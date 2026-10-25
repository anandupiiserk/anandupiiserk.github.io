#!/usr/bin/env python3
"""One entry point for maintaining the portfolio site.

Run it from any folder:   python3 tools/site.py <command> [options]

Commands
  build            Regenerate everything: i18n.js, gallery thumbnails and manifest, all HTML pages.
  bump             Raise the cache-busting version string (the ?v=... on style.css, script.js, i18n.js), then build.
  photos ID files  Resize photos to the site standard and name them for a gallery carousel or single photo.
  check            Static checks: em dash, PhD spelling, captions versus files, version strings, sizes.
  test             Browser smoke test with Chromium (needs Playwright): errors, failed requests, overflow.
  serve            Serve the site on http://localhost:8799 for manual looking.

Requirements: Python 3 and Pillow. The test command also needs Playwright with Chromium.
"""
import os, sys, re, glob, json, argparse, datetime, subprocess, threading, functools
import http.server, socketserver

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GAL = os.path.join(ROOT, 'gallery')
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
PAGES = ['index', 'home', 'about', 'research', 'publications', 'workshops', 'gallery', 'contact']
PREFIXES = ['PhD', 'Conf', 'WORK', 'Meet', 'Event', 'Field', 'Visit', 'MSpace']
ID_RE = re.compile(r'^(%s)_(\d{3,})$' % '|'.join(PREFIXES))
EMDASH = chr(0x2014)
BAD_SPELLINGS = ['Ph' + '.D', 'P' + 'HD']          # the only accepted spelling is "PhD"
IMG_EXT = ('.jpg', '.jpeg', '.png', '.webp')


def run(script, *args):
    subprocess.run([sys.executable, os.path.join(HERE, script), *args], check=True)


# ---------------------------------------------------------------- build
def photo_ids():
    return {os.path.splitext(os.path.basename(f))[0] for f in glob.glob(os.path.join(GAL, '*'))
            if f.lower().endswith(IMG_EXT)}


def cmd_build(_a=None):
    # remove thumbnails whose photo no longer exists (after a rename or delete)
    ids = photo_ids()
    for t in glob.glob(os.path.join(GAL, 't', '*.webp')):
        if os.path.splitext(os.path.basename(t))[0] not in ids:
            os.remove(t); print('removed stale thumbnail', os.path.basename(t))
    run('build_i18n.py')       # i18n.js from translations*.py
    run('build_gallery.py')    # thumbnails and manifest.json
    run('build_pages.py')      # HTML pages, Last Updated stamps (after the gallery files exist)


# ---------------------------------------------------------------- bump
def next_suffix(s):
    if not s: return 'a'
    d = list(s); i = len(d) - 1
    while i >= 0:
        if d[i] != 'z': d[i] = chr(ord(d[i]) + 1); return ''.join(d)
        d[i] = 'a'; i -= 1
    return 'a' + ''.join(d)


def cmd_bump(a):
    p = os.path.join(HERE, 'build_pages.py')
    s = open(p, encoding='utf-8').read()
    m = re.search(r'\?v=(\d{8})([a-z]*)', s)
    today = datetime.datetime.now(IST).strftime('%Y%m%d')
    new = (m.group(1) + next_suffix(m.group(2))) if m.group(1) >= today else today + 'a'
    s = re.sub(r'\?v=\d{8}[a-z]*', '?v=' + new, s)
    open(p, 'w', encoding='utf-8').write(s)
    print('version', m.group(1) + m.group(2), '->', new)
    cmd_build()


# ---------------------------------------------------------------- photos
def cmd_photos(a):
    from PIL import Image, ImageOps
    if not ID_RE.match(a.id):
        sys.exit('ID must look like MSpace_027 (prefix %s, then 3 or more digits)' % ', '.join(PREFIXES))
    os.makedirs(GAL, exist_ok=True)
    out = []
    for i, f in enumerate(a.files):
        name = a.id if a.single else '%s_%02d' % (a.id, a.start + i)
        if a.single and len(a.files) > 1: sys.exit('--single takes exactly one file')
        dst = os.path.join(GAL, name + '.JPG')
        if os.path.exists(dst) and not a.force:
            sys.exit('%s exists. Use --start to continue numbering, or --force to overwrite.' % os.path.basename(dst))
        im = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
        im.thumbnail((2000, 2000), Image.LANCZOS)
        im.save(dst, 'JPEG', quality=85, progressive=True, optimize=True)
        out.append((name, im.size, os.path.getsize(dst)))
    for n, sz, b in out: print('%-16s %dx%d  %d KB' % (n + '.JPG', sz[0], sz[1], b // 1024))
    print('\nNow add caption lines to gallery/captions.txt, for example:')
    if a.single: print('  %s | [YYYY-MM-DD] Caption' % a.id)
    else:
        print('  %s | [YYYY-MM-DD] Caption for the whole carousel' % a.id)
        print('  %s_%02d | Caption for one photo (optional)' % (a.id, a.start))
    print('Then run: python3 tools/site.py bump')


# ---------------------------------------------------------------- check
def read(p): return open(p, encoding='utf-8', errors='replace').read()


def cmd_check(_a=None):
    errs, warns = [], []
    texts = [os.path.join(ROOT, f + '.html') for f in PAGES] + [os.path.join(ROOT, f) for f in ('script.js', 'style.css', 'i18n.js', 'README.md')]
    texts += [os.path.join(GAL, 'captions.txt')] + glob.glob(os.path.join(HERE, '*.py')) + glob.glob(os.path.join(HERE, '*.md'))
    for p in texts:
        if not os.path.exists(p):
            if p.endswith('README.md'): continue
            errs.append('missing file: ' + os.path.relpath(p, ROOT)); continue
        t = read(p); rel = os.path.relpath(p, ROOT)
        if EMDASH in t: errs.append('%s: %d em dash character(s)' % (rel, t.count(EMDASH)))
        for bad in BAD_SPELLINGS:
            if bad in t: errs.append('%s: contains "%s" (write PhD)' % (rel, bad))
        if rel.endswith(('.html', 'script.js')) and re.search(r'facebook\.com|instagram\.com', t): errs.append(rel + ': Facebook or Instagram link')
    # version strings
    vers = set()
    for f in PAGES:
        p = os.path.join(ROOT, f + '.html')
        if os.path.exists(p):
            t = read(p); vers |= set(re.findall(r'(?:style\.css|script\.js|i18n\.js)\?v=([0-9a-z]+)', t))
            if 'name="last-updated"' not in t: errs.append(f + '.html: no last-updated meta (run build)')
    if len(vers) != 1: errs.append('version strings differ or missing in the pages: %s (run bump)' % sorted(vers))
    # gallery
    cap = os.path.join(GAL, 'captions.txt')
    lines = {}
    if os.path.exists(cap):
        for n, l in enumerate(read(cap).splitlines(), 1):
            if not l.strip() or l.lstrip().startswith('#') or '|' not in l: continue
            k, v = l.split('|', 1); k, v = k.strip(), v.strip(); lines[k] = v
            if v.startswith('['):
                if not re.match(r'^\[\d{4}-\d{2}(-\d{2})?\]', v): errs.append('captions.txt line %d: bad date, use [YYYY-MM] or [YYYY-MM-DD]' % n)
    photos = {}
    for f in glob.glob(os.path.join(GAL, '*')):
        if not f.lower().endswith(IMG_EXT): continue
        n = os.path.splitext(os.path.basename(f))[0]
        m = re.match(r'^((?:%s)_\d{3,})(?:_(\d{2}))?$' % '|'.join(PREFIXES), n)
        if not m: warns.append('gallery file with an unexpected name: ' + os.path.basename(f)); continue
        photos.setdefault(m.group(1), []).append(int(m.group(2)) if m.group(2) else 0)
        try:
            from PIL import Image
            w, h = Image.open(f).size
            if max(w, h) > 2000 or os.path.getsize(f) > 1_800_000: warns.append('%s is large (%dx%d, %d KB): resize with the photos command' % (os.path.basename(f), w, h, os.path.getsize(f) // 1024))
        except Exception as e:
            errs.append('cannot read %s: %s' % (os.path.basename(f), e))
        if not os.path.exists(os.path.join(GAL, 't', n + '.webp')): warns.append('no thumbnail for %s (run build)' % n)
    for base, nums in sorted(photos.items()):
        if base not in lines: warns.append('%s has photos but no caption line, so it will not show' % base)
        ns = sorted(x for x in nums if x)
        if ns and ns != list(range(1, len(ns) + 1)): errs.append('%s: photo numbers have a gap or do not start at 01: %s' % (base, ns))
        if ns and 0 in nums: errs.append('%s: both a single photo and a numbered carousel exist' % base)
        if ns and len(ns) > 40: errs.append('%s: more than 40 photos (limit in script.js, MAXG)' % base)
    for k in lines:
        m = re.match(r'^(.*)_(\d{2})$', k)
        if m and ID_RE.match(m.group(1)) and (m.group(1) not in photos or int(m.group(2)) not in photos[m.group(1)]):
            warns.append('caption %s has no matching photo' % k)
    for w in warns: print('warning:', w)
    for e in errs: print('ERROR:  ', e)
    print('check finished: %d error(s), %d warning(s)' % (len(errs), len(warns)))
    return 1 if errs else 0


# ---------------------------------------------------------------- serve and test
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


def start_server(port):
    class Srv(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        daemon_threads = True
        def handle_error(self, request, client_address): pass   # browsers abort requests; ignore broken pipes
    handler = functools.partial(Quiet, directory=ROOT)
    srv = Srv(('127.0.0.1', port), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def cmd_serve(a):
    start_server(a.port); print('serving %s at http://localhost:%d  (Ctrl+C to stop)' % (ROOT, a.port))
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        pass


def cmd_test(a):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit('Playwright is not installed: pip install playwright && playwright install chromium')
    port = a.port; start_server(port); base = 'http://localhost:%d/' % port
    widths = [int(x) for x in a.widths.split(',')]
    bad = 0
    if a.shots: os.makedirs(a.shots, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name in PAGES:
            for w in widths:
                ctx = b.new_context(viewport={'width': w, 'height': 900})
                ctx.add_init_script("try{sessionStorage.setItem('v','1');localStorage.setItem('thint','1')}catch(e){}")  # skip boot screen and hint
                pg = ctx.new_page(); errs = []; notes = []
                pg.on('pageerror', lambda e: errs.append('js error: %s' % e))
                pg.on('console', lambda m: errs.append('console error: %s' % m.text) if m.type == 'error' and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
                def resp(r):
                    if r.status >= 400:
                        (errs if r.url.startswith(base) else notes).append('HTTP %d %s' % (r.status, r.url))
                pg.on('response', resp)
                pg.goto(base + name + '.html'); pg.wait_for_timeout(a.wait)
                ov = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
                if ov > 1: errs.append('horizontal overflow of %d px' % ov)
                if name == 'gallery' and not pg.evaluate("document.querySelectorAll('.gi').length"): errs.append('gallery shows no photos')
                if not pg.evaluate("!!document.querySelector('.copy .upd') && document.querySelector('.copy .upd').textContent.length > 10"): errs.append('footer Last Updated line missing')
                if a.shots: pg.screenshot(path=os.path.join(a.shots, '%s_%d.png' % (name, w)))
                print('%-13s %4d px  %s' % (name, w, 'ok' if not errs else 'FAIL'))
                for e in errs: print('    ', e)
                for n in notes[:3]: print('     note:', n)
                bad += bool(errs); ctx.close()
        b.close()
    print('test finished: %d failing page/width combination(s)' % bad)
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('build').set_defaults(f=cmd_build)
    sub.add_parser('bump').set_defaults(f=cmd_bump)
    ph = sub.add_parser('photos'); ph.set_defaults(f=cmd_photos)
    ph.add_argument('id'); ph.add_argument('files', nargs='+')
    ph.add_argument('--single', action='store_true', help='one photo named ID.JPG, not a carousel')
    ph.add_argument('--start', type=int, default=1, help='first carousel number (to append to an existing carousel)')
    ph.add_argument('--force', action='store_true', help='overwrite existing files')
    sub.add_parser('check').set_defaults(f=cmd_check)
    t = sub.add_parser('test'); t.set_defaults(f=cmd_test)
    t.add_argument('--port', type=int, default=8799); t.add_argument('--widths', default='1440,768,390,320')
    t.add_argument('--wait', type=int, default=2500, help='milliseconds to wait after load'); t.add_argument('--shots', help='folder for screenshots')
    s = sub.add_parser('serve'); s.set_defaults(f=cmd_serve); s.add_argument('--port', type=int, default=8799)
    a = ap.parse_args()
    sys.exit(a.f(a) or 0)


if __name__ == '__main__':
    main()
