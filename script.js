/* Listener registry and generation counter. They let a page be swapped in place (soft navigation) so full screen survives page changes. */
if (!window.__reg) {
  window.__reg = []; window.__gen = 0;
  const addW = window.addEventListener.bind(window);
  [window, document].forEach(t => { const o = t.addEventListener; t.addEventListener = function (a, b, c) { window.__reg.push([t, a, b, c]); return o.call(this, a, b, c); }; });
  addW('popstate', () => { if (window.__soft) window.__soft(location.href, false); });
}
if (!window.__srcUrl && document.currentScript) window.__srcUrl = document.currentScript.src;
const GEN = ++window.__gen;
/* =========================================================
   EDIT THIS BLOCK FIRST: your name, links and pages.
   Every page reads from here, so you change things once.
   ========================================================= */
/* @stamp: site data (menu, social links) counts for the Last Updated time of every page */
const SITE = {
  name: 'Anandu P.',
  initials: 'AP',
  tagline: 'PhD scholar, CoEDMM, IIT Roorkee',
  email: 'anandupiiserk@gmail.com',
  /* Contact form. Leave endpoint empty to open the visitor's email app instead. Formspree: https://formspree.io/f/xxxxxxxx . Web3Forms: https://api.web3forms.com/submit and put the public access key in formKey. */
  formEndpoint: 'https://formspree.io/f/mdeeoqdz', formKey: '',
  nav: [
    { id: 'home',         href: 'home.html',         label: 'Home',         desc: 'Overview and research focus.' },
    { id: 'about',        href: 'about.html',        label: 'About me',     desc: 'Position, education and research interests.' },
    { id: 'research',     href: 'research.html',     label: 'Research',     desc: 'PhD thesis, MSc thesis and internships.' },
    { id: 'publications', href: 'publications.html', label: 'Publications', desc: 'Journal articles and conference presentations.' },
    { id: 'workshops',    href: 'workshops.html',    label: 'Workshops',    desc: 'Workshops and lectures handled, by year.' },
    { id: 'gallery',      href: 'gallery.html',      label: 'Gallery',      desc: 'Conferences, workshops, fieldwork and journeys.' },
    { id: 'contact',      href: 'contact.html',      label: 'Contact',      desc: 'Email and profiles on other platforms.' }
  ],
  socials: [
    { label: 'LinkedIn', brand: '#0a66c2',       icon: 'linkedin',     url: 'https://www.linkedin.com/in/anandu-iitr/' },
    { label: 'Google Scholar', brand: '#4285f4', icon: 'scholar',      url: 'https://scholar.google.com/citations?user=0PK5HxYAAAAJ&hl=en' },
    { label: 'ResearchGate', brand: '#00bfae',   icon: 'researchgate', url: 'https://www.researchgate.net/profile/Anandu-Prabhakar' },
    { label: 'ORCID', brand: '#a6ce39',          icon: 'orcid',        url: 'https://orcid.org/0000-0001-6621-2522' },
    { label: 'X', brand: '#000000',              icon: 'x',            url: 'https://twitter.com/anandup10' },
    { label: 'Blogger', brand: '#ff5722',        icon: 'blogger',      url: 'https://www.blogger.com/profile/03363089627354540732' },
    { label: 'Email', brand: '#d9902a',          icon: 'mail',         url: 'mailto:anandupiiserk@gmail.com' }
  ]
};
/* @endstamp */


(function () {
'use strict';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const page = document.body.dataset.page || 'home';
const root = document.documentElement;
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const LANGS = [{ c: 'en', n: 'English', s: 'EN' }, { c: 'ml', n: '\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02', s: 'ML' }, { c: 'hi', n: '\u0939\u093f\u0928\u094d\u0926\u0940', s: 'HI' }, { c: 'fr', n: 'Fran\u00e7ais', s: 'FR' }, { c: 'de', n: 'Deutsch', s: 'DE' }, { c: 'ar', n: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', s: 'AR' }, { c: 'es', n: 'Espa\u00f1ol', s: 'ES' }, { c: 'pt', n: 'Portugu\u00eas', s: 'PT' }, { c: 'zh', n: '\u4e2d\u6587', s: 'ZH' }, { c: 'ja', n: '\u65e5\u672c\u8a9e', s: 'JA' }];
let LANG = 'en'; const DICT = window.I18N || {};
const norm = s => String(s).replace(/\s+/g, ' ').trim();
const KEEP = /^(Blogger|Anandu Prabhakaran|\S+@\S+|anandu|\.fire|LAT|LON|FWI|[a-z.]+\.(com|net|org)|Anandu P\.|anandu\.fire|GitHub|LinkedIn|ORCID|ResearchGate|Google Scholar|X|WRF-SFIRE|CMIP6|CoEDMM, IIT Roorkee|IIT Roorkee|CEFE-CNRS|DOI|you@example\.com)$/;
const tr = s => { if (LANG === 'en') return s; const d = DICT[LANG]; const v = d && d[norm(s)]; return v === undefined ? s : v; };
const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del(k) { try { sessionStorage.removeItem(k); } catch (e) {} } };

/* ---------- Icons ---------- */
const svg = (inner, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${inner}</svg>`;
const txt = t => svg(`<text x="12" y="16" text-anchor="middle" font-size="10.5" font-weight="700" font-family="Arial, sans-serif" fill="currentColor" stroke="none">${t}</text>`);
const ICONS = {
  blogger: txt('B'),
  github: svg('<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>'),
  linkedin: svg('<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>'),
  scholar: txt('GS'), researchgate: txt('RG'), orcid: txt('iD'),
  x: svg('<path d="M4 4l16 16M20 4L4 20"/>'),
  mail: svg('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'),
  globe: svg('<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5c2.8 2.7 4.2 5.9 4.2 9.5s-1.4 6.8-4.2 9.5c-2.8-2.7-4.2-5.9-4.2-9.5S9.2 5.2 12 2.5z"/>'),
  fsin: svg('<polyline points="4 9 4 4 9 4"/><polyline points="20 9 20 4 15 4"/><polyline points="4 15 4 20 9 20"/><polyline points="20 15 20 20 15 20"/>'),
  fsout: svg('<polyline points="9 4 9 9 4 9"/><polyline points="15 4 15 9 20 9"/><polyline points="9 20 9 15 4 15"/><polyline points="15 20 15 15 20 15"/>'),
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  chat: svg('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'),
  arrow: svg('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'),
  up: svg('<line x1="7" y1="17" x2="17" y2="7"/><polyline points="8 7 17 7 17 16"/>'),
  expand: svg('<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>'),
  swap: svg('<polyline points="8 6 3 12 8 18"/><polyline points="16 6 21 12 16 18"/>'),
  db: svg('<g class="dbp"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></g>'),
  gear: svg('<g class="gear"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/>' + [0,45,90,135,180,225,270,315].map(a => `<line x1="12" y1="2" x2="12" y2="4.8" transform="rotate(${a} 12 12)"/>`).join('') + '</g>'),
  check: svg('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
  bell: svg('<g class="bell"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></g>')
};

/* ---------- Pointer (real cursor, themed, shape-coded) ---------- */
function cursorSvg(theme, kind) {
  const dark = theme === 'dark';
  const a = dark ? '#e8a33d' : '#1b4f9c', b = dark ? '#86a9c2' : '#4a6382';
  const fill = kind === 'ptr' ? b : a;
  const ring = kind === 'ptr' ? `<circle cx="6" cy="4" r="6" fill="none" stroke="${b}" stroke-width="1.5"/>` : '';
  const d = 'M6 4 L6 25 L11.5 20 L15.5 29 L19 27.5 L15 18.5 L22.5 18.5 Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${ring}<path d="${d}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="3.6" stroke-linejoin="round"/><path d="${d}" fill="${fill}" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
}
(function injectCursors() {
  const u = (t, k) => `url("data:image/svg+xml,${encodeURIComponent(cursorSvg(t, k))}") 6 4`;
  const css = ['dark', 'light'].map(t =>
    `html[data-theme="${t}"], html[data-theme="${t}"] body { cursor: ${u(t, 'arrow')}, auto; }
html[data-theme="${t}"] :is(a, button, summary, label, select, [role="button"], [data-cursor], input[type="range"], .fig, .gi) { cursor: ${u(t, 'ptr')}, pointer; }
html[data-theme="${t}"] :is(input[type="text"], input[type="email"], textarea) { cursor: text; }`).join('\n');
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);
})();

/* ---------- Theme (sun and moon) ---------- */
const SUN_MOON = `<svg class="sm" viewBox="0 0 24 24" aria-hidden="true"><mask id="sm-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/><circle class="cut" cx="30" cy="2" r="6.5" fill="#000"/></mask><g mask="url(#sm-mask)"><circle class="core" cx="12" cy="12" r="5" fill="currentColor"/></g><g class="rays" stroke="currentColor" stroke-width="2" stroke-linecap="round">${[0,45,90,135,180,225,270,315].map(a => `<line x1="12" y1="1.5" x2="12" y2="3.8" transform="rotate(${a} 12 12)"/>`).join('')}</g></svg>`;
function applyTheme(t, persist) {
  root.dataset.theme = t;
  if (persist) { try { localStorage.setItem('theme', t); } catch (e) {} }
  const m = $('meta[name="theme-color"]'); if (m) m.content = t === 'dark' ? '#0c0a09' : '#f4f7fa';
  const b = $('#theme'); if (b) { const l = tr(t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); b.setAttribute('aria-label', l); b.title = l; }
  dispatchEvent(new Event('themechange'));
}

/* ---------- Toast ---------- */
let toastEl, toastTimer;
function toast(msg, ms) { toastEl.textContent = tr(msg); toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms || 2200); }

/* ---------- Shared chrome ---------- */
/* @stamp: header and footer */
function socialsHTML(noMail) {
  return SITE.socials.filter(s => !(noMail && s.icon === 'mail')).map(s => `<a class="soc" href="${s.url}" target="${s.url.startsWith('mailto') ? '_self' : '_blank'}" rel="noopener noreferrer" aria-label="${s.label}" data-label="${s.label}" style="--bc:${s.brand}">${ICONS[s.icon]}</a>`).join('');
}
function buildChrome() {
  const idx = SITE.nav.findIndex(n => n.id === page);
  const skip = document.createElement('a'); skip.className = 'skip'; skip.href = '#main'; skip.textContent = 'Skip to content'; document.body.prepend(skip);
  const header = document.createElement('header');
  header.className = 'nav'; header.id = 'nav';
  header.innerHTML = `
    <a class="brand" href="home.html" aria-label="${SITE.name}, home"><span class="prompt" aria-hidden="true"><i>$</i><span class="slot"><span class="tx"></span><b class="caret"></b></span></span></a>
    <nav class="menu" id="menu" aria-label="Main">${SITE.nav.map((n, i) => `<a href="${n.href}" style="--i:${i}" ${n.id === page ? 'aria-current="page"' : ''}><span class="t"><span>${n.label}</span><span aria-hidden="true">${n.label}</span></span></a>`).join('')}</nav>
    <div class="tools">
      <div class="share-wrap">
        <button class="icon-btn lang-btn" id="lang-btn" data-dyn aria-expanded="false" aria-haspopup="true">${ICONS.globe}<span id="lang-code">EN</span></button>
        <div class="share-menu lang-menu" id="lang-menu" role="menu">
          <p>Language</p>
          ${LANGS.map(l => `<button class="it" role="menuitemradio" data-lang="${l.c}" lang="${l.c}" aria-checked="${l.c === 'en'}" data-i18n-skip><span>${l.n}</span><span class="code">${l.s}</span></button>`).join('')}
          <button class="it" id="voice-pick" type="button" data-i18n-skip><span id="vp-l">Voice</span><span class="code" id="vp-n"></span></button>
        </div>
      </div>
      <div class="sz" role="group" aria-label="Text size"><button id="sz-dec" data-dyn><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18 L8 6 L13 18 M5 14 H11"/><path d="M16 12 H21"/></svg></button><button id="sz-inc" data-dyn><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18 L8 6 L13 18 M5 14 H11"/><path d="M16 12 H21 M18.5 9.5 V14.5"/></svg></button></div>
      <button class="icon-btn fs-btn" id="fs-btn" data-dyn aria-pressed="false"><span class="i-enter">${ICONS.fsin}</span><span class="i-exit">${ICONS.fsout}</span></button>
      <div class="share-wrap">
        <button class="icon-btn" id="share-btn" aria-label="Share this page" aria-expanded="false" aria-haspopup="true">${ICONS.share}</button>
        <div class="share-menu" id="share-menu" role="menu">
          <p>Share this page</p>
          <button class="it" data-share="native" role="menuitem" hidden>${ICONS.share}<span>Share via device</span></button>
          <button class="it" data-share="copy" role="menuitem">${ICONS.link}<span>Copy link</span></button>
          <a class="it" data-share="x" target="_blank" rel="noopener" role="menuitem">${ICONS.x}<span>Post on X</span></a>
          <a class="it" data-share="linkedin" target="_blank" rel="noopener" role="menuitem">${ICONS.linkedin}<span>Share on LinkedIn</span></a>
          <a class="it" data-share="whatsapp" target="_blank" rel="noopener" role="menuitem">${ICONS.chat}<span>Send on WhatsApp</span></a>
          <a class="it" data-share="mail" role="menuitem">${ICONS.mail}<span>Send by email</span></a>
        </div>
      </div>
      <button class="icon-btn voice-btn" id="voice-btn" data-dyn aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.4"/><path d="M3.2 20c.4-3.6 2.9-5.6 5.8-5.6s5.4 2 5.8 5.6"/><path class="w1" d="M16.4 6.6c1 .8 1.5 1.8 1.5 3s-.5 2.2-1.5 3"/><path class="w2" d="M19 4.4c1.7 1.5 2.6 3.4 2.6 5.2s-.9 3.7-2.6 5.2"/></svg></button>
      <button class="icon-btn theme-toggle" id="theme" data-dyn aria-label="Switch theme">${SUN_MOON}</button>
      <button class="burger" id="burger" data-dyn aria-label="Open menu" aria-expanded="false"><i></i><i></i><i></i></button>
    </div>`;
  document.body.insertBefore(header, $('main'));
  const prog = document.createElement('div'); prog.id = 'progress'; document.body.append(prog);
  const main = $('main'); if (main) main.id = 'main';

  if (page !== 'home' && idx >= 0) {
    const prev = SITE.nav[idx - 1], next = SITE.nav[idx + 1];
    const pg = document.createElement('nav'); pg.className = 'pager'; pg.setAttribute('aria-label', 'Page navigation');
    pg.innerHTML = (prev ? `<a class="prev" href="${prev.href}" data-cursor="Back"><small>Previous</small><b><span aria-hidden="true">&larr;</span> ${prev.label}</b></a>` : '') +
                   (next ? `<a class="next" href="${next.href}" data-cursor="Next"><small>Next</small><b>${next.label} <span aria-hidden="true">&rarr;</span></b></a>` : '');
    document.body.append(pg);
  }
  /* "Last Updated" comes from this page's own <meta name="last-updated" content="DD-Month-YYYY|hh:mm:ss"> written at build time, in IST. */
  function updatedText() {
    const m = document.querySelector('meta[name="last-updated"]'), v = m && m.content.split('|');
    return v && v.length === 2 ? 'Last Updated : ' + v[0] + ' | Time : ' + v[1] + ' (IST)' : '';
  }
  const foot = document.createElement('footer');
  foot.innerHTML = `<div class="copy"><div class="cpwrap"><div class="cp">&copy; <span id="yr">${new Date().getFullYear()}</span> <span class="nt">Anandu Prabhakaran.</span> <span>All rights reserved.</span></div><div class="upd" data-i18n-skip>${updatedText()}</div></div><div class="socials" aria-label="Social media">${socialsHTML(true)}</div></div><p class="ainote">This website was partially developed and is maintained with the help of Claude, an AI assistant made by Anthropic.</p>`;
  document.body.append(foot);
  document.body.insertAdjacentHTML('beforeend', `
    <button id="totop" aria-label="Back to top"><svg viewBox="0 0 50 50"><circle class="bg" cx="25" cy="25" r="22"/><circle class="fg" id="totop-fg" cx="25" cy="25" r="22"/></svg>&uarr;</button>
    <div class="pt" id="pt" aria-hidden="true" translate="no"><div class="ptl"><span class="pd">$</span><span class="ptt"></span><span class="ptc"></span></div></div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`);
  toastEl = $('#toast');
}
/* @endstamp */
buildChrome();
/* terminal-style header: type the name slowly, hold, backspace slowly, retype, loop */
(function typedBrand() {
  const tx = document.querySelector('.brand .tx'); if (!tx) return;
  const caret = document.querySelector('.brand .caret');
  const full = () => (window.matchMedia('(max-width: 400px)').matches ? 'Anandu.P' : 'Anandu.Prabhakaran');
  const html = t => t.replace('.', '<em>.</em>');
  /* Lock the slot to the width of the full name in the font actually in use, so typing and deleting can never move the menu. */
  const slot = document.querySelector('.brand .slot');
  function lockSlot() {
    if (!slot) return;
    const m = document.createElement('span'); m.className = 'tx'; m.setAttribute('aria-hidden', 'true');
    m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0';
    m.textContent = full(); slot.appendChild(m);
    const w = m.getBoundingClientRect().width; m.remove();
    const cw = caret ? caret.getBoundingClientRect().width + (parseFloat(getComputedStyle(caret).marginInlineStart) || 0) : 0;
    slot.style.width = Math.ceil(w + cw + 1) + 'px';
  }
  lockSlot(); addEventListener('resize', lockSlot); if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockSlot);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { tx.innerHTML = html(full()); return; }
  let n = 0, dir = 1;
  const TYPE = 170, DEL = 140, HOLD = 3200, EMPTY = 900;
  function tick() {
    const t = full(); if (n > t.length) n = t.length;
    tx.innerHTML = html(t.slice(0, n));
    const busy = (dir === 1 && n < t.length) || (dir === -1 && n > 0);
    caret.classList.toggle('busy', busy);
    let wait;
    if (dir === 1) { if (n < t.length) { n++; wait = TYPE; } else { dir = -1; wait = HOLD; } }
    else { if (n > 0) { n--; wait = DEL; } else { dir = 1; wait = EMPTY; } }
    setTimeout(tick, wait);
  }
  tick();
})();

/* Content protection: no browser right-click menu (a small shortcut menu replaces it, see ctxMenu), text selection, copy, cut, select all or print. Form fields keep normal behaviour. The copy-link and share buttons use the clipboard directly and are unaffected. */
(function protect() {
  const field = t => !!(t && t.closest && t.closest('input,textarea,select,[contenteditable="true"]'));
  document.addEventListener('selectstart', e => { if (!field(e.target)) e.preventDefault(); });
  ['copy', 'cut'].forEach(ev => document.addEventListener(ev, e => { if (!field(e.target)) e.preventDefault(); }));
  document.addEventListener('dragstart', e => { if (!field(e.target)) e.preventDefault(); });
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase();
    /* F12, Ctrl/Cmd+Shift+I, J, C, Cmd+Option+I and Ctrl/Cmd+U (view source) */
    if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && 'ijc'.includes(k) && k.length === 1) || (e.metaKey && e.altKey && (k === 'i' || k === 'j' || k === 'c')) || ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && k === 'u')) { e.preventDefault(); e.stopPropagation(); return; }
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (k === 'p' || (!field(e.target) && (k === 'c' || k === 'x' || k === 'a'))) e.preventDefault();
  }, true);
})();

/* ---------- Theme button, menu, share, nav indicator ---------- */
(function () {
  const btn = $('#theme');
  applyTheme(root.dataset.theme || 'dark', false);
  /* Until the visitor picks a theme, follow the system setting live. */
  try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => { if (!LS.get('theme')) applyTheme(e.matches ? 'light' : 'dark', false); }); } catch (e) {}
  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (document.startViewTransition && !reduce) {
      const t = document.startViewTransition(() => applyTheme(next, true));
      t.ready.then(() => {
        const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] }, { duration: 900, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(() => {});
    } else { root.classList.add('theme-anim'); applyTheme(next, true); setTimeout(() => root.classList.remove('theme-anim'), 700); }
  });

  const burger = $('#burger');
  burger.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', tr(open ? 'Close menu' : 'Open menu'));
  });
  $$('#menu a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

  const menu = $('#menu'), ind = document.createElement('i'); ind.className = 'ind'; menu.append(ind);
  /* phone menu: text size and voice live here, the header keeps only language, share, theme and menu */
  const mt = document.createElement('div'); mt.className = 'mtools';
  mt.innerHTML = `<button type="button" data-p="#sz-dec" data-i18n-skip aria-label="Decrease text size">A&minus;</button><button type="button" data-p="#sz-inc" data-i18n-skip aria-label="Increase text size">A+</button><button type="button" data-p="#fs-btn" class="mv mf" data-i18n-skip>Full screen</button>`;
  menu.append(mt);
  mt.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const o = $(b.dataset.p); if (o && !o.disabled) { o.click(); if (b.dataset.p !== '#sz-dec' && b.dataset.p !== '#sz-inc') document.body.classList.remove('menu-open'); } });
  const links = $$('a', menu), active = $('a[aria-current]', menu);
  const place = a => { if (!a) { ind.style.opacity = 0; return; } ind.style.opacity = 1; ind.style.width = a.offsetWidth + 'px'; ind.style.transform = `translateX(${a.offsetLeft}px)`; };
  place(active);
  links.forEach(a => a.addEventListener('mouseenter', () => place(a)));
  menu.addEventListener('mouseleave', () => place(active));
  menu.addEventListener('mousemove', e => menu.style.setProperty('--mx', (e.clientX - menu.getBoundingClientRect().left) + 'px'));
  addEventListener('resize', () => place(active));
  addEventListener('load', () => place(active));

  const sbtn = $('#share-btn'), smenu = $('#share-menu');
  /* Shared links never end in .html: the page link is the extensionless path, the site link is the folder root. */
  const cleanPath = p => p.replace(/\/(index|home)?(\.html)?$/, '/home').replace(/\.html$/, '');
  const pageUrl = () => location.origin + cleanPath(location.pathname);
  const siteUrl = () => location.origin + location.pathname.replace(/[^/]*$/, '');
  let shareMode = 'page';
  const data = () => ({ title: document.title, text: `${SITE.name}: ${document.title}`, url: shareMode === 'site' ? siteUrl() : pageUrl() });
  const refreshShare = () => {
    const d = data(), U = encodeURIComponent(d.url), T = encodeURIComponent(d.text);
    $('[data-share="x"]').href = `https://twitter.com/intent/tweet?text=${T}&url=${U}`;
    $('[data-share="linkedin"]').href = `https://www.linkedin.com/sharing/share-offsite/?url=${U}`;
    $('[data-share="whatsapp"]').href = `https://wa.me/?text=${T}%20${U}`;
    $('[data-share="mail"]').href = `mailto:?subject=${T}&body=${U}`;
  };
  const setOpen = o => { if (o) { shareMode = 'page'; refreshShare(); } smenu.classList.toggle('open', o); sbtn.setAttribute('aria-expanded', o); };
  if (navigator.share) $('[data-share="native"]').hidden = false;
  refreshShare();
  async function copyLink() {
    try { await navigator.clipboard.writeText(data().url); }
    catch (e) { const t = document.createElement('textarea'); t.value = data().url; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (_) {} t.remove(); }
    toast('Link copied to clipboard');
  }
  async function nativeShare() { try { await navigator.share(data()); } catch (e) { /* cancelled */ } }
  sbtn.addEventListener('click', e => { e.stopPropagation(); setOpen(!smenu.classList.contains('open')); });
  document.addEventListener('click', e => { if (!e.target.closest('.share-wrap')) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { setOpen(false); document.body.classList.remove('menu-open'); } });
  smenu.addEventListener('click', e => {
    const it = e.target.closest('[data-share]'); if (!it) return;
    if (it.dataset.share === 'copy') copyLink(); else if (it.dataset.share === 'native') nativeShare();
    setOpen(false);
  });
  const fsh = $('#foot-share'); if (fsh) fsh.addEventListener('click', () => { shareMode = 'site'; navigator.share ? nativeShare() : copyLink(); });
  const cf = $('#cf-send') && $('#cform');
  if (cf) {
    const stat = $('#cf-stat'), btn = $('#cf-send'), t0 = Date.now();
    const say = (m, bad) => { stat.textContent = tr(m); stat.classList.toggle('bad', !!bad); };
    cf.addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('#cf-name').value.trim(), email = $('#cf-email').value.trim(), message = $('#cf-msg').value.trim();
      if (!name || !email || !message) { say('Please fill in all fields.', true); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say('Enter a valid email address.', true); return; }
      if ($('#cf-web').value || Date.now() - t0 < 2500) { say('Thank you. Your message has been sent.'); cf.reset(); return; }
      const subject = `Website message from ${name}`;
      if (!SITE.formEndpoint) {
        say('Opening your email app.'); location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message + '\n\n' + name + '\n' + email)}`; return;
      }
      btn.disabled = true; say('Sending...');
      try {
        const body = { name, email, message, subject }; if (SITE.formKey) { body.access_key = SITE.formKey; body.from_name = name; }
        const r = await fetch(SITE.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error('status ' + r.status);
        say('Thank you. Your message has been sent.'); cf.reset();
      } catch (err) { say('Something went wrong. Please email me directly.', true); }
      btn.disabled = false;
    });
  }
  $$('[data-copy-email]').forEach(b => b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(SITE.email); toast('Email address copied'); } catch (_) { toast(SITE.email); } }));
  /* Copy buttons next to the emails and the postal address; Share address opens the device share sheet or a small menu. */
  const copyText = async (text, msg) => {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (_) {} t.remove(); }
    toast(msg || 'Copied');
  };
  $$('.cpy').forEach(b => { b.innerHTML = ICONS.copy; const l = tr('Copy'); b.setAttribute('aria-label', l); b.title = l; });
  $$('.bi[data-ic]').forEach(el => { el.innerHTML = ICONS[el.dataset.ic] || ''; });
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => copyText(b.dataset.copy, b.dataset.msg)));
  $$('[data-share-addr]').forEach(b => {
    const wrap = b.parentElement, text = b.dataset.text, url = b.dataset.url;
    /* The device share sheet gets the address and the link as separate fields; the copied text already ends with the link, so it is left out here to avoid a double link. */
    const shareText = text.split('\n\nSource:')[0];
    const pop = document.createElement('div'); pop.className = 'share-menu pop'; pop.setAttribute('role', 'menu');
    const T = encodeURIComponent(text), U = encodeURIComponent(url);
    pop.innerHTML = `<p>Share postal address</p>
      ${navigator.share ? `<button class="it" data-a="native" role="menuitem">${ICONS.share}<span>Share via device</span></button>` : ''}
      <a class="it" href="https://wa.me/?text=${T}" target="_blank" rel="noopener" role="menuitem">${ICONS.chat}<span>Send on WhatsApp</span></a>
      <a class="it" href="mailto:?subject=${encodeURIComponent('Postal address: Anandu Prabhakaran')}&body=${T}" role="menuitem">${ICONS.mail}<span>Send by email</span></a>
      <button class="it" data-a="link" role="menuitem">${ICONS.link}<span>Copy link</span></button>`;
    wrap.appendChild(pop);
    const open = o => { pop.classList.toggle('open', o); b.setAttribute('aria-expanded', o); };
    b.addEventListener('click', async e => {
      e.stopPropagation();
      if (navigator.share) { try { await navigator.share({ title: 'Postal address', text: shareText, url }); return; } catch (err) { if (err && err.name === 'AbortError') return; } }
      open(!pop.classList.contains('open'));
    });
    pop.addEventListener('click', async e => {
      const it = e.target.closest('.it'); if (!it) return;
      if (it.dataset.a === 'native') { try { await navigator.share({ title: 'Postal address', text: shareText, url }); } catch (err) {} }
      else if (it.dataset.a === 'link') copyText(url, 'Link copied to clipboard');
      open(false);
    });
    document.addEventListener('click', e => { if (!e.target.closest('.apwrap')) open(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
  });
  $$('[data-share-page]').forEach(b => b.addEventListener('click', () => { shareMode = 'site'; navigator.share ? nativeShare() : copyLink(); }));
})();

/* ---------- Data-driven bits ---------- */
$$('[data-socials]').forEach(el => { el.classList.add('socials'); el.innerHTML = socialsHTML(); });
$$('[data-email]').forEach(a => { a.href = 'mailto:' + SITE.email; if (a.dataset.text !== undefined) a.textContent = SITE.email; });
$$('[data-rows]').forEach(el => {
  el.classList.add('rows');
  el.innerHTML = SITE.nav.filter(n => n.id !== 'home').map((n, i) =>
    `<a class="row reveal" data-cursor="Open" href="${n.href}"><span class="rn">${String(i + 1).padStart(2, '0')}</span><h3>${n.label}</h3><p>${n.desc}</p><span class="go">${ICONS.arrow}</span></a>`).join('');
});
$$('[data-social-rows]').forEach(el => {
  el.classList.add('lrows');
  el.innerHTML = SITE.socials.map(s => {
    let host = s.url; try { host = s.url.startsWith('mailto:') ? s.url.replace('mailto:', '') : new URL(s.url).hostname.replace('www.', ''); } catch (e) {}
    return `<a class="lrow reveal" href="${s.url}" target="${s.url.startsWith('mailto') ? '_self' : '_blank'}" rel="noopener noreferrer">${ICONS[s.icon]}<b>${s.label}</b><span class="h">${host}</span><span class="arr">${ICONS.up}</span></a>`;
  }).join('');
});
$$('.ticker .track').forEach(t => {
  const items = t.dataset.items.split('|');
  t.innerHTML = [...items, ...items, ...items, ...items].map(s => `<span class="t">${s}</span><i class="d"></i>`).join('');
});
$$('[data-icon]').forEach(el => { el.innerHTML = ICONS[el.dataset.icon] || ''; });
$$('[data-expand]').forEach(el => { el.innerHTML = ICONS.expand; });
$$('[data-swap]').forEach(el => { el.innerHTML = ICONS.swap; });

/* ---------- Split text, reveal ---------- */
function renderSplit(el, text) {
  const cjk = /^(zh|ja)$/.test(LANG);
  let words = text.trim().split(/\s+/);
  if (cjk && words.length < 3) { try { words = [...new Intl.Segmenter(LANG, { granularity: 'word' }).segment(text.trim())].map(x => x.segment).filter(x => x.trim()); } catch (e) { words = text.trim().match(/.{1,3}/g) || words; } }
  const n0 = +el.dataset.n0 || words.length;
  const hl = el.dataset.hl ? Math.round(+el.dataset.hl / n0 * words.length) : -1;
  el.setAttribute('aria-label', text.trim());
  el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}" class="${hl >= 0 && i >= hl ? 'em' : ''}">${w}</span></span>`).join(cjk ? '' : ' ');
}
$$('[data-split]').forEach(el => { el.dataset.src = norm(el.textContent); el.dataset.n0 = el.dataset.src.split(' ').length; renderSplit(el, el.dataset.src); });
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible', 'in'); io.unobserve(e.target); } }), { threshold: 0.15 });
$$('.reveal, .fig, .t-item, .rule, .eyebrow:not(.fade), [data-split]:not(.hero-split)').forEach((el, i) => {
  if (el.classList.contains('reveal')) el.style.transitionDelay = ((i % 4) * 80) + 'ms';
  io.observe(el);
});
const onIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); onIO.unobserve(e.target); } }), { threshold: 0.3 });
$$('.fcard, .brow, .rose, .chart-card').forEach(el => onIO.observe(el));

/* ---------- Pointer ring and label ---------- */
if (!reduce && finePointer) {
  document.body.insertAdjacentHTML('beforeend', '<div id="cur-ring"><i></i></div><div id="cur-label"><span></span></div>');
  const ring = $('#cur-ring'), label = $('#cur-label'), lspan = $('span', label);
  let mx = -200, my = -200, rx = -200, ry = -200;
  const INTERACTIVE = 'a, button, summary, label, select, [role="button"], [data-cursor], input[type="range"], .fig, .gi';
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; label.style.transform = `translate(${mx}px,${my}px)`; });
  addEventListener('mousedown', () => ring.classList.add('down')); addEventListener('mouseup', () => ring.classList.remove('down'));
  document.addEventListener('mouseover', e => {
    const t = e.target.closest(INTERACTIVE), l = e.target.closest('[data-cursor]');
    ring.classList.toggle('big', !!t); label.classList.toggle('on', !!l); if (l) lspan.textContent = tr(l.dataset.cursor);
  });
  document.addEventListener('mouseleave', () => [ring, label].forEach(x => x.classList.add('cur-hide')));
  document.addEventListener('mouseenter', () => [ring, label].forEach(x => x.classList.remove('cur-hide')));
  (function loop(now) { if (GEN !== window.__gen) return; const dt = Math.min(64, now - (loop.p || now)) || 8; loop.p = now; const k = 1 - Math.pow(.82, dt / 16.667); rx += (mx - rx) * k; ry += (my - ry) * k; ring.style.transform = `translate3d(${rx}px,${ry}px,0)`; requestAnimationFrame(loop); })(performance.now());
}

/* ---------- Quiet gallery preload ----------
   On every page except the gallery, once the page has finished loading and the browser is idle, the gallery photos are fetched
   into the browser cache, two at a time. Nothing is shown. Skipped on data saver and slow connections. */
(function galleryPreload() {
  if ($('#gallery') || window.__gpre) return; window.__gpre = true;
  const c = navigator.connection; if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;
  const EX = ['JPG', 'jpg', 'jpeg', 'JPEG', 'png', 'PNG', 'webp', 'WEBP'];
  const load = src => new Promise(r => { const im = new Image(); im.decoding = 'async'; im.onload = () => r(true); im.onerror = () => r(false); im.src = src; });
  async function runFast() {
    let man = null; try { const r = await fetch('gallery/manifest.json', { cache: 'no-cache' }); if (r.ok) man = await r.json(); } catch (e) { return false; }
    if (!man) return false;
    const q = Object.keys(man).sort(); const w = async () => { while (q.length) await load('gallery/t/' + q.shift() + '.webp'); };
    await Promise.all([w(), w(), w()]); return true;
  }
  async function run() {
    if (await runFast()) return;
    let text = ''; try { const r = await fetch('gallery/captions.txt'); if (r.ok) text = await r.text(); } catch (e) { return; }
    const bases = new Map();
    text.split(/\r?\n/).forEach(l => { l = l.trim(); if (!l || l[0] === '#') return; const id = l.split(/[|\t]/)[0].trim(), m = id.match(/^([A-Za-z]+_\d+)(?:_(\d{1,2}))?/); if (m) bases.set(m[1], (bases.get(m[1]) || false) || !!m[2]); });
    let ext = null; try { ext = sessionStorage.getItem('gal-ext'); } catch (e) { /* ignore */ }
    const find = async name => { for (const x of (ext ? [ext] : EX)) { if (await load('gallery/' + name + '.' + x)) { ext = x; try { sessionStorage.setItem('gal-ext', x); } catch (e) { /* ignore */ } return true; } } return false; };
    const queue = [...bases.keys()];
    const quick = find;
    const worker = async () => {
      while (queue.length) {
        const b = queue.shift();
        if (!bases.get(b) && await find(b)) continue;
        for (let k = 1; k <= 20; k++) if (!await (k === 1 ? find : quick)(b + '_' + String(k).padStart(2, '0'))) break;
      }
    };
    await Promise.all([worker(), worker()]);
  }
  const start = () => { const go = () => run(); (window.requestIdleCallback ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 1000)); };
  if (document.readyState === 'complete') setTimeout(start, 600); else addEventListener('load', () => setTimeout(start, 600));
})();

/* ---------- Page transition and boot ---------- */
const pt = $('#pt');
/* Address bar shows clean paths (/about, not /about.html). GitHub Pages serves both. Skipped on localhost, where a plain file server needs the .html. */
const PRETTY = /^https?:$/.test(location.protocol) && !/^(localhost|127\.|\[::1\])/.test(location.hostname);
const normPath = p => p.replace(/\/(index|home)?(\.html)?$/, '/home').replace(/\.html$/, '');
const prettyUrl = h => { const u = new URL(h, location.href); return PRETTY ? normPath(u.pathname) + u.search + u.hash : u.pathname + u.search + u.hash; };
const realUrl = h => { const u = new URL(h, location.href); let p = u.pathname; if (p.endsWith('/')) p += 'index.html'; else if (!/\.[a-z0-9]+$/i.test(p.split('/').pop())) p += '.html'; return u.origin + p + u.search; };
if (PRETTY && (/\.html$/.test(location.pathname) || location.pathname.endsWith('/'))) { try { history.replaceState(null, '', prettyUrl(location.href)); } catch (e) { /* ignore */ } }
/* Transition screen: "$Anandu." stays, the name of the page being opened is typed after the dot. */
const pageName = u => { const p = normPath(u.pathname).split('/').pop() || 'home'; return p.charAt(0).toUpperCase() + p.slice(1); };
const ptText = t => { const el = pt.querySelector('.ptt'); if (el) el.innerHTML = 'Anandu<em>.</em>' + t; };
const ptBusyCaret = on => { const c = pt.querySelector('.ptc'); if (c) c.classList.toggle('busy', on); };
async function ptType(name) {
  ptBusyCaret(true); ptText('');
  await new Promise(r => setTimeout(r, 190));
  for (let i = 1; i <= name.length; i++) { ptText(name.slice(0, i)); await new Promise(r => setTimeout(r, 75)); }
  ptBusyCaret(false); await new Promise(r => setTimeout(r, 220));
}
let navBusy = false;
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const href = a.getAttribute('href');
  if (a.target || a.hasAttribute('download') || /^(#|mailto:|tel:|https?:|javascript:)/i.test(href)) return;
  const url = new URL(a.href, location.href);
  if (normPath(url.pathname) === normPath(location.pathname)) return;
  if (fsOn()) { e.preventDefault(); softNav(a.href, true, pageName(url)); return; }
  if (reduce) return;
  e.preventDefault();
  if (navBusy) return; navBusy = true;
  const name = pageName(url); ss.set('pt', '1'); ss.set('ptn', name); pt.className = 'pt entering';
  ptType(name).then(() => { location.href = a.href; });
});
addEventListener('pageshow', e => { if (e.persisted) { navBusy = false; pt.className = 'pt'; document.body.classList.remove('menu-open'); } });
/* In full screen a normal page load would exit full screen, so the next page is fetched and swapped into the same document instead. */
let softBusy = false;
async function softNav(href, push, name) {
  if (softBusy) return; softBusy = true;
  try {
    if (!reduce) { pt.className = 'pt entering'; if (name) ss.set('ptn', name); }
    const [res, srcText] = await Promise.all([
      fetch(realUrl(href), { credentials: 'same-origin' }),
      window.__srcText ? Promise.resolve(window.__srcText) : fetch(window.__srcUrl).then(r => r.text()),
      (reduce ? Promise.resolve() : (name ? ptType(name) : new Promise(r => setTimeout(r, 200))))
    ]);
    if (!res.ok) throw new Error('bad status');
    window.__srcText = srcText;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    doc.querySelectorAll('script').forEach(n => n.remove());
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    window.__reg.forEach(([t, a, b, c]) => t.removeEventListener(a, b, c)); window.__reg.length = 0;
    if (push) history.pushState(null, '', PRETTY ? prettyUrl(href) : href);
    document.title = doc.title;
    const md = $('meta[name="description"]'), nd = doc.querySelector('meta[name="description"]'); if (md && nd) md.content = nd.content;
    document.body.className = doc.body.className; document.body.dataset.page = doc.body.dataset.page;
    document.body.innerHTML = doc.body.innerHTML;
    window.scrollTo(0, 0);
    if (!reduce) ss.set('pt', '1');
    softBusy = false;
    new Function(window.__srcText)();
  } catch (err) { softBusy = false; location.href = href; }
}
window.__soft = (h, push) => softNav(h, push);
function ready() {
  document.body.classList.add('ready');
  /* First-time visitors only: a wave around the theme button for 5 seconds. Pressing the button stops it at once. */
  const b = $('#theme');
  if (b && !reduce && !window.__hinted && !LS.get('thint')) {
    window.__hinted = true; LS.set('thint', '1');
    b.classList.add('hint');
    const off = () => b.classList.remove('hint');
    b.addEventListener('click', off, { once: true }); setTimeout(off, 5000);
  }
}
(function boot() {
  const flag = ss.get('pt'); ss.del('pt');
  const ptn = ss.get('ptn'); ss.del('ptn');
  if (flag && !reduce) {
    pt.className = 'pt cover'; if (ptn) ptText(ptn); ptBusyCaret(false);
    void pt.offsetWidth;
    setTimeout(() => { pt.className = 'pt leaving'; setTimeout(() => { pt.className = 'pt'; }, 500); }, ptn ? 380 : 0);
  }
  const loader = $('#loader');
  if (!loader) { setTimeout(ready, flag && !reduce ? 120 : 80); return; }
  const first = !ss.get('v'); ss.set('v', '1');
  const unlock = () => root.classList.remove('locked');
  if (reduce || !first) { loader.remove(); unlock(); setTimeout(ready, flag && !reduce ? 120 : 100); return; }
  const pct = $('#l-pct'), bar = $('#l-bar'), out = $('#term-out'), now0 = performance.now(), t0 = now0 - Math.min(now0, 450), dur = 1500; /* the clock counts from up to 450 ms before this point, so slow script start-up does not stretch the boot */
  const lines = ['anandu@iitroorkee:~$ ./anandu.forest.fire --boot', '[ ok ] mounting mesoscale circulation', '[ ok ] mounting terrain and station data', '[ ok ] loading WRF-Fire', '[ ok ] coupling fire and atmosphere'];
  let wel = null;
  const total = lines.join('\n').length, esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  (function step(t) {
    const k = clamp((t - t0) / dur), n = Math.floor(clamp(k / .85) * total);
    let left = n; const html = [];
    lines.forEach((l, i) => { if (left <= 0) return; const seg = l.slice(0, left); left -= l.length + 1; html.push('<div class="' + (i === 0 ? 'cmd' : 'ln') + '">' + esc(seg).replace('[ ok ]', '<b>[ ok ]</b>') + (left < 0 && left > -(l.length + 1) && k < .9 ? '<span class="cur"></span>' : '') + '</div>'); });
    out.innerHTML = html.join('');
    const e = clamp(k / .85), f = Math.round(e * 20);
    bar.textContent = '[' + '#'.repeat(f) + ' '.repeat(20 - f) + ']'; pct.textContent = String(Math.round(e * 100)).padStart(3, '0') + '%';
    if (e >= 1 && !wel) { wel = document.createElement('div'); wel.className = 'welcome'; wel.setAttribute('data-i18n-skip', ''); wel.textContent = 'Welcome to my website'; bar.parentNode.appendChild(wel); }
    if (k < 1) requestAnimationFrame(step);
    else setTimeout(() => { loader.classList.add('done'); setTimeout(() => { unlock(); ready(); }, 250); setTimeout(() => loader.remove(), 800); }, 280);
  })(t0);
})();

/* ---------- Counters, bars ---------- */
(function () {
  const els = $$('[data-count]'); if (!els.length) return;
  const o = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.count, suf = el.dataset.suffix || '';
    if (reduce) { el.textContent = target + suf; o.unobserve(el); return; }
    const t0 = performance.now(), dur = 1700;
    (function step(t) { const k = clamp((t - t0) / dur); el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(step); })(t0);
    o.unobserve(el);
  }), { threshold: .5 });
  els.forEach(el => o.observe(el));
})();

/* ---------- Contour field engine (cartographic motif) ---------- */
function makeNoise(seed) {
  const perm = [...Array(256).keys()]; let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const p = new Uint8Array(512); for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10), lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y) => { switch (h & 7) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } };
  const noise = (x, y) => { const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y); const u = fade(x), v = fade(y), a = p[X] + Y, b = p[X + 1] + Y; return lerp(lerp(grad(p[a], x, y), grad(p[b], x - 1, y), u), lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u), v); };
  return (x, y) => { let f = 0, a = 1, fr = 1, n = 0; for (let i = 0; i < 4; i++) { f += a * noise(x * fr, y * fr); n += a; a *= .5; fr *= 2; } return f / n; };
}
const EDGES = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [2, 1]], [[0, 2]], [[0, 3]], [[0, 3]], [[0, 2]], [[0, 1], [2, 3]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 2]], []];
function contours(canvas, o) {
  o = Object.assign({ cell: 16, levels: 16, speed: 1, hot: false, interactive: false, seed: 7, scale: 2.2 }, o);
  const ctx = canvas.getContext && canvas.getContext('2d');
  const api = { visible: false, mouse: { x: 0, y: 0, on: false }, frame() {}, resize() {}, colors() {} };
  if (!ctx) return api;
  const noise = makeNoise(o.seed);
  let W = 0, H = 0, cols = 0, rows = 0, base, val, hot, col = {}, bump = 0;
  api.colors = () => { const cs = getComputedStyle(root); col = { line: cs.getPropertyValue('--cline').trim() || 'rgba(150,160,170,.2)', a: cs.getPropertyValue('--a').trim() || '#56b4e9', b: cs.getPropertyValue('--b').trim() || '#e69f00' }; };
  api.resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5); W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / o.cell) + 2; rows = Math.ceil(H / o.cell) + 2;
    base = new Float32Array(cols * rows); val = new Float32Array(cols * rows); hot = new Float32Array(cols * rows);
    const m = Math.max(W, H, 1);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) base[j * cols + i] = noise(i * o.cell / m * o.scale, j * o.cell / m * o.scale) + (i / cols - .5) * .22;
  };
  /* Marching squares gives short straight pieces. They are joined into continuous lines and drawn as smooth curves
     (quadratic through the midpoints), so the contours bend gently instead of showing corners. */
  let N = 0, ex, ey, n1, n2, seen, touched;
  function alloc() { N = cols * rows * 2; ex = new Float32Array(N); ey = new Float32Array(N); n1 = new Int32Array(N).fill(-2); n2 = new Int32Array(N); seen = new Uint8Array(N); touched = new Int32Array(N); }
  function trace(f, lvl) {
    const c = o.cell; if (!ex || ex.length !== cols * rows * 2) alloc();
    let nt = 0;
    const H = (i, j) => j * cols + i, V = (i, j) => cols * rows + j * cols + i;
    const touch = id => { if (n1[id] === -2) { n1[id] = -1; n2[id] = -1; seen[id] = 0; touched[nt++] = id; } };
    const link = (a, b) => { if (n1[a] < 0) n1[a] = b; else n2[a] = b; if (n1[b] < 0) n1[b] = a; else n2[b] = a; };
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const tl = f[j * cols + i], tr = f[j * cols + i + 1], br = f[(j + 1) * cols + i + 1], bl = f[(j + 1) * cols + i];
      const mn = Math.min(tl, tr, br, bl), mx = Math.max(tl, tr, br, bl); if (lvl < mn || lvl > mx) continue;
      const k = (tl > lvl ? 8 : 0) | (tr > lvl ? 4 : 0) | (br > lvl ? 2 : 0) | (bl > lvl ? 1 : 0), segs = EDGES[k]; if (!segs.length) continue;
      const eid = e => {
        let id;
        if (e === 0) { id = H(i, j); ex[id] = (i + (lvl - tl) / (tr - tl)) * c; ey[id] = j * c; }
        else if (e === 1) { id = V(i + 1, j); ex[id] = (i + 1) * c; ey[id] = (j + (lvl - tr) / (br - tr)) * c; }
        else if (e === 2) { id = H(i, j + 1); ex[id] = (i + (lvl - bl) / (br - bl)) * c; ey[id] = (j + 1) * c; }
        else { id = V(i, j); ex[id] = i * c; ey[id] = (j + (lvl - tl) / (bl - tl)) * c; }
        touch(id); return id;
      };
      for (const sg of segs) link(eid(sg[0]), eid(sg[1]));
    }
    const mid = (a, b) => [(ex[a] + ex[b]) / 2, (ey[a] + ey[b]) / 2];
    const walk = (start, closed) => {
      const chain = []; let prev = -1, cur = start;
      while (cur >= 0 && !seen[cur]) { seen[cur] = 1; chain.push(cur); const nx = n1[cur] !== prev && n1[cur] >= 0 ? n1[cur] : n2[cur]; prev = cur; cur = (nx >= 0 && !seen[nx]) ? nx : -1; }
      const m = chain.length; if (m < 2) return;
      if (closed && m > 2) {
        const p0 = mid(chain[m - 1], chain[0]); ctx.moveTo(p0[0], p0[1]);
        for (let q = 0; q < m; q++) { const a = chain[q], b = chain[(q + 1) % m], mp = mid(a, b); ctx.quadraticCurveTo(ex[a], ey[a], mp[0], mp[1]); }
      } else {
        ctx.moveTo(ex[chain[0]], ey[chain[0]]);
        for (let q = 1; q < m - 1; q++) { const a = chain[q], b = chain[q + 1], mp = mid(a, b); ctx.quadraticCurveTo(ex[a], ey[a], mp[0], mp[1]); }
        ctx.lineTo(ex[chain[m - 1]], ey[chain[m - 1]]);
      }
    };
    for (let t = 0; t < nt; t++) { const id = touched[t]; if (!seen[id] && (n1[id] < 0 || n2[id] < 0)) walk(id, false); }
    for (let t = 0; t < nt; t++) { const id = touched[t]; if (!seen[id]) walk(id, true); }
    for (let t = 0; t < nt; t++) n1[touched[t]] = -2;
  }
  api.frame = t => {
    if (!W || !col.line) return;
    const m = api.mouse, c = o.cell, tt = t * .001 * o.speed;
    bump += ((o.interactive && m.on ? 1 : 0) - bump) * .06;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const idx = j * cols + i; let v = base[idx] + .045 * Math.sin(i * .21 + tt * .6) * Math.cos(j * .17 - tt * .45);
      if (bump > .01) { const dx = i * c - m.x, dy = j * c - m.y; v += .42 * bump * Math.exp(-(dx * dx + dy * dy) / (2 * 110 * 110)); }
      val[idx] = v;
    }
    ctx.clearRect(0, 0, W, H);
    const step = .9 / o.levels, phase = tt * .018, wraps = Math.floor(phase), shift = (phase - wraps) * step;
    const lo = -.45;
    for (const major of [false, true]) {
      ctx.beginPath();
      for (let k = 0; k <= o.levels; k++) { const isMajor = (((k - wraps) % 5) + 5) % 5 === 0; if (isMajor !== major) continue; trace(val, lo + k * step + shift); }
      ctx.setLineDash([]); ctx.lineWidth = major ? 1.5 : 1; ctx.strokeStyle = major ? col.b : col.line; ctx.globalAlpha = major ? .7 : 1; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (o.hot) {
      const hx = W * (.74 + .03 * Math.sin(tt * .15)), hy = H * (.6 + .03 * Math.cos(tt * .12)), pulse = .94 + .06 * Math.sin(tt * .9), s2 = 2 * (W * .12) * (W * .12);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const dx = i * c - hx, dy = (j * c - hy) * 1.25; hot[j * cols + i] = pulse * Math.exp(-(dx * dx + dy * dy) / s2); }
      ctx.beginPath(); [.2, .4, .6, .8].forEach(l => trace(hot, l)); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.8; ctx.strokeStyle = col.a; ctx.stroke(); ctx.setLineDash([]);
    }
  };
  api.colors(); api.resize(); return api;
}
const engines = [];
$$('canvas.contours').forEach(cv => {
  const hero = cv.dataset.contours === 'hero';
  let h = 0; for (const ch of page) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const e = contours(cv, hero ? { cell: 15, levels: 20, hot: true, interactive: true, seed: 11, scale: 2.3, speed: 1 } : { cell: 20, levels: 14, seed: h % 997 + 3, scale: 1.9, speed: .7 });
  engines.push(e);
  new IntersectionObserver(([en]) => { e.visible = en.isIntersecting; }, { threshold: 0 }).observe(cv);
  if (hero) {
    const host = cv.parentElement, lat = $('#ro-lat'), lon = $('#ro-lon');
    host.addEventListener('mousemove', ev => {
      const r = cv.getBoundingClientRect(); e.mouse.x = ev.clientX - r.left; e.mouse.y = ev.clientY - r.top; e.mouse.on = true;
      if (lat) { lat.textContent = (37 - (e.mouse.y / r.height) * 8.5).toFixed(2) + '°N'; lon.textContent = (73 + (e.mouse.x / r.width) * 24).toFixed(2) + '°E'; }
    });
    host.addEventListener('mouseleave', () => { e.mouse.on = false; });
  }
});
addEventListener('themechange', () => engines.forEach(e => { e.colors(); if (reduce) e.frame(0); }));
let rzT; addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => engines.forEach(e => { e.resize(); if (reduce) e.frame(0); }), 150); });
if (reduce) engines.forEach(e => e.frame(0));
else (function loop() {
  let last = 0;
  /* Runs on every display refresh (60, 120, 144 Hz). If a frame costs more than ~7 ms the canvas drops to every other refresh so scrolling and the nav stay at full rate. */
  let gap = 0;
  (function tick(now) {
    if (GEN !== window.__gen) return;
    if (!document.hidden && now - last >= gap) {
      const t0 = performance.now(); last = now; engines.forEach(e => e.visible && e.frame(now));
      const cost = performance.now() - t0; gap = cost > 7 ? 15 : 0;
    }
    requestAnimationFrame(tick);
  })(0);
})();

/* ---------- Charts: line (with tooltip), grouped bars, wind rose ---------- */
(function () {
  let uid = 0;
  const niceMax = v => { const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };
  const smooth = p => { let d = `M${p[0][0]} ${p[0][1]}`; for (let i = 0; i < p.length - 1; i++) { const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2; d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`; } return d; };
  const nums = s => s.split(',').map(Number);
  const legend = (names, kind) => `<div class="legend">${kind === 'line'
    ? `<span class="lg"><svg viewBox="0 0 28 14"><line x1="0" y1="7" x2="28" y2="7" class="sa"/><circle cx="14" cy="7" r="4.5" class="ma"/></svg>${names[0]}</span><span class="lg"><svg viewBox="0 0 28 14"><line x1="0" y1="7" x2="28" y2="7" class="sb"/><rect x="9.5" y="2.5" width="9" height="9" class="mb"/></svg>${names[1]}</span>`
    : `<span class="lg"><svg viewBox="0 0 28 14"><rect x="4" y="1" width="20" height="12" fill="var(--a)"/></svg>${names[0]}</span><span class="lg"><svg viewBox="0 0 28 14"><defs><pattern id="lgh${uid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--b-soft)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--b)" stroke-width="2.5"/></pattern></defs><rect x="4" y="1" width="20" height="12" fill="url(#lgh${uid})" stroke="var(--b)" stroke-width="2"/></svg>${names[1]}</span>`}</div>`;

  $$('[data-linechart]').forEach(el => {
    const id = ++uid, A = nums(el.dataset.a), B = nums(el.dataset.b), labels = el.dataset.labels.split(','), names = (el.dataset.names || 'Series A,Series B').split(','), band = +(el.dataset.band || 0);
    const W = 640, H = 300, L = 46, R = 92, T = 16, Bm = 36, n = A.length, max = niceMax(Math.max(...A, ...B) * 1.05);
    const xs = A.map((_, i) => L + i * (W - L - R) / (n - 1)), y = v => T + (1 - v / max) * (H - T - Bm);
    const pa = A.map((v, i) => [xs[i], y(v)]), pb = B.map((v, i) => [xs[i], y(v)]);
    const grid = [0, 1, 2, 3, 4].map(k => { const yy = T + k * (H - T - Bm) / 4; return `<line class="gl" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end">${Math.round(max * (1 - k / 4) * 10) / 10}</text>`; }).join('');
    const xl = labels.map((l, i) => (n > 8 && i % 2) ? '' : `<text x="${xs[i]}" y="${H - 12}" text-anchor="middle">${l}</text>`).join('');
    let bandPath = ''; if (band) { const up = A.map((v, i) => [xs[i], y(v + band)]), lo = A.map((v, i) => [xs[i], y(v - band)]).reverse(); bandPath = `<path class="band" d="${smooth(up)} L${lo[0][0]} ${lo[0][1]} ${smooth(lo).replace(/^M[^C]*/, '')} Z"/>`; }
    const la = pa[n - 1][1], lb = pb[n - 1][1], gap = Math.abs(la - lb) < 16, ya = gap ? Math.min(la, lb) - 8 : la, yb = gap ? Math.max(la, lb) + 14 : lb;
    const [na, nb] = la <= lb ? [ya, yb] : [yb, ya];
    const mA = pa.map((p, i) => `<circle class="mk ma" data-i="${i}" style="--i:${i}" cx="${p[0]}" cy="${p[1]}" r="4.6"/>`).join('');
    const mB = pb.map((p, i) => `<rect class="mk mb" data-i="${i}" style="--i:${i}" x="${p[0] - 4.6}" y="${p[1] - 4.6}" width="9.2" height="9.2"/>`).join('');
    el.insertAdjacentHTML('beforeend', legend(names, 'line') + `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${el.dataset.label || 'Line chart'}: ${names[0]} and ${names[1]}"><defs><clipPath id="cp${id}"><rect class="cp" x="0" y="-10" width="0" height="${H + 20}"/></clipPath></defs>${grid}${xl}<g clip-path="url(#cp${id})">${bandPath}<path class="sb" d="${smooth(pb)}"/><path class="sa" d="${smooth(pa)}"/></g>${mB}${mA}<line class="guide" x1="0" x2="0" y1="${T}" y2="${H - Bm}"/><text class="lab la" x="${xs[n - 1] + 14}" y="${la <= lb ? na : nb}" text-anchor="start">${names[0]}</text><text class="lab lb" x="${xs[n - 1] + 14}" y="${la <= lb ? nb : na}" text-anchor="start">${names[1]}</text></svg><div class="tip"></div>`);
    const sv = $('svg.chart', el), rect = $('.cp', el), guide = $('.guide', el), tip = $('.tip', el);
    el._reveal = () => { if (reduce) { rect.setAttribute('width', W); return; } const t0 = performance.now(); (function s(t) { const k = clamp((t - t0) / 2200), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; rect.setAttribute('width', e * W); if (k < 1) requestAnimationFrame(s); })(t0); };
    sv.addEventListener('pointermove', ev => {
      const r = sv.getBoundingClientRect(), cr = el.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * W;
      const i = clamp(Math.round(((px || 0) - L) / ((W - L - R) / (n - 1))), 0, n - 1);
      guide.setAttribute('x1', xs[i]); guide.setAttribute('x2', xs[i]); guide.classList.add('on');
      $$('.mk', sv).forEach(m => m.classList.toggle('hot', +m.dataset.i === i));
      tip.innerHTML = `<b>${tr(labels[i])}</b><br>● ${tr(names[0])}: <b>${A[i]}</b><br>■ ${tr(names[1])}: <b>${B[i]}</b>`;
      tip.classList.add('on');
      const tx = r.left - cr.left + xs[i] / W * r.width + 16; tip.style.left = Math.min(tx, cr.width - tip.offsetWidth - 8) + 'px'; tip.style.top = (r.top - cr.top + Math.min(pa[i][1], pb[i][1]) / H * r.height - 20) + 'px';
    });
    sv.addEventListener('pointerleave', () => { guide.classList.remove('on'); tip.classList.remove('on'); $$('.mk', sv).forEach(m => m.classList.remove('hot')); });
  });

  $$('[data-barchart]').forEach(el => {
    const id = ++uid, A = nums(el.dataset.a), B = nums(el.dataset.b), labels = el.dataset.labels.split(','), names = (el.dataset.names || 'Series A,Series B').split(',');
    const W = 640, H = 300, L = 46, R = 16, T = 16, Bm = 36, n = A.length, max = niceMax(Math.max(...A, ...B) * 1.1), y = v => T + (1 - v / max) * (H - T - Bm), gw = (W - L - R) / n, bw = gw * .32;
    const grid = [0, 1, 2, 3, 4].map(k => { const yy = T + k * (H - T - Bm) / 4; return `<line class="gl" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end">${Math.round(max * (1 - k / 4) * 10) / 10}</text>`; }).join('');
    const bars = A.map((a, i) => { const x0 = L + i * gw + gw / 2; return `<rect class="bar bar-a" style="--i:${i}" x="${x0 - bw - 2}" y="${y(a)}" width="${bw}" height="${H - Bm - y(a)}" rx="2"/><rect class="bar bar-b" style="--i:${i + .5};fill:url(#hx${id})" x="${x0 + 2}" y="${y(B[i])}" width="${bw}" height="${H - Bm - y(B[i])}" rx="2"/><text class="val" style="--i:${i}" x="${x0 - bw / 2 - 2}" y="${y(a) - 6}">${a}</text><text class="val" style="--i:${i + .5}" x="${x0 + bw / 2 + 2}" y="${y(B[i]) - 6}">${B[i]}</text><text x="${x0}" y="${H - 12}" text-anchor="middle">${labels[i]}</text>`; }).join('');
    el.insertAdjacentHTML('beforeend', legend(names, 'bar') + `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${el.dataset.label || 'Bar chart'}: ${names[0]} and ${names[1]}"><defs><pattern id="hx${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" style="fill:var(--b-soft)"/><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--b)" stroke-width="2.5"/></pattern></defs>${grid}${bars}</svg>`);
  });

  $$('[data-rose]').forEach(el => {
    const A = nums(el.dataset.a), B = nums(el.dataset.b), names = (el.dataset.names || 'Series A,Series B').split(','), C = 160, Rr = 118, max = Math.max(...A, ...B);
    const wedge = (i, v, hw) => { const r = v / max * Rr, a0 = (i * 22.5 - hw) * Math.PI / 180, a1 = (i * 22.5 + hw) * Math.PI / 180; return `M${C} ${C} L${C + r * Math.sin(a0)} ${C - r * Math.cos(a0)} A${r} ${r} 0 0 1 ${C + r * Math.sin(a1)} ${C - r * Math.cos(a1)} Z`; };
    const rings = [.25, .5, .75, 1].map(f => `<circle class="rg" cx="${C}" cy="${C}" r="${Rr * f}"/>`).join('');
    const spokes = [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * 45 * Math.PI / 180; return `<line class="rl" x1="${C}" y1="${C}" x2="${C + Rr * Math.sin(a)}" y2="${C - Rr * Math.cos(a)}"/>`; }).join('');
    const card = [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]].map(([l, dx, dy]) => `<text class="card-l" x="${C + dx * (Rr + 22)}" y="${C + dy * (Rr + 22)}">${l}</text>`).join('');
    const pa = A.map((v, i) => `<path class="petal pa" style="--i:${i};transform-origin:${C}px ${C}px" d="${wedge(i, v, 9)}"/>`).join('');
    const pb = B.map((v, i) => `<path class="petal pb" style="--i:${i + 1};transform-origin:${C}px ${C}px" d="${wedge(i, v, 9)}"/>`).join('');
    el.insertAdjacentHTML('beforeend', `<svg class="rose" viewBox="0 0 320 320" role="img" aria-label="${el.dataset.label || 'Wind rose'}: ${names[0]} filled petals, ${names[1]} dashed outline">${rings}${spokes}${pa}${pb}<g class="sweep"><line class="sw" x1="${C}" y1="${C}" x2="${C}" y2="${C - Rr}"/></g>${card}</svg><div class="legend" style="justify-content:center"><span class="lg"><svg viewBox="0 0 28 14"><rect x="4" y="1" width="20" height="12" fill="var(--a)"/></svg>${names[0]}</span><span class="lg"><svg viewBox="0 0 28 14"><rect x="4" y="2" width="20" height="10" fill="none" stroke="var(--b)" stroke-width="2.2" stroke-dasharray="5 4"/></svg>${names[1]}</span></div>`);
    onIO.observe($('svg.rose', el));
  });

  const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); if (e.target._reveal) e.target._reveal(); cio.unobserve(e.target); } }), { threshold: .35 });
  $$('.chart-card').forEach(c => cio.observe(c));
})();

/* ---------- Gallery: reads gallery/captions.txt, finds the image files, filters by section, lightbox ---------- */
(function () {
  const host = $('#gallery'); if (!host) return;
  const CATS = [
    { id: 'phd', prefix: 'PhD', label: 'PhD' }, { id: 'conf', prefix: 'Conf', label: 'Conference' }, { id: 'work', prefix: 'WORK', label: 'Workshops' },
    { id: 'meet', prefix: 'Meet', label: 'Meetings' }, { id: 'events', prefix: 'Event', label: 'Events' }, { id: 'field', prefix: 'Field', label: 'Field' }, { id: 'visit', prefix: 'Visit', label: 'Visit' }, { id: 'myspace', prefix: 'MSpace', label: 'My Space' }
  ];
  const DIR = 'gallery/', EXTS = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG', 'WEBP'], MAXG = 40;
  const seg = $('.seg'), btns = $$('button', seg), empty = $('#gal-empty');
  const ind = document.createElement('i'); ind.className = 'seg-ind'; seg.prepend(ind);
  const place = () => { const b = $('[aria-pressed="true"]', seg); if (!b) return; ind.style.width = b.offsetWidth + 'px'; ind.style.transform = `translateX(${b.offsetLeft}px)`; };
  window.__segPlace = place; place(); addEventListener('resize', place); addEventListener('load', place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);

  let items = [], filter = 'all', lastExt = null; try { lastExt = sessionStorage.getItem('gal-ext') || null; } catch (err) { /* ignore */ }
  const pad = (n, w) => String(n).padStart(w, '0');
  const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  /* gallery/manifest.json lists every photo (extension and size) and gallery/t/ holds light WebP copies for the tiles. */
  const manifestP = fetch(DIR + 'manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null); let MAN = null;
  async function find(base, hint) {
    if (MAN === null) MAN = await manifestP || false;
    if (MAN) { const m = MAN[base]; if (!m) return null; const im = await load(DIR + 't/' + base + '.webp'); if (im) { im._full = DIR + base + '.' + m.e; im._w = m.w; im._h = m.h; return im; } hint = m.e; }
    const order = hint ? [hint] : [...new Set([lastExt, ...EXTS].filter(Boolean))];
    for (const ext of order) { const im = await load(DIR + base + '.' + ext); if (im) { lastExt = ext; try { sessionStorage.setItem('gal-ext', ext); } catch (err) { /* ignore */ } return im; } }
    return null;
  }
  /* Line format:  ID | caption.   ID is PhD_001 for one photo, or PhD_001_01, PhD_001_02 ... for the photos of one event. */
  function parse(text) {
    const map = new Map(), order = [];
    text.split(/\r?\n/).forEach(line => {
      line = line.trim(); if (!line || line[0] === '#') return;
      const i = line.search(/[|\t]/), id = (i < 0 ? line : line.slice(0, i)).trim(), cap = i < 0 ? '' : line.slice(i + 1).trim();
      const m = id.match(/^([A-Za-z]+)_(\d+)(?:_(\d{1,2}))?(?:\.(\w+))?$/); if (!m) return;
      const cat = CATS.find(c => c.prefix.toLowerCase() === m[1].toLowerCase()); if (!cat) return;
      const base = m[1] + '_' + m[2];
      if (!map.has(base)) { map.set(base, { base, cat, cap: '', caps: {}, ext: null }); order.push(base); }
      const e = map.get(base);
      const dm = cap.match(/^\[(\d{4}-\d{2}(?:-\d{2})?)\]\s*/); let c2 = cap; if (dm) { e.date = dm[1]; c2 = cap.slice(dm[0].length); }
      if (m[3]) e.caps[+m[3]] = c2; else { e.cap = c2; if (m[4]) e.ext = m[4]; }
    });
    const list = order.map(b => map.get(b));
    /* Newest first across all sections; undated events keep their order in captions.txt after the dated ones. */
    const key = e => e.date ? Date.parse(e.date.length === 7 ? e.date + '-01' : e.date) : null;
    return list.map((e, i) => ({ e, i, t: key(e) })).sort((a, b) => (a.t == null) - (b.t == null) || (b.t - a.t) || (a.i - b.i)).map(x => x.e);
  }
  async function resolve(e) {
    let im = await find(e.base, e.ext), list = [];
    if (im) list = [{ src: im._full || im.src, th: im._full ? im.src : '', w: im._w || im.naturalWidth, h: im._h || im.naturalHeight, cap: e.caps[1] || '' }];
    else for (let k = 1; k <= MAXG; k++) { const g = await find(e.base + '_' + pad(k, 2)); if (!g) break; list.push({ src: g._full || g.src, th: g._full ? g.src : '', w: g._w || g.naturalWidth, h: g._h || g.naturalHeight, cap: e.caps[k] || '' }); }
    return list;
  }
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  /* Likes: kept in this browser only (localStorage). There is no server, so counts are not shared between visitors. */
  const LK = 'gal-likes'; let liked = new Set();
  try { liked = new Set(JSON.parse(localStorage.getItem(LK) || '[]')); } catch (err) { /* storage unavailable */ }
  const saveLikes = () => { try { localStorage.setItem(LK, JSON.stringify([...liked])); } catch (err) { /* ignore */ } };
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.1C.9 8.6 2.6 5 6.1 5c2 0 3.3 1 3.9 2.1C10.6 6 11.9 5 13.9 5c3.5 0 5.2 3.6 3.7 6.9C19.5 16.4 12 21 12 21z" transform="translate(1.1 0)"/></svg>';
  function burst(btn) {
    const r = btn.getBoundingClientRect(); if (RM && RM.matches) return;
    for (let i = 0; i < 7; i++) { const h = document.createElement('i'); h.className = 'gfly'; h.textContent = '\u2665'; h.style.left = (r.left + r.width / 2) + 'px'; h.style.top = (r.top + r.height / 2) + 'px'; h.style.setProperty('--dx', (Math.random() * 70 - 35) + 'px'); h.style.setProperty('--dy', -(50 + Math.random() * 60) + 'px'); h.style.setProperty('--d', (Math.random() * .15) + 's'); document.body.append(h); setTimeout(() => h.remove(), 1300); }
  }
  function paintLikes() { $$('.glike').forEach(b => { const on = liked.has(b.dataset.id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); const lk = $('#lb-like'); if (lk && lk.dataset.id) { const on = liked.has(lk.dataset.id); lk.classList.toggle('on', on); lk.setAttribute('aria-pressed', on); } }
  function toggleLike(id, btn) { if (liked.has(id)) liked.delete(id); else { liked.add(id); burst(btn); } saveLikes(); paintLikes(); }
  const fmtDate = d => { try { const dt = new Date(d.length === 7 ? d + '-01T12:00:00' : d + 'T12:00:00'); let l = (document.documentElement.lang || 'en'); if (l === 'en') l = 'en-GB'; return dt.toLocaleDateString(l, d.length === 7 ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' }); } catch (err) { return d; } };
  function build(e, list) {
    const f = document.createElement('figure'); f.className = 'gi' + (list.length > 1 ? ' multi' : ''); f.dataset.cat = e.cat.id; f.dataset.cursor = 'View'; f.tabIndex = 0; f.hidden = false;
    const cap = e.cap || list[0].cap;
    f.innerHTML = `<div class="gwrap"><div class="gimg${list.length === 1 && Math.abs(list[0].w / list[0].h / 1.5 - 1) > .12 ? ' fillbox' : ''}">${list.length === 1 && Math.abs(list[0].w / list[0].h / 1.5 - 1) > .12 ? `<i class="gfill" style="background-image:url('${esc(list[0].th || list[0].src)}')"></i>` : ''}<img src="${esc(list[0].th || list[0].src)}" width="${list[0].w}" height="${list[0].h}" alt="${esc(cap)}" decoding="async">${list.slice(1).map(p => `<img class="gx" src="${esc(p.th || p.src)}" alt="" decoding="async">`).join('')}<button type="button" class="glike" data-id="${esc(e.base)}" aria-pressed="false" aria-label="Like this photo" data-i18n-skip>${HEART}</button>${list.length > 1 ? `<span class="gbadge" aria-hidden="true" data-i18n-skip><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="7" width="13" height="13" rx="2"/><path d="M8 4h11a2 2 0 0 1 2 2v11"/></svg>${list.length}</span>` : ''}</div></div><figcaption><div class="gmeta"><b class="cat-${e.cat.id}">${esc(e.cat.label)}</b>${e.date ? `<i class="sep" aria-hidden="true">|</i><time datetime="${e.date}" data-i18n-skip>${fmtDate(e.date)}</time>` : ''}</div>${cap ? `<span class="gcap">${esc(cap)}</span>` : ''}</figcaption>`;
    const lb0 = f.querySelector('.glike'); lb0.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); toggleLike(e.base, lb0); }); lb0.addEventListener('keydown', ev => ev.stopPropagation());
    paintLikes();
    if (list.length > 1) slideshow(f, list);
    return f;
  }
  /* Carousel for events with several photos: photos slide in from the right on a loop,
     autoplay pauses on hover, off screen, hidden tab or reduced motion; arrows, dots and swipe work too. */
  const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  const seed = { n: 0 };
  function slideshow(f, list) {
    const box = f.querySelector('.gimg'), imgs = [...box.querySelectorAll('img')]; const N = imgs.length; if (N < 2) return;
    const track = document.createElement('div'); track.className = 'gtrack';
    const r0 = 1.5;
    imgs.forEach((im, j) => {
      im.classList.remove('gx'); const p = list[j], odd = p && Math.abs(p.w / p.h / r0 - 1) > .12;
      if (!odd) { track.append(im); return; }
      const w = document.createElement('div'); w.className = 'gslide'; const bg = document.createElement('i'); bg.style.backgroundImage = `url("${p.th || p.src}")`; im.classList.add('ct'); w.append(bg, im); track.append(w);
    });
    track.append(imgs[0].cloneNode(true)); track.lastChild.setAttribute('alt', ''); track.lastChild.removeAttribute('loading');
    box.prepend(track);
    const mk = (cls, label, svg) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'gnav ' + cls; b.setAttribute('aria-label', label); b.innerHTML = svg; return b; };
    const prev = mk('prev', 'Previous photo', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>');
    const next = mk('next', 'Next photo', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>');
    const dots = document.createElement('div'); dots.className = 'gdots'; dots.innerHTML = imgs.map((_, j) => `<i data-j="${j}"></i>`).join('');
    box.append(prev, next, dots);
    const di = [...dots.children]; let k = 0, vis = false, hov = false, busy = false, t = 0;
    const all = () => [...track.children].map(c => c.tagName === 'IMG' ? c : c.querySelector('img'));
    const paint = () => { di.forEach((d, j) => d.classList.toggle('on', j === k % N)); all().forEach((im, j) => im.classList.toggle('on', j === k)); };
    const go = (n, anim = true) => {
      track.style.transition = anim ? '' : 'none'; k = n; track.style.transform = `translate3d(${-k * 100}%,0,0)`; paint();
      if (!anim) { void track.offsetWidth; track.style.transition = ''; }
    };
    let fin = 0;
    const settle = () => { clearTimeout(fin); busy = false; if (k >= N) go(0, false); };
    track.addEventListener('transitionend', e => { if (e.target === track) settle(); });
    const step = d => {
      if (busy) return;
      busy = true; clearTimeout(fin); fin = setTimeout(settle, 1350); /* fallback if transitionend never fires */
      if (d > 0) go(k + 1);
      else { if (k === 0) go(N, false); requestAnimationFrame(() => go(k - 1)); }
    };
    go(0, false);
    const stop = e => { e.stopPropagation(); e.preventDefault(); };
    prev.addEventListener('click', e => { stop(e); step(-1); }); next.addEventListener('click', e => { stop(e); step(1); });
    dots.addEventListener('click', e => { const j = e.target.dataset && e.target.dataset.j; if (j == null) return; stop(e); if (!busy && +j !== k % N) { busy = true; clearTimeout(fin); fin = setTimeout(settle, 1350); go(+j); } });
    let x0 = null; box.addEventListener('pointerdown', e => { x0 = e.clientX; }); box.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 40) { step(e.clientX < x0 ? 1 : -1); box.dataset.sw = 1; setTimeout(() => delete box.dataset.sw, 50); } x0 = null; });
    box.addEventListener('click', e => { if (box.dataset.sw) { e.stopPropagation(); e.preventDefault(); } }, true);
    const tick = () => { if (!f.isConnected) { clearInterval(t); return; } if (vis && !hov && !document.hidden && !(RM && RM.matches)) step(1); };
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { vis = en.isIntersecting; })) : null;
    if (io) io.observe(f); else vis = true;
    f.addEventListener('mouseenter', () => { hov = true; }); f.addEventListener('mouseleave', () => { hov = false; });
    setTimeout(() => { if (f.isConnected) t = setInterval(tick, 4200); }, (seed.n++ % 4) * 900);
  }
  function apply() {
    let shown = 0;
    items.forEach(it => { const hide = !revealed || !it.ok || (filter !== 'all' && it.e.cat.id !== filter); it.el.hidden = hide; if (!hide) { it.el.classList.remove('pop'); void it.el.offsetWidth; it.el.style.animationDelay = Math.min(shown, 14) * 55 + 'ms'; it.el.classList.add('pop'); shown++; } });
    empty.hidden = shown > 0 || !done;
  }
  btns.forEach(b => b.addEventListener('click', () => { btns.forEach(x => x.setAttribute('aria-pressed', x === b)); filter = b.dataset.f; place(); apply(); }));

  let done = false, revealed = false; /* tiles stay hidden until every thumbnail is ready, then appear together (no pop-in while loading) */
  (async function init() {
    let text = '';
    try { const r = await fetch(DIR + 'captions.txt', { cache: 'no-cache' }); if (r.ok) text = await r.text(); else console.warn('[gallery] gallery/captions.txt not found (HTTP ' + r.status + ')'); } catch (err) { console.warn('[gallery] could not read gallery/captions.txt', err); }
    if (!text && location.protocol === 'file:') { empty.hidden = false; empty.textContent = 'Preview note: browsers block reading captions.txt when the page is opened by double-clicking the file. Open the site through GitHub Pages, or run "python -m http.server" in this folder and visit http://localhost:8000.'; }
    const entries = parse(text);
    items = entries.map(e => { const el = document.createElement('figure'); el.hidden = true; host.append(el); return { e, el, ok: false, list: [] }; });
    let next = 0, proc = 0, loaded = 0, okN = 0, shownP = 0;
    const bar = document.createElement('div'); bar.className = 'gload'; bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', 'Loading photos');
    bar.innerHTML = '<div class="gl-top"><span class="gl-t" data-i18n-skip>Loading photos</span><span class="gl-p" data-i18n-skip>0%</span></div><div class="gl-bar"><i></i></div>';
    host.before(bar);
    const upd = fin => {
      const tot = items.length + okN, p = fin ? 1 : Math.min(.99, (proc + loaded) / Math.max(1, tot)); shownP = Math.max(shownP, p);
      const v = Math.round(shownP * 100); bar.querySelector('i').style.transform = `scaleX(${shownP})`; bar.querySelector('.gl-p').textContent = v + '%'; bar.setAttribute('aria-valuenow', v);
      if (fin) setTimeout(() => { bar.classList.add('done'); setTimeout(() => bar.remove(), 700); }, 450);
    };
    upd();
    const worker = async () => {
      while (next < items.length) {
        const it = items[next++], list = await resolve(it.e);
        if (list.length) {
          const el = build(it.e, list); el.hidden = !revealed; it.el.replaceWith(el); it.el = el; it.list = list; it.ok = true; okN++;
          const im = el.querySelector('img'), ok = () => { if (im.dataset.d) return; im.dataset.d = 1; loaded++; el.classList.add('ready'); upd(done && loaded >= okN); };
          if (im.complete && im.naturalWidth) ok(); else { im.addEventListener('load', ok); im.addEventListener('error', ok); }
          if (window.__i18nAdd) window.__i18nAdd(el); wire(it);
        }
        proc++; upd();
      }
    };
    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
    done = true; revealed = true; apply(); upd(loaded >= okN);
    items.filter(it => !it.ok).forEach(it => it.el.remove());
  })();

  /* Lightbox: every photo of the visible items, event photos in order */
  const lb = $('#lb'), img = $('#lb-img'), cap = $('#lb-cap'), count = $('#lb-count'); let slides = [], cur = 0; const warm = new Set();
  function slidesNow() { slides = []; items.forEach(it => { if (!it.ok || it.el.hidden) return; it.list.forEach((p, k) => slides.push({ base: it.e.base, src: p.src, th: p.th, cap: p.cap || it.e.cap, cat: it.e.cat.label, k, n: it.list.length })); }); }
  function show(i) {
    if (!slides.length) return; cur = (i + slides.length) % slides.length; const s = slides[cur];
    if (s.th && !warm.has(s.src)) { img.src = s.th; const fl = new Image(); fl.src = s.src; fl.decode().then(() => { warm.add(s.src); if (slides[cur] === s) img.src = s.src; }).catch(() => {}); } else img.src = s.src;
    img.alt = s.cap || '';
    [1, 2].forEach(d => { const nb = slides[(cur + d) % slides.length]; if (nb && !warm.has(nb.src)) { const x = new Image(); x.src = nb.src; x.decode().then(() => warm.add(nb.src)).catch(() => {}); } }); const lkb = $('#lb-like'); if (lkb) { lkb.dataset.id = s.base; paintLikes(); }
    cap.innerHTML = ''; const b = document.createElement('b'); b.textContent = tr(s.cat); cap.append(b, document.createTextNode(s.cap ? tr(s.cap) : ''));
    count.textContent = pad(cur + 1, 2) + ' / ' + pad(slides.length, 2) + (s.n > 1 ? '  ·  ' + (s.k + 1) + '/' + s.n : '');
  }
  /* Lightbox autoplay: every 6 s the next photo slides in. Any manual action restarts the timer. Off for reduced motion until Play is pressed. */
  const AUTO_MS = 6000; let auto = !(RM && RM.matches), atimer = 0, moving = false;
  const prog = document.createElement('div'); prog.className = 'lb-prog'; prog.innerHTML = '<i></i>'; lb.append(prog);
  const play = document.createElement('button'); play.type = 'button'; play.className = 'lb-play'; lb.append(play);
  const paintPlay = () => { play.innerHTML = auto ? '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M7 4.5l12 7.5-12 7.5z"/></svg>'; play.setAttribute('aria-label', auto ? 'Pause slideshow' : 'Play slideshow'); play.setAttribute('aria-pressed', auto); };
  const stopTimer = () => { clearTimeout(atimer); const pi = prog.firstChild; pi.style.transition = 'none'; pi.style.transform = 'scaleX(0)'; };
  const armTimer = () => {
    stopTimer(); if (!auto || !lb.classList.contains('open')) return;
    const pi = prog.firstChild; void pi.offsetWidth; pi.style.transition = `transform ${AUTO_MS}ms linear`; pi.style.transform = 'scaleX(1)';
    atimer = setTimeout(() => { if (document.hidden) { armTimer(); return; } go(cur + 1, 1); }, AUTO_MS);
  };
  async function go(i, dir) {
    if (!slides.length || moving) return; moving = true; stopTimer();
    const n = (i + slides.length) % slides.length, nx = new Image(); nx.src = slides[n].src; try { await nx.decode(); warm.add(slides[n].src); } catch (e) { /* show anyway */ }
    const still = (RM && RM.matches) || !img.animate;
    if (!still) await img.animate([{ transform: 'translate3d(0,0,0)', opacity: 1 }, { transform: `translate3d(${-dir * 7}%,0,0) scale(.97)`, opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).finished.catch(() => {});
    show(n);
    if (!still) { const a = img.animate([{ transform: `translate3d(${dir * 7}%,0,0) scale(.97)`, opacity: 0 }, { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 }], { duration: 760, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }); cap.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' }); await a.finished.catch(() => {}); img.getAnimations().forEach(x => x.cancel()); }
    moving = false; armTimer();
  }
  play.addEventListener('click', e => { e.stopPropagation(); auto = !auto; paintPlay(); if (auto) armTimer(); else stopTimer(); });
  paintPlay();
  function wire(it) {
    const open = () => { slidesNow(); const first = slides.findIndex(s => s.src === it.list[0].src); show(first < 0 ? 0 : first); lb.classList.add('open'); paintPlay(); armTimer(); };
    it.el.addEventListener('click', open); it.el.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
  }
  const lkb0 = $('#lb-like'); if (lkb0) lkb0.addEventListener('click', e => { e.stopPropagation(); toggleLike(lkb0.dataset.id, lkb0); });
  const close = () => { lb.classList.remove('open'); stopTimer(); };
  $('#lb-close').onclick = close; $('#lb-prev').onclick = () => go(cur - 1, -1); $('#lb-next').onclick = () => go(cur + 1, 1);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => { if (!lb.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') go(cur - 1, -1); if (e.key === 'ArrowRight') go(cur + 1, 1); if (e.key === ' ') { e.preventDefault(); play.click(); } });
  let x0 = null;
  lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); x0 = null; });
})();

/* ---------- Workshops page: click a photo to enlarge (full-quality original, arrows within the same workshop) ---------- */
(function () {
  const groups = $$('.wk-pics'); if (!groups.length) return;
  let box = $('#wk-lb');
  if (!box) {
    box = document.createElement('div'); box.id = 'wk-lb'; box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<button type="button" class="lb-btn lb-close" aria-label="Close">&times;</button><button type="button" class="lb-btn lb-prev" aria-label="Previous photo">&#8249;</button><img alt=""><button type="button" class="lb-btn lb-next" aria-label="Next photo">&#8250;</button><div class="lb-count"></div>';
    document.body.appendChild(box);
  }
  const im = box.querySelector('img'), cnt = box.querySelector('.lb-count'), pv = box.querySelector('.lb-prev'), nx = box.querySelector('.lb-next');
  let list = [], cur = 0;
  const show = i => {
    cur = (i + list.length) % list.length; const el = list[cur];
    im.src = el.currentSrc || el.src; im.alt = el.alt;
    const f = new Image(); f.src = el.dataset.full; f.decode().then(() => { if (list[cur] === el) im.src = f.src; }).catch(() => { if (list[cur] === el) im.src = el.dataset.full; });
    cnt.textContent = list.length > 1 ? (cur + 1) + ' / ' + list.length : '';
    pv.hidden = nx.hidden = list.length < 2;
  };
  const close = () => box.classList.remove('open');
  groups.forEach(g => {
    const imgs = $$('img[data-full]', g);
    imgs.forEach(el => {
      const open = () => { list = imgs; show(imgs.indexOf(el)); box.classList.add('open'); };
      el.addEventListener('click', open); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  });
  box.querySelector('.lb-close').onclick = close; pv.onclick = () => show(cur - 1); nx.onclick = () => show(cur + 1);
  box.addEventListener('click', e => { if (e.target === box) close(); });
  document.addEventListener('keydown', e => { if (!box.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  addEventListener('pagehide', close);
})();

/* ---------- Compare slider and spotlight ---------- */
(function () {
  const s = $('#slider'), b = $('#layer-b'), h = $('#handle');
  if (s) s.addEventListener('input', () => { b.style.clipPath = `inset(0 0 0 ${s.value}%)`; h.style.left = s.value + '%'; });
  const spot = $('#spot'); if (!spot) return;
  let active = false, t = 0;
  const set = (x, y) => { spot.style.setProperty('--sx', x + 'px'); spot.style.setProperty('--sy', y + 'px'); };
  const move = (cx, cy) => { const r = spot.getBoundingClientRect(); active = true; set(cx - r.left, cy - r.top); };
  spot.addEventListener('mousemove', e => move(e.clientX, e.clientY));
  spot.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  spot.addEventListener('mouseleave', () => { active = false; });
  (function loop(now) { if (GEN !== window.__gen) return; const dt = Math.min(64, now - (loop.p || now)) || 8; loop.p = now; if (!active && !reduce) { t += .0006 * dt; const r = spot.getBoundingClientRect(); set(r.width * (.5 + .3 * Math.cos(t)), r.height * (.5 + .26 * Math.sin(t * 1.3))); } requestAnimationFrame(loop); })(performance.now());
})();

/* ---------- Scroll-linked effects ---------- */
const nav = $('#nav'), bar = $('#progress'), heroInner = $('.hero-inner');
const hs = $('#showcase'), htrack = $('#htrack'), hbar = $('#hbar'), hcount = $('#hcount'), hcards = $$('.h-card');
const pipe = $('.pipe'), psteps = $$('.pstep');
const tl = $('#tl'), tlFill = $('#tl-fill');
const totop = $('#totop'), tfg = $('#totop-fg');
if (hs && reduce) hs.classList.add('simple');
if (reduce) { psteps.forEach(s => s.classList.add('on')); if (pipe) pipe.style.setProperty('--p', 1); }
totop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
let lastY = 0;
function onScroll() {
  const y = scrollY, max = Math.max(1, root.scrollHeight - innerHeight);
  bar.style.width = (y / max * 100) + '%';
  nav.classList.toggle('hide', y > lastY && y > 240 && !document.body.classList.contains('menu-open')); lastY = y;
  if (heroInner && !reduce) { const p = clamp(y / innerHeight); heroInner.style.opacity = 1 - p * 1.25; heroInner.style.transform = `translateY(${y * .18}px)`; }
  if (tl) { const r = tl.getBoundingClientRect(); tlFill.style.height = (clamp((innerHeight * .62 - r.top) / r.height) * 100) + '%'; }
  if (hs && !reduce && innerWidth > 720) {
    const r = hs.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {
      const p = clamp(-r.top / (r.height - innerHeight)), mx = Math.max(0, htrack.scrollWidth - innerWidth);
      htrack.style.transform = `translateX(${-p * mx}px)`; hbar.style.width = (p * 100) + '%';
      if (hcount) hcount.textContent = String(Math.round(p * (hcards.length - 1)) + 1).padStart(2, '0');
      hcards.forEach(c => { const im = $('img', c); if (!im) return; const cr = c.getBoundingClientRect(); im.style.transform = `translateX(${((cr.left + cr.width / 2 - innerWidth / 2) / innerWidth) * -60}px) scale(1.2)`; });
    }
  } else if (htrack) htrack.style.transform = '';
  if (pipe && !reduce) {
    const r = pipe.getBoundingClientRect(), p = clamp((innerHeight * .78 - r.top) / (r.height * .85 + 60));
    pipe.style.setProperty('--p', p);
    psteps.forEach((s, i) => s.classList.toggle('on', p > 0.02 && p >= i / (psteps.length - 1) - .02));
  }
  totop.classList.toggle('show', y > 700); tfg.style.strokeDashoffset = 138.2 * (1 - y / max);
}
let ticking = false;
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
addEventListener('resize', onScroll); onScroll();


/* ---------- Text size, full screen, language, nav fit ---------- */
const SIZES = [92, 106, 120, 135, 155], DEF = 1;
let si = SIZES.indexOf(+LS.get('fs')); if (si < 0) si = DEF;
const navEl = $('#nav'), menuEl = $('#menu');
function placeInd() { const ind = $('.ind', menuEl), a = $('a[aria-current]', menuEl); if (ind && a) { ind.style.width = a.offsetWidth + 'px'; ind.style.transform = `translateX(${a.offsetLeft}px)`; } }
function fitNav() {
  root.classList.remove('nc');
  const need = innerWidth <= 1080 || navEl.scrollWidth > navEl.clientWidth + 1;
  if (need) root.classList.add('nc'); else document.body.classList.remove('menu-open');
  placeInd();
}
addEventListener('resize', fitNav);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNav);
function setSize(i, announce) {
  si = clamp(i, 0, SIZES.length - 1); root.style.fontSize = SIZES[si] + '%'; LS.set('fs', SIZES[si]);
  $('#sz-dec').disabled = si === 0; $('#sz-inc').disabled = si === SIZES.length - 1;
  fitNav();
  if (announce) toast(tr('Text size') + ': ' + Math.round(SIZES[si] / SIZES[DEF] * 100) + '%');
}
$('#sz-dec').addEventListener('click', () => setSize(si - 1, true));
$('#sz-inc').addEventListener('click', () => setSize(si + 1, true));

const fsBtn = $('#fs-btn'), fsRoot = document.documentElement;
const fsOK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const fsOn = () => document.fullscreenElement || document.webkitFullscreenElement;
function toggleFS() {
  if (!fsOK) return;
  try {
    if (fsOn()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else { const p = (fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen).call(fsRoot); if (p && p.catch) p.catch(() => {}); }
  } catch (e) {}
}
function fsSync() {
  const on = !!fsOn(); root.classList.toggle('is-fs', on); fsBtn.setAttribute('aria-pressed', on);
  const l = tr(on ? 'Exit full screen (F)' : 'Full screen (F)'); fsBtn.setAttribute('aria-label', l); fsBtn.title = l; const mf = $('.mtools .mf'); if (mf) mf.textContent = tr(on ? 'Exit full screen' : 'Full screen'); setTimeout(fitNav, 60);
}
if (!fsOK) { fsBtn.style.display = 'none'; const mf = $('.mtools .mf'); if (mf) mf.style.display = 'none'; }
fsBtn.addEventListener('click', toggleFS);
document.addEventListener('fullscreenchange', fsSync); document.addEventListener('webkitfullscreenchange', fsSync);
document.addEventListener('keydown', e => {
  if (e.key !== 'f' && e.key !== 'F') return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
  const t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
  e.preventDefault(); toggleFS();
});

/* Language engine: collects every text node, label and heading once, then swaps in the dictionary entry (i18n.js). */
const I = { nodes: [], attrs: [], splits: [], title: norm(document.title), desc: '' };
function collect(root, init) {
  const out = { nodes: [], attrs: [] };
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode(n) { const p = n.parentElement; if (!p || p.closest('script,style,noscript,canvas,[data-i18n-skip],[data-dyn],[data-split],.nt')) return NodeFilter.FILTER_REJECT; return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
  let n; while ((n = w.nextNode())) { const o = { n, src: norm(n.nodeValue), pre: n.nodeValue.match(/^\s*/)[0], post: n.nodeValue.match(/\s*$/)[0] }; I.nodes.push(o); out.nodes.push(o); }
  $$('[aria-label],[title],[alt]', root).forEach(el => {
    if (el.closest('[data-dyn],[data-i18n-skip]') || el.hasAttribute('data-split')) return;
    ['aria-label', 'title', 'alt'].forEach(a => { const v = el.getAttribute(a); if (v && v.trim()) { const o = { el, a, src: norm(v) }; I.attrs.push(o); out.attrs.push(o); } });
  });
  if (init) {
    $$('[data-split]').forEach(el => I.splits.push(el));
    const m = $('meta[name="description"]'); if (m) { I.desc = norm(m.content); I.meta = m; }
  }
  return out;
}
collect(document.body, true);
/* Content added after load (the gallery) is registered and translated here. */
window.__i18nAdd = root => {
  const r = collect(root), d = DICT[LANG] || {}, t = s => (LANG === 'en' || d[s] === undefined ? s : d[s]);
  r.nodes.forEach(o => { o.n.nodeValue = o.pre + t(o.src) + o.post; }); r.attrs.forEach(o => o.el.setAttribute(o.a, t(o.src)));
};
const EXTRA_KEYS = ['Switch to light theme', 'Switch to dark theme', 'Open menu', 'Close menu', 'Text size', 'Decrease text size', 'Increase text size', 'Language', 'Full screen (F)', 'Exit full screen (F)', 'Link copied to clipboard', 'Email address copied', 'Voice started', 'Voice paused. Click to resume, double click to restart.', 'Voice resumed', 'Restarting from the beginning', 'Read this page aloud. Click to pause or resume, double click to restart.', 'No voice for this language is installed on this device. The default voice will be used.'];
window.__i18nKeys = () => [...new Set([...I.nodes.map(o => o.src), ...I.attrs.map(o => o.src), ...I.splits.map(e => norm(e.dataset.src)), ...I.title.split(' | '), I.desc, ...EXTRA_KEYS])].filter(Boolean);

function applyThemeLabels() { const b = $('#theme'), t = root.dataset.theme; if (b) { const l = tr(t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); b.setAttribute('aria-label', l); b.title = l; } }
function refreshDyn() {
  applyThemeLabels(); $('#burger').setAttribute('aria-label', tr(document.body.classList.contains('menu-open') ? 'Close menu' : 'Open menu'));
  const sz = $('.sz'); if (sz) sz.setAttribute('aria-label', tr('Text size'));
  [['#sz-dec', 'Decrease text size'], ['#sz-inc', 'Increase text size']].forEach(([q, k]) => { const b = $(q); b.setAttribute('aria-label', tr(k)); b.title = tr(k); });
  const lb = $('#lang-btn'); lb.setAttribute('aria-label', tr('Language')); lb.title = tr('Language');
  $('#lang-code').textContent = (LANGS.find(l => l.c === LANG) || LANGS[0]).s;
  fsSync(); if (window.__voiceLabel) window.__voiceLabel();
}
function applyLang(code) {
  if (!LANGS.some(l => l.c === code)) code = 'en';
  LANG = code; root.lang = code; root.dir = code === 'ar' ? 'rtl' : 'ltr'; LS.set('lang', code);
  const d = DICT[code] || {}, t = s => (code === 'en' || d[s] === undefined ? s : d[s]);
  I.nodes.forEach(o => { o.n.nodeValue = o.pre + t(o.src) + o.post; });
  I.attrs.forEach(o => o.el.setAttribute(o.a, t(o.src)));
  I.splits.forEach(el => renderSplit(el, t(norm(el.dataset.src))));
  document.title = I.title.split(' | ').map(p => (KEEP.test(p) ? p : t(p))).join(' | ');
  if (I.meta) I.meta.content = t(I.desc);
  $$('[data-lang]').forEach(b => b.setAttribute('aria-checked', b.dataset.lang === code));
  refreshDyn(); fitNav(); if (window.__segPlace) window.__segPlace(); if (window.__voiceLang) window.__voiceLang();
  if (code !== 'en') {
    const miss = window.__i18nKeys().filter(k => /[A-Za-z]{3,}/.test(k) && !KEEP.test(k) && d[k] === undefined);
    if (miss.length) console.info('[i18n] no ' + code + ' translation yet for:', miss);
  }
}
(function langMenu() {
  const btn = $('#lang-btn'), menu = $('#lang-menu');
  const open = o => { menu.classList.toggle('open', o); btn.setAttribute('aria-expanded', o); };
  btn.addEventListener('click', e => { e.stopPropagation(); $('#share-menu').classList.remove('open'); open(!menu.classList.contains('open')); });
  document.addEventListener('click', e => { if (!e.target.closest('#lang-menu, #lang-btn')) open(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
  $('#share-btn').addEventListener('click', () => open(false));
  menu.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (!b) return; applyLang(b.dataset.lang); open(false); });
})();


/* ---------- Voice assistant: reads the current tab aloud in the selected language (Web Speech API) ---------- */
(function voice() {
  const btn = $('#voice-btn'); if (!btn) return;
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') { btn.style.display = 'none'; return; }
  const V = {
    en: { tag: 'en-IN', intro: 'Hello, this is Anandu Prabhakaran. Welcome to my website. I am your personal voice assistant, and I will help you understand what is here.', here: 'Currently, you are in the {tab} tab. Here is the key information from this tab.', avail: 'This website is available in English, Malayalam, Hindi, French, German, Arabic, Spanish, Portuguese, Chinese and Japanese. Select a language from the language button, and the voice will switch to it automatically.', tip: 'Press the voice button once to pause or resume, and twice to start again from the beginning.' },
    ml: { tag: 'ml-IN', intro: 'നമസ്കാരം, ഞാൻ ആനന്ദു പ്രഭാകരൻ. എന്റെ വെബ്സൈറ്റിലേക്ക് സ്വാഗതം. ഇവിടെയുള്ള വിവരങ്ങൾ മനസ്സിലാക്കാൻ സഹായിക്കുന്ന നിങ്ങളുടെ വ്യക്തിഗത വോയ്സ് അസിസ്റ്റന്റാണ് ഞാൻ.', here: 'ഇപ്പോൾ നിങ്ങൾ {tab} ടാബിലാണ്. ഈ ടാബിലെ പ്രധാന വിവരങ്ങൾ ഇതാ.', avail: 'ഈ വെബ്സൈറ്റ് ഇംഗ്ലീഷ്, മലയാളം, ഹിന്ദി, ഫ്രഞ്ച്, ജർമ്മൻ, അറബിക്, സ്പാനിഷ്, പോർച്ചുഗീസ്, ചൈനീസ്, ജാപ്പനീസ് എന്നീ ഭാഷകളിൽ ലഭ്യമാണ്. ഭാഷാ ബട്ടണിൽ നിന്ന് ഒരു ഭാഷ തിരഞ്ഞെടുക്കുക, ശബ്ദം സ്വയമേവ ആ ഭാഷയിലേക്ക് മാറും.', tip: 'ശബ്ദ ബട്ടൺ ഒരു തവണ അമർത്തിയാൽ നിർത്തുകയോ തുടരുകയോ ചെയ്യാം; രണ്ടു തവണ അമർത്തിയാൽ തുടക്കം മുതൽ വീണ്ടും തുടങ്ങും.' },
    hi: { tag: 'hi-IN', intro: 'नमस्ते, मैं आनंदु प्रभाकरन हूँ। मेरी वेबसाइट पर आपका स्वागत है। मैं आपका निजी वॉइस असिस्टेंट हूँ, जो यहाँ की जानकारी समझने में आपकी मदद करेगा।', here: 'अभी आप {tab} टैब में हैं। इस टैब की मुख्य जानकारी यह है।', avail: 'यह वेबसाइट अंग्रेज़ी, मलयालम, हिंदी, फ़्रेंच, जर्मन, अरबी, स्पेनिश, पुर्तगाली, चीनी और जापानी भाषाओं में उपलब्ध है। भाषा बटन से कोई भाषा चुनें, आवाज़ अपने आप उसी भाषा में बदल जाएगी।', tip: 'आवाज़ बटन को एक बार दबाने पर वह रुकेगा या फिर शुरू होगा, और दो बार दबाने पर शुरू से दोबारा चलेगा।' },
    fr: { tag: 'fr-FR', intro: "Bonjour, je suis Anandu Prabhakaran. Bienvenue sur mon site. Je suis votre assistant vocal personnel et je vous aide à comprendre son contenu.", here: "Vous êtes actuellement dans l'onglet {tab}. Voici les informations essentielles de cet onglet.", avail: "Ce site est disponible en anglais, malayalam, hindi, français, allemand, arabe, espagnol, portugais, chinois et japonais. Choisissez une langue avec le bouton de langue et la voix changera automatiquement.", tip: "Appuyez une fois sur le bouton vocal pour mettre en pause ou reprendre, et deux fois pour recommencer depuis le début." },
    de: { tag: 'de-DE', intro: 'Hallo, ich bin Anandu Prabhakaran. Willkommen auf meiner Website. Ich bin Ihr persönlicher Sprachassistent und helfe Ihnen, die Inhalte zu verstehen.', here: 'Sie befinden sich derzeit im Tab {tab}. Hier sind die wichtigsten Informationen aus diesem Tab.', avail: 'Diese Website ist auf Englisch, Malayalam, Hindi, Französisch, Deutsch, Arabisch, Spanisch, Portugiesisch, Chinesisch und Japanisch verfügbar. Wählen Sie über die Sprachtaste eine Sprache, und die Stimme wechselt automatisch.', tip: 'Einmal auf die Sprachtaste tippen pausiert oder setzt fort, zweimal tippen startet von vorn.' },
    ar: { tag: 'ar-SA', intro: 'مرحباً، أنا أنندو برابهاكاران. أهلاً بكم في موقعي. أنا مساعدكم الصوتي الشخصي، وسأساعدكم على فهم محتويات الموقع.', here: 'أنتم الآن في تبويب {tab}. إليكم أهم المعلومات في هذا التبويب.', avail: 'الموقع متاح بالإنجليزية والمالايالامية والهندية والفرنسية والألمانية والعربية والإسبانية والبرتغالية والصينية واليابانية. اختاروا لغة من زر اللغة، وسيتحول الصوت إليها تلقائياً.', tip: 'اضغطوا زر الصوت مرة واحدة للإيقاف المؤقت أو المتابعة، ومرتين للبدء من جديد.' },
    es: { tag: 'es-ES', intro: 'Hola, soy Anandu Prabhakaran. Bienvenido a mi sitio web. Soy su asistente de voz personal y le ayudaré a conocer su contenido.', here: 'Actualmente está en la pestaña {tab}. Esta es la información clave de esta pestaña.', avail: 'Este sitio está disponible en inglés, malayalam, hindi, francés, alemán, árabe, español, portugués, chino y japonés. Elija un idioma con el botón de idioma y la voz cambiará automáticamente.', tip: 'Pulse el botón de voz una vez para pausar o reanudar, y dos veces para empezar de nuevo desde el principio.' },
    pt: { tag: 'pt-BR', intro: 'Olá, eu sou Anandu Prabhakaran. Bem-vindo ao meu site. Sou seu assistente de voz pessoal e vou ajudá-lo a conhecer o conteúdo.', here: 'No momento, você está na aba {tab}. Estas são as informações principais desta aba.', avail: 'Este site está disponível em inglês, malaiala, híndi, francês, alemão, árabe, espanhol, português, chinês e japonês. Escolha um idioma no botão de idioma e a voz mudará automaticamente.', tip: 'Toque no botão de voz uma vez para pausar ou continuar, e duas vezes para recomeçar do início.' },
    zh: { tag: 'zh-CN', intro: '您好，我是 Anandu Prabhakaran。欢迎访问我的网站。我是您的个人语音助手，将帮助您了解这里的内容。', here: '您目前位于“{tab}”标签页。以下是该页面的关键信息。', avail: '本网站提供英语、马拉雅拉姆语、印地语、法语、德语、阿拉伯语、西班牙语、葡萄牙语、中文和日语。请通过语言按钮选择语言，语音将自动切换。', tip: '单击语音按钮可暂停或继续，双击则从头开始。' },
    ja: { tag: 'ja-JP', intro: 'こんにちは、Anandu Prabhakaran です。私のウェブサイトへようこそ。私はあなた専用の音声アシスタントとして、ここにある内容の理解をお手伝いします。', here: '現在、「{tab}」タブをご覧です。このタブの重要な情報をお伝えします。', avail: 'このサイトは、英語、マラヤーラム語、ヒンディー語、フランス語、ドイツ語、アラビア語、スペイン語、ポルトガル語、中国語、日本語でご利用いただけます。言語ボタンで言語を選ぶと、音声も自動的に切り替わります。', tip: '音声ボタンを1回押すと一時停止または再開、2回押すと最初からやり直します。' }
  };
  let voices = [], state = 'idle', queue = [], qi = 0, token = 0, warned = {};
  const load = () => { voices = synth.getVoices() || []; };
  load(); if (synth.addEventListener) synth.addEventListener('voiceschanged', load);

  /* Best voices first: neural or natural online voices, then Google, then others, then plain local ones. */
  const cands = tag => {
    const base = tag.split('-')[0].toLowerCase(), t = tag.toLowerCase();
    const sc = v => (/natural|neural|online/i.test(v.name) ? 6 : 0) + (/google/i.test(v.name) ? 4 : 0) + (/microsoft|apple|siri|samantha|enhanced|premium/i.test(v.name) ? 2 : 0) + (v.lang.replace('_', '-').toLowerCase() === t ? 1 : 0) - (/espeak/i.test(v.name) ? 5 : 0);
    return voices.filter(v => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(base)).sort((a, b) => sc(b) - sc(a));
  };
  const pick = tag => { const c = cands(tag), want = LS.get('voice:' + tag); return c.find(v => v.name === want) || c[0] || null; };
  /* Spoken forms of names and acronyms that Malayalam, Hindi and Arabic voices tend to mispronounce or skip. */
  const SAY = {
    ml: [[/CoEDMM/g, 'സി ഒ ഇ ഡി എം എം'], [/IIT Roorkee/g, 'ഐഐടി റൂർക്കി'], [/WRF-SFIRE/g, 'ഡബ്ല്യു ആർ എഫ് സ്ഫയർ'], [/WRF/g, 'ഡബ്ല്യു ആർ എഫ്'], [/PMRF/g, 'പി എം ആർ എഫ്'], [/MoE JRF/g, 'എം ഒ ഇ ജെ ആർ എഫ്'], [/CMIP6/g, 'സിമിപ് സിക്സ്'], [/GEWEX/g, 'ജിവെക്സ്'], [/IISER Kolkata/g, 'ഐസർ കൊൽക്കത്ത'], [/NWP/g, 'എൻ ഡബ്ല്യു പി'], [/Python/g, 'പൈത്തൺ'], [/Origin Pro/g, 'ഒറിജിൻ പ്രോ']],
    hi: [[/CoEDMM/g, 'सीओईडीएमएम'], [/IIT Roorkee/g, 'आईआईटी रुड़की'], [/WRF-SFIRE/g, 'डब्ल्यूआरएफ एसफ़ायर'], [/WRF/g, 'डब्ल्यूआरएफ'], [/PMRF/g, 'पीएमआरएफ'], [/MoE JRF/g, 'एमओई जेआरएफ'], [/CMIP6/g, 'सीमिप सिक्स'], [/GEWEX/g, 'जीवेक्स'], [/IISER Kolkata/g, 'आईसर कोलकाता'], [/NWP/g, 'एनडब्ल्यूपी']],
    ar: [[/CoEDMM/g, 'سي أو إي دي إم إم'], [/IIT Roorkee/g, 'آي آي تي رورقي'], [/WRF-SFIRE/g, 'دبليو آر إف إس فاير'], [/WRF/g, 'دبليو آر إف'], [/PMRF/g, 'بي إم آر إف'], [/MoE JRF/g, 'إم أو إي جي آر إف'], [/CMIP6/g, 'سي ميب ستة'], [/GEWEX/g, 'جيويكس'], [/IISER Kolkata/g, 'آيسر كولكاتا'], [/NWP/g, 'إن دبليو بي'], [/Python/g, 'بايثون']]
  };
  const say = (t, code) => (SAY[code] || []).reduce((x, [r, w]) => x.replace(r, w), t);
  const chunks = text => (text.match(/[^.!?。！？।\n]+[.!?。！？।]?/g) || [text]).map(s => s.trim()).filter(Boolean).flatMap(s => {
    if (s.length <= 220) return [s];
    const parts = [], w = s.split(/(?<=[,;:、，])\s*/); let cur = '';
    w.forEach(x => { if ((cur + ' ' + x).length > 220 && cur) { parts.push(cur); cur = x; } else cur = cur ? cur + ' ' + x : x; });
    if (cur) parts.push(cur); return parts;
  });
  const clean = s => norm(s).replace(/[|•·→↗]/g, ' ').replace(/\s+/g, ' ').trim();

  function pageText() {
    const main = $('main'); if (!main) return [];
    const out = []; let total = 0;
    const add = el => {
      if (!el || el.closest('[data-dyn],[data-i18n-skip],.ticker,nav,footer,.pager,.seg,.chips-hidden')) return;
      const t = clean(el.getAttribute('data-split') !== null ? (el.getAttribute('aria-label') || el.textContent) : el.textContent);
      if (!t || t.length < 3 || total > 1100) return;
      const s = t.length > 340 ? t.slice(0, 340).replace(/\s+\S*$/, '') + '.' : t;
      if (out.includes(s)) return; out.push(s); total += s.length;
    };
    add($('h1', main));
    add($('.lead', main) || $('.hero p', main));
    $$('section', main).forEach(sec => { if (out.length >= 9) return; add($('h2', sec)); add($('p:not(.lead)', sec)); });
    return out.map(t => /[.!?。！？।]$/.test(t) ? t : t + '.');
  }
  function script() {
    const L = V[LANG] || V.en, nav = SITE.nav.find(n => n.id === page), tab = tr(nav ? nav.label : 'Home');
    return { tag: L.tag, parts: [L.intro, L.here.replace('{tab}', tab), ...pageText(), L.avail, L.tip] };
  }

  function setState(s) {
    state = s; btn.classList.toggle('speaking', s === 'speaking'); btn.classList.toggle('paused', s === 'paused');
    btn.setAttribute('aria-pressed', s !== 'idle');
  }
  function speakFrom(i, tag) {
    const my = ++token; synth.cancel();
    qi = i; setState('speaking');
    const v = pick(tag);
    if (!v && voices.length && !warned[tag]) { warned[tag] = 1; toast('No voice for this language is installed on this device. The default voice will be used.'); }
    const next = () => {
      if (my !== token) return;
      if (qi >= queue.length) { setState('idle'); return; }
      const u = new SpeechSynthesisUtterance(say(queue[qi], LANG));
      u.lang = tag; if (v) u.voice = v; u.rate = .95; u.pitch = 1;
      u.onend = () => { if (my === token) { qi++; next(); } };
      u.onerror = e => { if (my === token && e.error !== 'canceled' && e.error !== 'interrupted') { qi++; next(); } };
      synth.speak(u);
    };
    next();
  }
  function start() { const sc = script(); queue = sc.parts.flatMap(chunks); speakFrom(0, sc.tag); }
  function stopAll() { token++; synth.cancel(); queue = []; qi = 0; setState('idle'); }
  function pause() { token++; synth.cancel(); setState('paused'); toast('Voice paused. Click to resume, double click to restart.'); }
  function resume() { toast('Voice resumed'); speakFrom(qi, (V[LANG] || V.en).tag); }
  function restart() { toast('Restarting from the beginning'); start(); }

  let timer = 0;
  btn.addEventListener('click', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (state === 'idle') { toast('Voice started. Press L to change language and R to reset to English.', 5000); start(); }
      else if (state === 'speaking') pause(); else resume();
    }, 230);
  });
  btn.addEventListener('dblclick', e => { e.preventDefault(); clearTimeout(timer); restart(); });
  addEventListener('pagehide', () => { try { synth.cancel(); } catch (e) {} });

  function pickerLabel() {
    const vp = $('#voice-pick'); if (!vp) return;
    const tag = (V[LANG] || V.en).tag, c = cands(tag), cur = pick(tag);
    $('#vp-l').textContent = tr('Voice');
    $('#vp-n').textContent = cur ? cur.name.replace(/^(Microsoft|Google)\s+/i, '').replace(/\s*-.*$/, '').slice(0, 18) : tr('Default');
    vp.disabled = c.length < 2; vp.style.opacity = c.length < 2 ? .6 : 1;
  }
  const vpBtn = $('#voice-pick');
  if (vpBtn) vpBtn.addEventListener('click', e => {
    e.stopPropagation();
    const tag = (V[LANG] || V.en).tag, c = cands(tag); if (c.length < 2) return;
    const cur = pick(tag), n = c[(c.indexOf(cur) + 1) % c.length];
    LS.set('voice:' + tag, n.name); pickerLabel(); toast(n.name);
    if (state === 'speaking') start();
  });
  if (synth.addEventListener) synth.addEventListener('voiceschanged', pickerLabel);
  window.__voiceLang = () => { pickerLabel(); if (state === 'speaking') start(); else if (state === 'paused') stopAll(); };
  window.__voiceLabel = () => { pickerLabel(); const l = tr('Read this page aloud. Click to pause or resume, double click to restart.'); btn.setAttribute('aria-label', l); btn.title = l; };
  window.__voiceLabel(); pickerLabel();
  window.__voiceToggle = () => { if (state === 'idle') { toast('Voice started. Press L to change language and R to reset to English.', 5000); start(); } else if (state === 'speaking') pause(); else resume(); };
  window.__voiceState = () => state;
})();

/* ---------- Right-click shortcut menu and keys: F / F11 full screen, V voice assistant, L language (only while the voice assistant is on) ---------- */
(function ctxMenu() {
  const field = t => !!(t && t.closest && t.closest('input,textarea,select,[contenteditable="true"]'));
  const voiceOK = () => !!window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined' && !!$('#voice-btn');
  const voiceOn = () => voiceOK() && window.__voiceState && window.__voiceState() !== 'idle';
  const nextLang = () => { const i = LANGS.findIndex(l => l.c === LANG); return LANGS[(i + 1) % LANGS.length]; };
  function cycleLang() {
    if (!voiceOn()) { toast(tr('Turn on the voice assistant (V) to change language with L. Otherwise use the language button.')); return; }
    const n = nextLang(); applyLang(n.c); toast(n.n);
  }
  function resetLang() { if (LANG === 'en') { toast('Already in English'); return; } applyLang('en'); toast('English'); }
  let menu = null;
  const close = () => { if (menu) { menu.remove(); menu = null; } };
  function openAt(x, y) {
    close();
    const st = window.__voiceState ? window.__voiceState() : 'idle';
    const rows = [];
    if (fsOK) rows.push(['F / F11', tr(fsOn() ? 'Exit full screen' : 'Full screen'), '', toggleFS]);
    if (voiceOK()) rows.push(['V', tr(st === 'speaking' ? 'Pause voice assistant' : st === 'paused' ? 'Resume voice assistant' : 'Voice assistant'), '', () => window.__voiceToggle()]);
    if (voiceOn()) rows.push(['L', tr('Language change'), (LANGS.find(l => l.c === LANG) || LANGS[0]).s + ' > ' + nextLang().s, cycleLang]);
    if (LANG !== 'en') rows.push(['R', tr('Reset language to English'), (LANGS.find(l => l.c === LANG) || LANGS[0]).s + ' > EN', resetLang]);
    if (!rows.length) return;
    menu = document.createElement('div'); menu.className = 'ctxm'; menu.setAttribute('role', 'menu'); menu.setAttribute('translate', 'no');
    rows.forEach(([k, label, sub, fn]) => {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.innerHTML = '<kbd></kbd><span class="cl"></span><span class="cs"></span>';
      b.querySelector('kbd').textContent = k; b.querySelector('.cl').textContent = label; b.querySelector('.cs').textContent = sub;
      b.addEventListener('click', e => { e.stopPropagation(); close(); fn(); });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
    requestAnimationFrame(() => menu && menu.classList.add('open'));
  }
  document.addEventListener('contextmenu', e => { if (field(e.target)) return; e.preventDefault(); openAt(e.clientX, e.clientY); });
  document.addEventListener('mousedown', e => { if (menu && !e.target.closest('.ctxm')) close(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  addEventListener('scroll', close, true); addEventListener('resize', close); addEventListener('blur', close);
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    if (e.key === 'F11') { if (fsOK) { e.preventDefault(); toggleFS(); } return; }
    if (field(e.target)) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'v' && voiceOK()) { e.preventDefault(); window.__voiceToggle(); }
    else if (k === 'l') { e.preventDefault(); cycleLang(); }
    else if (k === 'r') { e.preventDefault(); resetLang(); }
  });
})();

setSize(si, false);
applyLang(LS.get('lang') || 'en');
addEventListener('load', fitNav);

})();
