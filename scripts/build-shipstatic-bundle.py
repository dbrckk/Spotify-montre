#!/usr/bin/env python3
"""Create a reproducible, size-capped static deployment package.

Package all of the live watch storefront pages and exactly 15 validated
local WebP photos into small GitHub-readable JSON parts. Each entry can be
passed verbatim into the ShipStatic uploader, avoiding remote-image hotlinks.
"""
from __future__ import annotations
import base64
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
SITE=ROOT/'site'
DOCS=ROOT/'docs'
MAX_PART_BYTES=720000
TEXT_SUFFIXES={'.html','.css','.js','.json','.svg','.txt','.xml'}
IMAGE_SUFFIXES={'.webp','.png','.jpg','.jpeg','.gif','.ico'}
EXCLUDED={'revue-photo.html','revue-photo.css','revue-photo.js'}

def compact(data):
    return json.dumps(data,ensure_ascii=False,separators=(',',':'))

def assemble():
    catalog=json.loads((SITE/'selection-affiliation.json').read_text(encoding='utf-8'))
    products=catalog['products']
    assert len(products)==15, 'Expected 15 actual watch models'
    assets=[]
    for path in sorted(SITE.rglob('*')):
        if not path.is_file():
            continue
        relative=path.relative_to(SITE).as_posix()
        if relative in EXCLUDED or relative=='index.html':
            continue
        if path.suffix.lower() in TEXT_SUFFIXES:
            assets.append({'path':relative,'content':path.read_text(encoding='utf-8')})
        elif path.suffix.lower() in IMAGE_SUFFIXES:
            assets.append({
                'path':relative,
                'content':base64.b64encode(path.read_bytes()).decode('ascii'),
                'encoding':'base64',
            })
        else:
            raise ValueError('Unexpected site asset format: '+relative)
    assets.append({'path':'index.html','content':(SITE/'affiliation.html').read_text(encoding='utf-8')})
    ids=set()
    for p in products:
        id=p['id']
        assert id not in ids, 'Duplicate model'
        ids.add(id)
        expected='./assets/watches/'+id+'.webp'
        photo=p['photoReview']
        if photo.get('publicUsageApproved') is not True:
            assert not photo.get('localUrl'), 'Withdrawn photo must not expose localUrl: '+id
            assert not photo.get('localSha256'), 'Withdrawn photo must not retain public hash: '+id
            continue
        assert photo.get('localUrl')==expected, 'No verified local file for '+id
        path=SITE/'assets'/'watches'/(id+'.webp')
        assert path.is_file(), 'Missing physical photo: '+id
        data=path.read_bytes()
        assert data[:4]==b'RIFF' and data[8:12]==b'WEBP', 'Not actual WebP: '+id
        assert hashlib.sha256(data).hexdigest()==photo['localSha256'], 'Photo changed unexpectedly: '+id
    approved_core={p['id'] for p in products if p['photoReview'].get('publicUsageApproved') is True}
    approved_popular=set(json.loads((SITE/'popular-photo-rights.json').read_text(encoding='utf-8'))['photos'])
    for asset in assets:
        path=asset['path']
        for folder,approved in (
            ('watches',approved_core),
            ('watch-responsive',approved_core),
            ('watch-thumbs',approved_core),
            ('watches-popular',approved_popular),
            ('popular-responsive',approved_popular),
        ):
            prefix='assets/'+folder+'/'
            if not path.startswith(prefix):
                continue
            filename=path[len(prefix):]
            if not filename.endswith('.webp'):
                raise AssertionError('Unexpected watch media extension: '+path)
            owner=filename[:-5]
            if owner not in approved:
                # Responsive variants are ID-<width>.webp, not arbitrary IDs.
                import re
                variant=re.fullmatch(r'([a-z0-9-]+)-(240|360|480|720|800|960)',owner)
                owner=variant.group(1) if variant else owner
            assert owner in approved, 'Unapproved or withdrawn photo still packaged: '+path
    assert {a['path'] for a in assets if a['path'].startswith('assets/watches/')}=={
        'assets/watches/'+id+'.webp' for id in approved_core
    }, 'Unregistered or withdrawn core photo detected'
    # Pack the 37 source-backed accessories only after the checksummed registry
    # has been populated. No external images or unregistered files are allowed.
    popular=json.loads((SITE/'selection-populaires.json').read_text(encoding='utf-8'))
    rights=json.loads((SITE/'popular-photo-rights.json').read_text(encoding='utf-8'))
    allowed=set(p['id'] for p in popular['products'])
    assert len(allowed)==37, 'Expected 37 unique supplemental models'
    cached=set()
    for photo_id,record in rights['photos'].items():
        assert photo_id in allowed, 'Unknown supplemental watch photo'
        imagepath='assets/watches-popular/'+photo_id+'.webp'
        assert record['file']==imagepath, 'Unmatched supplemental photo path'
        imagebytes=(SITE/imagepath).read_bytes()
        assert imagebytes[:4]==b'RIFF' and imagebytes[8:12]==b'WEBP', 'Non-WebP supplemental photo'
        assert hashlib.sha256(imagebytes).hexdigest()==record['imageSha256'], 'Supplemental photo checksum mismatch'
        cached.add(imagepath)
    assert {a['path'] for a in assets if a['path'].startswith('assets/watches-popular/')}==cached, 'Unregistered public watch photo detected'

    DOCS.mkdir(parents=True,exist_ok=True)
    chunks=[]
    part=[]
    for a in assets:
        if part and len(compact({'version':1,'files':[ *part,a]}).encode('utf-8'))>MAX_PART_BYTES:
            chunks.append(part)
            part=[]
        part.append(a)
    if part:
        chunks.append(part)
    manifest={'version':1,'models':len(approved_core),'totalModels':len(products)+len(allowed),'supplementalPhotos':len(cached),'files':len(assets),'parts':[]}
    for i,part in enumerate(chunks,1):
        name='deploy-package-%02d.json'%i
        content=compact({'version':1,'files':part})+'\n'
        path=DOCS/name
        path.write_text(content,encoding='utf-8')
        assert path.stat().st_size<900000, 'GitHub Contents API file limit'
        manifest['parts'].append({'file':name,'count':len(part),'bytes':path.stat().st_size})
    for stale in DOCS.glob('deploy-package-*.json'):
        if stale.name not in {p['file'] for p in manifest['parts']} and stale.name!='deploy-package-manifest.json':
            stale.unlink()
    (DOCS/'deploy-package-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print('Publishable deployment:',len(approved_core),'approved core watch photos,',len(assets),'static files in',len(chunks),'GitHub-safe JSON parts')
    for chunk in manifest['parts']:
        print(chunk['file'],chunk['count'],'files',chunk['bytes'],'bytes')

if __name__=='__main__':
    assemble()
