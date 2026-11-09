#!/usr/bin/env python3
"""Synchronise des photos EXACTES depuis les fiches marque/distributeur autorisées.

L'éditeur déclare disposer des autorisations des marques (31/10/2026).
Ce fait est une déclaration du propriétaire, non une vérification indépendante
ni une preuve écrite. Images et métadonnées demeurent traçables et révocables.
AUCUNE image Amazon.fr n'est copiée. En cas de doute, on conserve le visuel de
remplacement existant. Ne jamais forcer une image d'un autre modèle.
"""
from __future__ import annotations

import hashlib
import io
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
SOURCE = SITE / "selection-populaires.json"
RIGHTS = SITE / "popular-photo-rights.json"
DEST = SITE / "assets" / "watches-popular"
REPORT = ROOT / "docs" / "popular-watch-photo-report.json"
DATE = date.today().isoformat()
USER_AGENT = "AtelierMontresPhotoSync/1.0 (+https://atelier-montres-selection-fr.onrender.com/; product-image-cache)"
MAX_IMAGE = 12_000_000
SAFE_CDN = {"cdn.shopify.com", "cdn.shopifycdn.net", "static.wixstatic.com", "cdn11.bigcommerce.com"}
NO_IMAGES = ("placeholder", "logo", "default", "icon", "sprite", "banner", "payment", "avatar", "badge", "favicon")

RECOVERY_SOURCE = ROOT / "research" / "official-watch-photo-sources.json"


def official_recovery(model: dict, registry: dict) -> dict:
    """Only manually documented, same-brand, exact-code manufacturer media.

    Never chase generic image search results or third-party resellers. The
    merchant product URL remains unchanged; alternate URLs are photo-only.
    """
    entry = registry.get(model["id"])
    if entry is None:
        return {}
    if entry["productPage"] != model["officialUrl"] or (
        re.sub(r"[^A-Z0-9]", "", entry["modelCode"].upper()) != model_key(model["model"])
    ):
        raise ValueError("Manufacturer recovery source does not match exact catalog model")
    alternate = entry.get("alternateManufacturerPage")
    if alternate:
        alt = urlparse(alternate)
        if (model["brand"] != "Orient" or alt.scheme != "https"
            or alt.hostname != "orient-watch.com" or alt.query or alt.fragment
            or alt.username or alt.password or alt.port
            or model_key(model["model"]) not in re.sub(r"[^A-Z0-9]", "", alt.path.upper())):
            raise ValueError("Untrusted alternative manufacturer image page")
    picture = entry.get("officialImage")
    if picture:
        image = urlparse(picture)
        if (model["brand"] != "Tissot" or image.scheme != "https"
            or image.hostname != "www.tissotwatches.com" or image.query
            or image.fragment or image.username or image.password or image.port
            or not image.path.endswith((".png", ".jpg", ".webp"))
            or model_key(model["model"]) not in re.sub(r"[^A-Z0-9]", "", image.path.upper())):
            raise ValueError("Untrusted manufacturer packshot or model mismatch")
    if bool(alternate) == bool(picture):
        raise ValueError("Exactly one manufacturer recovery method is required")
    return entry



def host_allowed(url: str, page_url: str) -> bool:
    try:
        parsed = urlparse(url)
        site = urlparse(page_url)
        host = (parsed.hostname or "").lower()
        page_host = (site.hostname or "").lower()
        if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port or not host:
            return False
        if "amazon." in host or "aliexpress." in host:
            return False
        # Exact product-source domain, www/non-www variants, or known image CDNs.
        if host.removeprefix("www.") == page_host.removeprefix("www."):
            return True
        if host in SAFE_CDN:
            return True
        return False
    except ValueError:
        return False


def model_key(model: str) -> str:
    candidates = re.findall(r"[A-Z0-9][A-Z0-9-]*\d[A-Z0-9-]*", model.upper())
    keys = [value for value in candidates if len(re.sub(r"[^A-Z0-9]", "", value)) >= 4]
    if not keys:
        raise ValueError("No model identifier found: " + model)
    return re.sub(r"[^A-Z0-9]", "", keys[-1])


def is_exact_page(html: str, page_url: str, model: dict) -> bool:
    soup = BeautifulSoup(html, "html.parser")
    title = (soup.title.get_text(" ", strip=True) if soup.title else "")[:250]
    main = soup.select_one("main") or soup.body or soup
    content = main.get_text(" ", strip=True)[:25000]
    normalized = re.sub(r"[^A-Z0-9]", "", (title + " " + content + " " + unquote(page_url)).upper())
    brand_key = re.sub(r"[^A-Z0-9]", "", model["brand"].upper().split()[0])
    key = model_key(model["model"])
    # A page cannot pass merely because the model identifier appears in its URL:
    # the body/title must identify it too.
    display = re.sub(r"[^A-Z0-9]", "", (title + " " + content[:8000]).upper())
    return key in display and brand_key in normalized and not title.lower().startswith(("404", "page not found", "not found"))


def src_candidates(html: str, base: str, code: str) -> list[str]:
    """Extract genuine product-gallery sources, not recommendations or logos.

    Some official Orient and Tissot pages render their packshots in <picture>
    and lazy-load data-src/srcset rather than publishing Product JSON-LD or
    og:image. The exact product reference must already be verified in the
    page's title/body by is_exact_page; never infer it from an image alone.
    """
    soup = BeautifulSoup(html, "html.parser")
    ranked: list[tuple[int, str]] = []
    normalized_code = re.sub(r"[^A-Z0-9]", "", code.upper())

    def add(raw: str | None, priority: int = 4):
        if not isinstance(raw, str) or not raw.strip():
            return
        full = urljoin(base, raw.strip().replace("&amp;", "&"))
        if not host_allowed(full, base):
            return
        path = unquote(urlparse(full).path).lower()
        if any(word in path for word in NO_IMAGES):
            return
        # Some srcset query parameters include commas (e.g. gravity=center).
        # Splitting them must not turn a parameter into an image URL.
        # Real manufacturer product images use a recognizable file extension.
        if not re.search(r"\.(?:jpe?g|png|webp|avif)$", path):
            return
        image_code = re.sub(r"[^A-Z0-9]", "", unquote(urlparse(full).path).upper())
        # Strongest evidence: the exact SKU appears in the image path.
        score = 0 if normalized_code and normalized_code in image_code else priority
        ranked.append((score, full))

    def add_srcset(srcset: str | None, priority: int):
        # Width / density descriptors must never be concatenated into a URL.
        if not srcset:
            return
        parsed: list[tuple[float, str]] = []
        for item in srcset.split(","):
            fields = item.strip().rsplit(None, 1)
            if not fields:
                continue
            size = 0.0
            if len(fields) == 2:
                try:
                    value, descriptor = fields[1][:-1], fields[1][-1:]
                    if descriptor in ("w", "x"):
                        size = float(value)
                except ValueError:
                    continue
            url = fields[0]
            if url:
                parsed.append((size, url))
        # Try the largest candidate first, retaining fallback if unavailable.
        for _, src in sorted(parsed, reverse=True)[:3]:
            add(src, priority)

    for script in soup.select('script[type="application/ld+json"]'):
        try:
            data = json.loads(script.string or script.get_text() or "{}")
        except (ValueError, TypeError):
            continue

        def walk(obj):
            if isinstance(obj, list):
                for item in obj:
                    walk(item)
            elif isinstance(obj, dict):
                kinds = obj.get("@type", [])
                if isinstance(kinds, str):
                    kinds = [kinds]
                if any(str(kind).lower().split("/")[-1] == "product" for kind in kinds):
                    images = obj.get("image", [])
                    if isinstance(images, (str, dict)):
                        images = [images]
                    for item in images:
                        if isinstance(item, str):
                            add(item, 1)
                        elif isinstance(item, dict):
                            add(item.get("url") or item.get("contentUrl"), 1)
                walk(obj.get("@graph", []))
        walk(data)

    for selector in (
        'meta[property="og:image:secure_url"]',
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'link[rel="image_src"]',
        'meta[itemprop="image"]',
    ):
        for item in soup.select(selector):
            add(item.get("content") or item.get("href"), 2)

    gallery = ", ".join((
        ".woocommerce-product-gallery",
        ".product-gallery",
        ".product__media",
        ".product-single__media",
        ".product-detail__images",
        ".product-detail__gallery",
        ".product-image-gallery",
        ".product-photo-gallery",
        ".pdp-gallery",
        ".pdp-product-images",
        ".pdp-images",
        "[data-product-image]",
        "[data-product-gallery]",
        "[data-pdp-gallery]",
        "[data-gallery-role='gallery-placeholder']",
        ".product-view .product-image",
    ))
    nodes = soup.select(gallery)
    for container in nodes:
        for img in container.select("img"):
            # Prefer a correctly sized gallery srcset before its smaller lazy
            # thumbnail; a srcset with an exact SKU still outranks both.
            for attr in ("data-srcset", "srcset"):
                add_srcset(img.get(attr), 3)
            for attr in ("data-large_image", "data-zoom-image", "data-full", "data-original", "data-src", "src"):
                add(img.get(attr), 3)
        for source in container.select("picture source, source[srcset]"):
            add_srcset(source.get("srcset") or source.get("data-srcset"), 3)
            add(source.get("src") or source.get("data-src"), 3)

    # Self-identified primary product image outside a known gallery wrapper.
    # Do not widen this to every page <img>: recommendations are common.
    for img in soup.select("img.wp-post-image, img[itemprop='image'], img[data-product-image]"):
        for attr in ("data-large_image", "data-src", "src"):
            add(img.get(attr), 3)
        add_srcset(img.get("srcset") or img.get("data-srcset"), 3)

    # A path containing the exact SKU also identifies the model when a
    # brand renders its gallery with otherwise unrecognizable markup.
    for img in soup.select("main img, picture img"):
        matches = [img.get(attr) for attr in
                   ("data-large_image", "data-zoom-image", "data-src", "src")]
        for value in matches:
            if value and normalized_code in re.sub(r"[^A-Z0-9]", "", unquote(urlparse(value).path).upper()):
                add(value, 1)

    ranked.sort(key=lambda item: item[0])
    out: list[str] = []
    for _, candidate in ranked:
        if candidate not in out:
            out.append(candidate)
        if len(out) >= 12:
            break
    return out


def fetch_page(session: requests.Session, url: str) -> tuple[str, str]:
    res = session.get(url, timeout=(10, 25), allow_redirects=True)
    res.raise_for_status()
    if not host_allowed(res.url, url):
        raise ValueError("Product page redirected outside its documented domain")
    if "html" not in res.headers.get("content-type", "").lower():
        raise ValueError("Expected an HTML product page")
    if len(res.content) > 3_500_000:
        raise ValueError("Product HTML too large")
    return res.text, res.url


def is_official_orient_front(url: str, model_code: str) -> bool:
    """Never replace a watch's front photo with a bracelet/back/gallery view."""
    try:
        parsed = urlparse(url)
        return (parsed.scheme == "https"
            and (parsed.hostname or "").lower() == "orient-watch.com"
            and parsed.path.endswith("/" + model_code + "_main.webp")
            and not parsed.fragment)
    except ValueError:
        return False


def download(session: requests.Session, url: str, source: str,
             *, exact_orient_front: bool = False) -> tuple[bytes, int, int]:
    if not host_allowed(url, source):
        raise ValueError("Image source is not an approved manufacturer/distributor CDN")
    with session.get(url, stream=True, timeout=(10, 30), allow_redirects=True) as response:
        response.raise_for_status()
        if not host_allowed(response.url, source):
            raise ValueError("Image redirect outside declared source")
        mime = response.headers.get("content-type", "").split(";")[0].strip().lower()
        if mime not in {"image/jpeg", "image/png", "image/webp", "image/avif", "application/octet-stream"}:
            raise ValueError("Not a product photograph: " + mime)
        raw = io.BytesIO()
        for chunk in response.iter_content(65536):
            raw.write(chunk)
            if raw.tell() > MAX_IMAGE:
                raise ValueError("Image too large")
    if raw.tell() < 8000:
        raise ValueError("Source image is too small")
    try:
        with Image.open(io.BytesIO(raw.getvalue())) as im:
            im.load()
            if im.width < (300 if exact_orient_front else 380) or im.height < 380 or max(im.size) > 9000:
                raise ValueError("Image resolution not suitable")
            im = ImageOps.exif_transpose(im)
            if im.mode in ("RGBA", "LA") or "transparency" in im.info:
                im = im.convert("RGBA")
                background = Image.new("RGBA", im.size, (248, 247, 244, 255))
                background.alpha_composite(im)
                im = background.convert("RGB")
            else:
                im = im.convert("RGB")
            # Orient's official exact-SKU front asset is a narrow 328px
            # catalog portrait. Keep its real front view instead of the larger
            # 738px reverse/strap gallery photos. Upscaling is a layout
            # derivative, not evidence of additional photographic detail.
            if exact_orient_front and im.width < 480:
                target_width = 480
                im = im.resize((target_width, round(im.height * target_width / im.width)),
                               Image.Resampling.LANCZOS)
            im.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, "WEBP", quality=86, method=5)
            webp = buf.getvalue()
            if len(webp) < 8000:
                raise ValueError("WebP implausibly small")
            return webp, im.width, im.height
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Invalid image bytes") from exc


def main() -> int:
    catalogue = json.loads(SOURCE.read_text(encoding="utf-8"))
    rights = json.loads(RIGHTS.read_text(encoding="utf-8"))
    if rights.get("version") != 1 or rights.get("policy") != "commercial_rights_holder_license_required":
        raise ValueError("Unexpected photo registry schema")
    products = catalogue["products"]
    if len(products) != 37 or len({p["id"] for p in products}) != len(products):
        raise ValueError("Expected 37 distinct documented models")
    DEST.mkdir(parents=True, exist_ok=True)
    recovery_data = json.loads(RECOVERY_SOURCE.read_text(encoding="utf-8"))
    if (recovery_data.get("version") != 1
        or recovery_data.get("scope") != "documented_exact_model_manufacturer_image_recovery_only"
        or not isinstance(recovery_data.get("sources"), dict)):
        raise ValueError("Invalid independent manufacturer recovery registry")
    recovery_sources = recovery_data["sources"]
    if not set(recovery_sources).issubset({p["id"] for p in products}):
        raise ValueError("Manufacturer recovery contains unknown watch models")
    for candidate in products:
        official_recovery(candidate, recovery_sources)
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"})
    report = {"version": 1, "reviewedOn": DATE, "total": len(products), "photos": [], "missing": []}
    blocked_file=SITE / 'photo-takedowns.json'
    blocked=json.loads(blocked_file.read_text(encoding='utf-8'))
    if blocked.get('version') != 1 or not isinstance(blocked.get('retired'),list):
        raise ValueError('Invalid permanent takedown registry')
    blocked_ids={x['id'] for x in blocked['retired']}
    for p in products:
        pid, source = p["id"], p["officialUrl"]
        if pid in blocked_ids:
            if pid in rights['photos'] or (DEST/(pid+'.webp')).exists():
                raise ValueError('Retired photo is present again: '+pid)
            report['missing'].append({'id':pid,'reason':'withdrawn_pending_rights_review'})
            print('WITHDRAWN',pid,flush=True)
            continue
        original = rights["photos"].get(pid)
        file = DEST / (pid + ".webp")
        if original:
            if not file.is_file():
                raise ValueError("Registered photo missing; refusing silent replacement: " + pid)
            digest = hashlib.sha256(file.read_bytes()).hexdigest()
            if digest == original.get("imageSha256"):
                report["photos"].append({"id": pid, "status": "preserved", "source": original["sourcePage"]})
                print("PRESERVED", pid, flush=True)
                continue
            raise ValueError("Existing registered image hash mismatch: " + pid)
        errors = []
        recovered = False
        source_config = official_recovery(p, recovery_sources)
        photo_pages = [source]
        if source_config.get("alternateManufacturerPage"):
            photo_pages.append(source_config["alternateManufacturerPage"])
        for photo_page in photo_pages:
            try:
                html, page_url = fetch_page(session, photo_page)
                if not is_exact_page(html, page_url, p):
                    raise ValueError("Page title/content does not confirm exact model")
                key = model_key(p["model"])
                candidates = src_candidates(html, page_url, key)
                # Only independently researched, exact-SKU Tissot media.
                # The manufacturer page MUST identify that reference first.
                if source_config.get("officialImage"):
                    image_url = source_config["officialImage"]
                    if host_allowed(image_url, photo_page):
                        candidates.insert(0, image_url)
                # Keep the historical known exact Tissot PRX 35 mm packshot.
                if pid == "tissot-prx-35-blue" and key == "T1372101104100":
                    official_image = (
                        "https://www.tissotwatches.com/dw/image/v2/BKKD_PRD/on/"
                        "demandware.static/-/Sites-Tissot-Catalogue/default/"
                        "dw85cbf290/product-pictures/"
                        "137cb52c-5d13-4d79-a9ce-53d32356fd77_"
                        "T137-210-11-041-00_shadow.png?sh=1680&sm=fit&sw=1680"
                    )
                    if host_allowed(official_image, page_url):
                        candidates.insert(0, official_image)
                exact_orient_front = (
                    p["brand"] == "Orient"
                    and source_config.get("alternateManufacturerPage") == photo_page
                )
                if exact_orient_front:
                    candidates = [item for item in candidates
                        if is_official_orient_front(item, source_config["modelCode"])]
                if not candidates:
                    raise ValueError("No trusted exact-model front packshot in official product gallery")
                print("CANDIDATES", pid, len(candidates), photo_page, flush=True)
                for candidate in dict.fromkeys(candidates):
                    try:
                        image, width, height = download(session, candidate, photo_page,
                            exact_orient_front=exact_orient_front)
                        sha = hashlib.sha256(image).hexdigest()
                        # Commit only after the exact model, brand-domain,
                        # source bytes and usable dimensions are verified.
                        file.write_bytes(image)
                        rights["photos"][pid] = {
                            "rightsBasis": "site_owner_attested_brand_authorization",
                            "rightsHolder": p["brand"],
                            "scope": "commercial_affiliate_website_display_and_local_hosting",
                            "approvedOn": DATE,
                            "attestationSource": "site_owner_declaration_2026-10-31",
                            "permissionIndependentlyVerified": False,
                            "sourcePage": photo_page,
                            "sourceImageUrl": candidate,
                            "file": "assets/watches-popular/" + pid + ".webp",
                            "imageSha256": sha,
                            "width": width, "height": height,
                        }
                        report["photos"].append({"id": pid, "status": "created",
                            "source": photo_page, "image": candidate, "sha256": sha})
                        print("SUCCESS", pid, width, height, len(image), flush=True)
                        recovered = True
                        break
                    except (requests.RequestException, ValueError, OSError) as exc:
                        errors.append(str(exc)[:160])
                if recovered:
                    break
            except (requests.RequestException, ValueError, OSError) as exc:
                errors.append(str(exc)[:160])
        if not recovered:
            file.unlink(missing_ok=True)
            reason = "; ".join(errors[-3:]) if errors else "No approved exact-model packshot"
            report["missing"].append({"id": pid, "reason": reason[:240]})
            print("SKIP", pid, reason[:140], flush=True)
    RIGHTS.write_text(json.dumps(rights, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("EXACT WATCH PHOTOS:", len(report["photos"]), "/", len(products),
          "new:", sum(x["status"] == "created" for x in report["photos"]), flush=True)
    # A partial batch is valid: wrong-model matches are not filled with fakes.
    return 0


if __name__ == "__main__":
    sys.exit(main())
