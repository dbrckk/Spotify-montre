"""Build genuine, lightweight thumbnail WebPs from already-approved local source photos.

No image is generated, edited semantically or fetched remotely. The source image
remains unchanged for full-screen and zoom. This script creates only 200px
navigation thumbnails to reduce download/decode costs on slower Android devices.
"""
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1] / 'site' / 'assets'
SOURCE=ROOT/'watches'
DEST=ROOT/'watch-thumbs'
WATCHES=('citizen-tsuyosa','tissot-prx-quartz','orient-bambino','casio-mtp-b145')

def build():
    DEST.mkdir(parents=True,exist_ok=True)
    for watch_id in WATCHES:
        image_path=SOURCE/(watch_id+'.webp')
        if not image_path.is_file():
            raise FileNotFoundError('Original manufacturer photo missing: '+str(image_path))
        with Image.open(image_path) as original:
            original.load()
            if original.width<200 or original.height<200:
                raise ValueError('Original photo too small to derive a thumbnail: '+watch_id)
            # Preserve visual aspect, transparent silhouettes on a neutral backdrop.
            photo=original.convert('RGBA')
            photo.thumbnail((200,200),Image.Resampling.LANCZOS)
            canvas=Image.new('RGBA',photo.size,(255,255,255,0))
            canvas.alpha_composite(photo)
            out=DEST/(watch_id+'.webp')
            canvas.save(out,format='WEBP',quality=76,method=6)
            with Image.open(out) as confirm:
                assert confirm.format=='WEBP' and confirm.width>100 and confirm.height>100
            print(f'{watch_id}: {image_path.stat().st_size} -> {out.stat().st_size} bytes')
if __name__=='__main__':
    build()
