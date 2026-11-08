"""Reproducible, checksum-verified mobile WebP derivatives for all approved popular watches.

Only uses already published, owner-attested original photographs; the originals
remain unchanged for product pages and full-size photo zoom.
"""
import hashlib
import io
import json
import math
from pathlib import Path
from PIL import Image, ImageOps, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1] / "site"
SOURCE = ROOT / "assets" / "watches-popular"
OUTPUT = ROOT / "assets" / "popular-responsive"


def main():
    registry = json.loads((ROOT / "popular-photo-rights.json").read_text())["photos"]
    if not registry or not isinstance(registry, dict):
        raise ValueError("No approved popular watch photography")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    expected = set()
    baseline_bytes = 0
    optimized_bytes = 0
    optimized_count = 0
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
            # Three lightweight cards plus medium/high-DPI product-sheet tiers.
            # Only produce variants smaller than each documented original.
            for width in (240, 360, 480, 720, 960):
                if width >= source.width:
                    continue
                if source.width < width:
                    raise ValueError(f"Source too small: {model_id}")
                resized = source.resize(
                    (width, round(source.height * width / source.width)),
                    Image.Resampling.LANCZOS,
                )
                name = f"{model_id}-{width}.webp"
                dest = OUTPUT / name
                # Compare against the existing quality-79 premium baseline.
                # Use a lighter quality only when its decoded appearance stays
                # extremely close to that baseline and it saves >=5% bytes.
                baseline_stream = io.BytesIO()
                resized.save(baseline_stream, "WEBP", quality=79, method=6)
                baseline = baseline_stream.getvalue()
                compact_stream = io.BytesIO()
                resized.save(compact_stream, "WEBP", quality=74, method=6)
                compact = compact_stream.getvalue()
                accepted = False
                if len(compact) <= len(baseline) * 0.95:
                    with Image.open(io.BytesIO(baseline)) as premium, Image.open(
                        io.BytesIO(compact)
                    ) as candidate:
                        diff = ImageChops.difference(
                            premium.convert("RGB"), candidate.convert("RGB")
                        )
                        rms = ImageStat.Stat(diff).rms
                        mse = sum(channel * channel for channel in rms) / 3
                        psnr = math.inf if mse == 0 else 10 * math.log10(255 * 255 / mse)
                        accepted = psnr >= 35
                output = compact if accepted else baseline
                dest.write_bytes(output)
                baseline_bytes += len(baseline)
                optimized_bytes += len(output)
                optimized_count += int(accepted)
                with Image.open(dest) as check:
                    if check.format != "WEBP" or check.width != width:
                        raise ValueError(f"Invalid derivative: {name}")
                expected.add(name)
                print(f"{name}: {len(original)} -> {dest.stat().st_size} bytes")
    for file in OUTPUT.glob("*.webp"):
        if file.name not in expected:
            file.unlink()
    count = sum(sum(width < record["width"] for width in (240, 360, 480, 720, 960)) for record in registry.values())
    if len(expected) != count:
        raise ValueError(f"Expected exactly {count} verified model-exact WebP derivatives")
    saved = baseline_bytes - optimized_bytes
    print(
        f"Verified {len(expected)} adaptive WebP derivatives across {len(registry)} exact watch models"
    )
    print(
        f"Premium quality-79 baseline: {baseline_bytes} bytes; selected: "
        f"{optimized_bytes} bytes; saved: {saved} bytes "
        f"({100 * saved / baseline_bytes:.1f}%), optimized variants: {optimized_count}"
    )


if __name__ == "__main__":
    main()
