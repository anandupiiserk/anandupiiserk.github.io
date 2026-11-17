(function () {
if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { r = Math.min(typeof r === 'number' ? r : 6, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
function run(hero, cv, opts) {
  "use strict";
  const FONT = opts.font;
  let DPRMAX = 2;
  const stage = hero; let cx = cv.getContext('2d');
  const $ = id => hero.querySelector('#fs-' + id);
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, SK = 0, dpr = 1, G = 5, GW = 0, GH = 0, N = 0;

  /* ================= helpers ================= */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const css = (c, al = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), sx), lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), sx), sy); };
  const kf = (arr, d) => { for (let i = 1; i < arr.length; i++) if (d <= arr[i][0]) { const a = arr[i - 1], b = arr[i]; return lerp(a[1], b[1], (d - a[0]) / (b[0] - a[0] || 1)); } return arr[arr.length - 1][1]; };

  /* ================= terrain ================= */
  function relief(u, v) {
    const m1 = Math.sin(6.283 * (u * 4.3 + .9 * Math.sin(v * 3.1 + 1.2) + .25 * vn(u * 3, v * 2)));
    const m2 = Math.sin(6.283 * (u * 9.6 + 1.4 * Math.sin(v * 5.3 + .4)));
    return .55 * m1 + .22 * m2 + .4 * (vn(u * 14, v * 5) - .5);
  }
  const elev = (u, v) => v + .07 * relief(u, v) * (.4 + .8 * Math.min(1, v));
  const treeline = u => .74 + .12 * (vn(u * 5, 3) - .5);
  const skyline = u => SK - H * .24 * (.45 * (1 - Math.abs(Math.sin(6.283 * (u * 1.7 + .1)))) + .35 * (1 - Math.abs(Math.sin(6.283 * (u * 3.9 + .6)))) + .2 * vn(u * 11, 7));
  const vOfY = y => (H - y) / (H - SK);
  let LAKE = { x: 0, y: 0, rx: 0, ry: 0 };
  const inLake = (x, y, m = 0) => { const dx = (x - LAKE.x) / (LAKE.rx + m), dy = (y - LAKE.y) / (LAKE.ry + m * .5); return dx * dx + dy * dy < 1; };

  const DAY = { forestA: hex('#2c6a4c'), forestB: hex('#24584a'), meadow: hex('#86a05a'), sub: hex('#8a8c5e'), rock: hex('#938a7e'), scree: hex('#b2aa9c'), snow: hex('#f3f7fb') };
  const MOON = [.17, .24, .46];
  let terr = [null, null], snowC = [], tint = null, topY = 0;
  function buildTerrain() {
    topY = Math.floor(SK - H * .25); const ch = Math.ceil((H - topY) / 2), cw = Math.ceil(W / 2);
    const mk = () => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; return c; };
    terr = [mk(), mk()]; snowC = [mk(), mk(), mk()]; tint = mk();
    const ctxs = terr.map(c => c.getContext('2d')), imgs = ctxs.map(c => c.createImageData(cw, ch)), sctx = snowC.map(c => c.getContext('2d')), simg = sctx.map(c => c.createImageData(cw, ch));
    const d = .004, snowV = [.46, .68, .90];
    for (let py = 0; py < ch; py++) {
      const y = topY + py * 2;
      for (let px = 0; px < cw; px++) {
        const u = (px * 2) / W, v = vOfY(y); if (y < skyline(u)) continue;
        const r = relief(u, v), ru = (relief(u + d, v) - relief(u - d, v)) / (2 * d), rv = (relief(u, v + d) - relief(u, v - d)) / (2 * d);
        const n1 = vn(u * 60, v * 40), n2 = vn(u * 150, v * 100), tl = treeline(u);
        let c;
        if (v < .07 + .03 * vn(u * 9, 1)) c = mixc(DAY.forestA, DAY.meadow, .75);
        else if (v < tl - .10) c = mixc(DAY.forestA, DAY.forestB, vn(u * 7, v * 4));
        else if (v < tl + .05) c = mixc(DAY.forestB, DAY.sub, sstep(tl - .10, tl + .05, v) * .8 + .15 * (n1 - .5));
        else c = mixc(DAY.rock, DAY.scree, .5 + .6 * (n1 - .5));
        if (vn(u * 6 + 3, v * 7) > .70 && v < tl - .08 && v > .1) c = mixc(c, DAY.meadow, .7);
        const lit0 = clamp(.62 - .02 * ru - .002 * rv + .05 * (n2 - .5), .32, 1.05), lit = lerp(lit0, .78, sstep(tl - .02, tl + .12, v) * .7) * (1 - .18 * sstep(.1, .8, -r));
        const k = (px + py * cw) * 4, day = c.map(x => x * lit), night = c.map((x, i) => x * (.25 + .7 * lit) * MOON[i] * 1.5);
        [day, night].forEach((col, t) => { const im = imgs[t].data; im[k] = col[0]; im[k + 1] = col[1]; im[k + 2] = clamp(col[2], 0, 255); im[k + 3] = 255; });
        snowV.forEach((sv, t) => { const sl = sv + .05 * (vn(u * 8, 2) - .5) - .10 * Math.max(0, -r) * (t < 2 ? 1 : 0) + .03 * (n1 - .5), a = sstep(sl, sl + .035, v), im = simg[t].data; im[k] = 244; im[k + 1] = 248; im[k + 2] = 253; im[k + 3] = a * 235 * (.7 + .3 * lit); });
      }
    }
    ctxs.forEach((c, i) => c.putImageData(imgs[i], 0, 0)); sctx.forEach((c, i) => c.putImageData(simg[i], 0, 0));
  }

  /* ================= fire grid: dynamic spread, fuel, moisture ================= */
  let lineMask = new Uint8Array(1), fuelSave = new Float32Array(1), fuel0, chute, el, rel, slp, Lf, st, tigR, bd, inten, acc, FL, wet;
  let trees = [];
  const burning = [];
  const DX = [1, -1, 0, 0, 1, -1, 1, -1], DY = [0, 0, 1, -1, 1, 1, -1, -1], DL = DX.map((x, i) => Math.hypot(x, DY[i]));
  const R0 = 3.4;
  const cellUV = (i, j) => [(i + .5) * G / W, vOfY(SK + (j + .5) * G)];
  const cellXY = k => [((k % GW) + .5) * G, SK + (((k / GW) | 0) + .5) * G];
  const cellAt = (x, y) => clamp(Math.round((x - G / 2) / G), 0, GW - 1) + clamp(Math.round((y - SK - G / 2) / G), 0, GH - 1) * GW;

  function buildFire() {
    GW = Math.ceil(W / G); GH = Math.ceil((H - SK) / G); N = GW * GH;
    fuel0 = new Float32Array(N); chute = new Float32Array(N); el = new Float32Array(N); rel = new Float32Array(N); slp = new Float32Array(N * 8);
    Lf = new Float32Array(N); st = new Uint8Array(N); tigR = new Float32Array(N); bd = new Float32Array(N).fill(-1e9); inten = new Float32Array(N); acc = new Float32Array(N); FL = new Float32Array(N); wet = new Float32Array(N); lineMask = new Uint8Array(N); fuelSave = new Float32Array(N);
    layoutWorld();
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const [u, v] = cellUV(i, j), k = i + j * GW, tl = treeline(u), r = relief(u, v), [x, y] = cellXY(k);
      let f = 1; if (v > tl + .05) f = 0; else if (v > tl - .10) f = .6;
      if (v < .07) f = 1.4; else if (vn(u * 6 + 3, v * 7) > .70 && v < tl - .08) f = 1.5;
      if (v > .5 && r > .62) f = 0; if (r < -.3) f *= .85;
      if (inLake(x, y, 8)) f = 0;
      fuel0[k] = f * (.85 + .3 * vn(u * 30, v * 20)); rel[k] = r; el[k] = elev(u, v); chute[k] = 1 + 1.1 * sstep(.05, .85, -r);
      Lf[k] = clamp(.55 + .45 * vn(u * 20 + 5, v * 12), .3, 1);
    }
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const k = i + j * GW; for (let d = 0; d < 8; d++) { const a = i + DX[d], b = j + DY[d]; if (a < 0 || b < 0 || a >= GW || b >= GH) { slp[k * 8 + d] = -9; continue; } const q = a + b * GW; slp[k * 8 + d] = 1 + clamp((el[q] - el[k]) / (DL[d] * G) * 900, -.5, 2.6); } }
    const NT = clamp(Math.round(W * H * .0042), 1700, 4400); trees = [];
    for (let s = 0; s < NT * 3 && trees.length < NT; s++) {
      const x = rnd() * W, y = SK + rnd() * (H - SK), u = x / W, v = vOfY(y), tl = treeline(u); if (v > tl + .035 || inLake(x, y, 12) || nearStream(x, y, 7)) continue;
      const k = cellAt(x, y), f = fuel0[k]; let dens = f <= 0 ? 0 : f > 1.3 ? .16 : f < .7 ? .35 : 1; dens *= .8 + .4 * sstep(-.2, .6, -rel[k]);
      if (rnd() > dens) continue;
      const sc = .42 + 1.05 * Math.pow(1 - v, 1.35);
      const rl = relief(u, v), dd2 = .004, lt = clamp(.62 - .02 * (relief(u + dd2, v) - relief(u - dd2, v)) / (2 * dd2), .32, 1.05); const gul = -rel[k], ty = v > tl - .05 ? 2 : ((gul > .22 && rnd() < .8) || (v < .22 && rnd() < .3)) ? 1 : 0; if (ty === 2 && rnd() < .4) continue; trees.push({ ty, lt, x, y, k, h: (24 + 16 * rnd()) * sc * Math.pow(H / 720, .6), w: .26 + .1 * rnd(), ph: rnd() * 6.28, tone: rnd(), surv: rnd(), torch: rnd(), born: -1e8, g0: 1, fate: 0, fd: -1, bloom: rnd() > .8 });
    }
    trees.sort((a, b) => a.y - b.y); burning.length = 0;
  }

  /* ================= story: seasons, weather, incidents (Indian Himalaya) ================= */
  const YEAR = 365, MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], ML = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const dateStr = d => { let m = 0; d = Math.floor(d); while (d >= ML[m]) { d -= ML[m]; m++; } return (d + 1) + ' ' + MN[m]; };
  const KF = {
    temp: [[0, .12], [45, .2], [90, .46], [125, .86], [150, .96], [168, .72], [200, .58], [250, .5], [280, .4], [320, .22], [365, .12]],
    rh: [[0, .5], [45, .45], [90, .34], [125, .14], [150, .11], [168, .8], [200, .95], [250, .9], [280, .5], [320, .32], [365, .5]],
    wind: [[0, .1], [60, .22], [100, .28], [125, .3], [165, .35], [185, .3], [250, .2], [300, .2], [365, .1]],
    cloud: [[0, .25], [60, .35], [125, .18], [150, .3], [168, .8], [200, 1], [250, .85], [275, .3], [320, .08], [365, .2]],
    snow: [[0, 1], [50, 1], [90, .55], [125, .2], [165, .02], [270, .02], [310, .35], [340, .8], [365, 1]],
    litter: [[0, .1], [60, .3], [90, 1], [165, 1], [185, .15], [270, .15], [285, .7], [330, .5], [365, .1]],
    green: [[0, .35], [60, .45], [100, .55], [140, .3], [168, .6], [210, 1], [265, 1], [300, .6], [365, .35]]
  };
  const SEASONS = [
    [0, 'Winter', 'Cold, dry spells. Cold air settles in the valleys at night and can hold smoke low (inversion).'],
    [59, 'Spring', 'Warming slopes. Rhododendron flowers; chir pine needles begin to fall and dry litter builds up.'],
    [120, 'Pre-monsoon', 'Hot and dry before the rains. Dry litter is at its peak and fires spread fastest.'],
    [166, 'Monsoon', 'Rain wets the fuel and puts fires out. Grass and young trees grow fast.'],
    [273, 'Post-monsoon', 'Skies clear. Monsoon grass dries and becomes fuel again.'],
    [334, 'Winter', 'Cold, dry spells. Cold air settles in the valleys at night and can hold smoke low (inversion).']
  ];
  const seasonOf = d => { let s = SEASONS[0]; for (const x of SEASONS) if (d >= x[0]) s = x; return s; };

  const YP = {};   /* per-year random plan */
  const rr = (a, b) => a + Math.random() * (b - a);
  function randCell(vmin, vmax) { for (let t = 0; t < 400; t++) { const x = rr(.08, .92) * W, y = SK + (1 - rr(vmin, vmax)) * (H - SK), k = cellAt(x, y); if (fuel0[k] > 0 && st[k] === 0 && !inLake(x, y, 30)) return [x, y]; } return [W * .5, SK + (H - SK) * .7]; }
  function planYear(y) {
    if (YP[y]) return YP[y]; const dry = rr(-1, 1), p = { dry, onset: Math.round(dry * 9 + rr(-4, 4)), list: [] };
    const mk = (id, cause, name, lo, hi, vm, label, extra) => { const [ax, ay] = randCell(.05, vm), base = rr(.06, .3), pk = rr(.3, .97);
      p.list.push(Object.assign({ id, cause, name, doy: Math.round(rr(lo, hi)), ax, ay, label, heli: pk > .6 || dry > .3, crewAt: rr(11, 28), cap: 190,
        wind: [[0, base], [14, base], [24, base + (pk - base) * .6], [40, pk], [100, pk * rr(.6, 1)], [130, base * 1.5], [190, base]],
        rainAt: Math.random() < .5 ? rr(70, 130) : 0 }, extra || {})); };
    const H1 = 'Human-caused ignition (negligence, litter or farm burning, or arson)';
    if (Math.random() < .45) mk('w', 'human', 'Winter fire', 15, 62, .5, 'A fire started by people in a dry winter spell', { wind: [[0, .08], [60, .14], [190, .08]], heli: false, rainAt: 0 });
    if (Math.random() < .55) mk('s', 'human', 'Spring fire', 70, 112, .5, H1);
    if (Math.random() < .9) mk('p', 'human', 'Pre-monsoon fire', 118, 150, .55, H1);
    if (Math.random() < .5 + .2 * dry) mk('l', 'lightning', 'Dry lightning fire', 128, 164, .6, 'Dry lightning strike, no rain at first', { rainAt: rr(60, 110), heli: true });
    if (Math.random() < .5) mk('d', 'human', 'Post-monsoon fire', 286, 322, .5, 'Fire set in dry monsoon grass', { heli: false, rainAt: 0, wind: [[0, .2], [40, .34], [100, .2]] });
    if (Math.random() < .5 + .15 * dry) mk('c', 'camp', 'Trekking camp fire', 105, 150, .5, 'A campfire left burning at a trekking camp spreads into the forest', { camp: (Math.random() * 3) | 0, heli: true });
    if (!p.list.length) mk('p', 'human', 'Pre-monsoon fire', 118, 150, .55, H1);
    YP[y] = p; return p;
  }

  /* ---------- state ---------- */
  let mode = 'auto', n = 0, rate = 3.2, nTarget = 0, T = 0, speed = 1, last = performance.now(), autoT = 0, fade = 1;
  let absDay = 20, doy = 20, yearIdx = 0, inc = null, incDone = {}, fastDay = 3.2, incDay = .085, rainHold = 0;
  const S = { temp: .2, rh: .5, wind: .1, cloud: .3, rain: 0, fm: .15, snow: 1, green: .4, litter: 1, inv: 0, storm: 0, flash: 0 };
  const WIN = { x: 0, y: 0, sx: 0 };
  const wf = new Float32Array(8);
  let danger = 0, dryD = 0;

  /* ================= wind, particles ================= */
  const parts = [], spots = [], wv = [0, 0], rain = [], streaks = [];
  function wind(x, y, t, out) {
    const aloft = sstep(SK + H * .12, SK - H * .10, y), g = 1 + .25 * Math.sin(t * .31 + x * .004), sw = S.wind * 34;
    const dy = lerp(-14, 13, n) * (1 - S.inv * .6), sx = (lerp(8, -4, n) * (1 - S.inv * .6) + sw) * g, sy = dy - sw * .3, ax = -.9 * (sw + 12), ay = -2;
    out[0] = lerp(sx, ax, aloft) + 4 * Math.sin(y * .021 + t * .8 + x * .006); out[1] = lerp(sy, ay, aloft) + 3.5 * Math.cos(x * .017 - t * .6);
  }
  const spr = (rgb, size = 64) => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(.55, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c; };
  const SM = { dark: spr('58,52,50'), mid: spr('130,126,122'), light: spr('214,212,210'), nDark: spr('26,30,44'), nMid: spr('70,78,104'), nLight: spr('120,132,168'), white: spr('255,255,255'), warm: spr('255,150,50'), grey: spr('120,128,140') };

  /* ================= callouts (pointers) ================= */
  const calls = [], flags = {};
  const A = { fire: [0, 0], crew: null, heli: null, light: null, sock: [0, 0], lake: [0, 0], fog: [0, 0], litter: [0, 0], tree: [0, 0] };
  const sayA = () => {};
  const say = (key, text, anchor, dur = 7, off = [48, -54]) => { if (flags[key] && T - flags[key] < 30) return; flags[key] = T; if (calls.length > 2) calls.shift(); calls.push({ text, anchor, t0: T, dur, off }); };

  /* ================= fire core ================= */
  function ignite(q, ros) {
    if (st[q] !== 0 || fuel0[q] <= 0) return;
    st[q] = 1; tigR[q] = T; bd[q] = absDay; inten[q] = clamp(ros / (R0 * 4.2), .08, 1); FL[q] = 7 + 8 * Lf[q]; burning.push(q);
  }
  function steam(k, c = 2) { const [x, y] = cellXY(k); for (let s = 0; s < c; s++) if (parts.length < 1300) parts.push({ k: 4, x: x + (Math.random() - .5) * G, y, vx: 2 + Math.random() * 3, vy: -(8 + Math.random() * 8), r: 5 + Math.random() * 5, age: 0, max: 3 + Math.random() * 2, w: Math.random() }); }
  const WNDN = () => Math.hypot(WIN.x, WIN.y);

  function stepFire(dt, nn) {
    const nightK = 1 - .3 * nn, damp0 = S.fm;
    for (let d = 0; d < 8; d++) wf[d] = clamp(1 + 1.5 * (WIN.x * DX[d] + WIN.y * DY[d]) / DL[d], .35, 3.3);
    for (let a = burning.length - 1; a >= 0; a--) {
      const k = burning[a], u = T - tigR[k];
      if (S.rain > .22 && Math.random() < S.rain * dt * 1.1) { st[k] = 2; Lf[k] = .04; steam(k, 2); burning[a] = burning[burning.length - 1]; burning.pop(); continue; }
      if (u > FL[k]) { st[k] = 2; Lf[k] = .04; burning[a] = burning[burning.length - 1]; burning.pop(); continue; }
      const i = k % GW, j = (k / GW) | 0;
      for (let d = 0; d < 8; d++) {
        const sl = slp[k * 8 + d]; if (sl < -5) continue;
        const q = (i + DX[d]) + (j + DY[d]) * GW; if (st[q] !== 0 || fuel0[q] <= 0) continue;
        const dm = Math.pow(Math.max(0, 1 - (damp0 + .4 * wet[q]) / .30), 1.3);
        const ros = R0 * fuel0[q] * (.4 + .9 * Lf[q]) * dm * sl * wf[d] * chute[q] * nightK; if (ros <= .02) continue;
        acc[q] += ros / (DL[d] * G) * dt; if (acc[q] >= 1) ignite(q, ros);
      }
      /* embers loft ahead of the front in strong wind and dry fuel */
      if (S.wind > .55 && dryD > .45 && Math.random() < dt * .006 * S.wind * S.wind * inten[k] && spots.length < 40) {
        const len = 22 + Math.random() * 60, bx = DX[0], by = DY[0]; const tx = ((k % GW) + .5) * G + (WIN.x / (WNDN() || 1)) * len + (Math.random() - .5) * 14, ty = SK + (((k / GW) | 0) + .5) * G + (WIN.y / (WNDN() || 1)) * len + (Math.random() - .5) * 10;
        const q = cellAt(tx, ty); if (st[q] === 0 && fuel0[q] > 0) spots.push({ t0: T, t1: T + 1.6 + len / 40, from: k, to: q });
      }
    }
    for (let s = spots.length - 1; s >= 0; s--) { const sp = spots[s]; if (T >= sp.t1) { if (S.rain < .2 && dryD > .3) ignite(sp.to, R0 * 1.5); spots.splice(s, 1); } }
  }
  function extinguishAt(x, y, r, p, wetAmt) {
    const i0 = Math.max(0, ((x - r) / G) | 0), i1 = Math.min(GW - 1, ((x + r) / G) | 0), j0 = Math.max(0, ((y - r - SK) / G) | 0), j1 = Math.min(GH - 1, ((y + r - SK) / G) | 0); let n2 = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = i + j * GW, [cx2, cy2] = cellXY(k), dd = Math.hypot(cx2 - x, cy2 - y); if (dd > r) continue;
      wet[k] = Math.max(wet[k], wetAmt * (1 - dd / r * .5));
      if (st[k] === 1 && Math.random() < p) { st[k] = 2; Lf[k] = .04; const ix = burning.indexOf(k); if (ix >= 0) { burning[ix] = burning[burning.length - 1]; burning.pop(); } steam(k, 1); n2++; }
    }
    return n2;
  }

  /* ================= crews, fire line, helicopter ================= */
  const crews = []; let heli = null, line = null, resc = null;
  const fireCentre = () => A.fire;
  const nearestBurning = (x, y, maxd = 1e9) => { let best = -1, bd2 = maxd * maxd; const m = Math.min(burning.length, 220); for (let s = 0; s < m; s++) { const k = burning[(Math.random() * burning.length) | 0], [cx2, cy2] = cellXY(k), d2 = (cx2 - x) ** 2 + (cy2 - y) ** 2; if (d2 < bd2) { bd2 = d2; best = k; } } return best; };
  function sendCrew(count) { for (let c = 0; c < count; c++) crews.push({ x: W * (.06 + .04 * c), y: H + 12, tx: 0, ty: 0, mode: 'walk', tool: c % 2, ph: Math.random() * 6, k: -1, role: null, slot: c }); }
  /* fire line: a strip cleared of litter and brush, so a surface fire has no fuel to cross it */
  function planLine(x0, y0, half) {
    const pts = []; for (let x = x0 - half; x <= x0 + half; x += G * .8) { const xx = clamp(x, 6, W - 6); pts.push([xx, clamp(y0 + Math.sin(xx * .02) * 5, SK + 10, H - 24)]); }
    line = { pts, p: 0, n: 0, state: 'go', dur: Math.max(8, pts.length * .13), t0: T };
  }
  function resetLine() { if (lineMask) for (let k = 0; k < N; k++) if (lineMask[k]) { fuel0[k] = fuelSave[k]; lineMask[k] = 0; } line = null; fDirty[0] = fDirty[1] = true; }
  function markLine(upTo) {
    for (; line.n < upTo; line.n++) { const [x, y] = line.pts[line.n], k0 = cellAt(x, y); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const q = k0 + a + b * GW; if (q < 0 || q >= N || lineMask[q] || st[q] === 1) continue; lineMask[q] = 1; fuelSave[q] = fuel0[q]; fuel0[q] = .0001; } }
  }
  function updateLine(dt) {
    if (!line) return;
    if (line.state === 'go') { const lc = crews.filter(c => c.role === 'line'); if (!lc.length || lc.every(c => c.at) || T - line.t0 > 30) line.state = 'cut'; }
    else if (line.state === 'cut') { line.p = Math.min(1, line.p + dt / line.dur); markLine(Math.floor(line.p * line.pts.length)); if (line.p >= 1) { markLine(line.pts.length); line.state = 'done'; fDirty[0] = fDirty[1] = true; if (inc) say('lined', 'Fire line complete: no fuel left to burn across the strip', () => line ? line.pts[line.pts.length >> 1] : A.fire, 7, [-100, 50]); } }
  }
  function updateCrews(dt) {
    A.crew = null;
    crews.forEach(c => {
      if (c.role === 'line') {
        if (!line) { c.role = null; c.mode = 'idle'; return; }
        if (line.state === 'go') { const [px, py] = line.pts[0], dx = px - c.x, dy = py + 8 - c.y, d = Math.hypot(dx, dy); if (d < 6) { c.mode = 'idle'; c.at = true; } else { c.x += dx / d * 20 * dt; c.y += dy / d * 20 * dt; c.mode = 'walk'; } }
        else if (line.state === 'cut') { const hd = line.pts[Math.min(line.pts.length - 1, Math.floor(line.p * line.pts.length))]; c.x = hd[0] - 6 - c.slot * 12; c.y = hd[1] + 9; c.mode = 'work'; }
        else { c.role = null; c.mode = 'idle'; c.k = -1; }
        if (!A.crew) A.crew = [c.x, c.y - 16]; return;
      }
      if (c.eng && !eng && c.mode !== 'done') c.mode = 'done';
      if (c.mode === 'idle' && !inc) c.mode = 'done';
      if (c.mode !== 'done' && (c.k < 0 || st[c.k] !== 1)) { c.k = nearestBurning(c.x, c.y - 10, c.mode === 'work' ? 160 : 1e9); if (c.k >= 0) { const [x, y] = cellXY(c.k); const vx = c.x - x, vy = c.y - y, vd = Math.hypot(vx, vy) || 1, so = 58; c.fx = x; c.fy = y; c.tx = clamp(x + vx / vd * so + (c.tool ? 14 : -14), 10, W - 10); c.ty = clamp(y + vy / vd * so, SK + 16, H - 14); c.mode = 'walk'; } else if (c.mode === 'work') c.mode = 'done'; }
      if (c.mode === 'walk' && c.k >= 0) { const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy); if (d < 4) c.mode = 'work'; else { c.x += dx / d * 16 * dt; c.y += dy / d * 16 * dt; } }
      if (c.mode === 'work' && c.k >= 0) { const fdx = c.fx - c.x, fdy = c.fy - (c.y - 16), fd = Math.hypot(fdx, fdy) || 1; if (fd < 38) { c.x -= fdx / fd * 22 * dt; c.y = clamp(c.y - fdy / fd * 22 * dt, SK + 16, H - 14); } if (fd < 80) { extinguishAt(c.fx, c.fy, c.eng ? 42 : 30, (c.eng ? 1.9 : 1.1) * dt, .9); if (Math.random() < dt * (c.eng ? 28 : 14) && parts.length < 1300) { const T2 = .65; parts.push({ k: 3, x: c.x + 5 * Math.sign(fdx || 1), y: c.y - 15, vx: fdx / T2 + (Math.random() - .5) * 8, vy: (fdy - 19) / T2 + (Math.random() - .5) * 8, r: 1.3, age: 0, max: T2 * (.9 + Math.random() * .2), w: 0 }); } } }
      if (!A.crew) A.crew = [c.x, c.y - 16];
    });
    for (let c = crews.length - 1; c >= 0; c--) if (crews[c].mode === 'done') { const q = crews[c]; if (q.eng) { if (!eng) { crews.splice(c, 1); continue; } const dx = eng.x - q.x, dy = eng.y - 3 - q.y, d = Math.hypot(dx, dy); if (d < 7) crews.splice(c, 1); else { q.x += dx / d * 22 * dt; q.y += dy / d * 22 * dt; } } else { q.x += 14 * dt; if (q.x > W + 20) crews.splice(c, 1); } }
  }
  /* helicopter: enters from the left, fills a bucket in the pond, drops on the fire, leaves when the fire is small */
  function startHeli() { if (heli) return; heli = { x: -90, y: SK * .8, vx: 40, vy: 0, ph: 'in', t: 0, load: 0, trips: 0, face: 1, bx: -90, by: SK * .8 + 46, rot: 0, tx: 0, ty: 0, tgx: 0, tgy: 0, pitch: 0 }; }
  function updateHeli(dt) {
    A.heli = null; if (!heli) return; const h = heli;
    const steer = (x, y, vmax) => { const dx = x - h.x, dy = y - h.y, d = Math.hypot(dx, dy), want = Math.min(vmax, d * 1.5), k = Math.min(1, dt * 1.7); h.vx += (dx / (d || 1) * want - h.vx) * k; h.vy += (dy / (d || 1) * want - h.vy) * k; h.x += h.vx * dt; h.y += h.vy * dt; return d < 7; };
    const lx = LAKE.x, ly = LAKE.y - 46, small = burning.length < 8 && (!inc || inc.endT > 0);
    if (h.ph === 'in') { if (steer(lx - 30, ly - 40, 150)) { h.ph = 'dip'; h.t = 0; } }
    else if (h.ph === 'dip') { steer(lx, ly, 70); h.t += dt; if (h.t > 1 && h.t < 3.2 && Math.random() < dt * 5) ripples.push({ x: h.bx + (Math.random() - .5) * 6, y: LAKE.y - 2, t0: T }); h.load = clamp((h.t - 1.4) / 1.4, 0, 1); if (h.t > 3.4) { const c = nearestBurning(W * .5, SK + (H - SK) * .5); if (c >= 0) { const [x, y] = cellXY(c); h.tx = x; h.ty = y - 76; h.tgx = x; h.tgy = y; h.ph = 'carry'; } else h.ph = 'out'; } }
    else if (h.ph === 'carry') { if (steer(h.tx, h.ty, 115)) { h.ph = 'drop'; h.t = 0; } }
    else if (h.ph === 'drop') { steer(h.tx, h.ty, 30); h.t += dt; if (h.t > .6 && h.t < 3) { h.load = Math.max(0, h.load - dt * .45); extinguishAt(h.tgx, h.tgy, 54, 1.3 * dt, 1); for (let s = 0; s < 3; s++) if (parts.length < 1500) parts.push({ k: 2, x: h.bx + (Math.random() - .5) * 8, y: h.by + 8, vx: (Math.random() - .5) * 10 + S.wind * 20, vy: 60 + Math.random() * 50, r: 1.4 + Math.random(), age: 0, max: (h.tgy - h.by) / 100 + .3, w: 0 }); if (Math.random() < dt * 6 && parts.length < 1500) parts.push({ k: 4, x: h.tgx + (Math.random() - .5) * 30, y: h.tgy, vx: 4, vy: -10, r: 5, age: 0, max: 2.2, w: 0 }); } if (h.t > 3.2) { h.load = 0; h.trips++; h.ph = small ? 'out' : 'back'; } }
    else if (h.ph === 'back') { if (steer(lx, ly - 30, 120)) { h.ph = 'dip'; h.t = 0; } }
    else if (h.ph === 'out') { h.vx += (120 - h.vx) * Math.min(1, dt * 1.2); h.vy += (-26 - h.vy) * Math.min(1, dt * 1.2); h.x += h.vx * dt; h.y += h.vy * dt; if (h.x > W + 120) heli = null; }
    if (!heli) return;
    const tf = Math.abs(h.vx) > 10 ? Math.sign(h.vx) : h.face; h.face += (tf - h.face) * Math.min(1, dt * 3.2);
    h.pitch += (clamp(h.vx * .0016, -.2, .2) * (h.face < 0 ? -1 : 1) - h.pitch) * Math.min(1, dt * 3);
    const kb = Math.min(1, dt * 3.4); h.bx += (h.x - h.vx * .13 - h.bx) * kb; h.by += (h.y + 44 - h.by) * kb; h.rot += dt * 55;
    A.heli = [h.x, h.y];
  }
  /* ================= incident engine ================= */
  const DCL = ['Low', 'Moderate', 'High', 'Very high', 'Extreme'], DCOL = ['#009E73', '#F0E442', '#E69F00', '#D55E00', '#8B1A4A'], dIdx = () => clamp(Math.floor(danger * 5), 0, 4);
  function startIncident(def) {
    absDay = yearIdx * YEAR + def.doy;
    const camp = def.cause === 'camp' ? camps[def.camp % camps.length] : null;
    inc = { def, t: 0, ignited: false, detected: false, crew: false, heliReq: false, endT: 0, ax: camp ? camp.x : def.ax, ay: camp ? camp.y : def.ay, rainOn: false, warned: danger >= .5 && Math.random() < .85, camp, igT: 3 };
    if (inc.warned) inc.igT = 17; if (camp) { inc.igT = Math.max(inc.igT, 9); camp.lit = true; camp.ignoring = true; }
    crews.length = 0; Object.keys(flags).forEach(k => delete flags[k]);
  }
  const windTarget = () => inc ? kf(inc.def.wind, inc.t) : kf(KF.wind, doy);
  function startLineAt(ax, ay) { const lx = clamp(ax + WIN.x * 80, 90, W - 90), ly = clamp(ay - (H - SK) * .17, SK + 14, H - 24); planLine(lx, ly, Math.min(W * .16, 150)); }
  function updateIncident(dt) {
    if (!inc) return;
    const d = inc.def; inc.t += dt; const igT = inc.igT;
    if (inc.warned && !inc.wset) { inc.wset = true; say('warn', 'Flux tower data: fire danger is ' + DCL[dIdx()].toLowerCase() + '. Early warning issued', () => A.ec, 9, [-250, 30]); if (inc.camp) say('ban', 'Campfires are banned in this dry spell', (cp => () => [cp.x, cp.y - 26])(inc.camp), 9, [-60, -64]); }
    if (inc.warned && inc.t > 2.5 && !inc.lineStarted) { inc.lineStarted = true; startLineAt(inc.ax, inc.ay); sendCrew(3); crews.forEach((c, i) => { c.role = 'line'; c.slot = i; }); say('line', 'Fire line: crews clear litter and brush from a strip above the area at risk', () => line ? line.pts[line.pts.length >> 1] : A.fire, 10, [-130, 52]); }
    if (d.cause === 'lightning' && !inc.ignited) { S.storm = sstep(igT - 3, igT, inc.t); if (inc.t > igT + .1 && !inc.bolt) { inc.bolt = { t0: T, pts: bolt(inc.ax, inc.ay) }; S.flash = 1; } }
    if (!inc.ignited && inc.t >= igT + (d.cause === 'lightning' ? .3 : 0)) {
      inc.ignited = true; const k0 = cellAt(inc.ax, inc.ay);
      if (inc.camp) { for (let a = 0; a < 14; a++) { const an = a / 14 * 6.283, q = cellAt(inc.ax + Math.cos(an) * 20, inc.ay + Math.sin(an) * 12); ignite(q, R0 * 1.6); } scareBirds(inc.ax, inc.ay); }
      else for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const q = k0 + a + b * GW; if (q >= 0 && q < N) ignite(q, R0 * 1.4); }
      scareBirds(inc.ax, inc.ay); say('ig', d.label, () => A.fire, 8);
      if (inc.warned) { inc.crew = true; say('crew', 'Crews on standby attack the fire from the fire line', () => A.crew || A.fire, 9, [-200, 38]); }
    }
    if (inc.ignited && !inc.detected && inc.t > igT + 3 && burning.length >= 10) { inc.detected = true; inc.dt0 = inc.t; say('det', inc.warned ? 'Tower sensors register the heat: the early warning centre alerts the forest department' : 'Smoke spotted: forest department alerted', (w => () => w ? A.ec : A.fire)(inc.warned), 8, [-220, -46]); }
    if (inc.detected && !inc.crew && inc.t > inc.dt0 + d.crewAt) { inc.crew = true; inc.crewT = inc.t; inc.eng = Math.random() < .6; sendCrew(d.heli ? 4 : 3); say('crew', 'Ground crew with hand tools: beaters and water sprayers', () => A.crew || A.fire, 9, [-200, 38]); }
    if (inc.crew && !inc.lineStarted && !inc.warned && burning.length > 50 && inc.t > (inc.crewT || 0) + 12) { inc.lineStarted = true; const f = A.fire; startLineAt(f[0], f[1] + 10); crews.slice(0, 2).forEach((c, i) => { c.role = 'line'; c.slot = i; c.k = -1; }); say('line', 'Crews cut a fire line ahead of the fire', () => line ? line.pts[line.pts.length >> 1] : A.fire, 10, [-130, 52]); }
    if (d.heli && inc.crew && !inc.heliReq && (burning.length > 150 || (S.wind > .7 && burning.length > 90))) { inc.heliReq = true; inc.hr0 = inc.t; say('hreq', 'Extreme fire: helicopter requested', () => A.fire, 7, [70, 44]); }
    if (inc.heliReq && !heli && !inc.heliDone && inc.t > inc.hr0 + 8) { startHeli(); inc.heliDone = true; say('heli', 'Helicopter fills its bucket in the pond and drops water on the fire', () => A.heli || A.fire, 10, [-220, 56]); }
    if (((d.rainAt && inc.t > d.rainAt) || inc.t > d.cap * .8) && !inc.rainOn) { inc.rainOn = true; say('rain', 'Rain arrives: the fire is put out', () => A.fire, 9, [-170, -60]); }
    if (inc.ignited && burning.length === 0 && inc.t > igT + 8) { inc.endT += dt; if (inc.endT > 5) { endInc(); return; } }
    if (inc.t > d.cap) { if (burning.length) burning.splice(0).forEach(k => { st[k] = 2; }); endInc(); }
  }
  function endInc() { incDone[yearIdx + inc.def.id] = 1; if (inc.camp) { inc.camp.ignoring = false; inc.camp.lit = false; } inc = null; if (heli) heli.ph = 'out'; S.storm = 0; }
  function bolt(x, y) { const pts = [[x + (Math.random() - .5) * 30, SK * .15]]; let cxp = pts[0][0], cyp = pts[0][1]; while (cyp < y) { cyp += 14 + Math.random() * 16; cxp += (Math.random() - .5) * 26 + (x - cxp) * .12; pts.push([cxp, Math.min(cyp, y)]); } pts.push([x, y]); return pts; }

  const yp0 = () => planYear(yearIdx);
  function updateWorld(dtSim, nn) {
    if (yearIdx !== (updateWorld.ly ?? yearIdx)) { resetLine(); } updateWorld.ly = yearIdx;
    rate += ((inc ? incDay : fastDay) - rate) * Math.min(1, dtSim * .9);   /* smooth change of time rate */
    if (!inc) {
      absDay += rate * dtSim; yearIdx = Math.floor(absDay / YEAR); doy = absDay - yearIdx * YEAR;
      for (const def of yp0().list) if (!incDone[yearIdx + def.id] && doy >= def.doy && doy < def.doy + 12) { startIncident(def); break; }
    } else { absDay += rate * dtSim; yearIdx = Math.floor(absDay / YEAR); doy = absDay - yearIdx * YEAR; }
    /* weather targets */
    const yp = planYear(yearIdx), mons = sstep(166 + yp.onset, 172 + yp.onset, doy) * (1 - sstep(262, 272, doy)), pulse = clamp(.45 + .5 * Math.sin(doy * 1.3) + .2 * Math.sin(doy * .37), 0, 1);
    let rainT = mons * pulse * (.75 + .25 * (1 - yp.dry)); if (inc && inc.rainOn) rainT = Math.max(rainT, .85);
    const k = dtSim * 1.2; S.temp += (clamp(kf(KF.temp, doy) + .07 * yp.dry * (1 - mons), 0, 1) - S.temp) * Math.min(1, dtSim * .8); S.rh += (clamp(kf(KF.rh, doy) - .10 * yp.dry * (1 - mons), .05, 1) - S.rh) * Math.min(1, dtSim * .8);
    S.wind += (windTarget() - S.wind) * Math.min(1, dtSim * (inc ? .7 : 2)); S.cloud += (Math.max(kf(KF.cloud, doy), rainT, S.storm * .9) - S.cloud) * Math.min(1, dtSim * .8);
    S.rain += (rainT - S.rain) * Math.min(1, dtSim * 1.5); S.snow = kf(KF.snow, doy); S.green += (kf(KF.green, doy) - S.green) * Math.min(1, dtSim); S.litter = kf(KF.litter, doy);
    const eq = clamp(.04 + .24 * S.rh + (S.temp < .25 ? .03 : 0), .03, .34), dd = rate * dtSim;
    S.fm += (eq - S.fm) * (1 - Math.exp(-dd / 4)) + S.rain * dtSim * .14; S.fm = clamp(S.fm, .03, .4);
    dryD = clamp(1 - S.fm / .28, 0, 1);
    const cold = sstep(.45, .15, S.temp); S.inv += (cold * (.35 + .65 * nn) - S.inv) * Math.min(1, dtSim * .8);
    const diurn = nn > .5 ? .22 : -.30; WIN.x = S.wind * .85; WIN.y = S.wind * -.35 + (diurn * (1 - S.inv * .7));
    /* danger index from fuel dryness, wind and heat (illustrative) */
    danger = clamp(.55 * dryD + .3 * S.wind + .15 * S.temp, 0, 1) * (1 - S.rain);
  }

  /* ================= fire drawing ================= */
  const scarC = document.createElement('canvas'), glowC = document.createElement('canvas');
  const scarD = [hex('#3a3331'), hex('#07070a')], grassD = [hex('#7fa157'), hex('#16301f')], tanD = [hex('#c9a45a'), hex('#4b4128')];
  const FLAME = 10;
  function updateFire(nn, time, dt) {
    const sg = scarC.getContext('2d'), gg = glowC.getContext('2d'), si = sg.createImageData(GW, GH), gi = gg.createImageData(GW, GH), sd = si.data, gd = gi.data;
    const sc = mixc(scarD[0], scarD[1], nn), gc = mixc(grassD[0], grassD[1], nn), tc = mixc(tanD[0], tanD[1], nn);
    const litRate = (.0016 + .0042 * S.litter) * rate * dt * (1 - S.rain * .6);
    for (let k = 0; k < N; k++) {
      if (wet[k] > 0) wet[k] = Math.max(0, wet[k] - dt * .012);
      if (lineMask[k]) { const q2 = k * 4, tcl = mixc(hex('#c9a45a'), hex('#5a4b30'), nn); sd[q2] = tcl[0]; sd[q2 + 1] = tcl[1]; sd[q2 + 2] = tcl[2]; sd[q2 + 3] = 235; continue; }
      if (fuel0[k] <= 0) continue; const q = k * 4, s = st[k];
      if (s === 0) { Lf[k] = Math.min(1, Lf[k] + litRate * .5); const a = .2 * dryD * Lf[k] * (S.litter > .3 ? 1 : .5) * (1 - S.green * .4); if (a > .01) { sd[q] = tc[0]; sd[q + 1] = tc[1]; sd[q + 2] = tc[2]; sd[q + 3] = a * 255; } continue; }
      const u = T - tigR[k], age = absDay - bd[k]; let g = 0;
      if (s === 1) { g = .5 + .5 * inten[k]; const a = 255 * sstep(0, 5, u) * .88; sd[q] = sc[0]; sd[q + 1] = sc[1]; sd[q + 2] = sc[2]; sd[q + 3] = a; }
      else {
        Lf[k] = Math.min(1, Lf[k] + litRate * 1.4);
        const ac = .88 * (1 - sstep(25, 140, age)), ag = .62 * sstep(70, 190, age) * (1 - sstep(260, 430, age));
        const col = mixc(sc, gc, ag / Math.max(.01, ac + ag)), al = Math.min(.92, ac + ag);
        sd[q] = col[0]; sd[q + 1] = col[1]; sd[q + 2] = col[2]; sd[q + 3] = al * 255;
        if (u < 45) { const fl = .5 + .5 * Math.sin(time * 7 + (k % 97) * 3.1) * Math.sin(time * 3.3 + (k % 53)); g = Math.exp(-Math.max(0, u - FL[k]) / 11) * (.22 + .5 * fl) * (.6 + .6 * hash(k, 3)); if (S.rain > .2) g *= 1 - S.rain; }
      }
      if (g > .01) { gd[q] = 255; gd[q + 1] = 90 + 80 * g; gd[q + 2] = 25; gd[q + 3] = clamp(g * 150, 0, 255); }
    }
    sg.putImageData(si, 0, 0); gg.putImageData(gi, 0, 0);
  }
  function drawFlame(bx, by, hh, ww, sw, al) {
    const sh = (h, w, col, a) => { cx.fillStyle = col; cx.globalAlpha = a; cx.beginPath(); cx.moveTo(bx - w, by); cx.quadraticCurveTo(bx - w * .55, by - h * .5, bx + sw, by - h); cx.quadraticCurveTo(bx + w * .5, by - h * .55, bx + w, by); cx.closePath(); cx.fill(); };
    sh(hh, ww, '#D55E00', .92 * al); sh(hh * .74, ww * .72, '#E69F00', .96 * al); sh(hh * .46, ww * .42, '#F6E96A', .96 * al); cx.globalAlpha = 1;
  }
  const lean = () => S.wind * 9 + lerp(1, -.5, n);

  /* ================= vegetation: static layers (60 fps), live trees, decor ================= */
  const K = { lA0: hex('#2a6a4c'), lA1: hex('#3f7a42'), lB0: hex('#3c8460'), lB1: hex('#58a050'), nA: hex('#102c2e'), nB: hex('#173c3c'), dA: hex('#24574a'), dN: hex('#0d2426'), burnt: hex('#17120f'), burntN: hex('#050507'), sc: hex('#8a6a34'), scN: hex('#2e2619'), hot: hex('#9a3d12'),
    l1: hex('#93b05a'), l2: hex('#3d7f44'), l3: hex('#2a6a40'), l4: hex('#d98c2b'), l5: hex('#a8501f'), nl: [14, 36, 38], bare: hex('#6b5a44'), bareN: hex('#2a2a32') };
  let LY = [], fDirty = [true, true], fLast = [{ nn: -9, gr: -9, d: -9, t: -9 }, { nn: -9, gr: -9, d: -9, t: -9 }], LEAF = { a: 1, col: [60, 120, 60] }, vegAvg = .5;
  const decor = [];
  function mkLayer() { const c = document.createElement('canvas'); c.width = Math.ceil(W * dpr); c.height = Math.ceil(H * dpr); return [c, c.getContext('2d')]; }
  function leafNow(d, nn) {
    let a, c;
    if (d < 62 || d > 338) { a = 0; c = K.l2; } else if (d < 100) { a = sstep(62, 92, d); c = mixc(K.l1, K.l2, sstep(75, 105, d)); }
    else if (d < 285) { a = 1; c = mixc(K.l2, K.l3, sstep(110, 170, d)); } else { a = 1 - sstep(318, 338, d); c = mixc(mixc(K.l3, K.l4, sstep(285, 312, d)), K.l5, sstep(312, 336, d)); }
    return { a, col: mixc(c, K.nl, nn * .72) };
  }
  function palette(nn) {
    const gr = S.green * .5;
    return { lA: mixc(mixc(K.lA0, K.lA1, gr), K.nA, nn), lB: mixc(mixc(K.lB0, K.lB1, gr), K.nB, nn), dA: mixc(K.dA, K.dN, nn), burnt: mixc(K.burnt, K.burntN, nn), scorch: mixc(K.sc, K.scN, nn), hot: K.hot, bare: mixc(K.bare, K.bareN, nn) };
  }
  function buildDecor() {
    decor.length = 0; seed = 303;
    for (let s = 0; s < 2400 && decor.length < 520; s++) {
      const x = rnd() * W, y = SK + rnd() * (H - SK), u = x / W, v = vOfY(y), k = cellAt(x, y), tl = treeline(u);
      if (inLake(x, y, 26) || nearStream(x, y, 9)) continue;
      const fz = fuel0[k];
      if (v > tl - .06 && v < tl + .40 && rnd() < .55) decor.push({ k: 'rock', x, y, s: .6 + rnd() * 1.1 });
      else if (fz > 1.3 && rnd() < .8) decor.push({ k: rnd() < .45 ? 'flower' : 'tuft', x, y, s: .7 + rnd() * .6, c: (rnd() * 3) | 0 });
      else if (fz > 0 && rnd() < .18) decor.push({ k: 'tuft', x, y, s: .6 + rnd() * .5, c: 0 });
    }
    decor.sort((a, b) => a.y - b.y);
  }
  function drawDecor(nn) {
    const dry = clamp(dryD * (1 - S.green * .6), 0, 1), bloomF = sstep(150, 185, doy) * (1 - sstep(262, 285, doy)) + .5 * sstep(62, 80, doy) * (1 - sstep(105, 120, doy));
    const grassC = mixc(mixc(hex('#4f8a4a'), hex('#b49a58'), dry), hex('#16301f'), nn * .8), FL3 = [hex('#CC79A7'), hex('#F0E442'), hex('#f3f6fb')];
    for (const d of decor) {
      const sc = (.5 + 1.0 * Math.pow(clamp((d.y - SK) / (H - SK), 0, 1), 1.1)) * d.s;
      if (d.k === 'rock') {
        const c0 = mixc(hex('#8f877b'), hex('#222838'), nn * .8), c1 = mixc(hex('#bdb4a6'), hex('#3b4258'), nn * .8);
        cx.fillStyle = css(c0); cx.beginPath(); cx.moveTo(d.x - 7 * sc, d.y); cx.lineTo(d.x - 4 * sc, d.y - 5 * sc); cx.lineTo(d.x + 1 * sc, d.y - 7 * sc); cx.lineTo(d.x + 6 * sc, d.y - 3 * sc); cx.lineTo(d.x + 8 * sc, d.y); cx.closePath(); cx.fill();
        cx.fillStyle = css(c1); cx.beginPath(); cx.moveTo(d.x - 4 * sc, d.y - 5 * sc); cx.lineTo(d.x + 1 * sc, d.y - 7 * sc); cx.lineTo(d.x + 2 * sc, d.y - 3 * sc); cx.closePath(); cx.fill();
      } else if (d.k === 'tuft') {
        cx.strokeStyle = css(grassC, .95); cx.lineWidth = 1; cx.beginPath(); for (let b = -2; b <= 2; b++) { cx.moveTo(d.x + b * 1.6 * sc, d.y); cx.lineTo(d.x + b * 2.6 * sc, d.y - (4 + 2 * (2 - Math.abs(b))) * sc); } cx.stroke();
      } else if (bloomF > .15) {
        cx.fillStyle = css(mixc(FL3[d.c], [30, 40, 60], nn * .55), .85 * bloomF); cx.fillRect(d.x, d.y - 3 * sc, 2 * sc + .5, 2 * sc + .5);
        cx.fillRect(d.x + 3 * sc, d.y - 1.5 * sc, 2 * sc + .5, 2 * sc + .5);
      }
    }
  }
  function nearStream(x, y, m) { for (let i = 0; i < STREAM.length; i++) { const dx = STREAM[i][0] - x, dy = STREAM[i][1] - y; if (dx * dx + dy * dy < m * m) return true; } return false; }

  function classify() {
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i], k = t.k, ly = t.ty === 1 ? 1 : 0;
      if (lineMask[k]) { if (t.s !== 5) { t.s = 5; if (t.st) { t.st = false; fDirty[ly] = true; } } continue; }
      if (t.s === 5) { t.born = absDay; t.g0 = .1; t.fate = 0; t.fd = -1; t.s = 0; }
      const bdk = bd[k], u = T - tigR[k]; let burntNow = bdk > t.born && st[k] !== 0; const ageD = absDay - bdk;
      let grow = t.born < -1e7 ? 1 : clamp(t.g0 + (absDay - Math.max(t.born, 0)) * .0021, .1, 1);
      if (burntNow && t.fd !== bdk && st[k] !== 0 && u > 0) { const I = inten[k], torching = t.torch < clamp((I - .25) * 2, 0, .9); t.fate = (torching || t.surv < .4) ? 2 : 1; t.fd = bdk; }
      let state = 0;
      if (burntNow && t.fd === bdk) {
        if (u < 9 && t.fate === 2 && u > 0) state = 2;
        else if (t.fate === 2) { if (ageD > 50 && S.green > .5) { t.born = absDay; t.g0 = .12; t.fate = 0; burntNow = false; grow = .12; } else state = 4; }
        else { if (ageD > 75 && S.green > .45) { t.born = absDay; t.g0 = grow; t.fate = 0; burntNow = false; } else state = u < 2 ? 1 : 3; }
      } else if (st[k] === 1 && u < 0.001) state = 1;
      t.s = state; t.gw = grow; t.u = u;
      const stat = state === 0 && grow >= .999; if (stat !== t.st) { t.st = stat; fDirty[ly] = true; }
    }
  }
  const mixCss = (a, b, q) => { const pa = a.match(/[\d.]+/g).map(Number), pb = b.match(/[\d.]+/g).map(Number); return `rgb(${(pa[0] + (pb[0] - pa[0]) * q) | 0},${(pa[1] + (pb[1] - pa[1]) * q) | 0},${(pa[2] + (pb[2] - pa[2]) * q) | 0})`; };
  function paintTree(t, nn, time, P, ln, bo, still) {
    const k = t.k, u = t.u, state = t.s, ty = t.ty, hS = ty === 1 ? .66 : ty === 2 ? .5 : 1;
    const hh = t.h * (state === 4 ? 1 : t.gw) * hS, w = hh * t.w * (ty === 1 ? 1.45 : ty === 2 ? 1.5 : 1), bx = t.x, by = t.y, lt = .55 + .6 * t.lt;
    const sway = still ? ln * hh * .02 : Math.sin(time * 1.4 + t.ph) * hh * .05 + ln * hh * .035 * (.5 + S.wind);
    const tone = (a, b, q) => css(mixc(a, b, q).map(x => x * lt)), plain = (a, b, q) => css(mixc(a, b, q));
    const trunk = (col, a) => { cx.strokeStyle = css(col, a); cx.lineWidth = Math.max(1, hh * .05); cx.beginPath(); cx.moveTo(bx, by); cx.lineTo(bx + sway * .3, by - hh * .5); cx.stroke(); };
    if (state === 4) {
      cx.strokeStyle = css(P.burnt, .96); cx.lineWidth = Math.max(1, hh * .06); cx.beginPath(); cx.moveTo(bx, by); cx.lineTo(bx + sway * .3, by - hh * .78);
      for (let b = 1; b <= 3; b++) { const yy = by - hh * (.18 + b * .17), L = hh * .12 * (1.2 - b * .2) * (b % 2 ? 1 : -1); cx.moveTo(bx + sway * .15 * b, yy); cx.lineTo(bx + sway * .15 * b + L, yy - hh * .07); } cx.stroke();
      const sm = u - FL[k]; if (sm > -1 && sm < 34) { const f = Math.exp(-Math.max(0, sm) / 14) * (.5 + .5 * Math.sin(time * 6 + t.ph)) * (1 - S.rain); if (f > .08) { cx.globalCompositeOperation = 'lighter'; cx.fillStyle = `rgba(255,${120 + 80 * f | 0},40,${f * (.35 + .35 * nn)})`; cx.beginPath(); cx.arc(bx, by - hh * .08, hh * .09 + 1, 0, 6.283); cx.fill(); cx.globalCompositeOperation = 'source-over'; } }
      return;
    }
    let colL, colR;
    if (state === 0) {
      if (ty === 1) { colL = css(mixc(LEAF.col, [0, 0, 0], .18).map(x => x * lt)); colR = css(LEAF.col.map(x => Math.min(255, x * lt * 1.05))); }
      else { colL = tone(P.dA, P.lA, t.tone); colR = tone(P.lA, P.lB, t.tone); }
    } else if (state === 1) { const q = clamp((u + 3) / 3, 0, 1) * .6; colL = plain(P.dA, P.hot, q); colR = plain(P.lA, P.hot, q); }
    else if (state === 2) { colL = css(P.hot); colR = css(mixc(P.hot, P.burnt, .3)); }
    else { const q = sstep(1, 9, u); colL = plain(P.dA, P.scorch, q); colR = plain(P.lA, P.scorch, q * .9); }
    cx.fillStyle = css(P.burnt, .8); cx.fillRect(bx - hh * .025, by - hh * .1, hh * .05, hh * .1);
    const rn = i => { const v = Math.sin(t.ph * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); };
    if (ty === 1) {
      const lf = state === 0 ? LEAF.a : 1;
      /* trunk with forks, visible in every season */
      cx.strokeStyle = css(P.burnt, .95); cx.lineCap = 'round'; cx.lineWidth = Math.max(1.2, hh * .06); cx.beginPath(); cx.moveTo(bx, by); cx.lineTo(bx + sway * .15, by - hh * .38); cx.stroke();
      cx.lineWidth = Math.max(.8, hh * .035); cx.beginPath(); cx.moveTo(bx + sway * .15, by - hh * .36); cx.lineTo(bx - w * .42 + sway * .3, by - hh * .62); cx.moveTo(bx + sway * .15, by - hh * .36); cx.lineTo(bx + w * .4 + sway * .3, by - hh * .66); cx.moveTo(bx + sway * .15, by - hh * .36); cx.lineTo(bx + sway * .4, by - hh * .78); cx.stroke();
      if (lf < .98) { cx.strokeStyle = css(P.bare, .95 * (1 - lf * .6)); cx.lineWidth = Math.max(.6, hh * .02); cx.beginPath(); for (let b = 0; b < 6; b++) { const yy = by - hh * (.5 + b * .08), L = hh * (.3 - b * .03) * (b % 2 ? 1 : -1); cx.moveTo(bx + sway * .3, yy); cx.lineTo(bx + L + sway * .4, yy - hh * .16); } cx.stroke(); }
      if (lf > .02) {
        cx.globalAlpha = lf;
        const ccx = bx + sway * .55, ccy = by - hh * .68, sx = w * .98, sy = hh * .3, bl = [[-.6, .12, .46], [.6, .14, .46], [0, .22, .5], [-.34, -.22, .5], [.36, -.2, .5], [-.7, -.18, .32], [.72, -.16, .32], [0, -.5, .42], [-.28, -.58, .3], [.3, -.56, .3]];
        bl.forEach(([ox, oy, r], q) => { const jx = (rn(q) - .5) * .12, jy = (rn(q + 9) - .5) * .12, x = ccx + (ox + jx) * sx, y = ccy + (oy + jy) * sy * 1.35, rr2 = r * sx * (.9 + rn(q + 3) * .2); cx.fillStyle = oy > .02 ? colL : (ox > 0 ? colR : mixCss(colL, colR, .5)); cx.beginPath(); cx.ellipse(x, y, rr2, rr2 * .82, 0, 0, 6.283); cx.fill(); });
        cx.fillStyle = 'rgba(255,255,255,.1)'; bl.forEach(([ox, oy, r], q) => { if (oy < -.1 && ox > -.35) { const x = ccx + ox * sx + sx * .08, y = ccy + oy * sy * 1.35 - r * sx * .25; cx.beginPath(); cx.ellipse(x, y, r * sx * .55, r * sx * .32, -.4, 0, 6.283); cx.fill(); } });
        cx.fillStyle = 'rgba(0,0,0,.16)'; cx.beginPath(); cx.ellipse(ccx, ccy + sy * .42, sx * .8, sy * .22, 0, 0, 6.283); cx.fill();
        if (hh > 14) { cx.fillStyle = 'rgba(255,255,255,.14)'; for (let q = 0; q < 5; q++) cx.fillRect(ccx + (rn(q + 20) - .5) * sx * 1.5, ccy + (rn(q + 30) - .7) * sy * 1.3, 1.4, 1.4); }
        if (state === 0 && t.bloom && bo > .05 && hh > 9) { cx.fillStyle = `rgba(204,121,167,${.75 * bo})`; for (let q = 0; q < 6; q++) cx.fillRect(ccx + (rn(q + 40) - .5) * sx * 1.5, ccy + (rn(q + 50) - .6) * sy * 1.2, 2, 2); }
        cx.globalAlpha = 1;
      }
    } else {
      /* conifer: drooping tiers, serrated skirts, a shaded side and a lit side */
      const T5 = [[.98, .74, .32], [.82, .6, .5], [.66, .45, .68], [.5, .3, .84], [.34, .14, 1]];
      for (let side = 0; side < 2; side++) {
        const sg = side ? 1 : -1; cx.fillStyle = side ? colR : colL;
        for (let q = 4; q >= 0; q--) { const [a1, b1, kk] = T5[q], ax = bx + sway * a1 * .9, ay = by - hh * a1, yb = by - hh * b1, hw = w * kk * sg, hwI = hw * (.9 + rn(q + 60 + side) * .1);
          cx.beginPath(); cx.moveTo(ax, ay); cx.quadraticCurveTo(bx + hw * .42 + sway * .4, ay + (yb - ay) * .55, bx + hw, yb + hh * .015);
          const tn = 3; for (let z = 1; z <= tn; z++) { const zx = bx + hw * (1 - z / (tn + .6)), zy = yb + (z % 2 ? -hh * .028 : hh * .014); cx.lineTo(zx, zy); }
          cx.lineTo(bx, yb - hh * .005); cx.closePath(); cx.fill(); }
      }
      cx.fillStyle = 'rgba(0,0,0,.17)'; for (let q = 0; q < 5; q++) { const yb = by - hh * T5[q][1], hw = w * T5[q][2]; cx.beginPath(); cx.moveTo(bx - hw, yb + hh * .012); cx.lineTo(bx + hw, yb + hh * .012); cx.lineTo(bx + hw * .6, yb + hh * .045); cx.lineTo(bx - hw * .6, yb + hh * .045); cx.closePath(); cx.fill(); }
      cx.fillStyle = 'rgba(255,255,255,.08)'; cx.beginPath(); cx.moveTo(bx + sway * .9, by - hh); cx.lineTo(bx + w * .3, by - hh * .72); cx.lineTo(bx + w * .08, by - hh * .72); cx.closePath(); cx.fill();
      if (ty === 2 && state === 0 && bo > .05) { cx.fillStyle = `rgba(204,121,167,${.9 * bo})`; for (let q = 0; q < 5; q++) cx.fillRect(bx + (rn(q + 70) - .5) * w * 1.3, by - hh * (.3 + rn(q + 80) * .5), 2, 2); }
    }
    const fy = ty === 1 ? .64 : .55;
    if (state === 2) { const fl = .78 + .22 * Math.sin(time * 9 + t.ph) + .12 * Math.sin(time * 17 + t.ph * 2), up = sstep(0, 1.5, u) * (1 - sstep(6, 9, u)); drawFlame(bx, by - hh * .1, hh * (.7 + .8 * up) * fl, w * 1.1, Math.sin(time * 3 + t.ph) * w * .6 + sway + ln * hh * .15, .95 * up); }
    else if ((state === 1 || state === 3) && st[k] === 1 && u > -1 && u < FL[k]) { const up = sstep(-1, 1.5, u) * (1 - sstep(FL[k] - 3, FL[k], u)), fl = .75 + .25 * Math.sin(time * 10 + t.ph); drawFlame(bx, by, hh * (.15 + .34 * inten[k]) * fl * up + 1, w * .55, sway * .3 + ln * hh * .06, up); }
  }
  function rebuildLayer(L, nn, time) {
    const g = LY[L][1], sv = cx; cx = g; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const P = palette(nn), ln = lean(), bo = sstep(62, 76, doy) * (1 - sstep(108, 122, doy));
    if (L === 1) drawDecor(nn);
    for (let i = 0; i < trees.length; i++) { const t = trees[i]; if (t.st && (t.ty === 1) === (L === 1)) paintTree(t, nn, time, P, ln, bo, true); }
    cx = sv; fDirty[L] = false; fLast[L] = { nn, gr: S.green, d: doy, t: time };
  }
  function drawTrees(nn, time) {
    LEAF = leafNow(doy, nn); classify();
    for (let L = 0; L < 2; L++) { const f = fLast[L]; if (!fDirty[L] && (Math.abs(nn - f.nn) > .012 || Math.abs(S.green - f.gr) > .03 || (L === 1 && Math.abs(doy - f.d) > 3))) fDirty[L] = true; if (fDirty[L] && time - f.t > .3) rebuildLayer(L, nn, time); }
    const bands = 8, bh = (H - SK) / bands;
    for (let L = 0; L < 2; L++) { const c = LY[L][0]; for (let b = 0; b < bands; b++) { const y0 = SK + b * bh, off = Math.sin(time * .8 + b * .7 + L * 1.3) * (.35 + 1.3 * S.wind); cx.drawImage(c, 0, y0 * dpr, c.width, bh * dpr + 1, off, y0, W, bh + .5); } }
    const P = palette(nn), ln = lean(), bo = sstep(62, 76, doy) * (1 - sstep(108, 122, doy));
    for (let i = 0; i < trees.length; i++) { const t = trees[i]; if (t.st || t.s === 5) continue; paintTree(t, nn, time, P, ln, bo, false); }
  }

  function drawGround(nn, time) {
    const ln = lean(); A.fire = A.fire || [W * .5, H * .6]; let sx = 0, sy = 0, cnt = 0;
    for (let a = 0; a < burning.length; a++) {
      const k = burning[a], i = k % GW, j = (k / GW) | 0, u = T - tigR[k]; if (u < 0 || u > FL[k]) continue;
      if (a % 12 === 0) { sx += (i + .5) * G; sy += SK + (j + .5) * G; cnt++; }
      if (a % 3) continue;
      const I = inten[k], v = vOfY(SK + (j + .5) * G), sc = .45 + 1.05 * Math.pow(1 - v, 1.35), up = sstep(0, 1.5, u) * (1 - sstep(FL[k] - 3, FL[k], u)), fl = .7 + .3 * Math.sin(time * 9 + a * 1.7) + .15 * Math.sin(time * 19 + a);
      drawFlame((i + .5) * G + (hash(i, j) - .5) * G, SK + (j + .5) * G + 2, (5 + 14 * I) * sc * fl * up + 1, (2 + 2.4 * I) * sc, Math.sin(time * 3 + a) * 2 * sc + ln * sc * (1 + 2 * I), up * (1 - S.rain * .8));
    }
    if (cnt) A.fire = [sx / cnt, sy / cnt - 12];
  }
  function bloom(nn) {
    cx.globalCompositeOperation = 'lighter';
    for (let a = 0; a < burning.length; a += 9) { const k = burning[a], i = k % GW, j = (k / GW) | 0, u = T - tigR[k]; if (u < 0 || u > FL[k]) continue; const v = vOfY(SK + (j + .5) * G), sc = .5 + 1.0 * Math.pow(1 - v, 1.3), r = (30 + 36 * inten[k]) * sc; cx.globalAlpha = (.04 + .15 * nn) * (.6 + .6 * inten[k]); cx.drawImage(SM.warm, (i + .5) * G - r, SK + (j + .5) * G - r * 1.2, r * 2, r * 2); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  }

  /* ================= smoke, steam, water ================= */
  function spawnSmoke(dt) {
    if (!burning.length || parts.length > 1250) return;
    const strong = clamp(burning.length / 520, 0, 1), k = Math.min(26, Math.round((270 * strong + 60) * dt * (1 - .35 * n) * (1 - S.rain * .8)));
    for (let s = 0; s < k; s++) { const c = burning[(Math.random() * burning.length) | 0], i = c % GW, j = (c / GW) | 0, I = inten[c], buoy = (1 - .55 * n) * (1 - .8 * S.inv); parts.push({ k: 0, x: (i + Math.random()) * G, y: SK + (j + .3) * G, vx: 0, vy: -(30 + 40 * I) * buoy, r: 3 + 4 * I, age: 0, max: 12 + Math.random() * 8, w: .5 + Math.random() }); }
  }
  function drawParts(dt, nn, time) {
    const yInv = H * .60;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt; if (p.age > p.max || p.y < -60 || p.y > H + 40 || p.x > W + 120 || p.x < -120) { parts.splice(i, 1); continue; }
      wind(p.x, p.y, time, wv); const t = p.age / p.max;
      if (p.k === 0) {
        if (S.inv > .35 && p.y < yInv + 40) p.vy *= (1 - dt * 2.2 * S.inv);
        p.vy = lerp(p.vy, 0, dt * (.22 + .3 * n)); const turb = Math.sin(time * .9 + p.w * 7 + p.y * .02) * 5;
        p.x += (wv[0] * p.w * (.7 + 1.1 * t) + turb) * dt; p.y += (p.vy + wv[1] * p.w * .5) * dt; p.r = Math.min(32, p.r + dt * (1.6 + 2.2 * (1 - t) + 2 * S.inv));
        const aloft = sstep(SK + H * .12, SK - H * .10, p.y), al = (.07 + .22 * (1 - t)) * sstep(0, .06, t) * (1 - sstep(.7, 1, t)) * (1 + .5 * aloft);
        let s; if (nn < .5) s = t < .22 ? SM.dark : t < .55 ? SM.mid : SM.light; else s = t < .22 ? SM.nDark : t < .55 ? SM.nMid : SM.nLight;
        const rr = p.r * (1 + 1.3 * aloft); cx.globalAlpha = Math.min(.52, al * (nn > .5 ? .75 : 1.1)); cx.drawImage(s, p.x - rr, p.y - rr, rr * 2, rr * 2);
        if (nn > .3 && t < .12) { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .1 * nn * (1 - t * 8); cx.drawImage(SM.warm, p.x - rr * 1.4, p.y - rr * 1.4, rr * 2.8, rr * 2.8); cx.globalCompositeOperation = 'source-over'; }
        cx.globalAlpha = 1;
      } else if (p.k === 4) { p.x += (p.vx + wv[0] * .4) * dt; p.y += p.vy * dt; p.r += dt * 4; cx.globalAlpha = (1 - t) * .28; cx.drawImage(SM.white, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); cx.globalAlpha = 1; }
      else if (p.k === 2 || p.k === 3) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 3) p.vy += 90 * dt; cx.fillStyle = `rgba(${nn > .5 ? '150,200,245' : '86,180,233'},${.85 * (1 - t * .5)})`; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill(); }
      else { p.x += (p.vx + wv[0] * .5) * dt; p.y += (p.vy + wv[1] * .3) * dt; const a = (1 - t) * (.55 + .45 * Math.sin(time * 22 + p.w)); cx.globalCompositeOperation = 'lighter'; cx.fillStyle = `rgba(255,${150 + 60 * (1 - t) | 0},40,${a})`; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill(); cx.globalCompositeOperation = 'source-over'; }
    }
    cx.globalCompositeOperation = 'lighter';
    spots.forEach(s => { const p = (T - s.t0) / Math.max(.5, s.t1 - s.t0); if (p < 0 || p > 1) return; const [x0, y0] = cellXY(s.from), [x1, y1] = cellXY(s.to), x = lerp(x0, x1, p), y = lerp(y0, y1, p) - Math.sin(p * Math.PI) * 40; cx.fillStyle = `rgba(255,170,60,${.95 * Math.sin(p * Math.PI)})`; cx.beginPath(); cx.arc(x, y, 1.9, 0, 6.283); cx.fill(); });
    cx.globalCompositeOperation = 'source-over';
  }

  /* ================= sky: Milky Way (clear nights only), stars, sun, moon, clouds, rain, lightning ================= */
  let mw = null; const polar = []; let POLE = [0, 0];
  function buildMilkyWay() {
    const S2 = Math.round(W * 2.4), c = document.createElement('canvas'); c.width = c.height = S2; const g = c.getContext('2d'); seed = 77;
    const rho = W * .34, cxm = S2 / 2, cym = S2 / 2, ang = -.32;
    g.translate(cxm, cym); g.rotate(ang);                      /* band lies along the x axis, offset by rho from the pole */
    const off = rho, len = S2 * .46, wid = W * .085;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) { const x = (rnd() * 2 - 1) * len, y = off + (rnd() + rnd() + rnd() - 1.5) * wid * .7 + Math.sin(x / W * 2.4) * wid * .35, r = wid * (.55 + rnd() * .7), core = 1 - Math.abs(x) / len, a = .05 + .1 * core; const gr = g.createRadialGradient(x, y, 0, x, y, r); const warm = x > len * .25; gr.addColorStop(0, warm ? `rgba(255,226,190,${a * 1.3})` : `rgba(190,208,255,${a})`); gr.addColorStop(1, 'rgba(120,150,230,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
    for (let i = 0; i < 5200; i++) { const x = (rnd() * 2 - 1) * len, y = off + (rnd() + rnd() + rnd() - 1.5) * wid * .9 + Math.sin(x / W * 2.4) * wid * .35, core = 1 - Math.abs(x) / len; if (rnd() > .25 + .75 * core) continue; g.fillStyle = `rgba(${220 + rnd() * 35 | 0},${220 + rnd() * 35 | 0},255,${.25 + rnd() * .65})`; g.fillRect(x, y, rnd() < .06 ? 2 : 1, 1); }
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 26; i++) { const x = (rnd() * 2 - 1) * len * .8, y = off + (rnd() - .5) * wid * .5 + Math.sin(x / W * 2.4) * wid * .35, r = wid * (.12 + rnd() * .25); const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.2); gr.addColorStop(0, 'rgba(4,6,16,.42)'); gr.addColorStop(1, 'rgba(4,6,16,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 3, r * .8, rnd() * .6 - .3, 0, 6.283); g.fill(); }
    mw = c; POLE = [W * .28, SK * .55]; polar.length = 0;
    for (let i = 0; i < 130; i++) { const r = 20 + Math.random() * W * .75, a = Math.random() * 6.283; polar.push({ r, a, s: .4 + Math.random() * 1.1, p: Math.random() * 6 }); }
  }
  const SKY = { top: [hex('#b4d6f0'), hex('#040813')], mid: [hex('#d8eaf6'), hex('#10183a')], low: [hex('#f6eee2'), hex('#2b3053')] };
  const clouds = Array.from({ length: 7 }, () => ({ x: Math.random(), y: .05 + Math.random() * .2, s: .6 + Math.random() * .8, v: .8 + Math.random() * .8 }));
  const mixp = (p, nn) => mixc(p[0], p[1], nn);
  function drawSky(nn, time) {
    const g = cx.createLinearGradient(0, 0, 0, SK + H * .12);
    g.addColorStop(0, css(mixp(SKY.top, nn))); g.addColorStop(.6, css(mixp(SKY.mid, nn))); g.addColorStop(1, css(mixp(SKY.low, nn)));
    cx.fillStyle = g; cx.fillRect(0, 0, W, SK + H * .14);
    const clear = clamp(1 - S.cloud * 1.15 - burning.length / 900, 0, 1), vis = Math.pow(nn, 1.4);
    if (vis > .02) {
      const ang = time * .004 + absDay * .0006;
      cx.save(); cx.beginPath(); cx.rect(0, 0, W, SK + 20); cx.clip();
      polar.forEach(p => { const a = p.a + ang, x = POLE[0] + p.r * Math.cos(a), y = POLE[1] + p.r * Math.sin(a) * .5; if (y < 0 || y > SK || x < 0 || x > W) return; cx.fillStyle = `rgba(255,255,255,${vis * clear * (.45 + .45 * Math.sin(time * 1.5 + p.p))})`; cx.beginPath(); cx.arc(x, y, p.s, 0, 6.283); cx.fill(); });
      cx.globalAlpha = vis * clear * .95; cx.translate(POLE[0], POLE[1]); cx.scale(1, .5); cx.rotate(ang); cx.drawImage(mw, -mw.width / 2, -mw.height / 2); cx.restore(); cx.globalAlpha = 1;
    }
    /* the sun (light theme) or the moon (dark theme) drifts slowly across the sky; the theme itself never changes */
    const dp = ((time + 70) / 300) % 1, arcX = W * (.1 + .8 * dp), arcY = SK * (.84 - .66 * Math.sin(Math.PI * dp)), edge = Math.pow(1 - Math.sin(Math.PI * dp), 1.6), dAl = sstep(0, .05, dp) * (1 - sstep(.95, 1, dp));
    if (nn < .98) { const wg = cx.createLinearGradient(0, 0, 0, SK + H * .1); wg.addColorStop(0, 'rgba(255,170,90,0)'); wg.addColorStop(1, `rgba(255,170,90,${.34 * edge * (1 - nn)})`); cx.fillStyle = wg; cx.fillRect(0, 0, W, SK + H * .1); }
    const sx = arcX, sy = arcY;
    if (nn < .98) { const a = (1 - nn) * (1 - S.cloud * .6), gl = cx.createRadialGradient(sx, sy, 0, sx, sy, H * .30); gl.addColorStop(0, `rgba(255,${216 - 50 * edge | 0},${130 - 40 * edge | 0},${.6 * a * dAl})`); gl.addColorStop(1, 'rgba(255,216,130,0)'); cx.fillStyle = gl; cx.fillRect(sx - H * .32, sy - H * .32, H * .64, H * .64); cx.fillStyle = `rgba(247,${196 - 40 * edge | 0},70,${a * dAl})`; cx.beginPath(); cx.arc(sx, sy, H * .04, 0, 6.283); cx.fill(); }
    if (nn > .02) { const a = nn * (1 - S.cloud * .8) * dAl, mx = arcX, my = arcY * .9 + SK * .03, gl = cx.createRadialGradient(mx, my, 0, mx, my, H * .2); gl.addColorStop(0, `rgba(190,205,240,${.3 * a})`); gl.addColorStop(1, 'rgba(190,205,240,0)'); cx.fillStyle = gl; cx.fillRect(mx - H * .22, my - H * .22, H * .44, H * .44); cx.fillStyle = `rgba(234,240,252,${a})`; cx.beginPath(); cx.arc(mx, my, H * .032, 0, 6.283); cx.fill(); cx.fillStyle = css(mixp(SKY.mid, 1), a * .92); cx.beginPath(); cx.arc(mx + H * .013, my - H * .005, H * .027, 0, 6.283); cx.fill(); }
    cx.beginPath(); cx.moveTo(0, SK + 8);
    for (let x = 0; x <= W; x += 6) { const u = x / W; cx.lineTo(x, SK - H * .16 * (.5 * (1 - Math.abs(Math.sin(6.283 * (u * 1.1 + .35)))) + .3 * (1 - Math.abs(Math.sin(6.283 * (u * 2.7 + .2)))) + .2 * vn(u * 9, 3)) - H * .02); }
    cx.lineTo(W, SK + 8); cx.closePath(); cx.fillStyle = css(mixc(hex('#c4d4e4'), hex('#1b2547'), nn), .95); cx.fill();
    const cd = S.cloud, dark = clamp(S.rain + S.storm * .8, 0, 1);
    clouds.forEach((c, i) => { const dir = S.wind > .3 ? 1.6 : lerp(-1, .8, nn), x = (((c.x * W + time * 5 * c.v * dir) % (W + 360)) + W + 360) % (W + 360) - 180, y = c.y * H, a = clamp(.18 + .55 * cd, 0, .85) * (1 - .3 * nn) * (i < 3 ? 1 : cd);
      cx.fillStyle = css(mixc(mixc(hex('#ffffff'), hex('#34406a'), nn), hex('#58606c'), dark), a); [[0, 0, 46], [40, -9, 36], [-40, 6, 32], [74, 8, 28]].forEach(([dx, dy, r]) => { cx.beginPath(); cx.ellipse(x + dx * c.s, y + dy * c.s, r * c.s * (1.6 + cd * .8), r * c.s * (.6 + cd * .25), 0, 0, 6.283); cx.fill(); }); });
    if (burning.length > 150 && nn < .6) { const ca = clamp(burning.length / 600, 0, 1) * (1 - nn) * .9, px = A.fire[0] + 40 + S.wind * 90; for (let i = 0; i < 9; i++) { const ang = i / 9 * 6.283, r = 38 + 16 * Math.sin(time * .4 + i * 2); cx.globalAlpha = ca * .35; cx.drawImage(SM.white, px + Math.cos(ang) * 58 - r * 1.6, SK * .45 + Math.sin(ang) * 20 - r, r * 3.2, r * 2); } cx.globalAlpha = 1; }
  }

  function drawRain(dt, nn, time) {
    if (S.rain < .03) return; const a = S.rain, lx = -S.wind * 16 - 5;
    cx.strokeStyle = nn > .5 ? `rgba(170,200,255,${.34 * a})` : `rgba(235,245,255,${.5 * a})`; cx.lineWidth = 1; cx.beginPath();
    const cnt = Math.floor(rain.length * Math.min(1, a * 1.3));
    for (let i = 0; i < cnt; i++) { const r = rain[i]; r.y += r.v * dt; r.x += lx * 8 * dt; if (r.y > H) { r.y = -10; r.x = Math.random() * W * 1.2; } cx.moveTo(r.x, r.y); cx.lineTo(r.x + lx * .35, r.y + 14); }
    cx.stroke();
  }
  function drawLightning(dt) {
    if (S.flash > .01) { cx.fillStyle = `rgba(255,255,255,${S.flash * .35})`; cx.fillRect(0, 0, W, H); S.flash = Math.max(0, S.flash - dt * 2.4); }
    if (inc && inc.bolt && T - inc.bolt.t0 < .5) { const f = 1 - (T - inc.bolt.t0) / .5, p = inc.bolt.pts; cx.globalCompositeOperation = 'lighter'; cx.strokeStyle = `rgba(190,215,255,${.45 * f})`; cx.lineWidth = 7; cx.beginPath(); p.forEach(([x, y], i) => i ? cx.lineTo(x, y) : cx.moveTo(x, y)); cx.stroke(); cx.strokeStyle = `rgba(255,255,255,${f})`; cx.lineWidth = 2; cx.stroke(); cx.globalCompositeOperation = 'source-over'; A.light = p[p.length - 1]; } else A.light = null;
  }

  /* ================= scenery: lake, windsock, inversion fog, haze ================= */
  /* ================= pond, stream, camps, flux tower, animals, birds ================= */
  const ripples = [], animals = [], flocks = [], camps = [], packets = [], flow = [];
  const TW = { x: 0, y: 0, h: 0 }, EC = { x: 0, y: 0 }, AW = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  function layoutWorld() {
    LAKE = { x: W * .83, y: H * .80, rx: clamp(W * .12, 60, 170), ry: clamp(H * .062, 26, 52) };
    buildStreams();
    TW.x = W * .60; TW.y = SK + (H - SK) * .42; TW.h = clamp(H * .11, 52, 84); EC.x = W * .79; EC.y = SK + (H - SK) * .30; AW[0].x = W * .27; AW[0].y = SK + (H - SK) * .36; AW[1].x = W * .66; AW[1].y = SK + (H - SK) * .58;
  }
  /* ---- stream network: sources in several gullies, tributaries that merge, meanders, widening downstream ---- */
  let NET = [], STREAM = [], sLayer = null, sLast = { w: -9, nn: -9 };
  function buildStreams() {
    NET = []; STREAM = []; const sv = seed; seed = 515;
    const trace = (x0, y0, tx, ty, wob, join) => {
      const pts = [{ x: x0, y: y0 }]; let x = x0, y = y0, vx = 0;
      for (let g = 0; g < 200 && y < ty; g++) {
        const step = 5 + rnd() * 2; let best = 0, bv = 1e9;
        for (const dx of [-10, -5, 0, 5, 10]) { const r = relief((x + dx) / W, vOfY(y + step)) + (rnd() - .5) * .05; if (r < bv) { bv = r; best = dx; } }
        const prog = clamp((y - y0) / (ty - y0 || 1), 0, 1);
        vx = vx * .6 + (best * .4 + Math.sin(y * .042 + wob) * 6 + Math.sin(y * .1 + wob * 2) * 2.6 + (tx - x) * .05 * prog * prog) * .4;
        x = clamp(x + vx, 8, W - 8); y += step; pts.push({ x, y });
        if (inLake(x, y, 6)) break;
        if (join) for (const m of join) if (m !== pts[pts.length - 1] && Math.hypot(m.x - x, m.y - y) < 9 && pts.length > 5) { pts.push({ x: m.x, y: m.y, join: m }); return pts; }
      }
      return pts;
    };
    const rimX = (s) => LAKE.x + s * LAKE.rx * .7, rimY = LAKE.y - LAKE.ry * .85;
    const main = trace(W * .44, SK + 8, LAKE.x - LAKE.rx * .3, LAKE.y - LAKE.ry * .9, 0, null);
    main.push({ x: LAKE.x - LAKE.rx * .3, y: LAKE.y - LAKE.ry * .9 });
    NET.push({ pts: main, order: 2 });
    const mp = i => main[Math.min(main.length - 1, Math.max(4, i | 0))];
    [[.16, .05, .38], [.30, .12, .55], [.62, .04, .5], [.78, .16, 0]].forEach(([fx, fy, jf], i) => {
      const y0 = SK + (H - SK) * fy + 8, x0 = W * fx;
      let t;
      if (jf > 0) { const m = mp(main.length * jf); t = trace(x0, y0, m.x, m.y, i * 2.1, main); }
      else t = trace(x0, y0, rimX(.2), rimY, i * 2.1, null);
      if (!t[t.length - 1].join) t.push({ x: rimX(i % 2 ? .3 : -.5), y: rimY + 4 });
      NET.push({ pts: t, order: 1 });
    });
    /* widths: grow downstream; the trunk takes in each tributary at its junction */
    NET.forEach(n => { const L = n.pts.length; n.pts.forEach((p, i) => { const pr = i / (L - 1 || 1); p.w = n.order === 2 ? 2.4 + 5.2 * Math.pow(pr, .8) : 1.6 + 2.4 * pr; }); });
    NET.filter(n => n.order === 1).forEach(t => { const j = t.pts[t.pts.length - 1].join; if (!j) return; const idx = main.indexOf(j); for (let i = idx; i < main.length; i++) main[i].w += 1.3; });
    NET.forEach(n => n.pts.forEach(p => STREAM.push([p.x, p.y])));
    NET.forEach(n => { n.pts.forEach((p, i) => { if (i > 0 && i < n.pts.length - 1) { const a = n.pts[i - 1], b = n.pts[i + 1]; for (let s = 1; s < 2; s++) STREAM.push([(p.x + a.x) / 2, (p.y + a.y) / 2]); } }); });
    seed = sv;
  }
  function edges(pts, k) {
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, h = pts[i].w * k / 2 * (1 + .24 * Math.sin(i * 1.7 + pts[0].x)); L.push([pts[i].x + nx * h, pts[i].y + ny * h]); R.push([pts[i].x - nx * h, pts[i].y - ny * h]); }
    return [L, R];
  }
  function strokePoly(L, R, fill) { cx.fillStyle = fill; cx.beginPath(); cx.moveTo(L[0][0], L[0][1]); for (let i = 1; i < L.length; i++) { const m = [(L[i - 1][0] + L[i][0]) / 2, (L[i - 1][1] + L[i][1]) / 2]; cx.quadraticCurveTo(L[i - 1][0], L[i - 1][1], m[0], m[1]); } cx.lineTo(L[L.length - 1][0], L[L.length - 1][1]); cx.lineTo(R[R.length - 1][0], R[R.length - 1][1]); for (let i = R.length - 2; i >= 0; i--) { const m = [(R[i + 1][0] + R[i][0]) / 2, (R[i + 1][1] + R[i][1]) / 2]; cx.quadraticCurveTo(R[i + 1][0], R[i + 1][1], m[0], m[1]); } cx.closePath(); cx.fill(); }
  function streamScale() { return clamp(.45 + .9 * (S.rain * .6 + S.rh * .45 + (1 - dryD) * .3), .4, 1.5); }
  function rebuildStreams(nn) {
    const g = sLayer[1], sv = cx; cx = g; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const ws = streamScale(), wt = clamp((ws - .5) / .35, 0, 1), bank = css(mixc(hex('#7a6a44'), hex('#1b1b22'), nn), .8), wet = css(mixc(hex('#46583a'), hex('#0e1522'), nn), .62), water = css(mixc(hex('#3b8fd0'), hex('#18386a'), nn), 1), deep = css(mixc(hex('#1f6fb0'), hex('#0e2a58'), nn), .95);
    NET.forEach(n => { const k = n.order === 2 ? ws : ws * wt; if (k < .05) return; const [bl, br] = edges(n.pts, k * 1.0 + 1.8), [wl, wr] = edges(n.pts, k), [dl, dr] = edges(n.pts, k * .5);
      strokePoly(bl, br, wet); strokePoly(wl, wr, water); strokePoly(dl, dr, deep);
      for (let i = 2; i < n.pts.length - 1; i += 3) { const p = n.pts[i], s = hash(i, n.order * 7) > .5 ? 1 : -1, w = p.w * k; cx.fillStyle = css(mixc(hex('#8f877b'), hex('#222838'), nn * .8), .95); cx.beginPath(); cx.ellipse(p.x + s * (w / 2 + 1.6), p.y, 1.6 + hash(i, 3) * 1.6, 1.1 + hash(i, 4), 0, 0, 6.283); cx.fill(); }
    });
    cx = sv; sLast = { w: ws, nn };
  }
  function drawStream(nn, time) {
    if (Math.abs(streamScale() - sLast.w) > .07 || Math.abs(nn - sLast.nn) > .015) rebuildStreams(nn);
    cx.drawImage(sLayer[0], 0, 0, W, H);
    const ws = streamScale(), wt = clamp((ws - .5) / .35, 0, 1);
    /* riffles and glints: white water on the faster stretches, slow shimmer elsewhere */
    NET.forEach(n => { const k = n.order === 2 ? 1 : wt; if (k < .05) return; const L = n.pts.length;
      for (let j = 0; j < (n.order === 2 ? 9 : 4); j++) { const f = ((time * .09 + j * .137 + n.pts[0].x * .001) % 1), i = Math.min(L - 2, Math.floor(f * (L - 1))), p = n.pts[i], q = n.pts[i + 1], u = f * (L - 1) - i, x = lerp(p.x, q.x, u), y = lerp(p.y, q.y, u), a = Math.sin(f * Math.PI) * (nn > .5 ? .35 : .6);
        cx.fillStyle = nn > .5 ? `rgba(180,205,255,${a})` : `rgba(255,255,255,${a})`; cx.beginPath(); cx.ellipse(x, y, Math.max(1.4, p.w * .35), .8, Math.atan2(q.y - p.y, q.x - p.x), 0, 6.283); cx.fill(); } });
  }
  function drawLake(nn, time) {
    const L = LAKE;
    cx.fillStyle = css(mixc(hex('#7a6a44'), hex('#1b1b22'), nn), .85); cx.beginPath(); cx.ellipse(L.x, L.y + 2, L.rx + 10, L.ry + 6, 0, 0, 6.283); cx.fill();
    cx.fillStyle = css(mixc(hex('#a3b27a'), hex('#1f3320'), nn), .55); cx.beginPath(); cx.ellipse(L.x, L.y + 3, L.rx + 18, L.ry + 10, 0, 0, 6.283); cx.globalCompositeOperation = 'destination-over'; cx.globalCompositeOperation = 'source-over'; cx.fill();
    cx.fillStyle = css(mixc(hex('#7a6a44'), hex('#1b1b22'), nn), .85); cx.beginPath(); cx.ellipse(L.x, L.y + 2, L.rx + 10, L.ry + 6, 0, 0, 6.283); cx.fill();
    cx.save(); cx.beginPath(); cx.ellipse(L.x, L.y, L.rx, L.ry, 0, 0, 6.283); cx.clip();
    const g = cx.createLinearGradient(0, L.y - L.ry, 0, L.y + L.ry); g.addColorStop(0, css(mixc(hex('#9fcbe6'), hex('#1d3566'), nn))); g.addColorStop(.55, css(mixc(hex('#4f93bf'), hex('#0e2448'), nn))); g.addColorStop(1, css(mixc(hex('#2f6f9b'), hex('#08162e'), nn))); cx.fillStyle = g; cx.fillRect(L.x - L.rx, L.y - L.ry, L.rx * 2, L.ry * 2);
    cx.fillStyle = css(mixc(hex('#dfeaf2'), hex('#3a4a7a'), nn), .35); cx.beginPath(); cx.moveTo(L.x - L.rx, L.y - L.ry * .1); for (let i = 0; i <= 12; i++) cx.lineTo(L.x - L.rx + i / 12 * L.rx * 2, L.y - L.ry * (.1 + .5 * Math.abs(Math.sin(i * 1.3 + 1)) * (1 - Math.abs(i - 6) / 7))); cx.lineTo(L.x + L.rx, L.y - L.ry * .1); cx.fill();
    cx.strokeStyle = nn > .5 ? 'rgba(200,215,255,.45)' : 'rgba(255,245,210,.7)'; cx.lineWidth = 1.4; for (let i = 0; i < 6; i++) { const y = L.y - L.ry * .8 + i * L.ry * .26, w = 6 + Math.sin(time * 2.2 + i) * 3; cx.beginPath(); cx.moveTo(L.x + L.rx * .25 - w, y); cx.lineTo(L.x + L.rx * .25 + w, y); cx.stroke(); }
    cx.strokeStyle = nn > .5 ? 'rgba(160,190,240,.28)' : 'rgba(255,255,255,.4)'; cx.lineWidth = 1; for (let i = 0; i < 9; i++) { const y = L.y - L.ry + (i + .5) / 9 * L.ry * 2, x = L.x - L.rx * .7 + ((time * (5 + S.wind * 14) + i * 41) % (L.rx * 1.4)); cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + 16, y); cx.stroke(); }
    for (let i = 0; i < 5; i++) { const px = L.x - L.rx * .55 + hash(i, 11) * L.rx * 1.1, py = L.y + L.ry * (-.1 + hash(i, 12) * .6); cx.fillStyle = css(mixc(hex('#3e8a45'), hex('#16301f'), nn), .9); cx.beginPath(); cx.ellipse(px, py, 7, 2.6, 0, 0, 6.283); cx.fill(); if (i % 2 === 0) { cx.fillStyle = nn > .5 ? '#c9b6e8' : '#f6f2fa'; cx.beginPath(); cx.arc(px + 1, py - 1, 1.6, 0, 6.283); cx.fill(); } }
    for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i], q = (T - r.t0) / 2.6; if (q > 1) { ripples.splice(i, 1); continue; } cx.strokeStyle = nn > .5 ? `rgba(200,220,255,${.55 * (1 - q)})` : `rgba(255,255,255,${.8 * (1 - q)})`; cx.lineWidth = 1; cx.beginPath(); cx.ellipse(r.x, r.y, 3 + 26 * q, 1 + 8 * q, 0, 0, 6.283); cx.stroke(); }
    if (burning.length && nn > .2) { cx.globalCompositeOperation = 'lighter'; cx.fillStyle = `rgba(255,140,40,${.1 * nn})`; cx.fillRect(L.x - L.rx, L.y - L.ry, L.rx * 2, L.ry * 2); }
    cx.restore();
    cx.strokeStyle = nn > .5 ? 'rgba(150,180,235,.55)' : 'rgba(255,255,255,.7)'; cx.lineWidth = 1.6; cx.beginPath(); cx.ellipse(L.x, L.y, L.rx, L.ry, 0, 0, 6.283); cx.stroke();
    cx.lineCap = 'round'; for (let i = 0; i < 34; i++) { const a = hash(i, 5) * 6.283, x = L.x + Math.cos(a) * (L.rx + 4 + hash(i, 6) * 5), y = L.y + Math.sin(a) * (L.ry + 2 + hash(i, 7) * 3), h = 6 + hash(i, 8) * 9, sw = Math.sin(time * 1.7 + i) * 1.6 + S.wind * 3;
      cx.strokeStyle = css(mixc(hex('#5b8c46'), hex('#1b3a24'), nn), .95); cx.lineWidth = 1.3; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + sw, y - h); cx.stroke();
      if (i % 3 === 0) { cx.strokeStyle = css(mixc(hex('#7a4f2a'), hex('#2a1c10'), nn)); cx.lineWidth = 2.2; cx.beginPath(); cx.moveTo(x + sw, y - h); cx.lineTo(x + sw * 1.05, y - h - 3.4); cx.stroke(); } }
    cx.font = '700 10px ' + FONT; cx.textAlign = 'center'; cx.fillStyle = nn > .5 ? 'rgba(220,232,255,.8)' : 'rgba(16,40,70,.8)'; cx.fillText('POND', L.x, L.y + L.ry + 20); cx.textAlign = 'start';
    A.lake = [L.x, L.y - L.ry];
  }
  /* ---- trekking camps ---- */
  function planCamps() {
    camps.length = 0; const n = 3; for (let tries = 0; tries < 60 && camps.length < n; tries++) { const [x, y] = randCell(.22, .6); if (camps.some(c => Math.hypot(c.x - x, c.y - y) < 150) || Math.hypot(x - TW.x, y - TW.y) < 80) continue; camps.push({ x, y, lit: false, ignoring: false, ban: false, out: 0, ph: Math.random() * 6, people: [{ dx: -9, dy: 8 }, { dx: 8, dy: 9 }, { dx: 0, dy: 11 }].map(p => ({ x: x + p.dx, y: y + p.dy, hx: x + p.dx, hy: y + p.dy })), told: false });
      const k0 = cellAt(x, y); for (let a = -2; a <= 2; a++) for (let b = -2; b <= 1; b++) { const q = k0 + a + b * GW; if (q >= 0 && q < N) fuel0[q] *= .15; } }
  }
  function updateCamps(dt, nn) {
    camps.forEach(c => {
      c.ban = danger >= .5; const night = nn > .55;
      if (!c.ignoring) { if (night && !c.ban && !c.lit && Math.random() < dt * .5) { c.lit = true; } if ((!night || c.ban) && c.lit) { c.lit = false; c.out = 1; for (let s = 0; s < 6; s++) steamAt(c.x, c.y); if (!c.told && !inc) { c.told = true; say('cm', night ? 'Campfire banned: the campers put it out with water' : 'Campers put the fire out with water before leaving', () => [c.x, c.y - 16], 8, [-60, -60]); } } }
      if (c.ban && !c.bs) { c.bs = true; if (!inc) say('cb', 'Fire danger high: campfires are banned at the trekking camps', () => [c.x, c.y - 26], 8, [-80, -70]); } if (!c.ban) c.bs = false;
      c.out = Math.max(0, c.out - dt);
      c.fdT = (c.fdT || 0) - dt;
      if (c.fdT <= 0) { c.fdT = .45; let best = 1e9, bx = c.x, by = c.y; const qs = [0, 0, 0, 0], stp = Math.max(1, (burning.length / 700) | 0); for (let s = 0; s < burning.length; s += stp) { const [fx, fy] = cellXY(burning[s]), dx = fx - c.x, dy = fy - c.y, d = Math.hypot(dx, dy); if (d < best) { best = d; bx = fx; by = fy; } if (d < 150) qs[(dx > 0 ? 1 : 0) + (dy > 0 ? 2 : 0)] = 1; } c.fd = best; c.fx = bx; c.fy = by; c.cut = qs[0] + qs[1] + qs[2] + qs[3]; }
      if (c.away && !inc && burning.length < 6) { c.away = false; c.rescued = false; c.people.forEach(p => { p.hidden = false; p.x = p.hx; p.y = p.hy; }); }
      const flee = (c.ignoring && inc && inc.ignited) || (c.fd || 1e9) < 260;
      if (c.scare > 0) c.scare -= dt;
      const sc2 = .75 + .7 * clamp((c.y - SK) / (H - SK), 0, 1); if (!c.hide && !c.away) { c.people.forEach(p => { p.hidden = false; p.up = false; }); }
      c.people.forEach((p, i) => { if (c.away || c.boarding) return; if (c.hide) { const tx = i < 2 ? c.x - 36 * sc2 + i * 3 : c.x + 40 * sc2, ty = i < 2 ? c.y + 5 * sc2 : c.y + 4 * sc2, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy); if (d < 3) { if (i < 2) p.hidden = true; else p.up = true; p.mv = false; } else { p.x += dx / d * 24 * dt; p.y += dy / d * 24 * dt; p.mv = true; } } else if (c.scare > 0 && !flee) { const dx = p.x - c.scareFrom[0], dy = p.y - c.scareFrom[1], d = Math.hypot(dx, dy) || 1; if (d < 70) { p.x += dx / d * 16 * dt; p.y += (dy / d * 5 + 4) * dt; p.mv = true; } else p.mv = false; } else if (flee) { const nf = (c.fd || 1e9) < 260, sx = nf ? c.fx : c.x, sy = nf ? c.fy : c.y, dx = p.x - sx, dy = p.y - sy, d = Math.hypot(dx, dy) || 1; if (d < (nf ? 300 : 110)) { p.x = clamp(p.x + dx / d * 24 * dt, 8, W - 8); p.y = clamp(p.y + (dy / d * 10 + 3) * dt, SK + 12, H - 10); p.mv = true; } else p.mv = false; } else { p.x += (p.hx - p.x) * Math.min(1, dt * .5); p.y += (p.hy - p.y) * Math.min(1, dt * .5); p.mv = false; } });
    });
  }


  function hotAt(x, y) { for (let q = 0; q < 5; q++) { const px = x + (q === 1 ? -13 : q === 2 ? 13 : 0), py = y + (q === 3 ? -9 : q === 4 ? 9 : 0), k = cellAt(clamp(px, 1, W - 2), clamp(py, 1, H - 2)); if (st[k] === 1) return true; } return false; }
  function guardAll(dt) {
    const push = (o, sx, sy) => { const dx = o.x - sx, dy = o.y - sy, d = Math.hypot(dx, dy) || 1; o.x = clamp(o.x + dx / d * 46 * dt, 6, W - 6); o.y = clamp(o.y + dy / d * 46 * dt, SK + 10, H - 10); o.mv = true; };
    camps.forEach(c => { if (c.away) return; c.people.forEach(p => { if (!p.hidden && !p.hang && hotAt(p.x, p.y)) push(p, c.fx != null ? c.fx : p.x - 1, c.fy != null ? c.fy : p.y); }); });
    crews.forEach(c => { if (c.role !== 'line' && hotAt(c.x, c.y)) push(c, c.fx != null ? c.fx : c.x - 1, c.fy != null ? c.fy : c.y); });
  }
  function updateRescue(dt) {
    if (!resc) {
      if (burning.length < 110) return; const c = camps.find(c => !c.rescued && !c.away && !c.ignoring && (c.fd || 1e9) < 230 && c.people.length && c.people.every(p => p.hidden || Math.hypot(p.x - c.x, p.y - c.y) < 70));
      if (c) { c.rescued = true; c.boarding = true; resc = { x: -90, y: SK * .5, vx: 60, vy: 0, ph: 'in', t: 0, face: 1, bx: 0, by: 0, load: 0, pitch: 0, rot: 0, camp: c, nobucket: true, i: 0, cab: 0, hs: 'down', ht: 0 }; say('rs', 'The fire is approaching the camp: a rescue helicopter winches the campers out before it arrives', () => [c.x, c.y - 30], 11, [-130, -70]); }
      return;
    }
    const h = resc, c = h.camp, ps = .9 * (.75 + .7 * clamp((c.y - SK) / (H - SK), 0, 1)), hover = c.y - 92;
    const steer = (x, y, vmax) => { const dx = x - h.x, dy = y - h.y, d = Math.hypot(dx, dy), want = Math.min(vmax, d * 1.5), k = Math.min(1, dt * 1.7); h.vx += (dx / (d || 1) * want - h.vx) * k; h.vy += (dy / (d || 1) * want - h.vy) * k; h.x += h.vx * dt; h.y += h.vy * dt; return d < 7; };
    if (h.ph === 'in') { if (steer(c.x, hover, 160)) { h.ph = 'hoist'; h.t = 0; } }
    else if (h.ph === 'hoist') {
      steer(c.x, hover, 30); const p = c.people[h.i];
      if (!p) { h.ph = 'out'; c.away = true; c.boarding = false; c.people.forEach(q => { q.hidden = true; q.hang = false; }); }
      else {
        const full = (c.y + 3 - 15 * ps) - (h.y + 14);
        if (h.hs === 'down') { h.cab = Math.min(Math.max(full, 20), h.cab + 70 * dt); const dx = h.x - p.x, dy = (c.y + 3) - p.y, d = Math.hypot(dx, dy); if (d > 3) { p.x += dx / d * 26 * dt; p.y += dy / d * 26 * dt; p.mv = true; } else p.mv = false; if (h.cab >= full - .6 && d <= 3.5) { h.hs = 'clip'; h.ht = 0; } }
        else if (h.hs === 'clip') { h.ht += dt; p.mv = false; if (h.ht > .7) { h.hs = 'up'; p.hang = true; p.hidden = true; } }
        else { h.cab = Math.max(14, h.cab - 36 * dt); if (h.cab <= 15) { p.hang = false; p.hidden = true; h.i++; h.hs = 'down'; h.cab = 14; } }
      }
    }
    else { h.vx += (130 - h.vx) * Math.min(1, dt * 1.2); h.vy += (-34 - h.vy) * Math.min(1, dt * 1.2); h.x += h.vx * dt; h.y += h.vy * dt; if (h.x > W + 120) { resc = null; return; } }
    const tf = Math.abs(h.vx) > 10 ? Math.sign(h.vx) : h.face; h.face += (tf - h.face) * Math.min(1, dt * 3.2); h.pitch += (clamp(h.vx * .0016, -.2, .2) * (h.face < 0 ? -1 : 1) - h.pitch) * Math.min(1, dt * 3); h.rot += dt * 55; h.bx = h.x; h.by = h.y + 20;
    if (h.ph !== 'out') for (let i = 0; i < 2; i++) if (Math.random() < dt * 8 && parts.length < 1400 && h.y > SK) steamAt(h.x + (Math.random() - .5) * 40, c.y + 6);
  }
  function drawRescueRig(nn, time) {
    if (!resc || resc.ph !== 'hoist') return; const h = resc, c = h.camp, p = c.people[h.i]; if (!p) return;
    const s = .9 * (.75 + .7 * clamp((c.y - SK) / (H - SK), 0, 1)), sc = clamp(W / 1280, .8, 1.15) * 1.15, ex = h.x + Math.sin(time * 2.1) * (h.hs === 'up' ? 2.2 : .6), ey = h.y + 14 + h.cab, ink = nn > .5 ? 'rgba(230,235,245,.95)' : 'rgba(20,20,20,.95)';
    cx.strokeStyle = ink; cx.lineWidth = 1.3; cx.beginPath(); cx.moveTo(h.x + 2 * sc, h.y + 10 * sc); cx.lineTo(ex, ey); cx.stroke(); cx.fillStyle = '#D55E00'; cx.beginPath(); cx.arc(ex, ey, 1.8, 0, 6.283); cx.fill();
    if (p.hang) {
      cx.lineCap = 'round'; cx.strokeStyle = '#1b1b1b'; cx.lineWidth = 2.4 * s; const sw = Math.sin(time * 3) * 1.6 * s;
      cx.beginPath(); cx.moveTo(ex, ey + 9 * s); cx.lineTo(ex - 1.6 * s + sw, ey + 15 * s); cx.moveTo(ex, ey + 9 * s); cx.lineTo(ex + 1.6 * s - sw, ey + 15 * s); cx.stroke();
      cx.strokeStyle = '#E69F00'; cx.lineWidth = 3.2 * s; cx.beginPath(); cx.moveTo(ex, ey + 2.4 * s); cx.lineTo(ex, ey + 9 * s); cx.stroke();
      cx.strokeStyle = '#1b1b1b'; cx.lineWidth = 1.2 * s; cx.beginPath(); cx.moveTo(ex - 1.4 * s, ey + 4 * s); cx.lineTo(ex - .6 * s, ey); cx.moveTo(ex + 1.4 * s, ey + 4 * s); cx.lineTo(ex + .6 * s, ey); cx.stroke();
      cx.fillStyle = '#e8c9a8'; cx.beginPath(); cx.arc(ex, ey + 1.2 * s, 2 * s, 0, 6.283); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(ex, ey - .2 * s, 2 * s, Math.PI, 0); cx.fill();
    }
  }
  /* ---- fire engine: arrives by the forest track, parks, and its crew lays a hose to the fire front ---- */
  let eng = null;
  function updateEngine(dt) {
    if (inc && inc.eng && !inc.engDone && !eng && inc.crew && inc.t > inc.crewT + 6) { inc.engDone = true; const fl = (inc.ax || W * .5) < W / 2; eng = { x: fl ? -90 : W + 90, y: H - (W < 760 ? 330 : 128), dir: fl ? 1 : -1, tx: clamp(inc.ax || W * .5, 130, W - 130), st: 'in', ph: 0 }; say('eng', 'A fire engine arrives and lays a hose line to the fire front', () => [eng.x, eng.y - 30], 9, [-120, -50]); }
    if (!eng) return; eng.ph += dt;
    if (eng.st === 'in') { eng.x += eng.dir * 70 * dt; if (eng.dir * (eng.tx - eng.x) <= 0) { eng.st = 'park'; for (let q = 0; q < 2; q++) crews.push({ x: eng.x + eng.dir * (14 + q * 6), y: eng.y - 3, tx: 0, ty: 0, mode: 'walk', tool: q, ph: Math.random() * 6, k: -1, role: null, slot: q, eng: true }); } }
    else if (eng.st === 'park') { if (!inc && burning.length < 6) { eng.st = 'out'; eng.dir = eng.x < W / 2 ? -1 : 1; } }
    else { eng.x += eng.dir * 80 * dt; if (eng.x < -120 || eng.x > W + 120) eng = null; }
  }
  function drawEngine(nn, time) {
    if (!eng) return; const s = clamp(W / 1280, .8, 1.1), lt = nn > .5 ? .55 : 1, m = c => css(mixc(c, [10, 14, 28], (1 - lt) * 1.1));
    cx.save(); cx.translate(eng.x, eng.y); cx.scale(eng.dir * s, s);
    cx.fillStyle = 'rgba(0,0,0,.2)'; cx.beginPath(); cx.ellipse(0, 1, 34, 4, 0, 0, 6.283); cx.fill();
    cx.fillStyle = m([196, 36, 40]); cx.fillRect(-32, -25, 36, 17); cx.fillStyle = m([226, 230, 236]); cx.fillRect(-32, -15, 36, 2.4);
    cx.fillStyle = m([150, 24, 28]); cx.fillRect(-30, -23, 8, 6); cx.fillRect(-20, -23, 8, 6); cx.fillStyle = m([88, 96, 110]); cx.fillRect(-10, -23, 12, 6);
    cx.fillStyle = m([196, 36, 40]); cx.beginPath(); cx.moveTo(4, -8); cx.lineTo(4, -26); cx.lineTo(20, -26); cx.lineTo(27, -17); cx.lineTo(28, -8); cx.closePath(); cx.fill();
    cx.fillStyle = nn > .5 ? 'rgba(120,150,200,.9)' : 'rgba(150,200,235,.95)'; cx.beginPath(); cx.moveTo(8, -24); cx.lineTo(19, -24); cx.lineTo(25, -17); cx.lineTo(8, -17); cx.closePath(); cx.fill();
    cx.fillStyle = m([226, 230, 236]); cx.fillRect(4, -13, 24, 2);
    cx.strokeStyle = m([200, 205, 215]); cx.lineWidth = 1.3; cx.beginPath(); cx.moveTo(-30, -29); cx.lineTo(2, -29); cx.moveTo(-30, -27); cx.lineTo(2, -27); for (let q = 0; q < 7; q++) { cx.moveTo(-28 + q * 4.6, -29); cx.lineTo(-28 + q * 4.6, -27); } cx.moveTo(-30, -27); cx.lineTo(-30, -25); cx.moveTo(2, -27); cx.lineTo(2, -25); cx.stroke();
    const on = eng.st !== 'out' ? Math.floor(time * 5) % 2 : 0; cx.fillStyle = on ? '#ff3b3b' : '#6a1a1a'; cx.fillRect(9, -29, 5, 3); cx.fillStyle = on ? '#3a6dff' : '#1a2b6a'; cx.fillRect(15, -29, 5, 3);
    if (nn > .15 && on) { cx.globalAlpha = .25 * nn; cx.fillStyle = '#ff3b3b'; cx.beginPath(); cx.arc(11, -28, 12, 0, 6.283); cx.fill(); cx.globalAlpha = 1; }
    const wr = eng.st === 'in' || eng.st === 'out' ? eng.ph * 14 : 0; for (const wx of [-22, -9, 17]) { cx.fillStyle = '#17181c'; cx.beginPath(); cx.arc(wx, -4, 5.4, 0, 6.283); cx.fill(); cx.fillStyle = '#9aa0ab'; cx.beginPath(); cx.arc(wx, -4, 2.4, 0, 6.283); cx.fill(); cx.strokeStyle = '#17181c'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(wx + Math.cos(wr) * 2.4, -4 + Math.sin(wr) * 2.4); cx.lineTo(wx - Math.cos(wr) * 2.4, -4 - Math.sin(wr) * 2.4); cx.stroke(); }
    cx.restore();
  }
  function steamAt(x, y) { if (parts.length < 1400) parts.push({ k: 4, x: x + (Math.random() - .5) * 8, y: y - 2, vx: 2 + Math.random() * 3, vy: -(10 + Math.random() * 10), r: 4 + Math.random() * 4, age: 0, max: 2.4 + Math.random() * 1.6, w: Math.random() }); }
  function drawCamps(nn, time) {
    camps.forEach(c => {
      const sc = .75 + .7 * clamp((c.y - SK) / (H - SK), 0, 1), x = c.x, y = c.y;
      cx.fillStyle = css(mixc(hex('#b79a62'), hex('#2a2a2a'), nn * .8), .85); cx.beginPath(); cx.ellipse(x, y + 4 * sc, 30 * sc, 9 * sc, 0, 0, 6.283); cx.fill();
      [[-17, '#56B4E9'], [1, '#E69F00'], [18, '#CC79A7']].forEach(([dx, col], i) => { const tx = x + dx * sc, ty = y + (i === 1 ? 1 : 3) * sc, w = 9 * sc, h = 10 * sc, c0 = mixc(hex(col), [14, 20, 40], nn * .55);
        cx.fillStyle = css(c0); cx.beginPath(); cx.moveTo(tx - w, ty); cx.lineTo(tx, ty - h); cx.lineTo(tx + w, ty); cx.closePath(); cx.fill(); cx.fillStyle = css(mixc(c0, [0, 0, 0], .3)); cx.beginPath(); cx.moveTo(tx, ty - h); cx.lineTo(tx + w, ty); cx.lineTo(tx + 1, ty); cx.closePath(); cx.fill(); cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.moveTo(tx - 2 * sc, ty); cx.lineTo(tx, ty - 5 * sc); cx.lineTo(tx + 2 * sc, ty); cx.closePath(); cx.fill(); });
      const fx = x, fy = y + 9 * sc;
      cx.strokeStyle = css(mixc(hex('#5a3a1e'), hex('#120c08'), nn)); cx.lineWidth = 2 * sc; cx.beginPath(); cx.moveTo(fx - 5 * sc, fy + 1); cx.lineTo(fx + 5 * sc, fy - 1); cx.moveTo(fx - 4 * sc, fy - 1); cx.lineTo(fx + 4 * sc, fy + 1); cx.stroke();
      if (c.lit) { const fl = .8 + .2 * Math.sin(time * 11 + c.ph) + .1 * Math.sin(time * 23); drawFlame(fx, fy, (11 + (c.ignoring ? 4 : 0)) * sc * fl, 4.4 * sc, Math.sin(time * 3 + c.ph) * 1.5 + S.wind * 5, 1); if (nn > .15) { cx.globalCompositeOperation = 'lighter'; const r = 46 * sc; cx.globalAlpha = .35 * nn; cx.drawImage(SM.warm, fx - r, fy - r, r * 2, r * 2); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; } if (Math.random() < .12 && parts.length < 1400) parts.push({ k: 0, x: fx, y: fy - 8 * sc, vx: 0, vy: -12, r: 2.4, age: 0, max: 5, w: .6 + Math.random() }); }
      else if (c.out > 0) { cx.fillStyle = `rgba(60,40,30,${.6})`; cx.beginPath(); cx.ellipse(fx, fy, 6 * sc, 2 * sc, 0, 0, 6.283); cx.fill(); }
      /* wooden hut and a broadleaf tree beside the camp */
      { const hx = x - 36 * sc, hy = y + 5 * sc, w = 13 * sc, h = 11 * sc; cx.fillStyle = css(mixc(hex('#8a5a32'), hex('#1a1210'), nn * .75)); cx.fillRect(hx - w / 2, hy - h, w, h); cx.strokeStyle = css(mixc(hex('#5a3a1e'), hex('#0c0806'), nn * .75), .8); cx.lineWidth = .7; for (let q = 1; q < 4; q++) { cx.beginPath(); cx.moveTo(hx - w / 2 + q * w / 4, hy - h); cx.lineTo(hx - w / 2 + q * w / 4, hy); cx.stroke(); } cx.fillStyle = css(mixc(hex('#5b3a22'), hex('#0e0a08'), nn * .75)); cx.beginPath(); cx.moveTo(hx - w / 2 - 2 * sc, hy - h); cx.lineTo(hx, hy - h - 7 * sc); cx.lineTo(hx + w / 2 + 2 * sc, hy - h); cx.closePath(); cx.fill(); cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(hx - 2 * sc, hy - 7 * sc, 4 * sc, 7 * sc); if (c.hide && nn > .3) { cx.fillStyle = 'rgba(240,228,66,.55)'; cx.fillRect(hx + 3 * sc, hy - 8 * sc, 2.4 * sc, 2.4 * sc); }
        const tx = x + 40 * sc, ty = y + 4 * sc; cx.strokeStyle = css(mixc(hex('#5a3a1e'), hex('#0c0806'), nn * .75)); cx.lineWidth = 3 * sc; cx.beginPath(); cx.moveTo(tx, ty); cx.lineTo(tx, ty - 14 * sc); cx.stroke(); const lc = mixc(hex('#3d7f44'), hex('#12301f'), nn * .8); cx.fillStyle = css(mixc(lc, [0, 0, 0], .2)); cx.beginPath(); cx.ellipse(tx, ty - 18 * sc, 11 * sc, 8 * sc, 0, 0, 6.283); cx.fill(); cx.fillStyle = css(lc); cx.beginPath(); cx.ellipse(tx + 3 * sc, ty - 21 * sc, 7 * sc, 5 * sc, 0, 0, 6.283); cx.fill(); }
      c.people.forEach((p, i) => { if (p.hidden) return; const s = sc * .9, fl = p.mv, sw = fl ? Math.sin(time * 8 + i) : 0; cx.strokeStyle = '#1b1b1b'; cx.lineWidth = 2.4 * s; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(p.x, p.y - 9 * s); cx.lineTo(p.x, p.y - 4 * s); cx.moveTo(p.x, p.y - 4 * s); cx.lineTo(p.x - 2 * s + sw * 2 * s, p.y); cx.moveTo(p.x, p.y - 4 * s); cx.lineTo(p.x + 2 * s - sw * 2 * s, p.y); cx.stroke(); cx.strokeStyle = ['#D55E00', '#0072B2', '#F0E442'][i % 3]; cx.lineWidth = 2 * s; cx.beginPath(); cx.moveTo(p.x, p.y - 9 * s); cx.lineTo(p.x, p.y - 5 * s); cx.stroke(); cx.fillStyle = '#e8c9a8'; cx.beginPath(); cx.arc(p.x, p.y - 11 * s, 2.1 * s, 0, 6.283); cx.fill(); });
      if (c.ban && !c.ignoring) { const sx = x + 26 * sc, sy = y + 6 * sc; cx.strokeStyle = '#444'; cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(sx, sy - 14 * sc); cx.stroke(); cx.fillStyle = '#fff'; cx.fillRect(sx - 6 * sc, sy - 22 * sc, 12 * sc, 9 * sc); cx.strokeStyle = '#D55E00'; cx.lineWidth = 1.6; cx.strokeRect(sx - 6 * sc, sy - 22 * sc, 12 * sc, 9 * sc); cx.fillStyle = '#D55E00'; cx.beginPath(); cx.moveTo(sx, sy - 21 * sc); cx.quadraticCurveTo(sx + 3 * sc, sy - 17 * sc, sx, sy - 14.5 * sc); cx.quadraticCurveTo(sx - 3 * sc, sy - 17 * sc, sx, sy - 21 * sc); cx.fill(); cx.beginPath(); cx.moveTo(sx - 6 * sc, sy - 22 * sc); cx.lineTo(sx + 6 * sc, sy - 13 * sc); cx.stroke(); }
    });
  }
  /* ---- flux tower and early warning centre ---- */
  function drawEW(nn, time) {
    const x = TW.x, y = TW.y, h = TW.h, col = DCOL[dIdx()], ink = nn > .5 ? '#c4cde0' : '#3b424d';
    cx.strokeStyle = ink; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(x - 6, y); cx.lineTo(x - 1.8, y - h); cx.moveTo(x + 6, y); cx.lineTo(x + 1.8, y - h); cx.stroke();
    cx.lineWidth = .9; cx.beginPath(); for (let i = 0; i < 6; i++) { const y0 = y - h * i / 6, y1 = y - h * (i + 1) / 6, w0 = 6 - 4.2 * i / 6, w1 = 6 - 4.2 * (i + 1) / 6; cx.moveTo(x - w0, y0); cx.lineTo(x + w1, y1); cx.moveTo(x + w0, y0); cx.lineTo(x - w1, y1); cx.moveTo(x - w1, y1); cx.lineTo(x + w1, y1); } cx.stroke();
    cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(x, y - h * .78); cx.lineTo(x + 17, y - h * .78); cx.stroke(); cx.fillStyle = ink; cx.fillRect(x + 15, y - h * .78 - 3.4, 4, 3.4); cx.fillRect(x + 8, y - h * .78 - 2, 2.6, 2);
    cx.beginPath(); cx.moveTo(x, y - h * .5); cx.lineTo(x - 13, y - h * .5); cx.stroke(); cx.fillStyle = '#56B4E9'; cx.fillRect(x - 15, y - h * .5 - 3, 3.4, 3);
    cx.save(); cx.translate(x - 7, y - h * .24); cx.rotate(-.6); cx.fillStyle = nn > .5 ? '#46567e' : '#2c4f7a'; cx.fillRect(-8, -3, 16, 6); cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = .5; cx.strokeRect(-8, -3, 16, 6); cx.restore();
    cx.fillStyle = nn > .5 ? '#8794b0' : '#5b6572'; cx.fillRect(x + 7, y - 9, 8, 9); cx.fillStyle = '#F0E442'; cx.fillRect(x + 9, y - 7, 2.5, 2);
    cx.strokeStyle = ink; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x, y - h); cx.lineTo(x, y - h - 8); cx.stroke(); cx.fillStyle = (Math.sin(time * 4) > 0 && nn > .2) ? '#ff3b30' : 'rgba(140,30,30,.8)'; cx.beginPath(); cx.arc(x, y - h - 8, 1.6, 0, 6.283); cx.fill();
    const q = (time % 2.2) / 2.2; cx.strokeStyle = nn > .5 ? `rgba(240,228,66,${.6 * (1 - q)})` : `rgba(0,114,178,${.7 * (1 - q)})`; cx.lineWidth = 1.2; cx.beginPath(); cx.ellipse(x + 17, y - h * .78 - 2, 4 + 18 * q, 2 + 9 * q, 0, 0, 6.283); cx.stroke();
    cx.font = '700 10px ' + FONT; cx.textAlign = 'center'; cx.fillStyle = nn > .5 ? 'rgba(220,232,255,.85)' : 'rgba(16,40,70,.85)'; cx.fillText('FLUX TOWER', x, y + 13);
    /* data links: the flux tower and two automatic weather stations send readings to the centre */
    const bx = EC.x, by = EC.y - 34, SRC = [{ x, y: y - h - 8 }, { x: AW[0].x, y: AW[0].y - 31 }, { x: AW[1].x, y: AW[1].y - 31 }];
    SRC.forEach((s, si) => { const mx = (s.x + bx) / 2, my = Math.min(s.y, by) - 40;
      cx.strokeStyle = nn > .5 ? 'rgba(200,215,255,.16)' : 'rgba(30,60,100,.16)'; cx.lineWidth = 1; cx.setLineDash([3, 5]); cx.beginPath(); cx.moveTo(s.x, s.y); cx.quadraticCurveTo(mx, my, bx, by); cx.stroke(); cx.setLineDash([]);
      const ls = drawEW.lasts || (drawEW.lasts = []); if (time - (ls[si] || 0) > 1.3 + si * .35) { ls[si] = time; packets.push({ t0: time, si }); } });
    for (let i = packets.length - 1; i >= 0; i--) { const p = packets[i], s = SRC[p.si], u = (time - p.t0) / 2.4; if (u > 1) { packets.splice(i, 1); EC.pulse = time; continue; } const mx = (s.x + bx) / 2, my = Math.min(s.y, by) - 40, px = (1 - u) * (1 - u) * s.x + 2 * u * (1 - u) * mx + u * u * bx, py = (1 - u) * (1 - u) * s.y + 2 * u * (1 - u) * my + u * u * by; cx.fillStyle = col; cx.fillRect(px - 2, py - 2, 4, 4); cx.strokeStyle = nn > .5 ? 'rgba(10,16,32,.9)' : 'rgba(255,255,255,.9)'; cx.lineWidth = .8; cx.strokeRect(px - 2, py - 2, 4, 4); }
    drawAWS(AW[0], 'AWS 1', nn, time); drawAWS(AW[1], 'AWS 2', nn, time);
    const ex = EC.x, ey = EC.y, pulse = Math.max(0, 1 - (time - (EC.pulse || -9)) * 3);
    cx.fillStyle = nn > .5 ? '#2a3350' : '#e9edf3'; cx.fillRect(ex - 22, ey - 22, 44, 24); cx.strokeStyle = nn > .5 ? '#7d8bb0' : '#4b5563'; cx.lineWidth = 1.2; cx.strokeRect(ex - 22, ey - 22, 44, 24);
    cx.fillStyle = nn > .5 ? '#1c2440' : '#c9d1dc'; cx.beginPath(); cx.moveTo(ex - 25, ey - 22); cx.lineTo(ex, ey - 31); cx.lineTo(ex + 25, ey - 22); cx.closePath(); cx.fill(); cx.stroke();
    for (let i = 0; i < 3; i++) { cx.fillStyle = nn > .5 ? `rgba(240,228,66,${.85})` : 'rgba(90,150,200,.85)'; cx.fillRect(ex - 18 + i * 13, ey - 17, 9, 7); } cx.fillStyle = col; cx.fillRect(ex - 9, ey - 17, 9, 7);
    cx.strokeStyle = ink; cx.lineWidth = 1.3; cx.beginPath(); cx.moveTo(ex + 14, ey - 28); cx.lineTo(ex + 14, ey - 40); cx.stroke(); cx.beginPath(); cx.arc(ex + 14, ey - 40, 4, Math.PI * 1.1, Math.PI * 1.9); cx.stroke();
    const bl = .55 + .45 * Math.sin(time * 5); cx.globalCompositeOperation = 'lighter'; const gr = cx.createRadialGradient(ex - 4, ey - 36, 0, ex - 4, ey - 36, 14 + 10 * pulse); gr.addColorStop(0, col + 'cc'); gr.addColorStop(1, col + '00'); cx.globalAlpha = .55 + .4 * bl; cx.fillStyle = gr; cx.fillRect(ex - 30, ey - 54, 52, 40); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    cx.fillStyle = col; cx.beginPath(); cx.arc(ex - 4, ey - 36, 3.4, 0, 6.283); cx.fill(); cx.strokeStyle = nn > .5 ? '#0a1020' : '#fff'; cx.lineWidth = 1; cx.stroke();
    cx.fillStyle = nn > .5 ? 'rgba(220,232,255,.85)' : 'rgba(16,40,70,.85)'; cx.fillText('EARLY WARNING CENTRE', ex, ey + 14); cx.textAlign = 'start'; A.ec = [ex - 4, ey - 38];
  }
  /* ---- animals ---- */
  function spawnAnimals() {
    animals.length = 0; const mk = (kind, n, vmin, vmax) => { for (let i = 0; i < n; i++) { const [x, y] = randCell(vmin, vmax); animals.push({ kind, x, y, hx: x, hy: y, s: 'graze', t: rr(1, 8), dir: Math.random() < .5 ? -1 : 1, ph: Math.random() * 6, tx: x, ty: y, hd: 1, big: Math.random() < .5, drinkT: 0, told: false }); } };
    mk('deer', 5, .32, .72); mk('goral', 3, .6, .82); mk('langur', 3, .3, .55);
  }

  /* ---- animals keep out of the water: the pond is a boundary, streams are jumped over ---- */
  function lakeFix(o) { if (inLake(o.x, o.y, 5)) { const ex = (o.x - LAKE.x) / (LAKE.rx + 5), ey = (o.y - LAKE.y) / (LAKE.ry + 2.5), l = Math.hypot(ex, ey) || 1; o.x = LAKE.x + ex / l * 1.03 * (LAKE.rx + 5); o.y = LAKE.y + ey / l * 1.03 * (LAKE.ry + 2.5); } }
  const sk = { t: -1, k: 1, wt: 1 };
  function strmIn(x, y) {
    if (sk.t !== T) { sk.t = T; const ws = streamScale(); sk.k = ws; sk.wt = clamp((ws - .5) / .35, 0, 1); }
    for (let i = 0; i < NET.length; i++) { const n = NET[i], k = n.order === 2 ? sk.k : sk.k * sk.wt; if (k < .25) continue; const P = n.pts; for (let j = 0; j < P.length; j += 1) { const p = P[j], dx = p.x - x, dy = p.y - y, r = p.w * k * .5 + 3; if (dx * dx + dy * dy < r * r) return true; } }
    return false;
  }
  function drawQuadFB(a, col, dk, nn, moving, gal) {
    const fr = a.view === 'front', g = a.kind === 'goral', k = g ? .85 : 1, hd = a.hd, ph = a.ph * gal; cx.lineCap = 'round';
    cx.strokeStyle = dk; cx.lineWidth = 1.5 * k; cx.beginPath();
    for (let i = 0; i < 4; i++) { const x = [-3.4, -1.3, 1.3, 3.4][i] * k, lift = moving ? Math.max(0, Math.sin(ph + (i % 2 ? 0 : Math.PI))) * 3.2 : 0; cx.moveTo(x, -5 * k); cx.lineTo(x, 1 - lift); } cx.stroke();
    cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, -7.5 * k, 4.8 * k, 5.2 * k, 0, 0, 6.283); cx.fill();
    const antl = a.kind === 'deer' && a.big, ac = nn > .5 ? 'rgba(200,205,215,.85)' : '#e6dcc6';
    if (fr) {
      cx.fillStyle = 'rgba(255,255,255,.3)'; cx.beginPath(); cx.ellipse(0, -5.2 * k, 2.6 * k, 2.6 * k, 0, 0, 6.283); cx.fill();
      const hy = -14.5 * k + hd * 6.5 * k; cx.strokeStyle = col; cx.lineWidth = 3.6 * k; cx.beginPath(); cx.moveTo(0, -9 * k); cx.lineTo(0, hy + 1); cx.stroke();
      if (antl) { cx.strokeStyle = ac; cx.lineWidth = .9; cx.beginPath(); for (const s of [-1, 1]) { cx.moveTo(s * 1.4, hy - 2.4); cx.lineTo(s * 3.6, hy - 8); cx.lineTo(s * 2.6, hy - 11.5); cx.moveTo(s * 3, hy - 6); cx.lineTo(s * 5.6, hy - 8); } cx.stroke(); }
      if (g) { cx.strokeStyle = dk; cx.lineWidth = 1.1; cx.beginPath(); for (const s of [-1, 1]) { cx.moveTo(s * 1.4, hy - 2.4); cx.quadraticCurveTo(s * 2.8, hy - 6, s * 1.6, hy - 7.4); } cx.stroke(); }
      cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, hy, 2.5 * k, 3 * k, 0, 0, 6.283); cx.fill();
      for (const s of [-1, 1]) { cx.save(); cx.translate(s * 3.2 * k, hy - 2 * k); cx.rotate(s * .55); cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, 0, 1.7 * k, .85 * k, 0, 0, 6.283); cx.fill(); cx.restore(); }
      cx.fillStyle = 'rgba(255,255,255,.55)'; cx.beginPath(); cx.ellipse(0, hy + 2.2 * k, 1.5 * k, 1.1 * k, 0, 0, 6.283); cx.fill();
      cx.fillStyle = '#151515'; cx.beginPath(); cx.arc(-1.4 * k, hy - .4 * k, .5, 0, 6.283); cx.arc(1.4 * k, hy - .4 * k, .5, 0, 6.283); cx.arc(0, hy + 2.8 * k, .6, 0, 6.283); cx.fill();
    } else {
      const hy = -13.6 * k + hd * 3 * k;
      cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, hy, 2.3 * k, 2.2 * k, 0, 0, 6.283); cx.fill();
      for (const s of [-1, 1]) { cx.save(); cx.translate(s * 2.8 * k, hy - 1 * k); cx.rotate(s * .6); cx.beginPath(); cx.ellipse(0, 0, 1.6 * k, .8 * k, 0, 0, 6.283); cx.fill(); cx.restore(); }
      if (antl) { cx.strokeStyle = ac; cx.lineWidth = .9; cx.beginPath(); for (const s of [-1, 1]) { cx.moveTo(s * 1.3, hy - 1.6); cx.lineTo(s * 3.4, hy - 7); cx.lineTo(s * 2.4, hy - 10); cx.moveTo(s * 3, hy - 5); cx.lineTo(s * 5.4, hy - 7); } cx.stroke(); }
      cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, -7.5 * k, 4.8 * k, 5.2 * k, 0, 0, 6.283); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.8)'; cx.beginPath(); cx.ellipse(0, -5.4 * k, 2.3 * k, 2.7 * k, 0, 0, 6.283); cx.fill(); cx.fillStyle = dk; cx.beginPath(); cx.ellipse(0, -7.4 * k, .9 * k, 1.3 * k, 0, 0, 6.283); cx.fill();
    }
  }
  function drawEleFB(x, y, s, front, ph, nn, drink, moving, al) {
    const col = css(mixc([120, 122, 128], [14, 16, 30], nn * .72)), dk = css(mixc([84, 86, 92], [6, 8, 18], nn * .72)), lt = css(mixc([160, 150, 150], [22, 22, 38], nn * .72));
    cx.save(); cx.globalAlpha = al; cx.translate(x, y); cx.scale(s, s); cx.lineCap = 'round';
    cx.strokeStyle = dk; cx.lineWidth = 6.4; cx.beginPath(); for (let i = 0; i < 4; i++) { const lx = [-11, -5, 5, 11][i], lift = moving ? Math.max(0, Math.sin(ph + (i % 2 ? 0 : Math.PI))) * 3.4 : 0; cx.moveTo(lx, -6); cx.lineTo(lx, 12 - lift); } cx.stroke();
    cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, -15, 16, 16, 0, 0, 6.283); cx.fill();
    if (front) {
      for (const sg of [-1, 1]) { cx.fillStyle = dk; cx.beginPath(); cx.ellipse(sg * 13, -22, 7.5, 11, sg * -.12, 0, 6.283); cx.fill(); cx.fillStyle = lt; cx.beginPath(); cx.ellipse(sg * 13, -22, 4.4, 7.4, sg * -.12, 0, 6.283); cx.fill(); }
      cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, -22, 8.6, 10, 0, 0, 6.283); cx.fill();
      cx.strokeStyle = nn > .5 ? '#cfd3da' : '#f4efe0'; cx.lineWidth = 2; cx.beginPath(); for (const sg of [-1, 1]) { cx.moveTo(sg * 4.4, -15); cx.quadraticCurveTo(sg * 8, -10, sg * 6.4, -5); } cx.stroke();
      cx.strokeStyle = col; cx.lineWidth = 5.2; cx.beginPath(); cx.moveTo(0, -17); cx.quadraticCurveTo(Math.sin(ph * .6) * 3, -8, drink ? 0 : Math.sin(ph * .6) * 3.4, drink ? 9 : 3); cx.stroke();
      cx.fillStyle = '#111'; cx.beginPath(); cx.arc(-4, -24, 1, 0, 6.283); cx.arc(4, -24, 1, 0, 6.283); cx.fill();
    } else {
      for (const sg of [-1, 1]) { cx.fillStyle = dk; cx.beginPath(); cx.ellipse(sg * 15, -20, 6, 10, sg * .15, 0, 6.283); cx.fill(); }
      cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, -27, 7, 6.4, 0, 0, 6.283); cx.fill(); cx.beginPath(); cx.ellipse(0, -14, 15, 15, 0, 0, 6.283); cx.fill();
      cx.fillStyle = lt; cx.globalAlpha = al * .35; cx.beginPath(); cx.ellipse(0, -9, 8, 8, 0, 0, 6.283); cx.fill(); cx.globalAlpha = al;
      cx.strokeStyle = dk; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(0, -10); cx.quadraticCurveTo(Math.sin(ph * .8) * 2, -3, Math.sin(ph * .8) * 3, 3); cx.stroke(); cx.fillStyle = dk; cx.beginPath(); cx.arc(Math.sin(ph * .8) * 3, 3.6, 1.6, 0, 6.283); cx.fill();
    }
    cx.restore();
  }
  let drinkTimer = 6, flockT = 14, campT = 30;
  function updateAnimals(dt) {
    const F = burning.length > 20 ? A.fire : null, R = 60 + Math.sqrt(burning.length) * 3.4;
    drinkTimer -= dt;
    if (drinkTimer <= 0) { drinkTimer = rr(9, 18); const cand = animals.filter(a => a.s === 'graze' || a.s === 'walk'); if (cand.length && !F) { const a = cand[(Math.random() * cand.length) | 0], side = Math.random() < .5 ? -1 : 1; a.s = 'toPond'; a.side = side; a.tx = LAKE.x + side * (LAKE.rx + 9); a.ty = LAKE.y + rr(-.3, .5) * LAKE.ry; } }
    campT -= dt;
    if (campT <= 0) { campT = rr(45, 85); const cand = animals.filter(a => (a.kind === 'deer' || a.kind === 'langur') && (a.s === 'graze' || a.s === 'walk')), cc = camps.filter(c => !c.ignoring && !c.hide); if (cand.length && cc.length && !F) { const a = cand[(Math.random() * cand.length) | 0], c = cc[(Math.random() * cc.length) | 0], sd = a.x < c.x ? -1 : 1; a.s = 'toCamp'; a.camp = c; a.cx = c.x; a.tx = c.x + sd * 22; a.ty = c.y + 8; } }
    animals.forEach(a => {
      if (a.gone) { a.goneT -= dt; if (a.goneT <= 0) { a.gone = false; a.x = a.hx; a.y = a.hy; a.s = 'graze'; a.t = rr(2, 6); } return; }
      if (a.s === 'run') return;
      const sc = .55 + .75 * clamp((a.y - SK) / (H - SK), 0, 1), base = a.kind === 'goral' ? 15 : a.kind === 'langur' ? 13 : 20;
      if (F && a.s !== 'flee' && Math.hypot(a.x - F[0], a.y - F[1]) < R + 90) { a.s = 'flee'; if (!a.told && !flags.fl) { a.told = true; sayA('fl', 'Wildlife moves away from the fire and smoke', () => [a.x, a.y - 12], 8, [60, -50]); } }
      let mvx = 0, mvy = 0, spd = 0, hdT = 0;
      if (a.s === 'flee') { if (!F || Math.hypot(a.x - F[0], a.y - F[1]) > R + 190) { a.s = 'graze'; a.hx = a.x; a.hy = a.y; a.t = rr(3, 8); } else { const dx = a.x - F[0], dy = a.y - F[1], d = Math.hypot(dx, dy) || 1; mvx = dx / d; mvy = dy / d * .6; spd = base * 3.3 * sc; a.dir = Math.sign(mvx) || a.dir; } }
      else if (a.s === 'graze') { hdT = a.kind === 'langur' ? 0 : 1; a.t -= dt; if (a.t <= 0) { a.s = 'walk'; if (Math.random() < .5) { a.tx = clamp(a.x + rr(-18, 18), 10, W - 10); a.ty = clamp(a.y + (Math.random() < .5 ? -1 : 1) * rr(45, 110), SK + 30, H - 40); } else { a.tx = clamp(a.hx + rr(-90, 90), 10, W - 10); a.ty = clamp(a.hy + rr(-70, 70), SK + 30, H - 40); } if (inLake(a.tx, a.ty, 18)) { a.tx = a.hx; a.ty = a.hy; } } }
      else if (a.s === 'walk' || a.s === 'toPond') { const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy); if (d < 4) { if (a.s === 'toPond') { a.s = 'drink'; a.drinkT = rr(5, 8); a.dir = -a.side; if (!a.told && !flags.dr) { a.told = true; sayA('dr', 'Animals come to the pond to drink', () => [a.x, a.y - 10], 8, [-90, -64]); } } else { a.s = 'graze'; a.t = rr(3, 9); } } else { mvx = dx / d; mvy = dy / d; spd = base * sc; a.dir = Math.sign(mvx) || a.dir; } }
      else if (a.s === 'toCamp') { const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy); if (d < 5) { a.s = 'campSniff'; a.t = 5.5; a.dir = Math.sign(a.cx - a.x) || a.dir; const c = a.camp; if (c) { c.scare = 7; c.scareFrom = [a.x, a.y]; if (!flags.dc) sayA('dc', 'A deer wanders into the camp and the campers step back', () => [a.x, a.y - 12], 9, [-90, -64]); } } else { mvx = dx / d; mvy = dy / d; spd = base * .8 * sc; a.dir = Math.sign(mvx) || a.dir; } }
      else if (a.s === 'campSniff') { hdT = 1; a.t -= dt; if (a.t <= 0) { a.s = 'walk'; a.tx = a.hx; a.ty = a.hy; } }
      else if (a.s === 'drink') { hdT = 1; a.drinkT -= dt; if (Math.random() < dt * 1.1) ripples.push({ x: a.x + a.dir * 9, y: LAKE.y + (a.y - LAKE.y) * .3 + 3, t0: T }); if (a.drinkT <= 0) { a.s = 'walk'; a.tx = a.hx; a.ty = a.hy; } }
      if (spd > 0 && a.s !== 'toPond' && a.s !== 'drink' && inLake(a.x + mvx * 28, a.y + mvy * 28, 12)) {
        const u = (a.x - LAKE.x) / LAKE.rx, v = (a.y - LAKE.y) / LAKE.ry, l = Math.hypot(u, v) || 1, ml = Math.hypot(mvx, mvy) || 1;
        if (!a.sd) a.sd = (u * mvy / ml - v * mvx / ml) >= 0 ? 1 : -1;
        let tx = -v * LAKE.rx * a.sd, ty = u * LAKE.ry * a.sd, ox = u * LAKE.rx, oy = v * LAKE.ry; const tl = Math.hypot(tx, ty) || 1, ol = Math.hypot(ox, oy) || 1;
        mvx = tx / tl * .85 + ox / ol * .4; mvy = ty / tl * .85 + oy / ol * .4; const nl = Math.hypot(mvx, mvy) || 1; mvx /= nl; mvy /= nl; a.dir = Math.sign(mvx) || a.dir;
      } else if (a.sd && !inLake(a.x + mvx * 60, a.y + mvy * 60, 14)) a.sd = 0;
      a.sT = (a.sT || 0) + dt; if (a.sT > 1.6) { if (spd > 0 && a.s !== 'drink' && Math.hypot(a.x - (a.sx || a.x), a.y - (a.sy || a.y)) < 5) { if (a.s !== 'flee') { a.s = 'walk'; } a.tx = clamp(a.x + rr(-120, 120), 10, W - 10); a.ty = clamp(a.y - rr(50, 110), SK + 30, H - 40); a.sd = 0; if (inLake(a.tx, a.ty, 12)) a.ty = clamp(LAKE.y - LAKE.ry - 40, SK + 30, H - 40); } a.sx = a.x; a.sy = a.y; a.sT = 0; }
      if (a.jt === undefined) a.jt = -1;
      if (a.jt >= 0) { a.jt += dt; const u = a.jt / a.jd; if (u >= 1) { a.jt = -1; a.jz = 0; } else a.jz = Math.sin(Math.PI * u) * a.jh; spd *= 1.5; }
      else { a.jz = 0; if (spd > 0 && a.kind !== 'langur') { if (strmIn(a.x + mvx * 8, a.y + mvy * 8) || strmIn(a.x, a.y)) { a.jt = 0; a.jd = .8; a.jh = 11; } else if (Math.random() < dt * (a.s === 'flee' ? 1.3 : .06)) { a.jt = 0; a.jd = .55; a.jh = a.s === 'flee' ? 9 : 5; } } }
      if (spd > 1) { const ax = Math.abs(mvx), ay = Math.abs(mvy); if (!a.view || a.view === 'side') { if (ay > ax * 1.25) a.view = mvy > 0 ? 'front' : 'back'; } else if (ax > ay * 1.4) a.view = 'side'; else a.view = mvy > 0 ? 'front' : 'back'; }
      if (a.s === 'drink' || a.s === 'campSniff' || a.s === 'run') a.view = 'side';
      a.x += mvx * spd * dt; a.y += mvy * spd * dt; lakeFix(a); a.ph += spd * dt * .35; a.hd += (hdT - a.hd) * Math.min(1, dt * 3); a.sp = spd;
    });
    flockT -= dt; if (flockT <= 0 && flocks.length < 2) { flockT = rr(28, 50); flocks.push({ x: -50, y: rr(.12, .55) * SK, vx: rr(26, 40), vy: rr(-2, 2), n: 5 + (Math.random() * 5 | 0), ph: Math.random() * 6, sc: false }); }
    for (let i = flocks.length - 1; i >= 0; i--) { const f = flocks[i]; f.x += f.vx * dt; f.y += (f.vy + Math.sin(f.ph + f.x * .02) * 4) * dt; if (f.x > W + 80 || f.x < -120 || f.y < -40) flocks.splice(i, 1); }
  }
  /* ---- predators: tiger, bear, fox. Chases always end out of view at the edge of the valley; nothing is ever caught or hurt on screen. ---- */
  const preds = []; let chaseT = 28, bearT = 50, foxT = 14;
  const scAt = y => .55 + .75 * clamp((y - SK) / (H - SK), 0, 1);
  function updatePreds(dt, nn) {
    const F = burning.length > 20 ? A.fire : null; chaseT -= dt; bearT -= dt; foxT -= dt;
    if (!F) {
      if (chaseT <= 0 && !preds.some(p => p.kind === 'tiger')) { chaseT = rr(45, 80); const pr = animals.filter(a => (a.kind === 'deer' || a.kind === 'goral') && !a.gone && (a.s === 'graze' || a.s === 'walk') && a.x < W * .6 && a.x > 60); if (pr.length) { const a = pr[(Math.random() * pr.length) | 0]; a.s = 'graze'; a.t = 99; preds.push({ kind: 'tiger', x: a.x - 150, y: a.y + 5, st: 'stalk', t: 4, dir: 1, ph: 0, hd: 1, prey: a }); sayA('tg', 'A tiger stalks a deer. The deer runs and the tiger follows it out of sight', () => [a.x, a.y - 14], 10, [-80, -70]); } }
      if (bearT <= 0 && !preds.some(p => p.kind === 'bear')) { bearT = rr(70, 120); const L = Math.random() < .5, cp = camps.filter(c => !c.ignoring), visit = Math.random() < .5 && cp.length ? cp[(Math.random() * cp.length) | 0] : null; preds.push({ kind: 'bear', x: L ? -40 : W + 40, y: visit ? visit.y + 6 : SK + (H - SK) * rr(.3, .62), tx: L ? W + 60 : -60, dir: L ? 1 : -1, ph: 0, hd: 0, st: visit ? 'toCamp' : 'walk', t: rr(4, 7), scared: false, camp: visit }); if (visit) sayA('bc', 'A bear enters the camp. The campers shelter in the wooden hut and up a tree until it leaves', () => [visit.x, visit.y - 24], 11, [-120, -76]); }
      if (nn > .55 && foxT <= 0 && !preds.some(p => p.kind === 'fox')) { foxT = rr(22, 45); const L = Math.random() < .5; preds.push({ kind: 'fox', x: L ? -30 : W + 30, y: SK + (H - SK) * rr(.45, .75), tx: L ? W + 50 : -50, dir: L ? 1 : -1, ph: 0, hd: 0, st: 'walk', t: rr(3, 6) }); }
    }
    for (let i = preds.length - 1; i >= 0; i--) {
      const p = preds[i], sc = scAt(p.y);
      if (F && p.kind !== 'tiger') { if (p.camp) p.camp.hide = false; p.st = 'leave'; p.tx = p.dir > 0 ? W + 80 : -80; }
      if (p.kind === 'tiger') {
        const a = p.prey; if (!a || a.gone || F) { if (a && !a.gone) { a.s = 'graze'; a.t = 3; } preds.splice(i, 1); continue; }
        if (p.st === 'stalk') { p.t -= dt; p.hd += (1 - p.hd) * Math.min(1, dt * 3); if (a.x - p.x > 110) { p.x += 16 * sc * dt; p.ph += 16 * sc * dt * .3; } if (p.t <= 0) { p.st = 'chase'; a.s = 'run'; a.dir = 1; } }
        else { const vp = 76 * scAt(a.y), gap = a.x - p.x, vt = gap > 46 ? vp * 1.3 : vp; a.x += vp * dt; a.ph += vp * dt * .33; p.x += vt * dt; p.ph += vt * dt * .3; p.y += (a.y + 3 - p.y) * Math.min(1, dt * 1.5); p.hd += (0 - p.hd) * Math.min(1, dt * 4); if (a.x > W + 40) { a.gone = true; a.goneT = rr(28, 48); a.s = 'graze'; preds.splice(i, 1); } }
        continue;
      }
      if (p.kind === 'bear' && p.camp) { const c = p.camp, near = Math.hypot(p.x - c.x, p.y - c.y) < 190; c.hide = near; if (p.st === 'toCamp') { const dx = c.x + (p.x < c.x ? -34 : 34) - p.x, d = Math.abs(dx); if (d < 4) { p.st = 'sniff'; p.t = 7; p.visit = true; p.dir = p.x < c.x ? 1 : -1; } else { p.dir = Math.sign(dx); p.x += p.dir * 24 * sc * dt; p.ph += 24 * sc * dt * .3; p.hd += (0 - p.hd) * Math.min(1, dt * 3); } continue; } if (p.st === 'sniff' && p.visit && p.t <= 0) { p.camp.hide = near; } if (p.st === 'walk' && p.visit) { p.dir = p.x > W / 2 ? 1 : -1; } }
      if (p.kind === 'bear' && !p.scared) { animals.forEach(a => { if (a.kind === 'langur' && !a.gone && Math.hypot(a.x - p.x, a.y - p.y) < 110) { a.s = 'walk'; a.tx = clamp(a.x + (a.x < p.x ? -90 : 90), 10, W - 10); a.ty = a.y; } }); }
      if (p.st === 'sniff') { p.t -= dt; p.hd += (1 - p.hd) * Math.min(1, dt * 3); if (p.t <= 0) { p.st = 'walk'; p.t = rr(5, 9); } }
      else { const spd = (p.kind === 'bear' ? 15 : p.st === 'leave' ? 70 : 30) * sc; p.hd += (0 - p.hd) * Math.min(1, dt * 3); p.x += p.dir * spd * dt; p.ph += spd * dt * .3; p.t -= dt; if (p.st === 'walk' && p.t <= 0) { p.st = 'sniff'; p.t = rr(2, 4); } }
      if ((p.dir > 0 && p.x > W + 70) || (p.dir < 0 && p.x < -70)) { if (p.camp) p.camp.hide = false; preds.splice(i, 1); } else lakeFix(p);
    }
  }
  function drawPreds(nn, time) {
    preds.forEach(p => {
      const sc = scAt(p.y) * (p.kind === 'tiger' ? 1.2 : p.kind === 'bear' ? 1.15 : .85), mv = p.st === 'walk' || p.st === 'chase' || p.st === 'leave' || (p.st === 'stalk' && true), run = p.st === 'chase', hd = p.hd;
      cx.save(); cx.translate(p.x, p.y); cx.scale(p.dir * sc, sc);
      const night = nn * .7, mc = c => css(mixc(c, [8, 10, 22], night)), leg = (xs, amp, col) => { cx.strokeStyle = col; cx.lineWidth = 2.1; cx.lineCap = 'round'; cx.beginPath(); xs.forEach((x, i) => { const sw = mv ? Math.sin(p.ph * (run ? 1.6 : 1) + (i % 2 ? 0 : Math.PI) + i * .4) * amp : 0; cx.moveTo(x, 3); cx.lineTo(x + sw, 11); }); cx.stroke(); };
      if (p.white === undefined) p.white = (p.y - SK) / (H - SK) < .42;
      const lim = (hx, hy, ph, A, fr, col, wd, L1, L2, sock) => {
        const s = Math.sin(ph), c = Math.cos(ph), lift = mv ? Math.max(0, c) * A * .55 : 0, px = hx + (mv ? s * A : 0), py = hy + L1 + L2 - lift - (hy + L1 + L2 > 0 ? hy + L1 + L2 : 0) + (hy + L1 + L2 > 0 ? 0 : 0), kx = hx + (px - hx) * .55 + (fr ? 1.4 : -1.7), ky = hy + L1 - lift * .35;
        cx.lineCap = 'round'; cx.strokeStyle = col; cx.lineWidth = wd; cx.beginPath(); cx.moveTo(hx, hy); cx.lineTo(kx, ky); cx.stroke(); cx.lineWidth = wd * .82; cx.beginPath(); cx.moveTo(kx, ky); cx.lineTo(px, -lift * .6 + 0); cx.stroke();
        if (sock) { cx.strokeStyle = sock; cx.lineWidth = wd * .84; cx.beginPath(); cx.moveTo(kx + (px - kx) * .45, ky + (-lift * .6 - ky) * .45); cx.lineTo(px, -lift * .6); cx.stroke(); }
        cx.fillStyle = sock || col; cx.beginPath(); cx.ellipse(px + .8, -lift * .6, wd * .75, wd * .45, 0, 0, 6.283); cx.fill();
      };
      const gp = run ? 1.7 : 1, ph = p.ph * gp;
      if (p.kind === 'tiger') {
        const wh = p.white, base = wh ? [236, 232, 222] : [214, 112, 34], stripe = wh ? [96, 84, 80] : [26, 18, 14], light = wh ? [252, 250, 246] : [246, 234, 212], bc = mc(base), sc2 = mc(stripe), lc = mc(light), far = mc(mixc(base, [0, 0, 0], .28));
        const A = run ? 6.5 : 3.6, hy0 = -12 + (run ? 0 : hd * 2.6);
        lim(9.6, -6.6, ph + Math.PI, A, true, far, 3, 3.6, 3.4, null); lim(-9.4, -6.8, ph, A, false, far, 3.2, 3.4, 3.4, null);
        /* tail with rings */
        const tsw = Math.sin(time * 2.6) * 2.4, tp = t => { const u = 1 - t; return [u * u * u * -14 + 3 * u * u * t * -21 + 3 * u * t * t * -26 + t * t * t * -28, u * u * u * -10 + 3 * u * u * t * -9 + 3 * u * t * t * (-3 + tsw) + t * t * t * (-9 + tsw)]; };
        for (let q = 0; q < 10; q++) { const a = tp(q / 10), b = tp((q + 1) / 10); cx.strokeStyle = q >= 8 ? sc2 : (q > 2 && q % 2 ? sc2 : bc); cx.lineWidth = 2.6 - q * .12; cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.stroke(); }
        /* body */
        cx.fillStyle = bc; cx.beginPath(); cx.moveTo(-14, -9.5); cx.quadraticCurveTo(-13.5, -13.6, -7, -13.2); cx.quadraticCurveTo(2, -12.4, 8, -13.8); cx.quadraticCurveTo(13.6, -12.6, 14, -9); cx.quadraticCurveTo(13.4, -6, 9, -6.2); cx.quadraticCurveTo(1, -5.4, -7, -6); cx.quadraticCurveTo(-13.8, -6, -14, -9.5); cx.closePath(); cx.fill();
        cx.fillStyle = lc; cx.beginPath(); cx.ellipse(0, -6.5, 11.5, 1.5, 0, 0, 6.283); cx.fill(); cx.fillStyle = 'rgba(0,0,0,.09)'; cx.beginPath(); cx.ellipse(-8.5, -9.6, 4.6, 3.4, 0, 0, 6.283); cx.fill();
        cx.strokeStyle = sc2; cx.lineCap = 'round'; for (let q = 0; q < 10; q++) { const x = -12.4 + q * 2.65, top = -12.9 + (x > 5 ? (x - 5) * -.1 : 0) + (x < -8 ? (-8 - x) * .55 : 0), L = 3.8 + Math.sin(q * 1.9) * 1.2; cx.lineWidth = 1.45 - Math.abs(Math.sin(q)) * .3; cx.beginPath(); cx.moveTo(x, top); cx.quadraticCurveTo(x + 1.2, top + L * .5, x + .6, top + L); cx.stroke(); }
        /* neck and head */
        cx.fillStyle = bc; cx.beginPath(); cx.ellipse(12.6, hy0 + .6, 4.4, 3.8, .2, 0, 6.283); cx.fill();
        const hx = 17.4, hy = hy0 + 1; cx.beginPath(); cx.ellipse(hx, hy, 4.7, 3.6, 0, 0, 6.283); cx.fill(); cx.beginPath(); cx.moveTo(hx - 3, hy + 1.6); cx.lineTo(hx - 5, hy + 4); cx.lineTo(hx - 1, hy + 3); cx.fill();
        cx.fillStyle = lc; cx.beginPath(); cx.ellipse(hx + 3.3, hy + 1.3, 2.4, 1.8, 0, 0, 6.283); cx.fill(); cx.fillStyle = mc([200, 110, 120]); cx.beginPath(); cx.arc(hx + 5.5, hy + .4, .8, 0, 6.283); cx.fill();
        cx.fillStyle = sc2; for (const ex of [-1.4, 1]) { cx.beginPath(); cx.arc(hx - 2.4 + ex * .2, hy - 3.3, 1.5, 0, 6.283); } cx.beginPath(); cx.arc(hx - 2.2, hy - 3.2, 1.5, 0, 6.283); cx.fill(); cx.beginPath(); cx.arc(hx + .6, hy - 3.6, 1.3, 0, 6.283); cx.fill();
        cx.strokeStyle = sc2; cx.lineWidth = .8; cx.beginPath(); cx.moveTo(hx - 1, hy - 2.8); cx.lineTo(hx - .4, hy - 1); cx.moveTo(hx - 3, hy - 1.2); cx.lineTo(hx - 2, hy + .6); cx.moveTo(hx + 2.4, hy + 2.6); cx.lineTo(hx + 5, hy + 2.2); cx.stroke();
        cx.fillStyle = wh ? mc([120, 170, 220]) : mc([226, 170, 40]); cx.beginPath(); cx.ellipse(hx + 1.4, hy - .9, 1, .7, 0, 0, 6.283); cx.fill(); cx.fillStyle = '#111'; cx.fillRect(hx + 1.2, hy - 1.1, .8, .8);
        lim(7.6, -6.4, ph, A, true, bc, 3.2, 3.6, 3.2, null); lim(-11.4, -6.6, ph + Math.PI, A, false, bc, 3.6, 3.4, 3.2, null);
        if (nn > .5) { cx.fillStyle = 'rgba(240,228,66,.9)'; cx.fillRect(hx + 1.6, hy - 1.2, 1.2, 1); }
      } else if (p.kind === 'bear') {
        const bc = mc([36, 30, 28]), far = mc([24, 20, 18]), tan = mc([160, 122, 86]), A = 2.8;
        lim(9, -6.6, ph + Math.PI, A, true, far, 4.4, 3.4, 3, null); lim(-8, -6.6, ph, A, false, far, 4.6, 3.4, 3, null);
        cx.fillStyle = bc; cx.beginPath(); cx.moveTo(-13.5, -9); cx.quadraticCurveTo(-13, -15, -4.4, -15); cx.quadraticCurveTo(5, -17, 9.4, -14.2); cx.quadraticCurveTo(14.4, -12.2, 13.8, -8); cx.quadraticCurveTo(11.4, -5, 6, -5.6); cx.quadraticCurveTo(-4, -4.8, -9, -5.4); cx.quadraticCurveTo(-13.8, -5.6, -13.5, -9); cx.closePath(); cx.fill();
        cx.beginPath(); cx.ellipse(-13.6, -9, 2.2, 2.6, 0, 0, 6.283); cx.fill();
        cx.fillStyle = 'rgba(255,255,255,.07)'; cx.beginPath(); cx.ellipse(2, -13.5, 8, 2, 0, 0, 6.283); cx.fill();
        const hx = 17.6, hy = -9.6 + hd * 3.6; cx.fillStyle = bc; cx.beginPath(); cx.ellipse(12.6, hy - .6, 4.6, 4.4, 0, 0, 6.283); cx.fill(); cx.beginPath(); cx.ellipse(hx, hy, 5.2, 4.2, 0, 0, 6.283); cx.fill(); cx.beginPath(); cx.arc(hx - 2.8, hy - 4, 1.8, 0, 6.283); cx.fill(); cx.beginPath(); cx.arc(hx + .6, hy - 4.2, 1.6, 0, 6.283); cx.fill();
        cx.fillStyle = tan; cx.beginPath(); cx.ellipse(hx + 3.8, hy + 1.5, 2.8, 2.1, 0, 0, 6.283); cx.fill(); cx.fillStyle = '#0c0c0c'; cx.beginPath(); cx.ellipse(hx + 6, hy + .8, 1.1, .8, 0, 0, 6.283); cx.fill(); cx.fillRect(hx + 1.2, hy - 1.4, 1, 1);
        cx.strokeStyle = mc([236, 232, 220]); cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(10.2, -9.6); cx.lineTo(12.2, -6.4); cx.lineTo(14.2, -9.8); cx.stroke();
        lim(10.6, -6.4, ph, A, true, bc, 4.6, 3.4, 3, null); lim(-9.6, -6.6, ph + Math.PI, A, false, bc, 4.8, 3.4, 3, null);
        if (nn > .5) { cx.fillStyle = 'rgba(240,228,66,.9)'; cx.fillRect(hx + 1.2, hy - 1.6, 1.2, 1.1); }
      } else {
        const rd = mc([196, 90, 34]), far = mc([120, 60, 26]), blk = mc([32, 24, 20]), wht = mc([246, 240, 230]), A = 3.6;
        lim(5, -4.4, ph + Math.PI, A, true, far, 1.9, 2.6, 2.4, blk); lim(-5, -4.6, ph, A, false, far, 2, 2.6, 2.4, blk);
        const ts = Math.sin(time * 3.4) * 1.5; cx.fillStyle = rd; cx.beginPath(); cx.moveTo(-7.5, -7); cx.bezierCurveTo(-14, -8.5, -20, -7 + ts, -22, -3 + ts); cx.bezierCurveTo(-18, -2 + ts, -13, -3.2, -6.6, -4.6); cx.closePath(); cx.fill(); cx.fillStyle = wht; cx.beginPath(); cx.moveTo(-19, -5.6 + ts); cx.bezierCurveTo(-21, -4.6 + ts, -22, -3.4 + ts, -22, -3 + ts); cx.bezierCurveTo(-20, -2.4 + ts, -18.6, -3.4 + ts, -17.6, -4.6 + ts); cx.closePath(); cx.fill();
        cx.fillStyle = rd; cx.beginPath(); cx.moveTo(-8, -6.5); cx.quadraticCurveTo(-7, -10, -2, -9.8); cx.quadraticCurveTo(4, -9.8, 7, -9); cx.quadraticCurveTo(9.2, -7.6, 8.4, -5.8); cx.quadraticCurveTo(4, -3.8, -3, -4.2); cx.quadraticCurveTo(-8, -4.4, -8, -6.5); cx.closePath(); cx.fill();
        cx.fillStyle = wht; cx.beginPath(); cx.ellipse(7, -5.4, 2.2, 1.6, 0, 0, 6.283); cx.fill();
        const hx = 11.4, hy = -8.6 + hd * 2.6; cx.fillStyle = rd; cx.beginPath(); cx.ellipse(8.8, hy + .6, 2.8, 2.4, 0, 0, 6.283); cx.fill(); cx.beginPath(); cx.moveTo(hx - 3, hy - 2.2); cx.lineTo(hx + 5.2, hy + .8); cx.lineTo(hx - 3, hy + 2.6); cx.closePath(); cx.fill();
        cx.fillStyle = wht; cx.beginPath(); cx.moveTo(hx - 1, hy + 1); cx.lineTo(hx + 4.6, hy + 1); cx.lineTo(hx - 2.4, hy + 2.8); cx.closePath(); cx.fill();
        cx.fillStyle = rd; cx.beginPath(); cx.moveTo(hx - 2.6, hy - 1.6); cx.lineTo(hx - 2.2, hy - 5.8); cx.lineTo(hx + .6, hy - 2); cx.closePath(); cx.fill(); cx.fillStyle = blk; cx.beginPath(); cx.moveTo(hx - 2, hy - 2.6); cx.lineTo(hx - 2.2, hy - 5.2); cx.lineTo(hx - .4, hy - 2.6); cx.closePath(); cx.fill(); cx.beginPath(); cx.arc(hx + 5, hy + .6, .8, 0, 6.283); cx.fill(); cx.fillRect(hx + 1.2, hy - .6, 1, .9);
        lim(6.6, -4.2, ph, A, true, rd, 2, 2.6, 2.4, blk); lim(-6.4, -4.4, ph + Math.PI, A, false, rd, 2.1, 2.6, 2.4, blk);
        if (nn > .5) { cx.fillStyle = 'rgba(240,228,66,.9)'; cx.fillRect(hx + 1.2, hy - .8, 1.1, 1); }
      }
      cx.restore();
    });
  }
  function scareBirds(x, y) { flocks.push({ x, y: y - 14, vx: Math.random() < .5 ? -70 : 70, vy: -42, n: 9, ph: Math.random() * 6, sc: true }); }
  function drawAnimals(nn, time) {
    animals.forEach(a => {
      if (a.gone) return; const sc = (.55 + .75 * clamp((a.y - SK) / (H - SK), 0, 1)) * (a.kind === 'goral' ? .8 : 1), d = a.dir, moving = a.s === 'walk' || a.s === 'toPond' || a.s === 'flee' || a.s === 'run', gal = (a.s === 'flee' || a.s === 'run') ? 1.8 : 1;
      if (a.jz > .5) { cx.fillStyle = 'rgba(0,0,0,.16)'; cx.beginPath(); cx.ellipse(a.x, a.y + 1, 8 * sc, 2.2 * sc, 0, 0, 6.283); cx.fill(); }
      cx.save(); cx.translate(a.x, a.y - (a.jz || 0) * sc); cx.scale(d * sc, sc);
      const base = a.kind === 'deer' ? [138, 90, 50] : a.kind === 'goral' ? [125, 116, 102] : [150, 156, 162], col = css(mixc(base, [8, 10, 22], nn * .72)), dark = css(mixc(base, [0, 0, 0], .45 + nn * .3)), hd = a.hd;
      if (a.kind !== 'langur' && (a.view === 'front' || a.view === 'back')) { drawQuadFB(a, col, dark, nn, moving, gal); cx.restore(); return; }
      if (a.kind === 'langur') {
        cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, -5, 3.6, 5.4, 0, 0, 6.283); cx.fill(); cx.strokeStyle = col; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(-3, -2); cx.quadraticCurveTo(-12, 0, -9, -12); cx.stroke();
        cx.fillStyle = '#222'; cx.beginPath(); cx.arc(1.6 + hd * 3, -10.6 + hd * 3, 2.5, 0, 6.283); cx.fill(); cx.fillStyle = col; cx.beginPath(); cx.arc(.6 + hd * 3, -11.2 + hd * 3, 1.6, 0, 6.283); cx.fill();
        cx.strokeStyle = '#222'; cx.lineWidth = 1.3; const sw = moving ? Math.sin(a.ph * 2) * 2 : 0; cx.beginPath(); cx.moveTo(-1, -1); cx.lineTo(-2 + sw, 1); cx.moveTo(2, -1); cx.lineTo(3 - sw, 1); cx.moveTo(2.4, -7); cx.lineTo(5 + hd * 2, -4 + hd * 3); cx.stroke();
      } else {
        cx.strokeStyle = dark; cx.lineWidth = 1.5; cx.lineCap = 'round'; cx.beginPath();
        for (let i = 0; i < 4; i++) { const x = [-6, -4, 4, 6][i], sw = moving ? Math.sin(a.ph * gal + (i % 2 ? 0 : Math.PI) + i * .5) * 3.6 * gal : 0; cx.moveTo(x, 2); cx.lineTo(x + sw, 10); } cx.stroke();
        cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, 0, 8.6, 3.9, 0, 0, 6.283); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.6)'; cx.beginPath(); cx.ellipse(-8.4, -.6, 1.6, 2.1, 0, 0, 6.283); cx.fill();
        const nx = 6, ny = -1, hx = 10.5 + hd * 3, hy = -9 + hd * 16; cx.strokeStyle = col; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(nx, ny); cx.lineTo(hx - 1, hy + 1); cx.stroke();
        cx.fillStyle = col; cx.beginPath(); cx.ellipse(hx + 1.5, hy + (hd > .5 ? 1.5 : 0), 3.3, 1.9, hd * .9 - .25, 0, 6.283); cx.fill(); cx.fillStyle = dark; cx.beginPath(); cx.moveTo(hx - 1, hy - 1); cx.lineTo(hx - 3, hy - 4); cx.lineTo(hx + .6, hy - 1.6); cx.fill();
        if (a.kind === 'deer' && a.big && hd < .6) { cx.strokeStyle = css(mixc([200, 190, 170], [20, 22, 40], nn * .6)); cx.lineWidth = 1; cx.beginPath(); cx.moveTo(hx, hy - 1.5); cx.lineTo(hx - 1, hy - 8); cx.moveTo(hx - 1, hy - 5); cx.lineTo(hx + 2, hy - 8); cx.moveTo(hx - 1, hy - 8); cx.lineTo(hx - 3, hy - 10); cx.stroke(); }
        if (a.kind === 'goral') { cx.strokeStyle = '#333'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(hx, hy - 1); cx.lineTo(hx - 1.4, hy - 4); cx.stroke(); }
        if (nn > .55) { cx.fillStyle = 'rgba(240,228,66,.85)'; cx.fillRect(hx + 2.4, hy - .5, 1, 1); }
      }
      cx.restore();
    });
    flocks.forEach(f => { if (nn > .6 && !f.sc) return; cx.strokeStyle = nn > .5 ? 'rgba(220,228,245,.85)' : 'rgba(30,34,44,.8)'; cx.lineWidth = 1.2; cx.beginPath(); for (let j = 0; j < f.n; j++) { const ox = f.x - j * 10 - (j % 2) * 5 * Math.sign(f.vx || 1), oy = f.y + ((j % 3) - 1) * 6 + (j % 2) * 3, fl = Math.sin(time * 9 + f.ph + j) * 3; cx.moveTo(ox - 4, oy - 1 - fl); cx.lineTo(ox, oy); cx.lineTo(ox + 4, oy - 1 - fl); } cx.stroke(); });
  }
  /* ---- smoke transport: faint wind streamlines at three heights ---- */
  function drawFlow(dt, nn, time) {
    if (!flow.length) for (let i = 0; i < 90; i++) flow.push({ x: Math.random() * W, y: SK - H * .2 + Math.random() * (H - SK + H * .2), a: Math.random() });
    cx.lineWidth = 1; cx.lineCap = 'round'; cx.strokeStyle = nn > .5 ? 'rgba(190,210,250,.26)' : 'rgba(255,255,255,.55)'; cx.beginPath();
    flow.forEach(p => { wind(p.x, p.y, time, wv); const sp = 1.7; p.x += wv[0] * dt * sp; p.y += wv[1] * dt * sp; p.a += dt * .15; if (p.x < -40 || p.x > W + 40 || p.y < -30 || p.y > H || p.a > 1) { p.x = Math.random() * W; p.y = SK - H * .2 + Math.random() * (H - SK + H * .2); p.a = 0; } cx.moveTo(p.x, p.y); cx.lineTo(p.x - wv[0] * .45, p.y - wv[1] * .45); });
    cx.stroke();
  }
  function drawSock(nn, time) {
    const px = W * .91, py = SK + (H - SK) * .22, top = py - 34; A.sock = [px, top];
    cx.strokeStyle = css(mixc(hex('#3a3f48'), hex('#9aa3b5'), nn)); cx.lineWidth = 2; cx.beginPath(); cx.moveTo(px, py); cx.lineTo(px, top); cx.stroke();
    const s = S.wind, droop = (1 - sstep(.1, .7, s)) * 1.25, base = Math.atan2(WIN.y * .2 + .0, 1), ang = Math.PI / 2 * droop + (Math.sin(time * 5) * .06 * s) + base * .3, seg = 5, L = 26;
    let x = px, y = top; for (let i = 0; i < seg; i++) { const a = ang + Math.sin(time * 6 + i) * .05 * s, w0 = 5 - i * .7, w1 = 5 - (i + 1) * .7, dx = Math.cos(a) * L / seg, dy = Math.sin(a) * L / seg; cx.fillStyle = i % 2 ? '#F5F5F5' : '#E69F00'; cx.beginPath(); cx.moveTo(x, y - w0); cx.lineTo(x + dx, y + dy - w1); cx.lineTo(x + dx, y + dy + w1); cx.lineTo(x, y + w0); cx.closePath(); cx.fill(); cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.lineWidth = .6; cx.stroke(); x += dx; y += dy; }
  }
  function drawFog(nn, time) {
    const a = S.inv; if (a < .05) return; const yI = H * .60; A.fog = [W * .55, yI + 10];
    const g = cx.createLinearGradient(0, yI - 8, 0, H); g.addColorStop(0, css(mixc(hex('#e8eef6'), hex('#3a4670'), nn), 0)); g.addColorStop(.08, css(mixc(hex('#e8eef6'), hex('#3a4670'), nn), .5 * a)); g.addColorStop(1, css(mixc(hex('#e8eef6'), hex('#3a4670'), nn), .22 * a)); cx.fillStyle = g; cx.fillRect(0, yI - 8, W, H - yI + 8);
    for (let b = 0; b < 4; b++) { const x = ((time * (3 + b) + b * 330) % (W + 500) + W + 500) % (W + 500) - 250; cx.globalAlpha = .12 * a; cx.drawImage(SM.white, x - 240, yI - 14 + b * 6, 480, 40); } cx.globalAlpha = 1;
  }
  function haze(nn, time) {
    const g = cx.createLinearGradient(0, SK - H * .26, 0, SK + H * .22); const hc = mixc(hex('#eef3f8'), hex('#1a2040'), nn); g.addColorStop(0, css(hc, 0)); g.addColorStop(.55, css(hc, .38)); g.addColorStop(1, css(hc, 0)); cx.fillStyle = g; cx.fillRect(0, SK - H * .26, W, H * .48);
    const v = cx.createLinearGradient(0, H * .7, 0, H); const vc = mixc(hex('#eef3f8'), hex('#05070f'), nn); v.addColorStop(0, css(vc, 0)); v.addColorStop(1, css(vc, .26)); cx.fillStyle = v; cx.fillRect(0, H * .7, W, H * .3);
  }

  /* ================= people and helicopter sprites ================= */
  function drawCrews(nn, time) {
    crews.forEach(c => { if (c.eng && eng && c.mode !== 'done') { const x0 = eng.x + eng.dir * 8 * 1, y0 = eng.y - 6, x1 = c.x, y1 = c.y - 9, mx = (x0 + x1) / 2, my = Math.max(y0, y1) + 10 + Math.abs(x1 - x0) * .04; cx.strokeStyle = nn > .5 ? '#9a8420' : '#c9a227'; cx.lineWidth = 2.6; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(x0, y0); cx.quadraticCurveTo(mx, my, x1, y1); cx.stroke(); cx.strokeStyle = 'rgba(0,0,0,.25)'; cx.lineWidth = .8; cx.stroke(); }
      const s = .62 + .5 * Math.pow(clamp((c.y - SK) / (H - SK), 0, 1), 1.2), x = c.x, y = c.y, sw = c.mode === 'work' ? Math.sin(time * 8 + c.ph) : Math.sin(time * 5 + c.ph) * .4;
      cx.lineCap = 'round'; cx.strokeStyle = '#1b1b1b'; cx.lineWidth = 3.2 * s; cx.beginPath(); cx.moveTo(x, y - 14 * s); cx.lineTo(x, y - 6 * s); cx.moveTo(x, y - 6 * s); cx.lineTo(x - 3 * s + sw * 2 * s, y); cx.moveTo(x, y - 6 * s); cx.lineTo(x + 3 * s - sw * 2 * s, y); cx.stroke();
      cx.strokeStyle = '#F0E442'; cx.lineWidth = 2.2 * s; cx.beginPath(); cx.moveTo(x, y - 14 * s); cx.lineTo(x, y - 7 * s); cx.stroke();
      cx.strokeStyle = '#1b1b1b'; cx.lineWidth = 1.4 * s; cx.beginPath(); cx.moveTo(x, y - 12 * s); const d = c.tool ? -1 : 1; if (c.mode === 'work') { cx.lineTo(x + d * 9 * s, y - 12 * s + sw * 5 * s); } else cx.lineTo(x + d * 5 * s, y - 6 * s); cx.stroke();
      cx.fillStyle = '#ffffff'; cx.beginPath(); cx.arc(x, y - 17 * s, 3 * s, 0, 6.283); cx.fill(); cx.strokeStyle = '#1b1b1b'; cx.lineWidth = .8; cx.stroke();
    });
  }
  function drawHeli(nn, time, hh = heli) {
    if (!hh) return; const h = hh, sc = clamp(W / 1280, .8, 1.15) * 1.15, face = h.face;
    /* ground shadow */
    if (nn < .6) { const gy = clamp(h.y + 120 + (h.y > SK ? 0 : 0), SK + 20, H - 14); cx.fillStyle = `rgba(10,20,10,${.16 * (1 - nn)})`; cx.beginPath(); cx.ellipse(h.x, gy, 26 * sc, 5 * sc, 0, 0, 6.283); cx.fill(); }
    /* rope and bucket (collapsible bucket, swings behind the movement) */
    cx.globalAlpha = h.nobucket ? 0 : 1; const bx = h.bx, by = h.by, ry = h.y + 8 * sc;
    cx.strokeStyle = nn > .5 ? 'rgba(220,225,240,.7)' : 'rgba(30,30,30,.8)'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(h.x, ry); cx.lineTo(bx, by - 8 * sc); cx.stroke();
    cx.fillStyle = '#D55E00'; cx.beginPath(); cx.moveTo(bx - 7 * sc, by - 8 * sc); cx.lineTo(bx + 7 * sc, by - 8 * sc); cx.lineTo(bx + 5 * sc, by + 5 * sc); cx.lineTo(bx - 5 * sc, by + 5 * sc); cx.closePath(); cx.fill(); cx.strokeStyle = '#222'; cx.lineWidth = .8; cx.stroke();
    if (h.load > .02) { cx.fillStyle = 'rgba(86,180,233,.95)'; cx.fillRect(bx - 5.5 * sc, by + 5 * sc - 11 * sc * h.load, 11 * sc, 11 * sc * h.load - .5); }
    cx.globalAlpha = 1;
    /* body */
    cx.save(); cx.translate(h.x, h.y); cx.scale(sc * (Math.abs(face) < .15 ? .15 * Math.sign(face || 1) : face), sc); cx.rotate(h.pitch);
    const lite = nn > .5 ? .55 : 1, body = c => { const m = mixc(c, [12, 16, 30], (1 - lite) * 1.1); return css(m); };
    /* tail boom, fin, stabiliser */
    cx.fillStyle = body([226, 230, 236]); cx.beginPath(); cx.moveTo(-12, -6); cx.lineTo(-54, -7.4); cx.lineTo(-54, -4.2); cx.lineTo(-12, 2); cx.closePath(); cx.fill();
    cx.fillStyle = body([213, 94, 0]); cx.beginPath(); cx.moveTo(-50, -7.2); cx.lineTo(-58, -19); cx.lineTo(-54, -19); cx.lineTo(-46, -7.2); cx.closePath(); cx.fill(); cx.fillStyle = body([60, 66, 80]); cx.fillRect(-42, -3.8, 10, 1.6);
    /* cabin */
    const gr = cx.createLinearGradient(0, -14, 0, 9); gr.addColorStop(0, body([244, 247, 250])); gr.addColorStop(.6, body([226, 230, 236])); gr.addColorStop(1, body([150, 158, 172]));
    cx.fillStyle = gr; cx.beginPath(); cx.moveTo(-17, -9); cx.bezierCurveTo(-12, -15, 6, -15, 15, -8); cx.bezierCurveTo(23, -3, 24, 2, 18, 6); cx.lineTo(-14, 8); cx.bezierCurveTo(-20, 6, -21, -4, -17, -9); cx.closePath(); cx.fill();
    cx.fillStyle = body([213, 94, 0]); cx.beginPath(); cx.moveTo(-19, 1); cx.lineTo(20, 0); cx.lineTo(18.5, 3.4); cx.lineTo(-18, 4.6); cx.closePath(); cx.fill();
    cx.fillStyle = nn > .5 ? 'rgba(120,150,200,.9)' : 'rgba(90,150,200,.92)'; cx.beginPath(); cx.moveTo(6, -12); cx.bezierCurveTo(14, -10, 20, -5, 20, -1); cx.lineTo(7, -1); cx.closePath(); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.55)'; cx.beginPath(); cx.moveTo(8, -11); cx.lineTo(12, -10); cx.lineTo(8.5, -3); cx.lineTo(7, -3); cx.closePath(); cx.fill();
    cx.fillStyle = nn > .5 ? 'rgba(120,150,200,.8)' : 'rgba(90,150,200,.85)'; cx.fillRect(-10, -8, 6, 5); cx.fillRect(-2, -8, 6, 5);
    /* engine housing, mast, skids */
    cx.fillStyle = body([88, 96, 110]); cx.beginPath(); cx.ellipse(-3, -14, 9, 3.6, 0, 0, 6.283); cx.fill(); cx.fillRect(-1.5, -20, 3, 6);
    cx.strokeStyle = body([40, 44, 54]); cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(-10, 8); cx.lineTo(-11, 13); cx.moveTo(8, 7); cx.lineTo(9, 13); cx.moveTo(-17, 14); cx.lineTo(19, 14); cx.moveTo(-17, 14); cx.lineTo(-20, 11); cx.moveTo(19, 14); cx.lineTo(22, 11); cx.stroke();
    /* tail rotor */
    const tr = h.rot * .6; cx.strokeStyle = 'rgba(30,30,30,.55)'; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(-56, -14 + Math.sin(tr) * 6); cx.lineTo(-56, -14 - Math.sin(tr) * 6); cx.moveTo(-56 + Math.cos(tr) * 1.5, -14 + Math.cos(tr + 1.4) * 6); cx.lineTo(-56, -14); cx.stroke(); cx.fillStyle = 'rgba(40,40,40,.14)'; cx.beginPath(); cx.ellipse(-56, -14, 2, 7.5, 0, 0, 6.283); cx.fill();
    /* main rotor: blur disc plus four visible blades */
    cx.fillStyle = nn > .5 ? 'rgba(210,220,240,.10)' : 'rgba(40,46,56,.11)'; cx.beginPath(); cx.ellipse(0, -21, 58, 6.2, 0, 0, 6.283); cx.fill();
    cx.strokeStyle = nn > .5 ? 'rgba(235,240,250,.85)' : 'rgba(25,28,34,.86)'; cx.lineWidth = 2.1; cx.lineCap = 'round';
    for (let b = 0; b < 4; b++) { const a = h.rot * .45 + b * Math.PI / 2, c = Math.cos(a), s = Math.sin(a); cx.globalAlpha = c > -.2 ? .95 : .5; cx.beginPath(); cx.moveTo(0, -21); cx.lineTo(c * 58, -21 + s * 6.2); cx.stroke(); }
    cx.globalAlpha = 1;
    /* lights */
    const bl = Math.sin(time * 6) > .6; cx.fillStyle = bl ? '#ff3b30' : 'rgba(120,20,20,.7)'; cx.beginPath(); cx.arc(-58, -19, 1.4, 0, 6.283); cx.fill(); if (nn > .3 && Math.sin(time * 9) > .85) { cx.fillStyle = 'rgba(255,255,255,.95)'; cx.beginPath(); cx.arc(2, 9, 1.6, 0, 6.283); cx.fill(); }
    cx.restore();
    /* rotor wash on the pond and ripples */
    if (h.ph === 'dip' && h.t > .6 && h.t < 3.4) { cx.strokeStyle = nn > .5 ? 'rgba(200,220,255,.35)' : 'rgba(255,255,255,.55)'; cx.lineWidth = 1; for (let i = 0; i < 3; i++) { const q = ((time * 1.4 + i / 3) % 1); cx.beginPath(); cx.ellipse(bx, LAKE.y - 1, 10 + 40 * q, 2 + 8 * q, 0, 0, 6.283); cx.globalAlpha = 1 - q; cx.stroke(); } cx.globalAlpha = 1; }
  }
  function drawCallouts(nn) {
    const used = [];
    for (let i = calls.length - 1; i >= 0; i--) {
      const c = calls[i], t = T - c.t0; if (t > c.dur) { calls.splice(i, 1); continue; }
      if (W < 700 && !hero.classList.contains('fs-clean')) continue; const al = Math.min(sstep(0, .5, t), 1 - sstep(c.dur - .8, c.dur, t)), an = c.anchor() || A.fire; if (!an) continue;
      cx.font = `600 ${W < 700 ? 11.5 : 12.5}px ${FONT}`; let lines = [c.text], tw = cx.measureText(c.text).width + 18; if (tw > W - 16) { const wd = c.text.split(' '), m = Math.ceil(wd.length / 2); lines = [wd.slice(0, m).join(' '), wd.slice(m).join(' ')]; tw = Math.max(...lines.map(l => cx.measureText(l).width)) + 18; } const bh = lines.length * 15 + 11; let lx = an[0] + c.off[0], ly = an[1] + c.off[1];
      lx = clamp(lx, 8, W - tw - 8); ly = clamp(ly, 12, H - (W < 700 ? 170 : 120)); if (!hero.classList.contains('fs-clean') && lx < W * .5) lx = clamp(W * .5, 8, W - tw - 8);
      if (lx < W * .42 && ly < H * .42) ly = H * .46;      /* keep clear of the headline */
      for (let tries = 0; tries < 6 && used.some(u => lx < u[0] + u[2] && lx + tw > u[0] && ly < u[1] + 30 && ly + 26 > u[1]); tries++) ly += 32;
      ly = clamp(ly, 12, H - 92); used.push([lx, ly, tw]);
      const bx = lx + tw / 2, by = ly + 13; cx.globalAlpha = al;
      cx.strokeStyle = nn > .5 ? '#F0E442' : '#10202f'; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(bx, by); cx.lineTo(an[0], an[1]); cx.stroke();
      cx.fillStyle = nn > .5 ? '#F0E442' : '#10202f'; cx.beginPath(); cx.arc(an[0], an[1], 3.6, 0, 6.283); cx.fill();
      cx.fillStyle = nn > .5 ? 'rgba(10,16,32,.9)' : 'rgba(255,255,255,.93)'; cx.strokeStyle = nn > .5 ? '#F0E442' : '#10202f'; cx.lineWidth = 1; cx.beginPath(); cx.roundRect(lx, ly, tw, bh, 8); cx.fill(); cx.stroke();
      cx.fillStyle = nn > .5 ? '#f3f6fb' : '#10202f'; cx.textBaseline = 'middle'; lines.forEach((l, qi) => cx.fillText(l, lx + 9, ly + 13.5 + qi * 15)); cx.globalAlpha = 1;
    }
  }

  /* ================= narration for quiet periods ================= */
  function narrate() {
    if (inc) {
      if (S.wind > .8 && inc.ignited) say('w2', 'Strong wind: the fire spreads fast', () => A.sock, 8, [-210, 40]);
      else if (S.wind < .2 && inc.ignited && inc.t > 6) say('w1', 'Low wind: the fire spreads slowly', () => A.sock, 7, [-210, 40]);
      else if (S.wind >= .3 && S.wind <= .7 && inc.ignited && inc.t > 20 && inc.def.id === 'p') say('w3', 'Wind rising: spread speeds up', () => A.sock, 6, [-210, 40]);
      if (inc.ignited && burning.length > 70) say('sm', 'Smoke rises with the heat, then the wind carries it downwind', () => [A.fire[0], A.fire[1] - 90], 9, [60, -30]);
      if (S.inv > .5 && inc.ignited) say('inv', 'Cold air pooled in the valley (inversion): smoke stays low', () => A.fog, 9, [-120, -60]);
      if (inc.def.id === 'p' && inc.ignited && dryD > .6) say('dry', 'Dry pine litter feeds the fire', () => A.fire, 8, [60, -64]);
      return;
    }
    if (T > 6 && !calls.length) say('ft', 'Flux tower measures wind, heat and moisture and sends the data to the early warning centre', () => [TW.x + 17, TW.y - TW.h * .78], 10, [-170, -70]);
    const s = seasonOf(doy)[1];
    if (s === 'Spring' && doy > 90) say('lit', 'Dry needle litter is building up on the forest floor', () => A.litter, 9, [-80, -70]);
    if (s === 'Pre-monsoon' && dryD > .6) say('hot', 'Hot, dry and windy weather: fuel is at its driest', () => A.litter, 9, [-80, -70]);
    if (s === 'Monsoon' && S.rain > .4) say('mon', 'Monsoon rain: fires cannot spread, vegetation regrows', () => A.litter, 9, [-80, -70]);
    if (s === 'Winter' && S.inv > .5) say('inv2', 'Cold air pooled in the valley (inversion)', () => A.fog, 9, [-120, -60]);
    if (yearIdx >= 1 && doy > 220 && doy < 260) say('grow', 'Burnt slopes are covered again by young trees and grass', () => A.litter, 9, [-80, -70]);
    if (s === 'Post-monsoon' && nTarget > .5 && S.cloud < .4) say('mw', 'Clear night: the Milky Way is visible', () => [W * .5, SK * .3], 9, [40, 60]);
  }

  /* ================= HUD ================= */
  /* ================= HUD and chapter titles ================= */
  let hudT = 0, chKey = '', chTimer = 0, chClean = false;
  const WCLASS = [[.15, 'Calm'], [.35, 'Light'], [.6, 'Moderate'], [.8, 'Strong'], [2, 'Very strong']];
  const SHORT = { Winter: 'Cold nights and valley inversions', Spring: 'Needles fall and fuel builds up', 'Pre-monsoon': 'The driest and windiest weeks', Monsoon: 'Rain, regrowth and full streams', 'Post-monsoon': 'Grass dries and the nights clear' };
  function chapter(dt) {
    const cl = hero.classList.contains('fs-clean'); if (cl !== chClean) { chClean = cl; chKey = ''; }
    let key, k, h;
    if (inc) {
      if (inc.rainOn && burning.length) { key = 'rain'; k = 'Rain'; h = 'Rain puts the fire out'; }
      else if (!inc.ignited && inc.warned) { key = 'warn'; k = 'Early warning'; h = 'The flux tower shows fire danger is ' + DCL[dIdx()].toLowerCase(); }
      else if (!inc.ignited) { key = 'pre'; k = 'Before the fire'; h = inc.camp ? 'A trekking camp, a campfire and a dry, windy day' : 'A dry day in the forest'; }
      else if (heli && heli.ph !== 'out') { key = 'air'; k = 'Air support'; h = 'A helicopter works the fire from the pond'; }
      else if (inc.crew && burning.length) { key = 'res'; k = 'Response'; h = 'Ground crews and a fire line fight the spread'; }
      else if (burning.length) { key = 'ign'; k = 'Ignition'; h = inc.def.name; }
      else { key = 'rec'; k = 'Recovery'; h = 'The fire is out and the burnt slope begins to regrow'; }
    } else { const s = seasonOf(doy)[1]; key = s; k = s; h = SHORT[s] || ''; }
    if (key !== chKey) { chKey = key; $('chK').textContent = 'Year ' + (yearIdx + 1) + '  |  ' + k; $('chT').textContent = h; $('chap').classList.add('show'); chTimer = 6.5; }
    else if (chTimer > 0) { chTimer -= dt; if (chTimer <= 0) $('chap').classList.remove('show'); }
  }
  function hud(dt) {
    hudT -= dt; if (hudT > 0) return; hudT = .25;
    const s = seasonOf(doy); $('hSeason').textContent = s[1] + '  |  ' + dateStr(doy) + '  |  Year ' + (yearIdx + 1) + (inc ? '  |  fire incident, time slowed' : '');
    let note = s[2]; if (inc) note = inc.def.name + ': ' + inc.def.label + '.'; $('hNote').textContent = note;
    const set = (id, v) => { $(id).style.width = Math.round(clamp(v, 0, 1) * 100) + '%'; };
    set('gT', S.temp); set('gH', S.rh); set('gF', dryD * (.4 + .6 * clamp(avgL, 0, 1))); set('gW', S.wind); set('gV', vegAvg);
    $('vT').textContent = S.temp < .2 ? 'Cold' : S.temp < .45 ? 'Cool' : S.temp < .7 ? 'Warm' : 'Hot'; $('vH').textContent = S.rh < .25 ? 'Very dry' : S.rh < .5 ? 'Dry' : S.rh < .8 ? 'Moist' : 'Humid';
    $('vF').textContent = S.rain > .3 ? 'Wet' : dryD > .75 ? 'Very dry' : dryD > .5 ? 'Dry' : dryD > .25 ? 'Damp' : 'Moist';
    $('vV').textContent = vegAvg > .9 ? 'Mature' : vegAvg > .75 ? 'Regrowing' : 'Recovering';
    $('vW').textContent = WCLASS.find(w => S.wind < w[0])[1]; $('arrow').setAttribute('transform', `rotate(${Math.atan2(WIN.y, Math.max(.01, WIN.x)) * 57.3})`);
    const di = dIdx(); $('vD').textContent = DCL[di]; $('vD').style.setProperty('--dc', DCOL[di]); $('dmark').style.left = (danger * 100).toFixed(1) + '%';
  }
  let avgL = .8;

  /* ================= frame ================= */
  function resize() {
    dpr = Math.min(DPRMAX, window.devicePixelRatio || 1); W = hero.clientWidth; H = hero.clientHeight; SK = Math.round(H * .36);
    cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); seed = 11; G = W < 700 ? 6 : 5;
    buildFire(); buildTerrain(); buildMilkyWay(); planCamps(); spawnAnimals(); buildDecor(); LY = [mkLayer(), mkLayer()]; fDirty = [true, true]; Object.keys(YP).forEach(k => delete YP[k]); line = null; scarC.width = glowC.width = GW; scarC.height = glowC.height = GH; parts.length = 0; spots.length = 0; crews.length = 0; heli = null; resc = null; eng = null; inc = null;
    rain.length = 0; for (let i = 0; i < (W < 700 ? 140 : 260); i++) rain.push({ x: Math.random() * W * 1.2, y: Math.random() * H, v: 460 + Math.random() * 220 });
    sLayer = mkLayer(); sLast = { w: -9, nn: -9 };
    A.litter = [W * .62, SK + (H - SK) * .52]; flags.x = 0;
  }

  /* ---- automatic weather stations ---- */
  function drawAWS(a, label, nn, time) {
    const x = a.x, y = a.y, ink = nn > .5 ? '#c4cde0' : '#394350', pad = nn > .5 ? '#3a4260' : '#b8bfc8';
    cx.fillStyle = pad; cx.beginPath(); cx.ellipse(x, y + 1, 11, 3.4, 0, 0, 6.283); cx.fill();
    cx.strokeStyle = ink; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x, y - 29); cx.stroke();
    cx.lineWidth = .8; cx.beginPath(); cx.moveTo(x - 5, y + 1); cx.lineTo(x, y - 9); cx.lineTo(x + 5, y + 1); cx.stroke();
    cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(x - 9, y - 25); cx.lineTo(x + 9, y - 25); cx.stroke();
    /* cup anemometer */
    const ax = x - 9, ay = y - 25, rot = time * (3 + S.wind * 9); cx.beginPath(); cx.moveTo(ax, ay); cx.lineTo(ax, ay - 4); cx.stroke();
    for (let i = 0; i < 3; i++) { const t = rot + i * 2.094, px = ax + Math.cos(t) * 4, py = ay - 4 + Math.sin(t) * 1.3; cx.fillStyle = i === 0 ? '#D55E00' : ink; cx.beginPath(); cx.arc(px, py, 1.3, 0, 6.283); cx.fill(); }
    /* wind vane */
    const vx = x + 9, vd = S.wind > .2 ? 1 : Math.sin(time * .5); cx.beginPath(); cx.moveTo(vx, y - 25); cx.lineTo(vx, y - 29); cx.stroke(); cx.fillStyle = ink; cx.beginPath(); cx.moveTo(vx - 6 * vd, y - 29); cx.lineTo(vx + 4 * vd, y - 29); cx.lineTo(vx + 6 * vd, y - 31); cx.lineTo(vx + 6 * vd, y - 27); cx.closePath(); cx.fill();
    /* solar panel, radiation shield, rain gauge, logger */
    cx.save(); cx.translate(x + 7, y - 16); cx.rotate(-.5); cx.fillStyle = nn > .5 ? '#46567e' : '#2c4f7a'; cx.fillRect(-6, -2.4, 12, 4.8); cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = .5; cx.strokeRect(-6, -2.4, 12, 4.8); cx.restore();
    cx.fillStyle = nn > .5 ? '#d7deee' : '#fff'; for (let i = 0; i < 4; i++) cx.fillRect(x - 11, y - 20 + i * 1.8, 6, 1.1);
    cx.strokeStyle = ink; cx.lineWidth = .8; cx.strokeRect(x - 11, y - 20, 6, 7);
    cx.fillStyle = nn > .5 ? '#8794b0' : '#6a7480'; cx.fillRect(x - 3, y - 8, 7, 7); cx.fillStyle = (Math.sin(time * 3 + x) > .4) ? '#F0E442' : 'rgba(80,80,20,.6)'; cx.fillRect(x - 1.5, y - 6.5, 2, 1.6);
    cx.strokeStyle = ink; cx.lineWidth = .9; cx.beginPath(); cx.moveTo(x + 4, y - 7); cx.lineTo(x + 4, y - 12); cx.stroke();
    cx.fillStyle = nn > .5 ? '#9aa6c2' : '#7a8592'; cx.beginPath(); cx.moveTo(x + 9, y - 6); cx.lineTo(x + 14, y - 6); cx.lineTo(x + 13, y); cx.lineTo(x + 10, y); cx.closePath(); cx.fill();
    cx.font = '700 9px ' + FONT; cx.textAlign = 'center'; cx.fillStyle = nn > .5 ? 'rgba(220,232,255,.8)' : 'rgba(16,40,70,.8)'; cx.fillText(label, x, y + 12); cx.textAlign = 'start';
  }
  /* ---- aircraft, raptors, horses with riders, elephants ---- */
  const air = [], hawks = [], parties = [], eles = []; let airT = 70, hawkT = 12, partyT = 45, eleT = 60, awsSaid = 0;
  const drawHorse = (x, y, s, d, ph, col, nn, pack, moving) => {
    const body = css(mixc(col, [8, 10, 22], nn * .72)), dk = css(mixc(col, [0, 0, 0], .5 + nn * .2));
    cx.save(); cx.translate(x, y); cx.scale(d * s, s); cx.lineCap = 'round';
    cx.strokeStyle = dk; cx.lineWidth = 2; cx.beginPath();
    for (let i = 0; i < 4; i++) { const lx = [-9, -6.5, 6.5, 9][i], sw = moving ? Math.sin(ph + (i % 2 ? 0 : Math.PI) + i * .6) * 4 : 0, kn = moving ? Math.max(0, Math.sin(ph + (i % 2 ? 0 : Math.PI) + i * .6)) * 2 : 0; cx.moveTo(lx, 0); cx.lineTo(lx + sw * .6, 7 - kn); cx.lineTo(lx + sw, 14 - kn * .5); } cx.stroke();
    cx.strokeStyle = dk; cx.lineWidth = 2.4; cx.beginPath(); cx.moveTo(-12, -4); cx.quadraticCurveTo(-18, 0 + (moving ? Math.sin(ph) * 1.5 : 0), -17, 8); cx.stroke();
    cx.fillStyle = body; cx.beginPath(); cx.ellipse(0, -2, 13, 6.2, 0, 0, 6.283); cx.fill();
    cx.strokeStyle = body; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(9, -5); cx.lineTo(15, -14); cx.stroke();
    cx.beginPath(); cx.ellipse(18, -15.5, 5, 2.7, .65, 0, 6.283); cx.fill();
    cx.fillStyle = dk; cx.beginPath(); cx.moveTo(14, -17); cx.lineTo(13.5, -21); cx.lineTo(16, -18); cx.fill();
    cx.strokeStyle = dk; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(10, -8); cx.quadraticCurveTo(12, -14, 14.5, -17); cx.stroke();
    if (pack) { cx.fillStyle = nn > .5 ? '#5a3f33' : '#a0522d'; cx.fillRect(-9, -11, 18, 7); cx.fillStyle = nn > .5 ? '#23405a' : '#0072B2'; cx.fillRect(-7, -14, 6, 4); cx.fillStyle = nn > .5 ? '#6a5a2a' : '#E69F00'; cx.fillRect(1, -14, 6, 4); }
    else { cx.fillStyle = '#5b3a22'; cx.fillRect(-3, -9, 8, 3); }
    cx.restore();
  };
  const person = (x, y, s, d, col, ph, moving, mount) => {
    cx.save(); cx.translate(x, y); cx.scale(d * s, s); cx.lineCap = 'round'; cx.strokeStyle = '#1b1b1b'; cx.lineWidth = 2.4;
    cx.beginPath(); if (mount) { cx.moveTo(0, -4); cx.lineTo(3, 0); cx.lineTo(1, 4); } else { const sw = moving ? Math.sin(ph) * 2.4 : 0; cx.moveTo(0, -4); cx.lineTo(-sw, 3); cx.moveTo(0, -4); cx.lineTo(sw, 3); } cx.stroke();
    cx.strokeStyle = col; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(0, -4); cx.lineTo(0, -10); cx.stroke();
    cx.fillStyle = '#e8c9a8'; cx.beginPath(); cx.arc(0, -12.4, 2.2, 0, 6.283); cx.fill(); cx.fillStyle = '#7a4b1e'; cx.fillRect(-2.8, -14.4, 5.6, 1.4);
    cx.restore();
  };
  function drawElephant(x, y, s, d, ph, nn, drink, moving) {
    const col = css(mixc([120, 122, 128], [14, 16, 30], nn * .72)), dk = css(mixc([84, 86, 92], [6, 8, 18], nn * .72)), lt = css(mixc([150, 150, 154], [20, 22, 38], nn * .72));
    cx.save(); cx.translate(x, y); cx.scale(d * s, s); cx.lineCap = 'round';
    cx.strokeStyle = dk; cx.lineWidth = 6; cx.beginPath(); for (let i = 0; i < 4; i++) { const lx = [-15, -9, 9, 15][i], sw = moving ? Math.sin(ph + (i % 2 ? 0 : Math.PI) + i * .5) * 3 : 0; cx.moveTo(lx, -4); cx.lineTo(lx + sw, 12); } cx.stroke();
    cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, -10, 22, 13, 0, 0, 6.283); cx.fill();
    cx.fillStyle = col; cx.beginPath(); cx.ellipse(21, -16, 9, 9, 0, 0, 6.283); cx.fill();
    cx.fillStyle = dk; cx.beginPath(); cx.ellipse(16, -15, 6.5, 8.5, .25, 0, 6.283); cx.fill(); cx.fillStyle = lt; cx.beginPath(); cx.ellipse(17.5, -15, 3.6, 5.5, .25, 0, 6.283); cx.fill();
    cx.strokeStyle = col; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(28, -15); if (drink) { cx.quadraticCurveTo(34, -6, 33 + Math.sin(ph) * .6, 7); } else { const sw = moving ? Math.sin(ph * .8) * 2 : 0; cx.quadraticCurveTo(33, -6, 30 + sw, 4); } cx.stroke();
    cx.strokeStyle = nn > .5 ? '#cfd3da' : '#f4efe0'; cx.lineWidth = 1.8; cx.beginPath(); cx.moveTo(26, -11); cx.quadraticCurveTo(31, -9, 32, -14); cx.stroke();
    cx.fillStyle = '#111'; cx.beginPath(); cx.arc(25, -18, .9, 0, 6.283); cx.fill();
    cx.strokeStyle = dk; cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(-22, -12); cx.quadraticCurveTo(-27, -6, -25, 4); cx.stroke();
    cx.restore();
  }
  function updateEco(dt, nn) {
    const F = burning.length > 40, SK2 = SK, ts = T;
    if (T > 30 && !awsSaid) { awsSaid = 1; say('aws', 'Two automatic weather stations and the flux tower report to the early warning centre', () => [AW[0].x, AW[0].y - 34], 9, [34, -56]); }
    airT -= dt; hawkT -= dt; partyT -= dt; eleT -= dt;
    if (airT <= 0) { airT = rr(120, 220); const d = Math.random() < .5 ? 1 : -1; air.push({ x: d > 0 ? -40 : W + 40, y: rr(.12, .42) * SK, d, v: rr(34, 46), t0: T }); }
    for (let i = air.length - 1; i >= 0; i--) { const a = air[i]; a.x += a.d * a.v * dt; a.y -= dt * .35; if (a.x < -120 || a.x > W + 120) air.splice(i, 1); }
    if (hawkT <= 0 && hawks.length < 2 && nn < .6) { hawkT = rr(35, 70); hawks.push({ cx: rr(.15, .85) * W, cy: rr(.2, .6) * SK, r: rr(26, 44), a: Math.random() * 6.28, w: rr(.18, .3) * (Math.random() < .5 ? 1 : -1), life: rr(40, 70), drift: rr(-6, 6) }); }
    for (let i = hawks.length - 1; i >= 0; i--) { const h = hawks[i]; h.a += h.w * dt; h.cx += h.drift * dt; h.life -= dt; if (h.life < 0 || nn > .85) hawks.splice(i, 1); }
    if (partyT <= 0 && !parties.length && nn < .55 && !F) { partyT = rr(110, 190); const d = Math.random() < .5 ? 1 : -1, y = SK + (H - SK) * rr(.44, .54); parties.push({ x: d > 0 ? -90 : W + 90, y, d, ph: 0, said: 0 }); }
    for (let i = parties.length - 1; i >= 0; i--) { const p = parties[i], s = scAt(p.y); p.x += p.d * (F ? 44 : 19) * s * dt; p.ph += (F ? 44 : 19) * s * dt * .32; if (!p.said && p.x > W * .2 && p.x < W * .8) { p.said = 1; sayA('hr', 'Riders and a pack horse cross the valley on a trekking route', () => [p.x, p.y - 34], 9, [-30, -58]); } if (p.x < -140 || p.x > W + 140) parties.splice(i, 1); }
    if (eleT <= 0 && !eles.length && !F) { eleT = rr(150, 240); const sx = LAKE.x - LAKE.rx - rr(120, 220), sy = SK + (H - SK) * .27; eles.push({ x: sx, y: sy, sx, sy, ph: 0, st: 'in', t: 0, al: 0, view: 'front', d: 1, cx: sx - 26, cy: sy - 12 }); }
    for (let i = eles.length - 1; i >= 0; i--) { const e = eles[i], s = scAt(e.y) * 1.05, tx = LAKE.x - LAKE.rx - 24 * s, ty = LAKE.y + LAKE.ry * .55;
      if (F && e.st !== 'out') e.st = 'out';
      let gx = e.x, gy = e.y, sp = 0;
      if (e.st === 'in') { gx = tx; gy = ty; sp = 16 * s; } else if (e.st === 'out') { gx = e.sx - 40; gy = e.sy - 30; sp = (F ? 34 : 16) * s; }
      if (e.st === 'drink') { e.view = 'side'; e.d = 1; e.t -= dt; if (Math.random() < dt * 1.4) ripples.push({ x: e.x + 33 * s, y: LAKE.y + 2, t0: T }); if (e.t <= 0) e.st = 'out'; }
      else { const dx = gx - e.x, dy = gy - e.y, d = Math.hypot(dx, dy) || 1; if (e.st === 'in' && d < 5) { e.st = 'drink'; e.t = rr(10, 14); } else if (e.st === 'out' && d < 6) { eles.splice(i, 1); continue; } else { e.x += dx / d * sp * dt; e.y += dy / d * sp * dt; e.ph += sp * dt * .22; const ax = Math.abs(dx), ay = Math.abs(dy); if (ay > ax * 1.2) e.view = dy > 0 ? 'front' : 'back'; else { e.view = 'side'; e.d = Math.sign(dx) || 1; } } }
      lakeFix(e); e.al = e.st === 'out' ? clamp((e.y - e.sy) / 50, 0, 1) : Math.min(1, e.al + dt * .5);
      const k = Math.min(1, dt * 1.6), bx = e.view === 'side' ? e.x - 30 * s * e.d : e.x - 24 * s, by = e.view === 'side' ? e.y + 2 : e.y - (e.view === 'front' ? 14 : -10) * s; e.cx += (bx - e.cx) * k; e.cy += (by - e.cy) * k; }
  }
  /* ---- satellites: MODIS (Terra, Aqua) and VIIRS (Suomi NPP) see the hotspot and relay it to the space agency ---- */
  const sats = [], satPk = []; let satNext = 0, satFlag = 0, satN = 0;
  const SATK = ['MODIS | Terra', 'MODIS | Aqua', 'VIIRS | Suomi NPP'], stn = () => ({ x: W * .93, y: SK + (H - SK) * .08 });
  function stepSat(time) {
    if (!satNext) satNext = time + 40; const fire = burning.length > 25 ? A.fire : null;
    if (fire && !satFlag) { satFlag = 1; satNext = Math.min(satNext, time + 6); } if (!fire) satFlag = 0;
    if (time >= satNext && !sats.length) { satNext = time + (fire ? rr(40, 60) : rr(90, 140)); const d = Math.random() < .5 ? 1 : -1; sats.push({ x0: d > 0 ? -50 : W + 50, d, y: rr(108, 130), t0: time, kind: SATK[satN++ % 3], v: rr(50, 62), done: false, st: 0, ts: 0, fx: 0, fy: 0, x: 0 }); }
    for (let i = sats.length - 1; i >= 0; i--) { const s = sats[i]; s.x = s.x0 + s.d * s.v * (time - s.t0);
      if (fire && !s.done && Math.abs(s.x - fire[0]) < 70) { if (!s.st) { s.st = 1; s.ts = time; s.fx = fire[0]; s.fy = fire[1]; { const ax = Math.min(W - 40, Math.max(40, s.x)), ay = s.y + 10; say('sat', 'Satellites (MODIS and VIIRS) detect the hotspot from space and send it to the space agency', () => [ax, ay], 11, [-120, 46]); } } if (time - s.ts > 1.8) { s.done = true; s.st = 2; satPk.push({ t0: time, stage: 1, s, sx: s.x, sy: s.y }); } }
      if (!fire && s.st === 1) s.st = 2; if (s.x < -70 || s.x > W + 70) sats.splice(i, 1); }
  }
  function drawSatBody(nn, time) {
    stepSat(time);
    sats.forEach(s => { cx.save(); cx.translate(s.x, s.y); const ink = nn > .5 ? '#c9d3ea' : '#2e3744', pan = nn > .5 ? '#5a74b8' : '#26508f';
      cx.fillStyle = pan; cx.fillRect(-15, -1.8, 10, 3.6); cx.fillRect(5, -1.8, 10, 3.6); cx.strokeStyle = nn > .5 ? 'rgba(220,230,255,.6)' : 'rgba(255,255,255,.6)'; cx.lineWidth = .5; cx.beginPath(); for (let q = 1; q < 4; q++) { cx.moveTo(-15 + q * 2.5, -1.8); cx.lineTo(-15 + q * 2.5, 1.8); cx.moveTo(5 + q * 2.5, -1.8); cx.lineTo(5 + q * 2.5, 1.8); } cx.stroke();
      cx.fillStyle = nn > .5 ? '#e4e9f5' : '#d9a441'; cx.fillRect(-4.5, -3.6, 9, 7.2); cx.fillStyle = ink; cx.fillRect(-1.6, 3.6, 3.2, 2.2); cx.beginPath(); cx.arc(0, -5.4, 1.8, Math.PI, 0); cx.stroke(); cx.fillStyle = (Math.sin(time * 4 + s.x) > .5) ? '#ff4d4d' : 'rgba(120,30,30,.7)'; cx.beginPath(); cx.arc(3, -3.6, .9, 0, 6.283); cx.fill(); cx.restore();
      cx.font = '700 9px ' + FONT; cx.textAlign = 'center'; cx.fillStyle = nn > .5 ? 'rgba(220,232,255,.85)' : 'rgba(16,40,70,.85)'; cx.fillText(s.kind, s.x, s.y + 17); cx.textAlign = 'start'; });
  }
  function drawSatFx(nn, time) {
    const st = stn(), ink = nn > .5 ? '#c4cde0' : '#3b424d', col = nn > .5 ? '#9ad1ff' : '#0072B2';
    /* space agency ground station */
    cx.fillStyle = nn > .5 ? '#2a3350' : '#e9edf3'; cx.fillRect(st.x - 11, st.y - 8, 22, 10); cx.strokeStyle = nn > .5 ? '#7d8bb0' : '#4b5563'; cx.lineWidth = 1; cx.strokeRect(st.x - 11, st.y - 8, 22, 10);
    cx.strokeStyle = ink; cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(st.x - 2, st.y - 8); cx.lineTo(st.x - 2, st.y - 16); cx.stroke(); cx.save(); cx.translate(st.x - 2, st.y - 17); cx.rotate(-.9); cx.fillStyle = nn > .5 ? '#dfe5f3' : '#f6f8fb'; cx.beginPath(); cx.ellipse(0, 0, 7, 3.4, 0, 0, 6.283); cx.fill(); cx.stroke(); cx.restore();
    cx.font = '700 9px ' + FONT; cx.textAlign = 'center'; cx.fillStyle = nn > .5 ? 'rgba(220,232,255,.85)' : 'rgba(16,40,70,.85)'; cx.fillText('SPACE AGENCY', st.x, st.y + 12);
    sats.forEach(s => { if (s.st !== 1) return; const u = clamp((time - s.ts) / 1.8, 0, 1), top = s.y + 6, gr = cx.createLinearGradient(0, top, 0, s.fy); gr.addColorStop(0, 'rgba(150,210,255,0)'); gr.addColorStop(1, nn > .5 ? 'rgba(150,210,255,.26)' : 'rgba(40,130,210,.2)');
      cx.fillStyle = gr; cx.beginPath(); cx.moveTo(s.x - 1, top); cx.lineTo(s.fx - 36, s.fy); cx.lineTo(s.fx + 36, s.fy); cx.lineTo(s.x + 1, top); cx.closePath(); cx.fill();
      cx.strokeStyle = nn > .5 ? 'rgba(200,230,255,.7)' : 'rgba(255,255,255,.8)'; cx.lineWidth = 1; cx.setLineDash([4, 4]); cx.beginPath(); cx.ellipse(s.fx, s.fy, 36, 9, 0, 0, 6.283); cx.stroke(); cx.setLineDash([]);
      const ly = s.fy + (u * 2 - 1) * 8; cx.strokeStyle = nn > .5 ? 'rgba(160,220,255,.9)' : 'rgba(0,114,178,.85)'; cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(s.fx - 33, ly); cx.lineTo(s.fx + 33, ly); cx.stroke();
      if (u > .7 && Math.sin(time * 14) > -.2) { cx.fillStyle = '#D55E00'; cx.fillRect(s.fx - 3, s.fy - 3, 6, 6); cx.strokeStyle = '#fff'; cx.lineWidth = 1; cx.strokeRect(s.fx - 3, s.fy - 3, 6, 6); }
      cx.font = '700 9px ' + FONT; cx.textAlign = 'center'; cx.fillStyle = nn > .5 ? 'rgba(255,225,200,.95)' : 'rgba(120,40,0,.95)'; cx.fillText('FIRE PIXEL', s.fx, s.fy + 22); cx.textAlign = 'start'; });
    for (let i = satPk.length - 1; i >= 0; i--) { const p = satPk[i], dur = p.stage === 1 ? 2 : 2.6, u = (time - p.t0) / dur;
      if (u > 1) { if (p.stage === 1) { satPk.push({ t0: time, stage: 2 }); } else EC.pulse = time; satPk.splice(i, 1); continue; }
      const x0 = p.stage === 1 ? p.sx + p.s.d * p.s.v * (time - p.t0) : st.x + 8, y0 = p.stage === 1 ? p.sy + 4 : st.y - 10, x1 = p.stage === 1 ? st.x - 2 : EC.x, y1 = p.stage === 1 ? st.y - 20 : EC.y - 34, mx = (x0 + x1) / 2, my = Math.min(y0, y1) - (p.stage === 1 ? 24 : 50);
      cx.strokeStyle = nn > .5 ? 'rgba(160,210,255,.28)' : 'rgba(0,114,178,.26)'; cx.lineWidth = 1; cx.setLineDash([3, 5]); cx.beginPath(); cx.moveTo(x0, y0); cx.quadraticCurveTo(mx, my, x1, y1); cx.stroke(); cx.setLineDash([]);
      const px = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * mx + u * u * x1, py = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * my + u * u * y1; cx.fillStyle = col; cx.fillRect(px - 2.4, py - 2.4, 4.8, 4.8); cx.strokeStyle = nn > .5 ? '#0a1020' : '#fff'; cx.lineWidth = .8; cx.strokeRect(px - 2.4, py - 2.4, 4.8, 4.8); }
    cx.textAlign = 'start';
  }
  function drawAir(nn, time) {
    drawSatBody(nn, time);
    air.forEach(a => {
      const L = 150 * (1 - nn * .35); if (nn < .85) { const g = cx.createLinearGradient(a.x - a.d * L, 0, a.x, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,255,255,${.5 * (1 - nn)})`); cx.strokeStyle = g; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(a.x - a.d * L, a.y + L * .004); cx.lineTo(a.x, a.y); cx.stroke(); }
      cx.save(); cx.translate(a.x, a.y); cx.scale(a.d, 1); cx.fillStyle = nn > .5 ? '#2b3350' : '#e8edf4'; cx.beginPath(); cx.ellipse(0, 0, 6, 1.1, 0, 0, 6.283); cx.fill(); cx.beginPath(); cx.moveTo(-1, 0); cx.lineTo(-3.4, 2.8); cx.lineTo(-.4, .1); cx.fill(); cx.beginPath(); cx.moveTo(-5, 0); cx.lineTo(-6.4, -2); cx.lineTo(-4, -.2); cx.fill();
      if (nn > .15) { cx.globalAlpha = Math.min(1, nn * 1.4); cx.fillStyle = '#ff4040'; cx.fillRect(-1.2, -1.4, 1.4, 1.2); cx.fillStyle = '#40ff90'; cx.fillRect(-1.2, 1.4, 1.4, 1.2); if (Math.sin(time * 9) > .9) { cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(-5, 0, 1.6, 0, 6.283); cx.fill(); } cx.globalAlpha = 1; } cx.restore();
    });
    hawks.forEach(h => { const x = h.cx + Math.cos(h.a) * h.r * 1.6, y = h.cy + Math.sin(h.a) * h.r * .45, d = Math.sign(-Math.sin(h.a) * h.w) || 1, fl = Math.sin(time * 1.3 + h.a) * .6;
      cx.save(); cx.translate(x, y); cx.scale(d, 1); cx.strokeStyle = nn > .5 ? '#10142a' : '#2b2118'; cx.lineWidth = 1.6; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(-9, 1 + fl); cx.quadraticCurveTo(-4, -2.4, 0, 0); cx.quadraticCurveTo(4, -2.4, 9, 1 + fl); cx.stroke(); cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(-1.5, 3.5); cx.stroke(); cx.restore(); });
  }
  function drawEco(nn, time) {
    parties.forEach(p => { const s = scAt(p.y) * .9, d = p.d, step = p.ph, brown = [[120, 78, 44], [86, 56, 36], [160, 130, 90]];
      /* lead rider, pack horse behind, walker behind that */
      const hx = [0, -36 * s * d, -68 * s * d];
      drawHorse(p.x + hx[0], p.y, s, d, step, brown[0], nn, false, true); person(p.x + hx[0] + 1 * d * s, p.y - 11 * s, s, d, '#D55E00', step, true, true);
      drawHorse(p.x + hx[1], p.y + 1, s, d, step + 1, brown[1], nn, true, true);
      person(p.x + hx[2], p.y + 2, s * .95, d, '#0072B2', step * 1.2, true, false); });
    eles.forEach(e => { const s = scAt(e.y) * 1.05, dr = e.st === 'drink', mv = e.st !== 'drink', cs = scAt(e.cy) * .58;
      const one = (x, y, sc, ph) => { if (e.view === 'side') { cx.save(); cx.globalAlpha = e.al; drawElephant(x, y, sc, e.d, ph, nn, dr, mv); cx.restore(); } else drawEleFB(x, y, sc, e.view === 'front', ph, nn, false, mv, e.al); };
      if (e.view === 'back') { one(e.x, e.y, s, e.ph); one(e.cx, e.cy, cs, e.ph + 1.3); } else { one(e.cx, e.cy, cs, e.ph + 1.3); one(e.x, e.y, s, e.ph); } });
  }
  function frameInner(now) {
    const dtR = Math.min(.05, (now - last) / 1000); last = now; const dt = dtR * speed;
    if (mode === 'auto') nTarget = siteDark() ? 1 : 0;
    n += (nTarget - n) * Math.min(1, dtR * 1.5); const nn = Math.round(n * 1000) / 1000, time = now / 1000;
    if (!rm) { T += dt; updateWorld(dt, nn); updateIncident(dt); stepFire(dt, nn); updateCrews(dt); updateLine(dt); updateHeli(dt); updateCamps(dt, nn); updateRescue(dt); updateEngine(dt); guardAll(dt); updateAnimals(dt); updatePreds(dt, nn); updateEco(dt, nn); }
    fade = Math.min(1, fade + dtR * .6);

    drawSky(nn, time); drawAir(nn, time);
    cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
    cx.globalAlpha = 1; cx.drawImage(terr[0], 0, topY, W, terr[0].height * 2);
    if (nn > .005) { cx.globalAlpha = nn; cx.drawImage(terr[1], 0, topY, W, terr[1].height * 2); cx.globalAlpha = 1; }
    /* seasonal tint on the terrain, wet darkening after rain */
    const tg = tint.getContext('2d'); tg.globalCompositeOperation = 'copy'; tg.drawImage(terr[0], 0, 0); tg.globalCompositeOperation = 'source-in';
    const dryT = clamp(dryD * .8 * (1 - S.green), 0, 1), greenT = clamp(S.green - .4, 0, 1), wetT = clamp(S.rain, 0, 1);
    tg.fillStyle = css(mixc(mixc(mixc(hex('#7a8a52'), hex('#b08a3c'), dryT), hex('#3f9a52'), greenT), hex('#2a4a62'), wetT * .6), (.10 + .14 * dryT + .12 * greenT + .2 * wetT) * (1 - nn * .5)); tg.fillRect(0, 0, tint.width, tint.height); tg.globalCompositeOperation = 'source-over';
    cx.drawImage(tint, 0, topY, W, tint.height * 2);
    /* snow cover by season */
    const sv = clamp(S.snow, 0, 1), s0 = sv > .66 ? 0 : sv > .33 ? 1 : 2; const a0 = sv >= .85 ? 1 : 0;
    const lv = sv * 2.99; const lo = Math.floor(clamp(2.99 - lv, 0, 2)), fr = clamp(2.99 - lv, 0, 2) - lo; // snowC index 0 thick .. 2 thin
    cx.globalAlpha = (1 - fr) * (sv > .02 ? 1 : 0) * (1 - nn * .25); cx.drawImage(snowC[lo], 0, topY, W, snowC[lo].height * 2);
    if (lo < 2) { cx.globalAlpha = fr * (1 - nn * .25); cx.drawImage(snowC[lo + 1], 0, topY, W, snowC[lo + 1].height * 2); } cx.globalAlpha = 1;
    drawStream(nn, time); drawLake(nn, time);
    updateFire(nn, time, dt);
    cx.drawImage(scarC, 0, SK, GW * G, GH * G);
    cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .4 + .4 * nn; cx.drawImage(glowC, 0, SK, GW * G, GH * G); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    drawGround(nn, time); drawTrees(nn, time); drawCamps(nn, time); drawEW(nn, time); drawSatFx(nn, time); drawEngine(nn, time); drawAnimals(nn, time); drawEco(nn, time); drawPreds(nn, time); drawCrews(nn, time); bloom(nn);
    haze(nn, time); drawFog(nn, time); drawSock(nn, time);
    spawnSmoke(dt); drawParts(dt, nn, time); drawFlow(dt, nn, time); drawHeli(nn, time); drawHeli(nn, time, resc); drawRescueRig(nn, time);
    drawRain(dt, nn, time); drawLightning(dt);
    if (S.rain > .05) { cx.fillStyle = `rgba(20,36,56,${.16 * S.rain})`; cx.fillRect(0, 0, W, H); }
    narrate(); drawCallouts(nn); hud(dtR); chapter(dtR);
  }

  const siteDark = () => document.documentElement.dataset.theme === 'dark';
  function setMode(m) { mode = m; }
  function jump(d) { resetLine(); burning.length = 0; st.fill(0); parts.length = 0; spots.length = 0; crews.length = 0; heli = null; resc = null; eng = null; inc = null; wet.fill(0); absDay = yearIdx * YEAR + d; doy = d; planYear(yearIdx); S.wind = kf(KF.wind, d); S.rain = 0; }
  resize(); n = siteDark() ? 1 : 0; nTarget = n; planYear(0);
  if (rm) { absDay = 130; doy = 130; }
  setInterval(() => { let g = 0, gn = 0; for (let i = 0; i < trees.length; i += 3) { const t = trees[i]; g += t.s === 4 ? 0 : (t.gw || 1); gn++; } vegAvg = gn ? g / gn : 1; let s = 0; for (let k = 0; k < N; k += 7) if (fuel0[k] > 0) s += Lf[k]; avgL = s / (N / 7); }, 1500);

  /* ---- run loop: paused when off screen or hidden, throttled for reduced motion, resolution steps down if frames are slow ---- */
  let vis = true, prevT = 0, ema = 16.7, slow = 0, lastRm = 0, lastW = W, lastH = H;
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; }, { threshold: 0 }).observe(hero);
  new ResizeObserver(() => { const w = hero.clientWidth, h = hero.clientHeight; if (Math.abs(w - lastW) > 2 || Math.abs(h - lastH) > 90) { lastW = w; lastH = h; const d = absDay; resize(); absDay = d; } }).observe(hero);
  function loop(now) {
    if (!hero.isConnected) return; requestAnimationFrame(loop);
    if (!vis || document.hidden) { last = now; prevT = 0; return; }
    if (rm && now - lastRm < 500) { last = now; return; } lastRm = now;
    if (prevT) { const dtm = now - prevT; ema += (Math.min(dtm, 100) - ema) * .05; if (ema > 26) { if (++slow > 150 && DPRMAX > 1) { DPRMAX = 1; slow = 0; const d = absDay; resize(); absDay = d; } } else slow = Math.max(0, slow - 2); } prevT = now;
    frameInner(now);
  }
  requestAnimationFrame(loop);
}

const HUD = `<div class="fs-scrim" aria-hidden="true"></div><div class="fs-vig" aria-hidden="true"></div>
<div class="fs-chap" id="fs-chap" aria-hidden="true"><div class="k" id="fs-chK"></div><div class="h" id="fs-chT"></div></div>
<div class="fs-disc" id="fs-disc"></div>
<div class="fs-hud" aria-hidden="true">
  <div class="fs-card fs-cap"><div class="t" id="fs-hSeason"></div><div id="fs-hNote"></div></div>
  <div class="fs-card fs-gs">
    <div class="g"><div class="l">Temperature</div><div class="b2"><i id="fs-gT"></i></div><div class="v" id="fs-vT"></div></div>
    <div class="g"><div class="l">Humidity</div><div class="b2"><i id="fs-gH"></i></div><div class="v" id="fs-vH"></div></div>
    <div class="g"><div class="l">Dry fuel</div><div class="b2"><i id="fs-gF"></i></div><div class="v" id="fs-vF"></div></div>
    <div class="g"><div class="l">Vegetation</div><div class="b2 veg"><i id="fs-gV"></i></div><div class="v" id="fs-vV"></div></div>
    <div class="g"><div class="l">Wind</div><div class="wg"><svg viewBox="-14 -14 28 28"><circle r="12" fill="none" stroke="currentColor" stroke-opacity=".4" stroke-width="1.5"/><g id="fs-arrow"><path d="M-8 0H7M2 -5L8 0L2 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg><div><div class="b2" style="width:48px"><i id="fs-gW"></i></div><div class="v" id="fs-vW"></div></div></div></div>
    <div class="g dgw"><div class="l">Fire danger</div><div class="dbar"><i id="fs-dmark"></i></div><div class="v" id="fs-vD"></div></div>
  </div>
</div>`;
const EYE = '<svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><svg class="eyeoff" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6A10.8 10.8 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.2 4"/><path d="M6.4 7.6A16.6 16.6 0 0 0 2 12s3.6 6.5 10 6.5c1.5 0 2.9-.3 4.1-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
window.FireStory = {
  mount(hero, o) {
    if (!hero || hero._fs) return; hero._fs = 1; o = o || {}; const tr = o.tr || (s => s);
    const cv = document.createElement('canvas'); cv.className = 'fs-canvas'; cv.setAttribute('aria-hidden', 'true'); hero.insertBefore(cv, hero.firstChild);
    hero.insertAdjacentHTML('beforeend', HUD);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost fs-toggle'; b.innerHTML = EYE + '<span class="lbl"></span>'; hero.appendChild(b);
    const lab = () => { const t = tr(hero.classList.contains('fs-clean') ? 'Show text' : 'Hide overlaying texts'); b.setAttribute('aria-label', t); b.querySelector('.lbl').textContent = t; b.setAttribute('aria-pressed', hero.classList.contains('fs-clean') ? 'true' : 'false'); };
    if (window.__fsClean) hero.classList.add('fs-clean');
    b.addEventListener('click', () => { hero.classList.toggle('fs-clean'); window.__fsClean = hero.classList.contains('fs-clean'); lab(); });
    const dis = hero.querySelector('#fs-disc'), dl = () => { dis.textContent = tr('This animation is entirely hypothetical and should not be equated with any place, location or region.'); };
    addEventListener('langchange', () => { if (hero.isConnected) { lab(); dl(); } }); lab(); dl(); hero.classList.add('fs-on');
    run(hero, cv, { font: getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif' });
  }
};
})();
