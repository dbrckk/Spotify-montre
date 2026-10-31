#!/usr/bin/env python3
"""Analyse locale d'un export Google Search Console (CSV, ZIP ou dossier).

Aucun appel reseau, token Google, dependance externe ou import GitHub. Les
requetes et pages non jointes ne sont jamais associees artificiellement.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
import unicodedata
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

DEFAULT_SITE = "https://atelier-montres-selection-fr.onrender.com/"
MAX_FILE_BYTES = 8 * 1024 * 1024
MAX_FILES = 40


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.lower().strip())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in value if not unicodedata.combining(c)))


ALIASES = {
    "query": {"topqueries", "query", "queries", "requetes", "requeteslesplusfrequentes", "requete"},
    "page": {"toppages", "page", "pages", "pageslesplusfrequentes"},
    "clicks": {"clicks", "clics"},
    "impressions": {"impressions"},
    "ctr": {"ctr", "tauxdeclics"},
    "position": {"position", "averageposition", "positionmoyenne"},
}
MOVEMENTS = ("quartz", "automatique", "automatic", "solaire", "eco drive")
BRANDS = ("casio", "citizen", "seiko", "tissot", "orient", "hamilton", "swatch")


def extract_files(path: Path) -> list[tuple[str, bytes]]:
    if not path.exists():
        raise ValueError("Export introuvable : " + str(path))
    items = []
    if path.is_dir():
        for file in sorted(path.iterdir()):
            if file.is_file() and file.suffix.lower() == ".csv":
                size = file.stat().st_size
                if size > MAX_FILE_BYTES:
                    raise ValueError("CSV trop volumineux : " + file.name)
                items.append((file.name, file.read_bytes()))
    elif zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            csv_files = [i for i in archive.infolist() if not i.is_dir() and i.filename.lower().endswith(".csv")]
            if len(csv_files) > MAX_FILES:
                raise ValueError("Trop de CSV dans l'archive")
            for member in csv_files:
                if member.file_size > MAX_FILE_BYTES or member.compress_size > MAX_FILE_BYTES:
                    raise ValueError("CSV trop volumineux dans le ZIP : " + member.filename)
                # No extraction: traversal paths in an uploaded ZIP cannot escape.
                with archive.open(member) as handle:
                    data = handle.read(MAX_FILE_BYTES + 1)
                if len(data) > MAX_FILE_BYTES:
                    raise ValueError("CSV trop volumineux : " + member.filename)
                items.append((Path(member.filename).name, data))
    elif path.suffix.lower() == ".csv":
        if path.stat().st_size > MAX_FILE_BYTES:
            raise ValueError("CSV trop volumineux")
        items = [(path.name, path.read_bytes())]
    else:
        raise ValueError("Format requis : fichier .csv, archive .zip ou dossier de CSV")
    if not items:
        raise ValueError("Aucun CSV trouve dans l'export")
    if len(items) > MAX_FILES:
        raise ValueError("Trop de fichiers CSV")
    return items


def number(value: str, percentage: bool = False) -> float:
    raw = str(value or "").strip().replace("\u00a0", "").replace("\u202f", "").replace(" ", "")
    if raw in {"", "-", "~"}:
        return 0.0
    if percentage and raw.endswith("%"):
        raw = raw[:-1].replace(",", ".")
        return float(raw) / 100
    raw = raw.replace(",", ".")
    return float(raw)


def parse_table(name: str, content: bytes, site: str):
    text = content.decode("utf-8-sig")
    if "\x00" in text:
        raise ValueError("CSV binaire ou corrompu : " + name)
    first = text[:2048]
    delimiter = ";" if first.split("\n", 1)[0].count(";") > first.split("\n", 1)[0].count(",") else ","
    reader = csv.DictReader(io.StringIO(text, newline=""), delimiter=delimiter)
    if not reader.fieldnames:
        return None
    headers = {normalized(h): h for h in reader.fieldnames if h}
    def find(field):
        return next((headers[a] for a in ALIASES[field] if a in headers), None)
    clicks_key, impr_key, position_key = find("clicks"), find("impressions"), find("position")
    query_key, page_key = find("query"), find("page")
    if not all((clicks_key, impr_key, position_key)) or not (query_key or page_key):
        return None  # Chart, Devices, Countries, Appearance etc.
    kind = "query_page" if query_key and page_key else "query" if query_key else "page"
    rows = []
    host = urlsplit(site).netloc.lower()
    for index, row in enumerate(reader, start=2):
        try:
            clicks = number(row.get(clicks_key, "0"))
            impressions = number(row.get(impr_key, "0"))
            position = number(row.get(position_key, "0"))
        except (ValueError, TypeError):
            raise ValueError(f"{name}:{index} : nombre invalide")
        if min(clicks, impressions, position) < 0 or position > 1000:
            raise ValueError(f"{name}:{index} : metriques impossibles")
        query = str(row.get(query_key) or "").strip() if query_key else None
        page = str(row.get(page_key) or "").strip() if page_key else None
        if kind in ("page", "query_page"):
            parts = urlsplit(page)
            if parts.scheme != "https" or parts.netloc.lower() != host:
                # Exclude unrelated domains. Do not contaminate site priorities.
                continue
            if not parts.path.startswith("/") or parts.query:
                continue
        if kind in ("query", "query_page") and not query:
            continue
        if not impressions:
            continue
        rows.append({
            "query": query, "page": page, "clicks": int(clicks),
            "impressions": int(impressions), "ctr": round(clicks / impressions, 6),
            "position": round(position, 2),
        })
    return {"kind": kind, "name": name, "rows": rows}


def classify(row: dict, kind: str) -> tuple[str, str] | None:
    impressions, ctr, position = row["impressions"], row["ctr"], row["position"]
    if kind != "page":
        query = normalized(row.get("query") or "")
        if not any(word.replace(" ", "") in query for word in (*MOVEMENTS, *BRANDS, "montre", "watch", "boitier")):
            return None  # Other intent cannot be claimed to match our watch catalogue.
    if impressions < 50:
        return None
    if impressions >= 100 and 3 <= position <= 12 and ctr < 0.03:
        return ("CTR à examiner", "Comparer le titre et la description affichés par Google à l'intention exacte, sans bourrage de mots-clés.")
    if impressions >= 100 and 12 < position <= 30:
        return ("Contenu / maillage", "Évaluer la pertinence de la page, ses données vérifiées et les liens internes depuis les catégories.")
    return None


def prioritize(table: dict) -> list[dict]:
    items = []
    for row in table["rows"]:
        advice = classify(row, table["kind"])
        if advice is None:
            continue
        category, next_step = advice
        candidate = dict(row)
        candidate.update({"opportunity": category, "recommended_review": next_step})
        # Heuristic prioritization, not Google demand or a forecast of clicks.
        candidate["priority_score"] = round(row["impressions"] * (1 - row["ctr"]) / max(row["position"], 1), 2)
        items.append(candidate)
    return sorted(items, key=lambda x: (-x["priority_score"], -x["impressions"]))[:20]


def cell(text: object) -> str:
    return str(text or "").replace("|", "\\|").replace("\n", " ").replace("\r", " ")[:180]


def report(input_file: Path, site: str, period: str, out: Path) -> dict:
    if urlsplit(site).scheme != "https" or not site.endswith("/") or urlsplit(site).query:
        raise ValueError("L'origine du site doit etre une URL HTTPS terminee par /")
    found = []
    for name, contents in extract_files(input_file):
        table = parse_table(name, contents, site)
        if table:
            found.append(table)
    if not found:
        raise ValueError("Aucun tableau Requetes/Pages reconnu avec Clics, Impressions et Position")
    kinds = [t["kind"] for t in found]
    if len(kinds) != len(set(kinds)):
        raise ValueError("Plusieurs exports de meme dimension : analyser chaque periode/filtre separement")
    analyzed = [{"dimension": t["kind"], "source": t["name"], "rows": len(t["rows"]),
                 "opportunities": prioritize(t)} for t in found]
    warnings = [
        "Aucune correspondance requete-page ne peut etre deduite d'exports separes Requetes et Pages.",
        "La position est une moyenne, pas un rang garanti sur chaque recherche.",
        "L'export Search Console peut etre limite a 1 000 lignes et exclure des requetes anonymisees.",
        "CTR, clics et impressions ne prouvent ni indexation de toutes les pages ni gain SEO futur.",
    ]
    if all(not t["opportunities"] for t in analyzed):
        warnings.append("Pas assez de donnees exploitables pour prioriser une optimisation, ne pas modifier les pages au hasard.")
    payload = {"site": site, "period": period or "non precisee", "generatedAt": datetime.now(timezone.utc).isoformat(),
               "provenance": "Export Google Search Console fourni par le proprietaire ; aucune requete API",
               "sources": analyzed, "notes": warnings}
    out.mkdir(parents=True, exist_ok=True)
    (out / "gsc-opportunities.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# Atelier Montres — opportunites Search Console", "",
             "**Site :** " + site, "**Periode de l'export :** " + (period or "non precisee"), "",
             "Ce rapport est produit uniquement a partir des CSV fournis, sans estimation de trafic.", ""]
    for source in analyzed:
        dimension = {"query": "Requetes", "page": "Pages", "query_page": "Paires requete/page"}[source["dimension"]]
        lines += ["## " + dimension, "", "**Fichier :** " + cell(source["source"]),
                  "**Lignes valides :** " + str(source["rows"]), ""]
        if not source["opportunities"]:
            lines += ["Aucune opportunite ne satisfait les seuils conservateurs de selection.", ""]
            continue
        lines += ["| Recherche ou page | Clics | Impressions | CTR | Position | Priorite |",
                  "|---|---:|---:|---:|---:|---|"]
        for item in source["opportunities"]:
            label = (item.get("query") or "") + (" → " if item.get("query") and item.get("page") else "") + (item.get("page") or "")
            lines.append("| " + cell(label) + " | " + str(item["clicks"]) + " | " +
                         str(item["impressions"]) + " | " + f'{item["ctr"] * 100:.2f}%' +
                         " | " + f'{item["position"]:.2f}' + " | " + cell(item["opportunity"]) + " |")
        lines += ["", "Actions envisageables (a verifier manuellement) :",
                  "- Verifier que le contenu repond a l'intention de recherche avant toute retouche.",
                  "- Corriger les liens internes ou les extraits sous-performants avec des faits verifies.",
                  "- Comparer les memes indicateurs sur une periode comparable apres modification.", ""]
    lines += ["## Limites", ""] + ["- " + warning for warning in warnings] + [""]
    (out / "gsc-opportunities.md").write_text("\n".join(lines), encoding="utf-8")
    return payload


def main():
    parser = argparse.ArgumentParser(description="SEO Search Console hors ligne, sans donnees inventees")
    parser.add_argument("--input", required=True, type=Path, help="CSV, dossier de CSV ou ZIP exporte par Search Console")
    parser.add_argument("--site", default=DEFAULT_SITE)
    parser.add_argument("--period", default="", help="Libelle explicite de la plage de dates, sans inference")
    parser.add_argument("--out", default="artifacts/search-console-local", type=Path)
    args = parser.parse_args()
    try:
        result = report(args.input, args.site, args.period, args.out)
    except (ValueError, UnicodeDecodeError, OSError, zipfile.BadZipFile) as exc:
        print("Export impossible a analyser : " + str(exc), file=sys.stderr)
        return 1
    print("Rapport local genere : " + str(args.out / "gsc-opportunities.md"))
    for table in result["sources"]:
        print(f"{table['dimension']} : {table['rows']} lignes, {len(table['opportunities'])} opportunites a examiner")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
