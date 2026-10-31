#!/usr/bin/env python3
"""Integration checks using clearly synthetic Search Console exports, never real traffic."""
import importlib.util
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("search_console", HERE / "analyze-search-console.py")
gsc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gsc)


class SearchConsoleExportTests(unittest.TestCase):
    def test_csv_en_and_outside_property_filtered(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "Pages.csv").write_text(
                "Top pages,Clicks,Impressions,CTR,Position\n"
                "https://atelier-montres-selection-fr.onrender.com/montres/montres-casio.html,2,400,0.5%,7.4\n"
                "https://unrelated.example/montres/,0,90000,0%,4\n", encoding="utf-8")
            (root / "Queries.csv").write_text(
                "Top queries,Clicks,Impressions,CTR,Position\n"
                '"montres Casio vintage",1,220,0.45%,8.2\n'
                "recette cheesecake,0,1200,0%,9\n", encoding="utf-8")
            output = gsc.report(root, gsc.DEFAULT_SITE, "octobre 2026", root / "results")
            by_dimension = {s["dimension"]: s for s in output["sources"]}
            self.assertEqual(by_dimension["page"]["rows"], 1)
            self.assertEqual(len(by_dimension["page"]["opportunities"]), 1)
            self.assertEqual(len(by_dimension["query"]["opportunities"]), 1)
            self.assertEqual(by_dimension["query"]["opportunities"][0]["query"], "montres Casio vintage")
            self.assertEqual(output["period"], "octobre 2026")
            self.assertTrue((root / "results" / "gsc-opportunities.md").is_file())

    def test_french_delimiters_utf8_and_decimal_comma(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            file = root / "Requetes.csv"
            file.write_text("\ufeffRequêtes les plus fréquentes;Clics;Impressions;CTR;Position\n"
                            "montre automatique;2;300;0,66%;12,5\n", encoding="utf-8")
            table = gsc.parse_table(file.name, file.read_bytes(), gsc.DEFAULT_SITE)
            self.assertEqual(table["kind"], "query")
            self.assertEqual(table["rows"][0]["position"], 12.5)
            self.assertEqual(table["rows"][0]["impressions"], 300)
            self.assertEqual(gsc.prioritize(table)[0]["opportunity"], "Contenu / maillage")

    def test_zip_export_and_no_data_fabrication(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / "export.zip"
            with zipfile.ZipFile(source, "w") as archive:
                archive.writestr("Queries.csv", "Top queries,Clicks,Impressions,CTR,Position\nmontres,0,12,0%,30\n")
                archive.writestr("Pages.csv", "Top pages,Clicks,Impressions,CTR,Position\n"
                                 "https://atelier-montres-selection-fr.onrender.com/,0,3,0%,50\n")
                archive.writestr("Chart.csv", "Date,Clicks,Impressions\n2026-10-31,0,15\n")
            out = gsc.report(source, gsc.DEFAULT_SITE, "", root / "analysis")
            self.assertEqual(out["period"], "non precisee")
            self.assertEqual(len(out["sources"]), 2)
            self.assertTrue(all(not item["opportunities"] for item in out["sources"]))
            self.assertIn("Pas assez de donnees", out["notes"][-1])

    def test_duplicate_dimension_fails_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name in ("Queries.csv", "Query-split.csv"):
                (root / name).write_text("Queries,Clicks,Impressions,CTR,Position\nmontre quartz,0,400,0%,8\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "meme dimension"):
                gsc.report(root, gsc.DEFAULT_SITE, "", root / "report")

    def test_combined_query_page_only_when_both_in_source(self):
        text = ("Query,Page,Clicks,Impressions,CTR,Position\n"
                "montres casio,https://atelier-montres-selection-fr.onrender.com/montres/montres-casio.html,1,150,1%,7\n")
        table = gsc.parse_table("combined.csv", text.encode(), gsc.DEFAULT_SITE)
        self.assertEqual(table["kind"], "query_page")
        self.assertEqual(len(table["rows"]), 1)
        self.assertEqual(table["rows"][0]["page"].split("/")[-1], "montres-casio.html")

    def test_oversize_zip_rejected_without_extracting(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            path = root / "malicious.zip"
            with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("../Queries.csv", b"x" * (gsc.MAX_FILE_BYTES + 1))
            with self.assertRaisesRegex(ValueError, "trop volumineux"):
                gsc.extract_files(path)
            self.assertFalse((root.parent / "Queries.csv").exists())


if __name__ == "__main__":
    unittest.main()
