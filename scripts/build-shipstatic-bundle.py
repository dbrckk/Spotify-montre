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
TEXT=[
    'affiliation.html','affiliation.css','affiliation.js',
    'selection-affiliation.json','watch-illustrations.js','app.js',
    'base.css','features.css','horlogerie.css','montre.html',
    'fiche.js','fiche.css','embleme.svg','favicon.svg',
    'marque.html','marque.css','marque.js',
    'confidentialite.html','config.json',
]

def compact(data):
    return json.dumps(data,ensure_ascii=False,separators=(',',':'))

def assemble():
    catalog=json.loads((SITE/'selection-affiliation.json').read_text(encoding='utf-8'))
    products=catalog['products']
    assert len(products)==15, 'Expected 15 actual watch models'
    assets=[]
    for name in TEXT:
        path=SITE/name
        assert path.is_file(), 'Missing page dependency: '+name
        assets.append({'path':name,'content':path.read_text(encoding='utf-8')})
    assets.append({'path':'index.html','content':(SITE/'affiliation.html').read_text(encoding='utf-8')})
    ids=set()
    for p in products:
        id=p['id']
        assert id not in ids, 'Duplicate model'
        ids.add(id)
        expected='./assets/watches/'+id+'.webp'
        photo=p['photoReview']
        assert photo.get('localUrl')==expected, 'No verified local file for '+id
        path=SITE/'assets'/'watches'/(id+'.webp')
        assert path.is_file(), 'Missing physical photo: '+id
        data=path.read_bytes()
        assert data[:4]==b'RIFF' and data[8:12]==b'WEBP', 'Not actual WebP: '+id
        assert hashlib.sha256(data).hexdigest()==photo['localSha256'], 'Photo changed unexpectedly: '+id
        assets.append({
            'path':'assets/watches/'+id+'.webp',
            'content':base64.b64encode(data).decode('ascii'),
            'encoding':'base64',
        })
    assert len(assets)==len(TEXT)+1+15
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
    manifest={'version':1,'models':len(products),'files':len(assets),'parts':[]}
    for i,part in enumerate(chunks,1):
        name='deploy-package-%02d.json'%i
        content=compact({'version':1,'files':part})+'\n'
        path=DOCS/name
        path.write_text(content,encoding='utf-8')
        assert path.stat().st_size<900000, 'GitHub Contents API file limit'
        manifest['parts'].append({'file':name,'count':len(part),'bytes':path.stat().st_size})
    (DOCS/'deploy-package-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print('Publishable deployment:',len(products),'verified genuine watch photos,',len(assets),'static files in',len(chunks),'GitHub-safe JSON parts')
    for chunk in manifest['parts']:
        print(chunk['file'],chunk['count'],'files',chunk['bytes'],'bytes')

if __name__=='__main__':
    assemble()
