#!/usr/bin/env python3
"""Cache authentic watch product photographs as optimized local WebP images.

The catalogue preserves manufacturer credits and sourcing metadata. Run only
when the store operator has publishing permission for the chosen photographs.
"""
from __future__ import annotations
import hashlib
import io
import json
from pathlib import Path
import requests
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent.parent
CATALOGUE = ROOT / 'site' / 'selection-affiliation.json'
OUTPUT = ROOT / 'site' / 'assets' / 'watches'
REPORT = ROOT / 'docs' / 'watch-photo-check.json'

# Explicit fallback photos correspond to the same precise product reference.
ALTERNATES = {
    'casio-mtp-1302': [
        'https://www.casio.com/content/dam/casio/product-info/locales/fr/fr/timepiece/product/watch/M/MT/MTP/mtp-1302pd-2a2v/assets/MTP-1302PD-2A2V.png',
        'https://scarce.co/cdn/shop/files/MTP1302PD-2A2_3_1200x1200.jpg?v=1694159419',
    ],
    'casio-a168wa': [
        'https://www.casio.com/content/dam/casio/product-info/locales/europe/en-gb/timepiece/product/watch/A/A1/A16/A168WA-1/assets/A168WA-1_01.jpg',
    ],
    'casio-mdv107': [
        'https://www.casio.com/content/dam/casio/product-info/locales/fr/fr/timepiece/product/watch/M/md/mdv/mdv-107-1a1v/local-assets/MDV-107-1A1V_2000x2000.png',
    ],
    'swatch-clearly': [
        'https://www.thejewelhut.co.uk/media/catalog/product/2/1/21-61-131_grey.jpg',
    ],
    'hamilton-khaki': [
        'https://www.lepage.fr/71698-zoom_default/watch-hamilton-khaki-field-automatic-black-dial-steel-bracelet-38-mm.jpg',
        'https://cdn2.lepage.fr/42577-large_default/montre-hamilton-khaki-field-cadran-noir-bracelet-acier-38-mm.jpg',
    ],
    'seiko-sharp': [
        'https://www.seikowatches.com/fr-fr/-/media/Images/Product--Image/All/Seiko/2022/02/20/00/52/SPB165J1/SPB165J1.png?mh=300&mw=300',
    ],
}

def download(session, url):
    from urllib.parse import urlsplit
    parsed=urlsplit(url)
    if parsed.scheme!='https':
        raise ValueError('Only HTTPS photo sources are permitted')
    response=session.get(
        url, headers={
            'Referer': parsed.scheme+'://'+parsed.hostname+'/',
            'Accept': 'image/avif,image/webp,image/apng,image/*;q=0.8,*/*;q=0.5',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        timeout=(9,26), stream=True, allow_redirects=True
    )
    response.raise_for_status()
    mime=response.headers.get('Content-Type','').split(';')[0].strip().lower()
    if mime and mime not in ('image/jpeg','image/png','image/webp','image/avif','image/gif','application/octet-stream'):
        raise ValueError('Unexpected MIME: '+mime)
    chunks=[]
    total=0
    for chunk in response.iter_content(chunk_size=262144):
        if not chunk:
            continue
        total+=len(chunk)
        if total>13000000:
            raise ValueError('Image exceeds 13MB')
        chunks.append(chunk)
    raw=b''.join(chunks)
    if len(raw)<1200:
        raise ValueError('Response is too small')
    try:
        with Image.open(io.BytesIO(raw)) as source:
            source.load()
            img=ImageOps.exif_transpose(source)
            if min(img.size)<240 or max(img.size)>9000:
                raise ValueError('Invalid photograph dimensions: '+str(img.size))
            if img.mode in ('RGBA','LA') or 'transparency' in img.info:
                img=img.convert('RGBA')
                ground=Image.new('RGBA',img.size,(248,247,244,255))
                ground.alpha_composite(img)
                img=ground.convert('RGB')
            else:
                img=img.convert('RGB')
            img.thumbnail((1200,1200),Image.Resampling.LANCZOS)
            buf=io.BytesIO()
            img.save(buf,format='WEBP',quality=91,method=5)
            blob=buf.getvalue()
            if len(blob)<1500:
                raise ValueError('Suspiciously tiny compressed image')
            return blob,img.size,hashlib.sha256(blob).hexdigest()
    except UnidentifiedImageError as ex:
        raise ValueError('Source is not a decodable photograph') from ex

def main():
    catalogue=json.loads(CATALOGUE.read_text(encoding='utf-8'))
    assert len(catalogue['products'])==15
    OUTPUT.mkdir(parents=True,exist_ok=True)
    session=requests.Session()
    session.headers.update({
        'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
        'Cache-Control':'no-cache',
    })
    report={'version':1,'count':15,'items':[],'unavailable':[]}
    used={}
    for p in catalogue['products']:
        id=p['id']
        photo=p['photoReview']
        output=OUTPUT/(id+'.webp')
        attempts=[]
        ok=False
        for url in dict.fromkeys([photo['url'],*ALTERNATES.get(id,[])]):
            try:
                blob,dimensions,digest=download(session,url)
                if digest in used and used[digest]!=id:
                    raise ValueError('Same image already used for '+used[digest])
                used[digest]=id
                output.write_bytes(blob)
                photo['localUrl']='./assets/watches/'+id+'.webp'
                photo['localSha256']=digest
                photo['localWidth'],photo['localHeight']=dimensions
                photo['localBytes']=len(blob)
                photo['originalFetchedFrom']=url
                report['items'].append({
                    'id':id,'ok':True,'source':url,'size':list(dimensions),
                    'bytes':len(blob),'sha256':digest
                })
                print('OK',id,dimensions,len(blob),'bytes',flush=True)
                ok=True
                break
            except (requests.RequestException,ValueError,OSError,Image.DecompressionBombError) as ex:
                attempts.append({'source':url,'error':str(ex)[:250]})
                print('FAILED',id,type(ex).__name__,str(ex)[:160],flush=True)
        if ok:
            continue
        if output.is_file():
            try:
                with Image.open(output) as img:
                    img.verify()
                photo['localUrl']='./assets/watches/'+id+'.webp'
                report['items'].append({'id':id,'ok':True,'retainedPrevious':True,'attempts':attempts})
                print('KEEP verified existing asset',id,flush=True)
                continue
            except (ValueError,OSError):
                output.unlink(missing_ok=True)
        for field in ('localUrl','localSha256','localWidth','localHeight','localBytes','originalFetchedFrom'):
            photo.pop(field,None)
        report['items'].append({'id':id,'ok':False,'attempts':attempts})
        report['unavailable'].append(id)
    CATALOGUE.write_text(json.dumps(catalogue,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    REPORT.parent.mkdir(parents=True,exist_ok=True)
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('IMAGE REPORT: ',len(report['items'])-len(report['unavailable']),'/15 verified',flush=True)
    return 0

if __name__=='__main__':
    raise SystemExit(main())
