"""Reproducible, checksum-verified mobile WebP derivatives for all approved popular watches.

Only uses already published, owner-attested original photographs; the originals
remain unchanged for product pages and full-size photo zoom.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1] / "site"
SOURCE = ROOT / "assets" / "watches-popular"
OUTPUT = ROOT / "assets" / "popular-responsive"


def main():
    registry = json.loads((ROOT / "popular-photo-rights.json").read_text())["photos"]
    if not registry or not isinstance(registry, dict):
        raise ValueError("No approved popular watch photography")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    expected = set()
    for model_id in sorted(registry):
        record = registry[model_id]
        if record["file"] != f"assets/watches-popular/{model_id}.webp":
            raise ValueError(f"Unexpected photo source for {model_id}")
        path = SOURCE / f"{model_id}.webp"
        original = path.read_bytes()
        if hashlib.sha256(original).hexdigest() != record["imageSha256"]:
            raise ValueError(f"Photo digest mismatch for {model_id}")
        with Image.open(path) as source:
            if source.format != "WEBP":
                raise ValueError(f"Not WebP: {model_id}")
            source = ImageOps.exif_transpose(source)
            if source.size != (record["width"], record["height"]):
                raise ValueError(f"Image size differs from approved registry: {model_id}")
            for width in (240, 480):
                if source.width < width:
                    raise ValueError(f"Source too small: {model_id}")
                resized = source.resize(
                    (width, round(source.height * width / source.width)),
                    Image.Resampling.LANCZOS,
                )
                name = f"{model_id}-{width}.webp"
                dest = OUTPUT / name
                resized.save(dest, "WEBP", quality=79, method=6)
                with Image.open(dest) as check:
                    if check.format != "WEBP" or check.width != width:
                        raise ValueError(f"Invalid derivative: {name}")
                expected.add(name)
                print(f"{name}: {len(original)} -> {dest.stat().st_size} bytes")
    for file in OUTPUT.glob("*.webp"):
        if file.name not in expected:
            file.unlink()
    if len(expected) != 2 * len(registry):
        raise ValueError("Expected exactly two verified WebPs per approved watch")
    print(f"Verified {len(expected)} lightweight WebP derivatives across {len(registry)} exact watch models")


if __name__ == "__main__":
    main()
