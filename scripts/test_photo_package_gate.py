"""Regression tests for deployment fail-closed behavior when core photo rights are withdrawn."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('build-shipstatic-bundle.py')
spec = importlib.util.spec_from_file_location('photo_package_gate', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
WEBP = b'RIFF' + b'\x00\x00\x00\x00' + b'WEBP' + b'fixture'

class PackageRightsGateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.site = self.root / 'site'
        self.docs = self.root / 'docs'
        self.site.mkdir()
        self.docs.mkdir()
        (self.site/'assets'/'watches').mkdir(parents=True)
        self.models=[]
        for i in range(15):
            id=f'watch-{i:02d}'
            self.models.append({'id':id,'photoReview':{
                'publicUsageApproved':True,
                'localUrl':'./assets/watches/'+id+'.webp',
                'localSha256':hashlib.sha256(WEBP).hexdigest()
            }})
            (self.site/'assets'/'watches'/(id+'.webp')).write_bytes(WEBP)
        self._save()
    def _save(self):
        (self.site/'selection-affiliation.json').write_text(
            json.dumps({'products':self.models}),encoding='utf-8')
        (self.site/'selection-populaires.json').write_text(
            json.dumps({'products':[{'id':f'extra-{i:02d}'} for i in range(37)]}),encoding='utf-8')
        (self.site/'popular-photo-rights.json').write_text(
            json.dumps({'photos':{}}),encoding='utf-8')
        (self.site/'affiliation.html').write_text('<!doctype html><title>Test</title>',encoding='utf-8')
    def _assemble(self):
        with patch.object(module,'SITE',self.site),patch.object(module,'DOCS',self.docs):
            module.assemble()
        manifest=json.loads((self.docs/'deploy-package-manifest.json').read_text())
        packages=[json.loads((self.docs/p['file']).read_text()) for p in manifest['parts']]
        return manifest,[f for p in packages for f in p['files']]
    def test_fifteen_approved_photos_ship(self):
        manifest,files=self._assemble()
        self.assertEqual(manifest['models'],15)
        self.assertEqual(len([f for f in files if f['path'].startswith('assets/watches/')]),15)
    def test_withdrawn_photo_not_shipped_and_product_stays(self):
        photo=self.models[0]['photoReview']
        photo.update(publicUsageApproved=False,localUrl=None,localSha256=None)
        (self.site/'assets'/'watches'/'watch-00.webp').unlink()
        self._save()
        manifest,files=self._assemble()
        self.assertEqual(manifest['models'],14)
        self.assertFalse(any('watch-00.webp' in f['path'] for f in files))
        self.assertTrue(any(f['path']=='selection-affiliation.json' for f in files))
    def test_withdrawn_photo_original_fails_closed(self):
        self.models[0]['photoReview'].update(
            publicUsageApproved=False,localUrl=None,localSha256=None)
        self._save()
        with self.assertRaisesRegex(AssertionError,'Unapproved or withdrawn'):
            self._assemble()
    def test_withdrawn_photo_responsive_fails_closed(self):
        self.models[0]['photoReview'].update(
            publicUsageApproved=False,localUrl=None,localSha256=None)
        (self.site/'assets'/'watches'/'watch-00.webp').unlink()
        responsive=self.site/'assets'/'watch-responsive'
        responsive.mkdir()
        (responsive/'watch-00-480.webp').write_bytes(WEBP)
        self._save()
        with self.assertRaisesRegex(AssertionError,'Unapproved or withdrawn'):
            self._assemble()
    def test_approved_intermediate_responsive_widths_ship(self):
        responsive=self.site/'assets'/'watch-responsive'
        responsive.mkdir()
        for width in (640,720):
            (responsive/f'watch-00-{width}.webp').write_bytes(WEBP)
        _,files=self._assemble()
        paths={f['path'] for f in files}
        for width in (640,720):
            self.assertIn(f'assets/watch-responsive/watch-00-{width}.webp',paths)
    def test_withdrawn_intermediate_responsive_fails_closed(self):
        self.models[0]['photoReview'].update(
            publicUsageApproved=False,localUrl=None,localSha256=None)
        (self.site/'assets'/'watches'/'watch-00.webp').unlink()
        responsive=self.site/'assets'/'watch-responsive'
        responsive.mkdir()
        (responsive/'watch-00-640.webp').write_bytes(WEBP)
        self._save()
        with self.assertRaisesRegex(AssertionError,'Unapproved or withdrawn'):
            self._assemble()
    def test_unregistered_extra_media_fails_closed(self):
        extra=self.site/'assets'/'watches-popular'
        extra.mkdir()
        (extra/'extra-00.webp').write_bytes(WEBP)
        with self.assertRaisesRegex(AssertionError,'Unapproved or withdrawn'):
            self._assemble()

if __name__=='__main__':
    unittest.main()
