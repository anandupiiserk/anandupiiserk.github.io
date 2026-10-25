#!/usr/bin/env python3
"""Make gallery/t/<name>.webp thumbnails (960 px long edge) and gallery/manifest.json for the site."""
import os, json, glob, sys
from PIL import Image
G = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'gallery')
os.makedirs(G + '/t', exist_ok=True)
man = {}
for f in sorted(glob.glob(G + '/*')):
    n, e = os.path.splitext(os.path.basename(f))
    if e.lower() not in ('.jpg', '.jpeg', '.png', '.webp') or n.lower() == 'readme': continue
    im = Image.open(f); im = im.convert('RGB') if im.mode != 'RGB' else im
    w, h = im.size; t = im.copy(); t.thumbnail((960, 960), Image.LANCZOS)
    t.save(f'{G}/t/{n}.webp', 'WEBP', quality=80, method=6)
    man[n] = {'e': e[1:], 'w': w, 'h': h}
json.dump(man, open(G + '/manifest.json', 'w'), separators=(',', ':'), sort_keys=True)
tot = sum(os.path.getsize(p) for p in glob.glob(G + '/t/*.webp'))
print(len(man), 'photos, thumbs', round(tot / 1e6, 2), 'MB')
