"""Fixture checks for source-backed manufacturer packshot extraction.

Run offline: python -m unittest discover -s scripts -p test_popular_photo_sources.py
Never contacts brands or publishes imagery.
"""
import importlib.util
import unittest
from pathlib import Path

MODULE = Path(__file__).with_name("sync-popular-watch-images.py")
spec = importlib.util.spec_from_file_location("watch_photo_sync", MODULE)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

TISSOT = "https://www.tissotwatches.com/fr-fr/T1372101104100.html"
ORIENT = "https://www.orientwatch.fr/or/fr_FR/brands/orient/orient-bambino-38mm/p/RA-AC0M04Y"


class OfficialProductSources(unittest.TestCase):
    def test_documented_recovery_sources_are_exact_and_manufacturer_only(self):
        import json
        research = json.loads(sync.RECOVERY_SOURCE.read_text(encoding="utf-8"))
        products = json.loads(sync.SOURCE.read_text(encoding="utf-8"))["products"]
        by_id = {p["id"]: p for p in products}
        self.assertEqual(research["version"], 1)
        self.assertEqual(len(research["sources"]), 14)
        for pid, evidence in research["sources"].items():
            item = by_id[pid]
            actual = sync.official_recovery(item, research["sources"])
            self.assertEqual(sync.re.sub(r"[^A-Z0-9]", "", actual["modelCode"]),
                sync.model_key(item["model"]))
            self.assertEqual(actual["productPage"], item["officialUrl"])
        locle=research["sources"]["tissot-le-locle-white"]
        self.assertEqual(locle["modelCode"],"T0064071103300")
        self.assertIn("T006-407-11-033-00_shadow.png",locle["officialImage"])
        self.assertTrue(sync.host_allowed(locle["officialImage"],
            by_id["tissot-le-locle-white"]["officialUrl"]))
        changed={"tissot-le-locle-white":{**locle,
            "officialImage":locle["officialImage"].replace(
                "T006-407-11-033-00","T006-407-11-053-00")}}
        with self.assertRaisesRegex(ValueError,"packshot or model mismatch"):
            sync.official_recovery(by_id["tissot-le-locle-white"],changed)
        image = research["sources"]["tissot-gentleman-auto"]["officialImage"]
        self.assertTrue(sync.host_allowed(image, by_id["tissot-gentleman-auto"]["officialUrl"]))
        self.assertIn("T127-407-11-041-00_shadow.png", image)
        self.assertIn("orient-watch.com",
            research["sources"]["orient-mako40-black"]["alternateManufacturerPage"])
        self.assertNotIn("amazon.", str(research))

    def test_new_photos_ship_with_derivatives_even_after_bot_push(self):
        workflow=(sync.ROOT / ".github" / "workflows"
                  / "source-popular-watch-photos.yml").read_text()
        self.assertIn("python scripts/sync-popular-watch-images.py",workflow)
        self.assertIn("python scripts/build-popular-editorial-thumbnails.py",workflow)
        self.assertLess(workflow.index("python scripts/sync-popular-watch-images.py"),
                        workflow.index("python scripts/build-popular-editorial-thumbnails.py"))
        self.assertLess(workflow.index("python scripts/build-popular-editorial-thumbnails.py"),
                        workflow.index("node scripts/build-seo.mjs"))
        self.assertIn("git add -A site/assets/watches-popular/ site/assets/popular-responsive/",
                      workflow)

    def test_weekly_photo_rechecks_have_a_reproducible_noop_gate(self):
        import json
        from copy import deepcopy
        p = sync.ROOT / "scripts" / "report-photo-sourcing.py"
        module = importlib.util.spec_from_file_location("watch_photo_status", p)
        status = importlib.util.module_from_spec(module)
        module.loader.exec_module(status)
        products = json.loads(sync.SOURCE.read_text(encoding="utf-8"))["products"]
        rights = json.loads(sync.RIGHTS.read_text(encoding="utf-8"))
        report = json.loads(status.REPORT.read_text(encoding="utf-8"))
        summary = status.assess(products, rights, report)
        self.assertEqual(summary["total"], 37)
        self.assertEqual(summary["published"], len(rights["photos"]))
        self.assertEqual(summary["missing"], 37-len(rights["photos"]))
        markdown = status.summary(summary)
        self.assertIn("not been independently verified", markdown)
        self.assertIn("| Model | Blocking reason |", markdown)
        self.assertIn("casio-f91w-1", markdown)
        changed = deepcopy(report)
        changed["missing"][0]["id"] = changed["photos"][0]["id"]
        with self.assertRaisesRegex(ValueError, "exactly once"):
            status.assess(products, rights, changed)
        changed = deepcopy(report)
        changed["photos"][0]["source"] = "https://wrong-brand.example/photo"
        with self.assertRaisesRegex(ValueError, "source mismatch"):
            status.assess(products, rights, changed)
        changed = deepcopy(report)
        changed["photos"][0]["status"] = "invented"
        with self.assertRaisesRegex(ValueError, "Unverified photo status"):
            status.assess(products, rights, changed)
        changed = deepcopy(report)
        changed["photos"][0]["status"] = "created"
        changed["photos"][0]["sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            status.assess(products, rights, changed)
        # Status is generated from the current run, not stale committed JSON.
        current = deepcopy(report)
        for record in current["photos"]:
            record["status"] = "preserved"
        self.assertEqual(status.assess(products, rights, current)["new"], 0)
        workflow = (sync.ROOT / ".github/workflows/source-popular-watch-photos.yml").read_text()
        self.assertIn("cron: '41 5 * * 2'", workflow)
        self.assertIn("python scripts/report-photo-sourcing.py --new-count", workflow)
        self.assertIn("steps.photo_delta.outputs.count != '0'", workflow)
        self.assertIn("github.event_name != 'pull_request'", workflow)

    def test_casio_alternate_sources_require_manufacturer_and_exact_sku(self):
        import json
        research=json.loads(sync.RECOVERY_SOURCE.read_text(encoding="utf-8"))
        products={p["id"]:p for p in
          json.loads(sync.SOURCE.read_text(encoding="utf-8"))["products"]}
        casios={pid:entry for pid,entry in research["sources"].items()
                if pid.startswith("casio-")}
        self.assertEqual(len(casios),10)
        for pid,entry in casios.items():
            model=products[pid]
            self.assertEqual(sync.official_recovery(model,casios),entry)
            self.assertTrue(entry["alternateManufacturerPage"].startswith(
                "https://www.casio.com/"))
            bad={**entry,
                 "alternateManufacturerPage":entry["alternateManufacturerPage"]
                     .replace("https://www.casio.com/",
                              "https://casio-photography.example/")}
            with self.assertRaisesRegex(ValueError,"Untrusted alternative"):
                sync.official_recovery(model,{pid:bad})
            bad={**entry,
                 "alternateManufacturerPage":entry["alternateManufacturerPage"]
                     .replace("product.", "product.UNRELATED-")}
            with self.assertRaisesRegex(ValueError,"Untrusted alternative"):
                sync.official_recovery(model,{pid:bad})
            bad={**entry,
                 "alternateManufacturerPage":entry["alternateManufacturerPage"]
                     +"?redirect=https://example.org/"}
            with self.assertRaisesRegex(ValueError,"Untrusted alternative"):
                sync.official_recovery(model,{pid:bad})
        self.assertTrue(sync.is_exact_casio_photo(
            "https://www.casio.com/content/dam/CASIO-F-91W-1_front.png","F-91W-1"))
        self.assertTrue(sync.is_exact_casio_photo(
            "https://www.casio.com/product/F91W1_01.webp","F-91W-1"))
        for near_match in (
            "F-91W-1Y.jpg","F-91W-11.webp","F-91W-1A_02.png",
            "F-91W-1B.jpg","F-91W-3.webp","another-product.png"
        ):
            self.assertFalse(sync.is_exact_casio_photo(
                "https://www.casio.com/assets/"+near_match,"F-91W-1"),
                "Colourway or unrelated photo must not be mistaken: "+near_match)

    def test_only_exact_orient_front_is_eligible_for_mobile_cards(self):
        base = "https://orient-watch.com/en/orient/collection/sports/diver-design-40/RA-AC0Q01B/product_en_file/file/"
        self.assertTrue(sync.is_official_orient_front(base+"RA-AC0Q01B_main.webp", "RA-AC0Q01B"))
        self.assertFalse(sync.is_official_orient_front(base+"RA-AC0Q01B_01.webp", "RA-AC0Q01B"),
            "Back and clasp views must not become the catalog front photograph")
        self.assertFalse(sync.is_official_orient_front(base+"RA-AC0Q01B_02.webp", "RA-AC0Q01B"))
        self.assertFalse(sync.is_official_orient_front(base+"RA-AC0Q02L_main.webp", "RA-AC0Q01B"))
        self.assertFalse(sync.is_official_orient_front(
            "https://www.amazon.fr/RA-AC0Q01B_main.webp","RA-AC0Q01B"))
        other = "https://orient-watch.com/en/orient/collection/classic/classic-and-simple-style-38/RA-AC0M04Y/product_en_file/file/"
        self.assertTrue(sync.is_official_orient_front(other+"RA-AC0M04Y_main.webp","RA-AC0M04Y"))

    def test_recovery_fails_closed_on_other_brand_or_code(self):
        import json
        research = json.loads(sync.RECOVERY_SOURCE.read_text(encoding="utf-8"))
        models = {p["id"]:p for p in
            json.loads(sync.SOURCE.read_text(encoding="utf-8"))["products"]}
        original = research["sources"]["orient-mako40-black"]
        malicious = {"orient-mako40-black": {**original,
            "alternateManufacturerPage": "https://evil.example/RA-AC0Q01B.jpg"}}
        with self.assertRaisesRegex(ValueError,"Untrusted alternative"):
            sync.official_recovery(models["orient-mako40-black"],malicious)
        malicious = {"orient-mako40-black": {**original,"modelCode":"RA-AC0Q02L"}}
        with self.assertRaisesRegex(ValueError,"exact catalog model"):
            sync.official_recovery(models["orient-mako40-black"],malicious)
        tissot = research["sources"]["tissot-gentleman-auto"]
        with self.assertRaisesRegex(ValueError,"packshot or model mismatch"):
            sync.official_recovery(models["tissot-gentleman-auto"],{
                "tissot-gentleman-auto":{**tissot,
                    "officialImage":tissot["officialImage"].replace(
                        "T127-407-11-041-00","T127-407-11-031-00")}})
        with self.assertRaisesRegex(ValueError,"exact catalog model"):
            sync.official_recovery({**models["tissot-gentleman-auto"],
                "officialUrl":"https://wrong.example/product"},research["sources"])

    def test_tissot_lazy_picture_and_exact_sku_priority(self):
        html = """<html><head><title>Tissot PRX 35mm T137.210.11.041.00</title>
        <meta property="og:image" content="/campaign/logo.png"></head>
        <body><main><h1>PRX 35 mm T1372101104100</h1>
        <div class="pdp-gallery"><picture>
        <source srcset="/dw/image/T137-210-11-041-00-front.png 720w,
                        /dw/image/T137-210-11-041-00-shadow.png 1680w">
        <img src="/dw/image/T137-210-11-041-00-small.jpg" alt="Tissot PRX">
        </picture></div>
        <div class="suggestions"><img src="/dw/image/T127-202-00-other-watch.png"></div>
        </main></body></html>"""
        p={"brand":"Tissot","model":"PRX 35 mm T1372101104100"}
        self.assertTrue(sync.is_exact_page(html,TISSOT,p))
        options=sync.src_candidates(html,TISSOT,sync.model_key(p["model"]))
        self.assertGreaterEqual(len(options),2)
        self.assertIn("T137-210-11-041-00",options[0])
        self.assertIn("1680w",html)
        self.assertNotIn("T127-202-00",str(options))
        self.assertNotIn("/campaign/logo.png",str(options))

    def test_orient_gallery_lazy_load_and_no_unrelated_photo(self):
        html = """<title>Orient Bambino 38 mm RA-AC0M04Y</title>
          <main><h1>Orient RA-AC0M04Y</h1>
          <div data-product-gallery>
          <img data-src="/media/orient_bambino_front.webp"
               data-srcset="/media/orient_bambino_480.webp 480w,
                            /media/orient_bambino_960.webp 960w"/>
          </div>
          <aside><img src="/related/RA-AC0Q01B.webp"></aside></main>"""
        p={"brand":"Orient","model":"RA-AC0M04Y"}
        self.assertTrue(sync.is_exact_page(html,ORIENT,p))
        options=sync.src_candidates(html,ORIENT,sync.model_key(p["model"]))
        self.assertEqual(options[0],"https://www.orientwatch.fr/media/orient_bambino_960.webp")
        self.assertNotIn("RA-AC0Q01B",str(options))

    def test_url_only_does_not_verify_page(self):
        html="<html><title>404 Not Found</title><main>Collections</main></html>"
        p={"brand":"Tissot","model":"PRX T1372101104100"}
        self.assertFalse(sync.is_exact_page(html,TISSOT,p))

    def test_strict_source_domain_and_no_generic_recommendations(self):
        html="""<title>PRX T1372101104100 - Tissot</title>
        <main><h1>PRX T1372101104100</h1>
        <img src="https://other-brand.com/model-T1372101104100.jpg">
        <div class="recommendations"><img src="/photo-unrelated.jpg"></div>
        <div class="pdp-gallery"><img src="https://www.amazon.fr/product-photo.jpg"
              data-src="/media/product-main.jpg"></div></main>"""
        options=sync.src_candidates(html,TISSOT,"T1372101104100")
        self.assertEqual(options,["https://www.tissotwatches.com/media/product-main.jpg"])

    def test_product_jsonld_graph(self):
        html="""<script type="application/ld+json">{
          "@graph":[{"@type":"BreadcrumbList","itemListElement":[]},
          {"@type":["Product","Thing"],"image":[
          {"contentUrl":"https://www.tissotwatches.com/media/T1372101104100.webp"}]}]}
          </script>"""
        options=sync.src_candidates(html,TISSOT,"T1372101104100")
        self.assertEqual(options,["https://www.tissotwatches.com/media/T1372101104100.webp"])


if __name__ == "__main__":
    unittest.main()
