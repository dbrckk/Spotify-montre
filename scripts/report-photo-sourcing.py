#!/usr/bin/env python3
"""Fail-closed, source-only status for the 37 supplemental watch photographs.

Reads the result of the real manufacturer-only downloader. Never grants image
rights, downloads a photo or mistakes a candidate URL for a published asset.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "site/selection-populaires.json"
RIGHTS = ROOT / "site/popular-photo-rights.json"
REPORT = ROOT / "docs/popular-watch-photo-report.json"


def assess(products: list, registry: dict, report: dict) -> dict:
    if report.get("version") != 1 or report.get("total") != len(products):
        raise ValueError("Source report does not match actual catalogue")
    ids = [p["id"] for p in products]
    if len(ids) != 37 or len(set(ids)) != 37:
        raise ValueError("Expected 37 distinct catalogue references")
    catalog_ids = set(ids)
    photos = report.get("photos")
    missing = report.get("missing")
    if not isinstance(photos, list) or not isinstance(missing, list):
        raise ValueError("Missing photographs and blocked-photo arrays")
    entries = photos + missing
    entry_ids = [item.get("id") for item in entries]
    if len(entries) != len(ids) or len(set(entry_ids)) != len(ids) or set(entry_ids) != catalog_ids:
        raise ValueError("Every exact model must be reported exactly once")
    rights = registry.get("photos")
    if registry.get("version") != 1 or not isinstance(rights, dict):
        raise ValueError("Invalid photo permission registry")
    published = {entry["id"] for entry in photos}
    if published != set(rights):
        raise ValueError("Photo report and permission registry do not describe identical models")
    for entry in photos:
        model = rights[entry["id"]]
        if entry.get("status") not in {"created", "preserved"}:
            raise ValueError("Unverified photo status: " + entry["id"])
        if entry.get("source") != model.get("sourcePage"):
            raise ValueError("Photo source mismatch: " + entry["id"])
        if entry["status"] == "created" and entry.get("sha256") != model.get("imageSha256"):
            raise ValueError("Created photo checksum mismatch: " + entry["id"])
    for item in missing:
        if not isinstance(item.get("reason"), str) or not item["reason"].strip():
            raise ValueError("Missing-photo reason must be explicit: " + item["id"])
    return {
        "total": len(ids),
        "published": len(photos),
        "missing": len(missing),
        "new": sum(entry["status"] == "created" for entry in photos),
        "blocked": missing,
    }


def summary(result: dict) -> str:
    lines = [
        "### Photograph sourcing — exact models only",
        "",
        f"- Published, provenance-recorded photos: **{result['published']}/{result['total']}**",
        f"- New photos this run: **{result['new']}**",
        f"- Models awaiting an exact verified source: **{result['missing']}**",
        "",
        "Photo publication also relies on the site owner's brand-permission attestation; "
        "written permission has not been independently verified. An inaccessible "
        "manufacturer page is never bypassed and no substitute-model image is used.",
        "",
    ]
    if result["blocked"]:
        lines += ["| Model | Blocking reason |", "| --- | --- |"]
        for item in result["blocked"]:
            model = item["id"]
            if not re.fullmatch(r"[a-z0-9-]+", model):
                raise ValueError("Unexpected product identifier")
            reason = item["reason"].replace("|", "/").replace("\n", " ")
            reason = reason.replace("<", "&lt;").replace(">", "&gt;")
            lines.append(f"| {model} | {reason[:190]} |")
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in {"--github-summary", "--new-count"}:
        raise SystemExit("Usage: report-photo-sourcing.py --github-summary | --new-count")
    result = assess(
        json.loads(CATALOG.read_text(encoding="utf-8"))["products"],
        json.loads(RIGHTS.read_text(encoding="utf-8")),
        json.loads(REPORT.read_text(encoding="utf-8")),
    )
    if sys.argv[1] == "--new-count":
        print(result["new"])
    else:
        print(summary(result))


if __name__ == "__main__":
    main()
