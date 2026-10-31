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
DATE = "2026-10-31"
USER_AGENT = "AtelierMontresPhotoSync/1.0 (+https://atelier-montres-selection-fr.onrender.com/; product-image-cache)"
MAX_IMAGE = 12_000_000
SAFE_CDN = {"cdn.shopify.com", "cdn.shopifycdn.net", "static.wixstatic.com", "cdn11.bigcommerce.com"}
NO_IMAGES = ("placeholder", "logo", "default", "icon", "sprite", "banner", "payment", "avatar", "badge", "favicon")


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
    soup = BeautifulSoup(html, "html.parser")
    urls: list[str] = []
    # Structured Product schema and social packshot are usually the primary variant.
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            data = json.loads(script.string or script.get_text() or "{}")
        except (ValueError, TypeError):
            continue
        def walk(obj):
            if isinstance(obj, list):
                for v in obj:
                    walk(v)
            elif isinstance(obj, dict):
                typ = str(obj.get("@type", "")).lower()
                if typ == "product" or (isinstance(obj.get("@type"), list) and "Product" in obj["@type"]):
                    images = obj.get("image", [])
                    if isinstance(images, (str, dict)):
                        images = [images]
                    for item in images:
                        if isinstance(item, str):
                            urls.append(item)
                        elif isinstance(item, dict) and isinstance(item.get("url"), str):
                            urls.append(item["url"])
                for field in ("@graph",):
                    if field in obj:
                        walk(obj[field])
        walk(data)
    for selector in ('meta[property="og:image:secure_url"]', 'meta[property="og:image"]', 'meta[name="twitter:image"]'):
        for item in soup.select(selector):
            if item.get("content"):
                urls.append(item["content"])
    # Product galleries only; do not fetch logos / unrelated recommendations.
    for item in soup.select(".woocommerce-product-gallery img, .product-gallery img, .product__media img, .product-single__media img, img.wp-post-image, [data-product-image] img"):
        for attr in ("data-large_image", "data-zoom-image", "data-src", "src"):
            if item.get(attr):
                urls.append(item[attr])
        if item.get("srcset"):
            candidate = item["srcset"].split(",")[-1].strip().split(" ")[0]
            if candidate:
                urls.append(candidate)
    out: list[str] = []
    for candidate in urls:
        full = urljoin(base, candidate.replace("&amp;", "&"))
        if not host_allowed(full, base):
            continue
        path = unquote(urlparse(full).path).lower()
        if any(word in path for word in NO_IMAGES) or full in out:
            continue
        out.append(full)
    return out[:8]


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


def download(session: requests.Session, url: str, source: str) -> tuple[bytes, int, int]:
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
            if im.width < 380 or im.height < 380 or max(im.size) > 9000:
                raise ValueError("Image resolution not suitable")
            im = ImageOps.exif_transpose(im)
            if im.mode in ("RGBA", "LA") or "transparency" in im.info:
                im = im.convert("RGBA")
                background = Image.new("RGBA", im.size, (248, 247, 244, 255))
                background.alpha_composite(im)
                im = background.convert("RGB")
            else:
                im = im.convert("RGB")
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
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"})
    report = {"version": 1, "reviewedOn": DATE, "total": len(products), "photos": [], "missing": []}
    for p in products:
        pid, source = p["id"], p["officialUrl"]
        original = rights["photos"].get(pid)
        file = DEST / (pid + ".webp")
        if original and file.is_file():
            digest = hashlib.sha256(file.read_bytes()).hexdigest()
            if digest == original.get("imageSha256"):
                report["photos"].append({"id": pid, "status": "preserved", "source": original["sourcePage"]})
                print("PRESERVED", pid, flush=True)
                continue
            # A mismatched or missing registered asset must never be silently replaced.
            raise ValueError("Existing registered image hash mismatch: " + pid)
        errors = []
        try:
            html, page_url = fetch_page(session, source)
            if not is_exact_page(html, page_url, p):
                raise ValueError("Page title/content does not confirm exact model")
            key = model_key(p["model"])
            candidates = src_candidates(html, page_url, key)
            if not candidates:
                raise ValueError("No trusted product image source found")
            for candidate in candidates:
                try:
                    image, width, height = download(session, candidate, page_url)
                    sha = hashlib.sha256(image).hexdigest()
                    file.write_bytes(image)
                    rights["photos"][pid] = {
                        "rightsBasis": "site_owner_attested_brand_authorization",
                        "rightsHolder": p["brand"],
                        "scope": "commercial_affiliate_website_display_and_local_hosting",
                        "approvedOn": DATE,
                        "attestationSource": "site_owner_declaration_2026-10-31",
                        "permissionIndependentlyVerified": False,
                        "sourcePage": source,
                        "sourceImageUrl": candidate,
                        "file": "assets/watches-popular/" + pid + ".webp",
                        "imageSha256": sha,
                        "width": width, "height": height,
                    }
                    report["photos"].append({"id": pid, "status": "created", "source": source, "image": candidate, "sha256": sha})
                    print("SUCCESS", pid, width, height, len(image), flush=True)
                    break
                except (requests.RequestException, ValueError, OSError) as exc:
                    errors.append(str(exc)[:160])
            else:
                raise ValueError("; ".join(errors[-3:]))
        except (requests.RequestException, ValueError, OSError) as exc:
            file.unlink(missing_ok=True) if not original else None
            report["missing"].append({"id": pid, "reason": str(exc)[:240]})
            print("SKIP", pid, str(exc)[:140], flush=True)
    RIGHTS.write_text(json.dumps(rights, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("EXACT WATCH PHOTOS:", len(report["photos"]), "/", len(products),
          "new:", sum(x["status"] == "created" for x in report["photos"]), flush=True)
    # A partial batch is valid: wrong-model matches are not filled with fakes.
    return 0


if __name__ == "__main__":
    sys.exit(main())
