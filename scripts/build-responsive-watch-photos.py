"""Create documented responsive WebP variants of the 15 locally published watches.

Uses original source bytes only, with no network image requests. The full-quality
WebP remains unchanged for zooming. Never upscale: 480px variants for all images
and an 800px variant only when the original supports it. Reproducible output.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1] / "site"
WATCHES = ROOT / "assets" / "watches"
DEST = ROOT / "assets" / "watch-responsive"
DATA = ROOT / "selection-affiliation.json"

def build():
    catalog = json.loads(DATA.read_text(encoding="utf-8"))
    products = catalog["products"]
    if len(products) != 15 or catalog.get("version") != 1:
        raise ValueError("Expected exactly fifteen catalogued watch models")
    DEST.mkdir(parents=True, exist_ok=True)
    expected = set()
    for model in products:
        model_id = model["id"]
        review = model.get("photoReview") or {}
        if review.get("publicUsageApproved") is not True:
            continue
        if review.get("localUrl") != f"./assets/watches/{model_id}.webp":
            raise ValueError(f"Unexpected source path for {model_id}")
        path = WATCHES / f"{model_id}.webp"
        payload = path.read_bytes()
        if hashlib.sha256(payload).hexdigest() != review.get("localSha256"):
            raise ValueError(f"Source checksum mismatch: {model_id}")
        with Image.open(path) as source:
            if source.format != "WEBP":
                raise ValueError(f"Source is not a WebP: {model_id}")
            source.load()
            source = ImageOps.exif_transpose(source)
            for width in (480, 800):
                if source.width < width:
                    continue
                target = source.resize(
                    (width, round(source.height * width / source.width)),
                    Image.Resampling.LANCZOS,
                )
                filename = f"{model_id}-{width}.webp"
                output = DEST / filename
                target.save(output, format="WEBP", quality=79, method=6)
                with Image.open(output) as check:
                    if check.format != "WEBP" or check.width != width:
                        raise ValueError(f"Invalid derived WebP: {filename}")
                expected.add(filename)
                print(f"{filename}: {len(payload):,} -> {output.stat().st_size:,} bytes")
    for stale in DEST.glob("*.webp"):
        if stale.name not in expected:
            stale.unlink()
    if len(expected) < 15:
        raise ValueError(f"Expected responsive images for all fifteen watches, found {len(expected)}")
    print(f"Validated {len(expected)} responsive photo derivatives")

if __name__ == "__main__":
    build()
