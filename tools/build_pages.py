import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)   # the repository root: the published site lives here
OUT = ROOT
NAME = 'Anandu P.'
FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='o' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23ff9a1f'/%3E%3Cstop offset='1' stop-color='%23e8310f'/%3E%3C/linearGradient%3E%3ClinearGradient id='i' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23ffe76a'/%3E%3Cstop offset='1' stop-color='%23ffa400'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23o)' d='M16 1.5C17 7 22.5 9.5 24 15.5C25.5 21.5 21.8 29.5 16 30C10 30 6.3 24.6 7.8 18.6C8.4 16.2 9.8 14.6 11 12.4C12 15 13.2 15.9 14.3 15.6C15.5 12.4 14 6 16 1.5Z'/%3E%3Cpath fill='url(%23i)' d='M16.6 16.2C17.6 19.2 20.2 20.8 20 24.2C19.8 26.8 18.2 28.4 16 28.4C13.5 28.4 12 26.3 12.5 23.8C12.9 22 14.4 21.2 15.1 19.4C15.5 18.4 16.2 17.6 16.6 16.2Z'/%3E%3C/svg%3E"
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&family=Noto+Sans+Arabic:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Malayalam:wght@400;600;700&display=swap">')

import hashlib, json, re, datetime
STAMPS = os.path.join(HERE, 'page_stamps.json')
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
def stamp(file, html):
    """Last-updated time of one page (IST). It changes when the page's own content changes, or when the shared header, footer or menu text in script.js changes (that shows on every page). Styling, behaviour code and translations do not count. The hash ignores the cache-busting ?v= strings, and the gallery page also hashes its captions and photo list."""
    h = re.sub(r'\?v=[0-9a-z]+', '', html)
    if file == 'gallery.html':
        for extra in ('captions.txt', 'manifest.json'):
            try: h += open(os.path.join(ROOT, 'gallery', extra), encoding='utf-8').read()
            except OSError: pass
    # Header, footer, menu and social buttons are written by script.js. The parts between "@stamp" and "@endstamp" comments count for every page:
    # change one letter there and every page gets a new time. Styling, behaviour code and translations do not count.
    try:
        js = open(os.path.join(ROOT, 'script.js'), encoding='utf-8').read()
        parts = re.findall(r'/\* @stamp[^*]*\*/(.*?)/\* @endstamp \*/', js, flags=re.S)
        h += ''.join(parts) if parts else re.sub(r'/\* @pagestamp.*?@endpagestamp \*/', '', js, flags=re.S)
        # Code that belongs to one page (its gallery, photo viewer or appointment picker) counts only for that page: /* @pagestamp gallery.html */ ... /* @endpagestamp */
        for nm, body in re.findall(r'/\* @pagestamp ([\w.]+) \*/(.*?)/\* @endpagestamp \*/', js, flags=re.S):
            if nm == file: h += body
        # The same markers in style.css: look and layout of one page's own parts count for that page only.
        try:
            css = open(os.path.join(ROOT, 'style.css'), encoding='utf-8').read()
            for nm, body in re.findall(r'/\* @pagestamp ([\w.]+) \*/(.*?)/\* @endpagestamp \*/', css, flags=re.S):
                if nm == file: h += body
        except OSError: pass
    except OSError: pass
    digest = hashlib.sha256(h.encode('utf-8')).hexdigest()
    try: db = json.load(open(STAMPS))
    except (OSError, ValueError): db = {}
    cur = db.get(file)
    if not cur or cur.get('h') != digest:
        now = datetime.datetime.now(IST)
        cur = {'h': digest, 't': now.strftime('%d-%B-%Y|%H:%M:%S')}
        db[file] = cur; json.dump(db, open(STAMPS, 'w'), indent=1)
    return cur['t']

LITE = True   # True = only the pages in LIVE_PAGES are built as real pages; every other page becomes a tiny static notice. Set False and run build to restore.
LIVE_PAGES = ('home.html', 'index.html', 'about.html', 'research.html', 'publications.html', 'workshops.html', 'contact.html', 'gallery.html')


def page(file, pid, title, desc, body, html_class=''):
    if LITE and file not in LIVE_PAGES:
        stub = ('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
                '<meta name="robots" content="noindex"><title>Anandu P.</title></head>'
                '<body style="margin:0;background:#0c0a09;color:#f4efe9;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">'
                '<div><h1 style="font-weight:600;font-size:1.6rem;margin:0 0 10px">This page is temporarily unavailable</h1>'
                '<p style="color:#b9b0a6;margin:0 0 22px">Please visit the home page.</p>'
                '<a href="home.html" style="color:#e8a33d">Go to home</a></div></body></html>')
        with open(os.path.join(OUT, file), 'w', encoding='utf-8') as f:
            f.write(stub)
        return
    cls = f' class="{html_class}"' if html_class else ''
    html = f'''<!DOCTYPE html>
<html lang="en" data-theme="dark"{cls}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0c0a09">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="last-updated" content="@@UPD@@">
<script>try{{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t;var z=localStorage.getItem('fs');if(z)document.documentElement.style.fontSize=z+'%';var l=localStorage.getItem('lang');if(l){{document.documentElement.lang=l;if(l==='ar')document.documentElement.dir='rtl'}}}}catch(e){{}}</script>
<link rel="icon" href="{FAVICON}">
{FONTS}
<link rel="stylesheet" href="style.css?v=20261030u">
</head>
<body data-page="{pid}">
<main>
{body}
</main>
<noscript><p style="padding:20px">This site uses JavaScript for navigation and animation. Pages: index.html, about.html, research.html, publications.html, workshops.html, gallery.html, contact.html.</p></noscript>
<script src="i18n.js?v=20261030u"></script>
<script src="script.js?v=20261030u"></script>
</body>
</html>
'''
    html = html.replace('@@UPD@@', stamp(file, html))
    with open(os.path.join(OUT, file), 'w', encoding='utf-8') as f:
        f.write(html)


def phero(num, h1, lead, tag):
    return f'''<header class="phero">
  <canvas class="contours" aria-hidden="true"></canvas>
  <div class="wrap">
    <div class="eyebrow fade"><span class="n">{num}</span></div>
    <h1 class="hero-split" data-split>{h1}</h1>
    <p class="lead fade" style="--d:350">{lead}</p>
  </div>
  <div class="tag" aria-hidden="true">{tag}</div>
</header>'''

PH = lambda n: f'https://picsum.photos/seed/{n}'
def sec(inner, cls='sec'):
    return f'<section class="{cls}"><div class="wrap">{inner}</div></section>'
def shead(n, label, h2, lead):
    return f'<div class="shead"><div><div class="eyebrow reveal{' nocaps' if 'PhD' in label else ''}"><span class="n">{n}</span> {label}</div><h2 data-split>{h2}</h2></div>{f'<p class="lead reveal">{lead}</p>' if lead else ''}</div>'
NO = ' translate="no"'

# ---------------------------------------------------------------- HOME
ill_coupled = '''<svg class="ill" viewBox="0 0 320 200" aria-hidden="true">
  <path class="ax" d="M20 170 H300 M20 170 V20"/>
  <g class="vec">''' + ''.join(f'<path d="M{30+i*40} {150-j*34} q18 -{8+j*3} 30 -{2+j*2}"/>' for i in range(7) for j in range(3) if (i+j)%2==0) + '''</g>
  <path class="front" d="M60 168 C 100 130, 140 150, 180 100 S 250 70, 290 40"/>
  <ellipse class="heat" cx="210" cy="84" rx="38" ry="22"/>
  <text x="26" y="16">z</text><text x="292" y="184">x</text>
</svg>'''
ill_fwi = '''<svg class="ill" viewBox="0 0 320 200" aria-hidden="true">
  <path class="rowline" d="M20 60H300M20 100H300M20 140H300"/><path class="ax" d="M20 170H300M20 170V20"/>
  <g class="wipe"><path class="s1" d="M24 150 C70 140 100 110 140 105 S 220 70 296 52"/><path class="s2" d="M24 156 C80 130 120 128 160 96 S 240 80 296 70"/><path class="s3" d="M24 160 C80 150 130 140 180 120 S 250 100 296 92"/></g>
  <rect class="mk c" style="--i:0" x="136" y="101" width="9" height="9"/><circle class="mk s" style="--i:1" cx="160" cy="96" r="5"/>
  <path class="mk t" style="--i:2" d="M180 114 l6 10 h-12 z"/><path class="mk dm" style="--i:3" d="M230 76 l6 6 -6 6 -6 -6 z"/>
  <text x="26" y="16">FWI</text>
</svg>'''
ill_cmip = '''<svg class="ill" viewBox="0 0 320 200" aria-hidden="true">
  <path class="rowline" d="M20 60H300M20 100H300M20 140H300"/><path class="ax" d="M20 170H300M20 170V20"/>
  <g class="wipe"><path class="band" d="M150 112 L300 40 L300 110 L150 124 Z"/><path class="s1" d="M24 130 C70 120 110 126 150 118 L296 76"/><path class="s2" d="M150 118 L296 100"/></g>
  <line class="ax" x1="150" y1="22" x2="150" y2="170" stroke-dasharray="3 4"/>
  <text x="154" y="30">projection</text><text x="26" y="16">T</text>
  <circle class="mk c" style="--i:0" cx="150" cy="118" r="5"/>
</svg>'''
cards = [('01', 'Coupled fire-atmosphere modelling', 'WRF-SFIRE simulations of fire spread under Himalayan terrain and weather.', ill_coupled),
         ('02', 'Fire weather index over the Northwest Himalaya', 'Numerical weather prediction based assessment of fire weather conditions over the forests of the Indian Himalayan Region.', ill_fwi),
         ('03', 'Climate projections', 'CMIP6 scenarios used to estimate future fire-weather conditions.', ill_cmip)]
fc = ''.join(f'<article class="fcard reveal"><div class="art">{a}</div><div class="body"><span class="no">{n}</span><h3>{t}</h3><p>{d}</p></div></article>' for n, t, d, a in cards)
INTERESTS = ['Forest fire modelling', 'Numerical weather prediction model', 'Fire weather severity and indices', 'Weather and climate change induced disasters']
chips = '<ul class="chips reveal">' + ''.join(f'<li>{i}</li>' for i in INTERESTS) + '</ul>'

cartouche = '''<div class="cartouche" aria-hidden="true">
  <svg class="north" width="30" height="42" viewBox="0 0 30 42"><path d="M15 2 L24 34 L15 28 L6 34 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M15 2 L15 28 L6 34 Z" fill="currentColor"/><text x="15" y="42" text-anchor="middle" font-size="9" fill="currentColor" font-family="monospace">N</text></svg>
  <svg width="130" height="32" viewBox="0 0 130 32"><rect x="1" y="12" width="32" height="6" fill="currentColor"/><rect x="33" y="12" width="32" height="6" fill="none" stroke="currentColor"/><rect x="65" y="12" width="32" height="6" fill="currentColor"/><rect x="97" y="12" width="32" height="6" fill="none" stroke="currentColor"/>
  <text x="1" y="28" font-size="9" fill="currentColor" font-family="monospace">0</text><text x="65" y="28" font-size="9" fill="currentColor" font-family="monospace" text-anchor="middle">50</text><text x="129" y="28" font-size="9" fill="currentColor" font-family="monospace" text-anchor="end">100 km</text></svg>
</div>'''

mets = ''.join(f'<div class="metric reveal"><b data-count="{v}">0</b><span>{l}</span></div>' for v, l in [(9, 'Workshops and lectures'), (5, 'Conference presentations'), (2, 'Journal articles published'), (2023, 'PMRF fellow since')])

LOADER = '''<div id="loader" aria-hidden="true">
  <div class="panel top"></div><div class="panel bottom"></div>
  <div class="l-content"><div class="term" aria-hidden="true"><div class="tbar"><i></i><i></i><i></i><span>anandu.forest.fire</span></div><div class="tbody"><div id="term-out"></div><div class="tprog"><span id="l-bar">[                    ]</span> <span id="l-pct">000%</span></div></div></div></div>
</div>'''
LOADER = '' if LITE else LOADER.replace('{{','{').replace('}}','}')
home = f'''{LOADER}

<section class="hero">
  <canvas class="contours" data-contours="hero" aria-hidden="true"></canvas>
  <div class="grat" aria-hidden="true"></div><div class="scan" aria-hidden="true"></div><div class="vig" aria-hidden="true"></div>
  <div class="wrap hero-inner">
    <div class="eyebrow fade"><span class="n nocaps">PhD scholar</span> <span class="keep" translate="no">CoEDMM, IIT Roorkee</span></div>
    <h1 class="hero-split" data-split data-hl="4">Forest fire early warning for the Himalaya</h1>
    <p class="lead fade" style="--d:450">Coupled fire-atmosphere modelling, fire weather indices and climate projections for the Indian Himalayan Region.</p>
    <div class="cta-row fade" style="--d:650">
      <a class="btn" href="research.html" data-cursor="Open">See the research <span data-icon="arrow"></span></a>
      <a class="btn ghost" href="contact.html">Get in touch</a>
    </div>
    <dl class="focus-dl fade" style="--d:850">
      <div><dt>Model</dt><dd>WRF-SFIRE</dd></div>
      <div><dt>Index</dt><dd>Fire Weather Index</dd></div>
      <div><dt>Scenarios</dt><dd>CMIP6</dd></div>
    </dl>
  </div>
  {cartouche}
  <div class="readout" aria-hidden="true">LAT <b id="ro-lat">30.00&deg;N</b><br>LON <b id="ro-lon">79.00&deg;E</b></div>
</section>

<div class="ticker" aria-hidden="true"><div class="track" data-items="WRF-SFIRE|Fire Weather Index|CMIP6|Himalaya|Early warning|Fire-atmosphere coupling"></div></div>

{sec(shead('01', 'Research focus', 'Three lines of work', 'Current focus of the PhD work. The illustrations are schematic, not data.') + f'<div class="focus-grid">{fc}</div><h3 class="sub-h reveal">Research interests</h3>{chips}')}

{sec(shead('02', 'At a glance', 'Work so far', '') + f'<div class="metrics">{mets}</div>', 'sec alt')}

{sec(shead('03', 'Pages', 'Explore the site', 'Each section is its own page, with a short transition between them.') + '<div data-rows></div>')}
'''
page('index.html', 'home', f'{NAME} | Forest fire early warning', 'Portfolio of research on forest fire early warning in the Indian Himalayan Region.', home, '' if LITE else 'locked')

# ---------------------------------------------------------------- ABOUT
dl_about = f'''<dl class="dl">
  <div class="dl-row reveal"><dt>Position</dt><dd>PhD researcher, <span translate="no">CoEDMM, IIT Roorkee</span></dd></div>
  <div class="dl-row reveal"><dt>Fellowship</dt><dd>Prime Minister's Research Fellowship (PMRF) since January 2023. MoE JRF fellow from July to December 2022. Raman-Charpak fellow from July to December 2025.</dd></div>
  <div class="dl-row reveal"><dt>Scholarship</dt><dd>INSPIRE-SHE Scholarship, Department of Science and Technology, 2015 to 2020.</dd></div>
  <div class="dl-row reveal"><dt>Education</dt><dd><span translate="no">BS-MS in Geological Sciences, IISER Kolkata</span></dd></div>
  <div class="dl-row reveal"><dt>Supervisor</dt><dd><a href="https://www.weatherxplorers.com/piyush-srivastava" target="_blank" rel="noopener noreferrer" translate="no">Prof. Piyush Srivastava</a><span translate="no">, Assistant Professor, Centre of Excellence in Disaster Mitigation &amp; Management, Indian Institute of Technology Roorkee</span></dd></div>
  <div class="dl-row reveal"><dt>Email</dt><dd><a href="mailto:anandu_p@dm.iitr.ac.in" translate="no">anandu_p@dm.iitr.ac.in</a><button class="cpy" type="button" data-copy="anandu_p@dm.iitr.ac.in" data-msg="Email address copied"></button></dd></div>
</dl>'''
tl_items = ''.join(f'<div class="t-item"><div class="yr">{y}</div><div><h3>{t}</h3><p>{d}</p></div></div>' for y, t, d in [
    ('2015', 'INSPIRE-SHE scholar', 'Scholarship from the Department of Science and Technology, 2015 to 2020.'),
    ('2022', 'MoE JRF fellow', 'July to December 2022.'),
    ('2023', 'PMRF fellow', 'PhD researcher at CoEDMM, IIT Roorkee, supported by the PMRF since January 2023.'),
    ('2025', 'Raman-Charpak fellow', 'July to December 2025.')])

def rows(items):
    out = []
    for dt, title, desc, link in items:
        t = f'<a href="{link}" target="_blank" rel="noopener noreferrer" translate="no">{title}</a>' if link and not title.startswith('~') else (title[1:] if title.startswith('~') else f'<span translate="no">{title}</span>')
        d = f'<br><span>{desc}</span>' if desc else ''
        out.append(f'<div class="dl-row reveal"><dt>{dt}</dt><dd><b>{t}</b>{d}</dd></div>')
    return '<dl class="dl">' + ''.join(out) + '</dl>'
edu = rows([
    ('2022 - present', '~PhD in Disaster Mitigation and Management', '<span translate="no">Centre of Excellence in Disaster Mitigation and Management, Indian Institute of Technology Roorkee</span>', None),
    ('2015 - 2020', '~BS-MS Dual Degree in Geological Sciences', '<span translate="no">Indian Institute of Science Education and Research Kolkata</span>', None),
    ('2013 - 2015', '~Higher Secondary Education', '<span translate="no">Sivaram NSS HSS, Karicode, Kollam, Kerala</span>', None)])
rexp = rows([
    ('2022 - present', 'Weather and Climate Research Group, IIT Roorkee', 'Modelling and Analysis of Atmospheric Conditions Conducive to the Spread of Wildfires over Mountainous Region in India.', None),
    ('2025', 'CEFE-CNRS, Montpellier', 'Fire weather indices over the Mediterranean and the Indian Himalayas, July to December 2025.', None),
    ('2024', 'Workshop on Data Assimilation in Weather and Climate models', 'Two-week training workshop attended, 6 to 17 May 2024, ICTS Bengaluru.', 'https://www.icts.res.in/program/da_workshop'),
    ('Final year', 'ACARR, CUSAT', 'Final year project on the increasing frequency of cyclonic storms over the Arabian Sea.', None),
    ('Summer 2017', 'CGMLI, IISER Bhopal', 'Impact of heatwaves in Indian metropolitan cities, under Dr. Pankaj Kumar.', None),
    ('Summer 2016', 'ACARR, CUSAT', 'Planetary boundary layer over the Gateway of the Indian Monsoon in Cochin, under Prof. K. Mohankumar and Dr. M. G. Manoj.', None)])
honours = rows([
    ('2025', 'Raman-Charpak Fellowship', 'Fellowship for India-France research collaboration, July to December 2025.', None),
    ('2022', "Prime Minister's Research Fellowship (PMRF)", 'Cycle 10, December 2022, lateral entry.', 'https://www.pmrf.in/'),
    ('2022', 'MoE JRF', 'Junior research fellowship for doctoral research, July to December 2022.', None),
    ('2015 - 2020', 'INSPIRE-SHE Scholarship', 'Scholarship awarded by the Department of Science and Technology, 2015 to 2020.', 'https://online-inspire.gov.in/')])
achv = rows([
    ('2024', 'UGC-NET in Disaster Mitigation and Management', None, None),
    ('2022', 'Graduate Aptitude Test in Engineering (GATE), Geology', None, None),
    ('2022', 'Kerala State Eligibility Test (KSET), Geology, January 2022', None, None)])
work = rows([
    ('2020 - 2022', '~Chegg Q&amp;A expert in Earth Sciences', 'Part-time. Answered Earth science questions from students.', None),
    ('2020 - 2022', '~Course Hero tutor in Earth Sciences', 'Part-time. Tutored students in Earth science courses.', None)])
about = phero('01 / About me', 'About me', 'PhD researcher working on forest fire early warning and numerical weather prediction.', 'PROFILE').replace('</header>', '''<figure class="portrait" aria-label="Portrait"><img src="img/anandu-prabhakaran.jpg" width="1122" height="1292" alt="Anandu Prabhakaran presenting his research at CoEDMM, IIT Roorkee" decoding="async" fetchpriority="high"></figure></header>''', 1) + sec(f'''
<div class="two">
  <div class="bio">
    <div class="eyebrow reveal"><span class="n">01</span> Bio</div>
    <img class="portrait-m" src="img/anandu-prabhakaran.jpg" width="1122" height="1292" alt="" loading="lazy" decoding="async">
    <h2 data-split>Research in a few lines</h2>
    <p class="reveal">I am a PhD researcher at the Centre of Excellence in Disaster Mitigation and Management (CoEDMM), Indian Institute of Technology Roorkee. My PhD thesis is titled <span translate="no">&ldquo;Modelling and Analysis of Atmospheric Conditions Conducive to the Spread of Wildfires over Mountainous Region in India&rdquo;</span>.</p>
    <p class="reveal">The work combines numerical weather prediction models with observational and reanalysis datasets. I also work on tropical cyclones and on disasters induced by climate change.</p>
    <p class="reveal">I was born and raised in Kollam district, Kerala.</p>
    <p class="reveal">As part of my PMRF deliverables and science communication, I conduct and organise workshops, science communication lectures and other lectures at universities and colleges across India. The topics include the application of numerical weather prediction models, including the WRF model, followed by programming and data analysis with Python, R and Origin Pro, disaster mitigation and management, climate change, and wildfire spread and analysis using geospatial and other computational tools.</p>
    <div class="bio-int reveal"><span class="lbl">Interests</span>{chips}</div>
    <div class="socials reveal" data-socials></div>
  </div>
  <div>{dl_about}</div>
</div>''') + sec(shead('02', 'Milestones', 'Fellowships and scholarships', 'In chronological order.') + f'<div class="tl" id="tl"><div class="tl-line"><i class="tl-fill" id="tl-fill"></i></div>{tl_items}</div>', 'sec alt')
about += sec(shead('03', 'Education', 'Academic background', 'Degrees, most recent first.') + edu)
about += sec(shead('04', 'Experience', 'Research experience', 'Research projects and internships.') + rexp, 'sec alt')
about += sec(shead('05', 'Recognition', 'Honours and awards', 'Fellowships and scholarships held.') + honours)
about += sec(shead('06', 'Achievements', 'Qualifying examinations', 'National and state eligibility tests cleared.') + achv, 'sec alt')
members = rows([
    ('Member', 'American Geophysical Union (AGU)', 'International scientific society for Earth and space sciences.', 'https://www.agu.org/'),
    ('Member', 'International Association of Wildland Fire (IAWF)', 'Worldwide membership association of wildland fire specialists.', 'https://www.iawfonline.org/'),
    ('Member', 'Association for Fire Ecology (AFE)', 'Professional association for fire ecology and fire science.', 'https://fireecology.org/')])
about += sec(shead('07', 'Memberships', 'Professional memberships', 'Scientific societies I belong to.') + members)
about += sec(shead('08', 'Work', 'Work experience', 'Part-time online roles, 2020 to 2022.') + work, 'sec alt')
page('about.html', 'about', f'About me | {NAME}', 'About the researcher: position, education and research interests.', about)

# ---------------------------------------------------------------- RESEARCH
def ol(items): return '<ol class="ol">' + ''.join(f'<li>{i}</li>' for i in items) + '</ol>'
research = phero('02 / Research', 'Research', 'PhD thesis, M.Sc. thesis and summer internships, with objectives and supervisors.', 'THESES AND INTERNSHIPS') + sec(shead('01', 'PhD thesis', 'Wildfire spread over mountainous India', 'Ongoing at CoEDMM, IIT Roorkee.') + f'''
<div class="rgrid"><article class="rcard big reveal"><span class="badge nocaps"><i></i>PhD thesis</span>
  <h3 translate="no">Modelling and Analysis of Atmospheric Conditions Conducive to the Spread of Wildfires over Mountainous Region in India</h3>
  <p>The thesis combines numerical weather prediction models with observational and reanalysis datasets.</p>
  <p class="who"><a href="https://www.weatherxplorers.com/piyush-srivastava" target="_blank" rel="noopener noreferrer" translate="no">Prof. Piyush Srivastava</a><span translate="no">, Assistant Professor, Centre of Excellence in Disaster Mitigation &amp; Management, Indian Institute of Technology Roorkee</span></p></article></div>
<h3 class="sub-h reveal">Current focus</h3><div class="focus-grid">{fc}</div>''') + sec(shead('02', 'M.Sc. thesis', 'Cyclonic storms over the Arabian Sea', 'Master thesis at IISER Kolkata.') + f'''
<div class="rgrid"><article class="rcard big reveal"><span class="badge alt"><i class="d"></i>M.Sc. thesis</span>
  <h3 translate="no">Investigation on the increased frequency of cyclonic storms over Arabian Sea (1982-2019)</h3>
  <h4>Objectives</h4>{ol(['Vorticity and divergence analysis during cyclonic days.', 'Study of sea surface temperature, wind shear and accumulated cyclone energy.', 'Synoptic analysis of the genesis potential parameter along the cyclone track.', 'Future projection of cyclonic storms over the Arabian Sea and prediction of their severity.', 'Analysis of path speed, CI number and central pressure of cyclones, with their future projection.'])}
  <p class="who" translate="no"><b>Dr. M.G. Manoj</b>, Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India<br><b>Dr. Sayantan Sarkar</b>, Associate Professor, School of Civil and Environmental Engineering, IIT Mandi (at IISER Kolkata during the thesis)</p></article></div>''', 'sec alt') + sec(shead('03', 'Summer internships', 'Two internships', 'Short research projects during the M.Sc. programme.') + f'''
<div class="rgrid">
<article class="rcard reveal"><span class="badge"><i class="c"></i>Internship</span>
  <h3 translate="no">Heat wave analysis over different parts of India and its effect on human mortality</h3>
  <h4>Objectives</h4>{ol(['Trend analysis of temperature over the mega cities of India.', 'Temperature and mortality correlation, and projection of mortality due to global warming.'])}
  <p class="who" translate="no">Dr. Pankaj Kumar, Assistant Professor, IISER Bhopal</p></article>
<article class="rcard reveal"><span class="badge"><i class="c"></i>Internship</span>
  <h3 translate="no">Black body radiation and determination of Planetary Boundary Layer over the gateway of Indian Monsoon</h3>
  <h4>Objectives</h4>{ol(['Black-body radiation studies to determine the temperature rise associated with the monsoon.', 'PBL determination over the Cochin region to reduce health risk and pollution.'])}
  <p class="who" translate="no">Dr. M.G. Manoj, Scientist-D, ACARR, CUSAT, Kalamassery, Cochin, Kerala, India</p></article>
</div>''')
page('research.html', 'research', f'Research | {NAME}', 'Research: PhD thesis, M.Sc. thesis and summer internships.', research)

# ---------------------------------------------------------------- PUBLICATIONS
def pub(year, status, title, au, venue, doi=None):
    y = f'<div class="yr">{year}</div>' if year else f'<div class="yr">&mdash;<small>{status}</small></div>'
    y = y.replace('&mdash;', '')
    if year and status: y = f'<div class="yr">{year}<small>{status}</small></div>'
    act = f'<div class="act"><a class="btn ghost sm2" href="{doi}" target="_blank" rel="noopener noreferrer" data-cursor="Open">DOI <span data-icon="up"></span></a></div>' if doi else '<div class="act"></div>'
    return f'<article class="pub reveal">{y}<div><h3 translate="no">{title}</h3><p class="au" translate="no">{au}</p><p class="ve" translate="no">{venue}</p></div>{act}</article>'
ME = '<b>Prabhakaran, A.</b>'
journal = ''.join([
  pub('2026', '', 'Impact of El Niño Southern Oscillation and Indian ocean dipole on wildfire across the Indian forests.', f'{ME} &amp; Srivastava, P.', 'Natural Hazards, 122, 146.', 'https://doi.org/10.1007/s11069-025-07937-2'),
  pub('2026', 'Under review', 'A Numerical Weather Prediction Model-Based Approach to Assess Fire Weather Conditions over the Northwest Himalayan Forests.', f'{ME} &amp; Srivastava, P.', 'EGUsphere [preprint], egusphere-2026-2474. Received 29 April 2026; discussion started 6 July 2026. Not yet peer reviewed or published.', 'https://doi.org/10.5194/egusphere-2026-2474'),
  pub('2024', '', 'Analysis of prevailing atmospheric conditions during wildfire events in the Indian Himalayan region.', f'{ME} &amp; Srivastava, P.', 'Quarterly Journal of the Royal Meteorological Society, pp. 1-15.', 'https://doi.org/10.1002/qj.4918')])
conf = ''.join([
  pub('2023', '', 'Analysis of Weather Patterns over the North Eastern Region of India During the Propagation of Cyclone Mocha.', f'{ME}, Srivastava, P. &amp; Sen, S.', 'American Geophysical Union Fall Meeting 2023, San Francisco, CA.'),
  pub('2023', '', 'General Overview of Global Forest Fires, Possible Causes, Outcome, and Existing Warning and Mitigation Methods in India.', f'{ME} &amp; Srivastava, P.', '13th International Conference of the International Society for the Integrated Disaster Risk Management, 28-30 September 2023, CoEDMM, IIT Roorkee.'),
  pub('2023', '', 'Atmospheric Conditions Conducive to Forest Fire Events in the Greater Himalayan Region.', f'{ME}, Srivastava, P. &amp; Pai, A.', 'EGU General Assembly 2023, Vienna, Austria, 24-28 April 2023, EGU23-1004.', 'https://doi.org/10.5194/egusphere-egu23-1004'),
  pub('2023', '', 'Atmospheric Conditions Conducive to Forest Fire Events in Uttarakhand.', f'{ME} &amp; Srivastava, P.', 'National Conference on Land-Atmosphere Interactions Controlling Weather &amp; Climate, NIT Rourkela, 9-12 January 2023.'),
  pub('2023', '', 'A Meteorological Perspective of the 6th August 2020 Kerala and the 7th February 2021 Uttarakhand Disasters.', f'Pai, A., Srivastava, P. &amp; {ME}', 'EGU General Assembly 2023, Vienna, Austria, 24-28 April 2023, EGU23-642.', 'https://doi.org/10.5194/egusphere-egu23-642')])
publications = phero('03 / Publications', 'Publications', 'Journal articles and conference presentations. Titles, authors and venues are shown as published.', 'PAPERS AND PRESENTATIONS') + sec(f'''
<div class="cta-row reveal" style="margin-bottom:10px"><a class="btn" href="https://scholar.google.com/citations?user=0PK5HxYAAAAJ&amp;hl=en" target="_blank" rel="noopener noreferrer" data-cursor="Open">Google Scholar profile <span data-icon="up"></span></a></div>
<h2 class="sub-h" data-split>Journal articles</h2><div class="pubs">{journal}</div>
<h2 class="sub-h" data-split>Conference presentations</h2><div class="pubs">{conf}</div>''')
page('publications.html', 'publications', f'Publications | {NAME}', 'Journal articles and conference presentations.', publications)

# ---------------------------------------------------------------- WORKSHOPS
import glob as _g, os as _o
def _full(f):
    m = _g.glob(_o.path.join(_o.path.dirname(_o.path.abspath(__file__)), '..', 'gallery', f + '.*'))
    m = [x for x in m if not x.endswith('.webp')]
    return _o.path.basename(m[0]) if m else f + '.JPG'

def wk(role, when, title, inst, place, mode=None, note=None, pics=None):
    glyph = {'Conducted': '<i></i>', 'Organised': '<i class="d"></i>', 'Attended': '<i class="o"></i>'}[role]
    m = f' <span class="badge alt">{mode}</span>' if mode else ''
    n = f'<p>{note}</p>' if note else ''
    pc = ('<div class="wk-pics">' + ''.join(f'<img src="gallery/t/{f}.webp" data-full="gallery/{_full(f)}" alt="{a}" loading="lazy" width="480" height="360" tabindex="0" role="button">' for f, a in pics) + '</div>') if pics else ''
    return f'<article class="wk reveal"><div class="when"><span class="badge">{glyph}{role}</span><span translate="no">{when}</span></div><div><h3 translate="no">{title}</h3><p translate="no"><b>{inst}</b></p><p translate="no">{place}</p>{(m and "<p>"+m+"</p>")}{n}{pc}</div></article>'
y2025 = wk('Conducted', '10-16 October 2025', 'Introduction to Numerical Weather Prediction Models and Weather Research and Forecasting Model as a tool for Extreme Event Analysis', 'College of Climate Change and Environmental Studies, Kerala Agricultural University', 'Vellanikkara, Thrissur, Kerala', 'Online') + \
        wk('Conducted', '03-07 February 2025', 'Introduction to Disaster Mitigation &amp; Management, Climate Change and California Wildfire Analysis', 'Department of Environmental Studies, Kannur University', 'Mangattuparamba Campus', 'Offline', None, [('WORK_002_01', 'Blackboard announcing the lecture series on climate change at Kannur University'), ('WORK_002_02', 'Classroom during the lecture series at Kannur University'), ('WORK_002_04', 'Lecture during the series at Kannur University')])
y2024 = wk('Conducted', '21-25 October 2024', 'Python Essentials: Foundations of Programming, Data Structures, and Analysis', 'Department of Environmental Sciences, School of Basic Sciences and Research, Sharda University', 'Greater Noida, Uttar Pradesh, India') + \
        wk('Conducted', '14-20 October 2024', 'System for Unprecedented Rainfall-induced Landslide Early Warning Techniques (SURE-ALERT), Day 02, Hands-on Session on WRF Model', 'Department of Earth and Environmental Sciences, Indian Institute of Science Education and Research (IISER) Mohali', 'Mohali, Punjab, India') + \
        wk('Conducted', '24-25 September 2024', 'Python Essentials: Foundations of Programming, Data Structures, and Analysis', 'School of Environmental Studies, Cochin University of Science and Technology (CUSAT)', 'Cochin, Kerala, India', None, None, [('WORK_009_01', 'Lecture hall during the Python Essentials workshop at CUSAT'), ('WORK_009_06', 'Presenting during the Python Essentials workshop at CUSAT'), ('WORK_009_04', 'Stage and lectern during the Python Essentials workshop at CUSAT')]) + \
        wk('Conducted', '31 January - 08 February 2024', 'R language and Origin Pro', 'School of Environmental Studies, CUSAT', 'Cochin, Kerala, India')
y2023 = wk('Conducted', '16-20 October 2023', 'Hands-on Workshop on Weather Prediction and Climate Model', 'Department of Architecture and Planning, IIT Roorkee', 'IIT Roorkee, Uttarakhand, India', None, 'Five-hour lecture with a hands-on session on the WRF model, organised and funded by the Department of Architecture and Planning under the project "Gender oriented adaptive transformation cross-learning for climate change and disaster risk resilience among India, Nepal, Sri Lanka, and Japan".') + \
        wk('Conducted', '7 August - 01 November 2023', 'Origin Pro &amp; PLAXIS 2D', 'Department of Civil Engineering, College of Engineering Roorkee', 'Haridwar, Uttarakhand, India') + \
        wk('Organised', '02-08 January 2023', 'FOREcaSting and Early-Warning of Extreme Events and Disasters (FORESEED) KARYASHALA Workshop on WRF', 'Centre of Excellence for Disaster Mitigation and Management (CoEDMM), IIT Roorkee', 'Roorkee, Uttarakhand, India')
att = wk('Attended', '', 'Workshop on Data Assimilation in Weather and Climate models', 'International Centre for Theoretical Sciences (ICTS)', 'Bengaluru, India')
workshops = phero('04 / Workshops', 'Workshops', 'Workshops and lectures handled, organised and attended. A square marks conducted, a diamond organised and a circle attended.', 'WORKSHOPS AND LECTURES') + sec(f'''
<div class="yh"><h3>2025</h3></div><div class="wks">{y2025}</div>
<div class="yh"><h3>2024</h3></div><div class="wks">{y2024}</div>
<div class="yh"><h3>2023</h3></div><div class="wks">{y2023}</div>
<div class="yh"><h3>Workshops attended</h3></div><div class="wks">{att}</div>''')
page('workshops.html', 'workshops', f'Workshops | {NAME}', 'Workshops and lectures handled, organised and attended.', workshops)

# ---------------------------------------------------------------- GALLERY
GL = 'Photographs from the PhD, conferences, workshops, meetings, fieldwork and other journeys.'
gallery = phero('05 / Gallery', 'Gallery', GL, 'PHOTOGRAPHS') + sec('''
<div class="seg reveal" role="group" aria-label="Filter photographs"><button aria-pressed="true" data-f="all">All</button><button aria-pressed="false" data-f="phd">PhD</button><button aria-pressed="false" data-f="conf">Conference</button><button aria-pressed="false" data-f="work">Workshops</button><button aria-pressed="false" data-f="meet">Meetings</button><button aria-pressed="false" data-f="events">Events</button><button aria-pressed="false" data-f="field">Field</button><button aria-pressed="false" data-f="visit">Visit</button><button aria-pressed="false" data-f="myspace">My Space</button></div>
<div class="gal" id="gallery"></div>
<p class="gal-empty" id="gal-empty" hidden>Photographs will appear here soon.</p>''') + '''
<div class="lightbox" id="lb" role="dialog" aria-modal="true" aria-label="Image viewer">
  <div class="lb-count" id="lb-count"></div>
  <button class="lb-like" id="lb-like" type="button" aria-pressed="false" aria-label="Like this photo"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.1C.9 8.6 2.6 5 6.1 5c2 0 3.3 1 3.9 2.1h.0C10.6 6 11.9 5 13.9 5c3.5 0 5.2 3.6 3.7 6.9C19.5 16.4 12 21 12 21z" transform="translate(1.1 0)"/></svg></button>
  <button class="lb-btn lb-close" id="lb-close" aria-label="Close" style="top:22px;transform:none">&times;</button>
  <button class="lb-btn lb-prev" id="lb-prev" aria-label="Previous">&#8249;</button>
  <img id="lb-img" alt="">
  <button class="lb-btn lb-next" id="lb-next" aria-label="Next">&#8250;</button>
  <p id="lb-cap"></p>
</div>'''
page('gallery.html', 'gallery', f'Gallery | {NAME}', GL, gallery)

# ---------------------------------------------------------------- CONTACT
import html as _h
CONTACT_URL = 'https://anandupiiserk.github.io/contact'
ADDR = ['Anandu Prabhakaran', 'DM12 Weather and Climate Research Lab', 'CoEDMM, Third Floor, New Bioscience Building', 'Indian Institute of Technology Roorkee', 'Roorkee, Uttarakhand 247667, India']
ADDR_COPY = _h.escape('Postal address\n' + '\n'.join(ADDR) + '\n\nSource: Contact page of Anandu Prabhakaran, ' + CONTACT_URL, quote=True).replace('\n', '&#10;')
ADDR_HTML = '<b>' + ADDR[0] + '</b><br>' + '<br>'.join(ADDR[1:])
ADDR_BLOCK = '''<address class="postal reveal" translate="no">@@H@@</address>
<div class="cta-row reveal postal-act" style="margin-top:12px">
  <button class="btn ghost cbtn" type="button" data-copy="@@C@@" data-msg="Postal address copied"><span class="bi" data-ic="copy"></span>Copy address</button>
  <div class="apwrap"><button class="btn ghost cbtn" type="button" data-share-addr data-text="@@C@@" data-url="@@U@@" aria-haspopup="true" aria-expanded="false"><span class="bi" data-ic="share"></span>Share address</button></div>
</div>'''
ADDR_BLOCK = ADDR_BLOCK.replace('@@H@@', ADDR_HTML).replace('@@C@@', ADDR_COPY).replace('@@U@@', CONTACT_URL)

# Holidays the appointment picker never offers (weekends are excluded by the picker itself). Days away are kept in tools/unavailable.json (python3 tools/site.py block ...). Sources: Kerala Government holiday list 2026 (Onmanorama, Hono),
# Central Government gazetted holidays 2027 (DoPT list via StaffNews). Guru Nanak Jayanti 2026 (24 Nov) is blocked as a precaution, not confirmed in the sources.
# Kerala holidays for 2027 (Onam, Vishu and others) are not published yet: ADD THEM when the Kerala list is out. The build prints a reminder after 31 Dec 2026.
# Web app URL of tools/google/appointments.gs after deployment (ends with /exec). Empty = visitors' email app opens instead.
APPT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx4ftUvQ0G2ctvXvvkhwiodbX87pfrSjky8RF_oZxzTygKLmODBvLh-PF8OyzW5EcTk/exec'
APPT_BLOCKED = [
    '2026-11-08', '2026-11-24', '2026-12-25',  # Deepavali, Guru Nanak Jayanti, Christmas
    '2027-01-26', '2027-03-10', '2027-03-23', '2027-03-26', '2027-04-15', '2027-04-19', '2027-05-17', '2027-05-20', '2027-06-16', '2027-08-25',
]
import datetime as _dt
if _dt.date.today() > _dt.date(2026, 12, 31): print('REMINDER: update APPT_BLOCKED with the Kerala 2027 holidays (Onam, Vishu, etc.)')

contact = phero('06 / Contact', 'Get in touch', 'Write by email, or find me on the platforms below.', 'GET IN TOUCH') + sec('''
<div class="contact-compact">
<div class="cgrid">
<div class="ccol">
<div class="eyebrow reveal"><span class="n">01</span> Email</div>
<dl class="dl cdl">
  <div class="dl-row reveal"><dt>Personal</dt><dd><a href="mailto:anandupiiserk@gmail.com" translate="no">anandupiiserk@gmail.com</a><button class="cpy" type="button" data-copy="anandupiiserk@gmail.com" data-msg="Email address copied"></button></dd></div>
  <div class="dl-row reveal"><dt>IIT Roorkee</dt><dd><a href="mailto:anandu_p@dm.iitr.ac.in" translate="no">anandu_p@dm.iitr.ac.in</a><button class="cpy" type="button" data-copy="anandu_p@dm.iitr.ac.in" data-msg="Email address copied"></button></dd></div>
  <div class="dl-row reveal"><dt>CEFE-CNRS</dt><dd><a href="mailto:anandu.prabhakaran@cefe.cnrs.fr" translate="no">anandu.prabhakaran@cefe.cnrs.fr</a><button class="cpy" type="button" data-copy="anandu.prabhakaran@cefe.cnrs.fr" data-msg="Email address copied"></button></dd></div>
</dl>
<div class="cta-row reveal" style="margin-top:14px">
  <button class="btn ghost cbtn" data-copy-email>Copy email</button>
  <button class="btn ghost cbtn" data-share-page>Share this site</button>
</div>
<div class="eyebrow reveal" style="margin-top:34px"><span class="n">02</span> Postal address</div>
@@ADDRBLOCK@@
</div>
<div class="ccol">
<div class="eyebrow reveal"><span class="n">03</span> Send a message</div>
<form class="cform reveal" id="cform" novalidate>
  <div class="frow"><label for="cf-name">Your name</label><input id="cf-name" name="name" type="text" autocomplete="name" required></div>
  <div class="frow"><label for="cf-email">Your email</label><input id="cf-email" name="email" type="email" autocomplete="email" required></div>
  <div class="frow"><label for="cf-msg">Your query</label><textarea id="cf-msg" name="message" rows="5" required></textarea></div>
  <div class="hp" aria-hidden="true"><label for="cf-web">Website</label><input id="cf-web" name="website" type="text" tabindex="-1" autocomplete="off"></div>
  <div class="fact"><button class="btn" type="submit" id="cf-send">Send message</button><span class="fstat" id="cf-stat" role="status" aria-live="polite"></span></div>
</form>
</div>
</div>
<div class="eyebrow reveal" style="margin-top:36px"><span class="n">04</span> Request an appointment</div>
<div class="appt reveal" id="appt" data-to="anandupiiserk@gmail.com" data-endpoint="@@APPTEP@@" data-days="1,2,3,4,5" data-start="10:00" data-end="18:00" data-step="30" data-lens="30,60" data-months="2" data-lead="2" data-blocked="@@BLOCKED@@">
  <p class="appt-note">Appointments of 30 or 60 minutes, Monday to Friday, 10:00 to 18:00 Indian Standard Time (IST), over the next two months. Weekends, public holidays and days when I am away are not available. Choose a length, a day and a time, add your details and send the request. The slot is confirmed by email once I reply.</p>
  <div class="frow appt-len"><span class="lbl-s">Length</span><label class="rd"><input type="radio" name="aplen" value="30" checked> 30 minutes</label><label class="rd"><input type="radio" name="aplen" value="60"> 60 minutes</label></div>
  <div class="appt-cols">
    <div class="appt-pick">
      <div class="appt-nav"><button type="button" class="btn ghost" id="ap-prev" aria-label="Previous month">&lsaquo;</button><b id="ap-month" data-i18n-skip></b><button type="button" class="btn ghost" id="ap-next" aria-label="Next month">&rsaquo;</button></div>
      <div class="appt-cal" id="ap-cal" role="grid" aria-label="Choose a day"></div>
      <div class="appt-slots" id="ap-slots" aria-live="polite"></div>
    </div>
    <form class="cform appt-form" id="ap-form" novalidate>
      <div class="appt-sel" id="ap-sel" data-i18n-skip>No slot chosen yet</div>
      <div class="frow"><label for="ap-name">Your name</label><input id="ap-name" type="text" autocomplete="name" required></div>
      <div class="frow"><label for="ap-email">Your email</label><input id="ap-email" type="email" autocomplete="email" required></div>
      <div class="frow"><label for="ap-topic">What would you like to discuss?</label><textarea id="ap-topic" rows="3" required></textarea></div>
      <div class="fact"><button class="btn" type="submit" id="ap-send">Request appointment</button><span class="fstat" id="ap-stat" role="status" aria-live="polite"></span></div>
    </form>
  </div>
</div>
<div class="eyebrow reveal" style="margin-top:36px"><span class="n">05</span> Profiles</div>
<div data-social-rows></div>
</div>'''.replace('@@ADDRBLOCK@@', ADDR_BLOCK).replace('@@APPTEP@@', APPT_ENDPOINT).replace('@@BLOCKED@@', ','.join(APPT_BLOCKED + [x['range'] for x in json.load(open(os.path.join(ROOT, 'tools', 'unavailable.json')))])))
page('contact.html', 'contact', f'Contact | {NAME}', 'Email and profiles on other platforms.', contact)

print('written:', sorted(f for f in os.listdir(OUT)))

import shutil; shutil.copyfile(os.path.join(OUT, 'index.html'), os.path.join(OUT, 'home.html'))
