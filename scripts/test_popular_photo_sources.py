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
