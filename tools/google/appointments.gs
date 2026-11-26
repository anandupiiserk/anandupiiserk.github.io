/**
 * Appointment backend for anandupiiserk.github.io (Google Apps Script web app).
 * Runs as the account that deploys it and uses that account's primary Google Calendar.
 *
 * GET  (no parameters)  -> {busy:[[startMs,endMs],...], daysOff:["YYYY-MM-DD",...]}   times only, never titles or details
 * GET  ?action=approve|decline&id=...&sig=...   -> one-click approve or decline from the notification email
 * POST -> creates a "REQUEST (pending)" event after re-checking the rules and any clash, then sends two HTML emails.
 *
 * Block a day: add an all-day event to the calendar (any title). Timed events block only their own time.
 */
var TZ = 'Asia/Kolkata';
var OWNER_NOTIFY = true;
var DAYS_AHEAD = 75;
var EXTRA_DAYS = ['2026-11-15'];   /* Sundays opened as a special case, booked like a Saturday */
var START_H = 10, END_H = 18, SAT_START_H = 10.5, SAT_END_H = 17;   /* Saturday 10:30 to 17:00, Sunday closed */
var LENGTHS = [30, 60];
var BOOK_CLOSE_HOUR = 8;   /* a day can be booked only until 08:00 IST on the previous day; nothing can be booked for today */
/* Online booking blocks that are kept here, not on the calendar. BLOCK_DAYS: whole days (YYYY-MM-DD). BLOCK_FROM: a day blocked from that hour (IST, 24-hour clock) to the end of the day. */
var BLOCK_DAYS = ['2026-12-17'];
var BLOCK_FROM = { '2026-11-18': 15 };
function blockedSlot_(start, end) {
  var d = ymd_(start); if (BLOCK_DAYS.indexOf(d) >= 0) return true;
  if (BLOCK_FROM[d] !== undefined) { var eh = +Utilities.formatDate(end, TZ, 'H') + (+Utilities.formatDate(end, TZ, 'm')) / 60; if (ymd_(end) !== d || eh > BLOCK_FROM[d]) return true; }
  return false;
}
var HOLIDAY_CAL = 'en.indian#holiday@group.v.calendar.google.com';
var MSG_ARCHIVE_DAYS = 60, MSG_KEEP_DAYS = 365;   /* messages older than 60 days move to the Archive, and are removed after a year unless you delete them sooner */
var MSG_SENDER = 'No-Reply-Website-Admin-Anandu';
var OWNER_NAME = 'Anandu Prabhakaran';
var SITE_URL = 'https://anandu-prabhakaran.pages.dev/contact';

function ymd_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function whenText_(s, e) { return Utilities.formatDate(s, TZ, 'EEEE d MMMM yyyy, HH:mm') + ' to ' + Utilities.formatDate(e, TZ, 'HH:mm') + ' IST'; }

/* ---- signed links (approve / decline) ---- */
function secret_() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SECRET', s); }
  return s;
}
function sign_(action, id) {
  var sig = Utilities.computeHmacSha256Signature(action + ':' + id, secret_());
  return sig.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
/* The portal pages (Subscribers, Visitors, Messages, Appointments, compose, reply, approve and decline) are served by a second deployment of this script
   that runs as the signed-in visitor and is open only to OWNER_EMAIL. Its address is kept in the script property PORTAL_URL. The public site keeps using the first deployment. */
var OWNER_EMAIL = 'anandupiiserk@gmail.com';
var OWNER_ACTIONS_ = { reply: 1, compose: 1, admin: 1, visitors: 1, go: 1, messages: 1, appts: 1, acc_ok: 1, acc_no: 1, acc_rv: 1, approve: 1, decline: 1, apedit: 1, apdel: 1, arch: 1, unarch: 1, apthist: 1, msgarc: 1, mail: 1, draft: 1, cv: 1, open: 1 };
function portalBase_() { return PropertiesService.getScriptProperties().getProperty('PORTAL_URL') || ScriptApp.getService().getUrl(); }
function gate_(p) {
  var base = PropertiesService.getScriptProperties().getProperty('PORTAL_URL');
  if (!base || !OWNER_ACTIONS_[p.action]) return null;
  var who = ''; try { who = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (x) { }
  if (who === OWNER_EMAIL) return null;
  return trapPage_(p);
}
function link_(action, id) { return portalBase_() + '?action=' + action + '&id=' + encodeURIComponent(id) + '&sig=' + sign_(action, id); }
function calLink_(ev) {
  var id = ev.getId().split('@')[0];
  var eid = Utilities.base64EncodeWebSafe(id + ' ' + CalendarApp.getDefaultCalendar().getId()).replace(/=+$/, '');
  return 'https://www.google.com/calendar/event?eid=' + eid;
}

/* ---- HTML email ---- */
function mail_(heading, intro, rows, buttons, footer) {
  var h = '<div style="background:#eef2f8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1c2430">'
    + '<div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(31,78,156,.12)">'
    + '<div style="background:#1f4e9c;background-image:linear-gradient(135deg,#1f4e9c,#3b82c4);color:#ffffff;padding:26px 28px">'
    + '<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85">Anandu Prabhakaran</div>'
    + '<div style="font-size:22px;font-weight:bold;margin-top:6px;line-height:1.3">' + esc_(heading) + '</div></div>'
    + '<div style="padding:26px 28px">';
  if (intro) h += '<p style="margin:0 0 18px;line-height:1.6;font-size:15px">' + intro + '</p>';
  h += '<table style="border-collapse:collapse;width:100%;background:#f7f9fc;border-radius:10px">';
  rows.forEach(function (r) {
    h += '<tr><td style="padding:11px 14px;border-bottom:1px solid #e6ebf2;color:#5b6675;width:100px;vertical-align:top;font-size:13px;font-weight:bold">' + esc_(r[0]) + '</td>'
      + '<td style="padding:11px 14px;border-bottom:1px solid #e6ebf2;vertical-align:top;font-size:15px;line-height:1.5">' + r[1] + '</td></tr>';
  });
  h += '</table>';
  if (buttons && buttons.length) {
    h += '<div style="margin-top:24px">';
    buttons.forEach(function (b) {
      h += '<a href="' + b[1] + '" style="display:inline-block;margin:0 8px 10px 0;padding:12px 22px;border-radius:999px;background:' + b[2] + ';color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px">' + esc_(b[0]) + '</a>';
    });
    h += '</div>';
  }
  if (footer) h += '<p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #e6ebf2;color:#7a8594;font-size:12px;line-height:1.6">' + footer + '</p>';
  h += '</div><div style="background:#f7f9fc;padding:14px 28px;text-align:center;color:#7a8594;font-size:12px;border-top:1px solid #e6ebf2">'
    + 'This email is sent from a custom domain developed and maintained by Anandu Prabhakaran.</div>'
    + '</div></div>';
  return h;
}
/* ---- admin portal pages (decline, reply, results) ---- */
var PORTAL_CSS = '.nu{background:var(--surface)!important;color:var(--text)!important;border:2px solid var(--muted)!important}.nu:hover{border-color:var(--a)!important}.on{background:var(--a)!important;color:var(--on)!important;border:2px solid var(--a)!important}body{margin:0;background:var(--bg);font-family:Calibri,Carlito,"Segoe UI",system-ui,Arial,sans-serif}*{box-sizing:border-box}'
  + '.pt{background:var(--surface);border-bottom:1px solid var(--line);color:var(--text);padding:16px 20px 64px;font-family:Calibri,Carlito,"Segoe UI",system-ui,Arial,sans-serif}'
  + '.pt .in{max-width:800px;margin:0 auto;display:flex;align-items:center;gap:12px}.pt .lg{width:38px;height:38px;border:1.5px solid var(--text);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px;letter-spacing:.04em}'
  + '.pt .t1{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.pt .t2{font-size:18px;margin-top:2px}'
  + '.pw{max-width:800px;margin:-44px auto 40px;padding:0 14px;font-family:Calibri,Carlito,"Segoe UI",system-ui,Arial,sans-serif;color:var(--text)}'
  + '.cd{background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 24px 60px rgba(15,30,55,.08);padding:28px}'
  + '.cd h1{font-size:30px;font-weight:400;letter-spacing:-.015em;margin:0 0 6px}.sub{color:var(--muted);font-size:15px;margin:0 0 20px;line-height:1.55}'
  + '.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}.chip{background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px;color:var(--muted)}.chip b{color:var(--text)}'
  + '.q{background:var(--soft2);border-left:4px solid var(--a);border-radius:10px;padding:12px 16px;margin:0 0 20px;font-size:14px;line-height:1.6;max-height:160px;overflow:auto;white-space:normal}.q small{display:block;color:var(--muted2);margin-bottom:4px;font-weight:bold;text-transform:uppercase;letter-spacing:.08em;font-size:11px}'
  + 'label.l{display:block;font-weight:bold;font-size:13px;margin:0 0 6px;color:var(--muted)}.hint{color:var(--faint);font-size:12px;font-weight:normal}'
  + 'input.tx,textarea.tx{width:100%;padding:12px 14px;font:inherit;font-size:15px;border:1.5px solid var(--line2);border-radius:10px;background:var(--surface);color:var(--text);outline:none;transition:border-color .2s,box-shadow .2s}'
  + 'input.tx:focus,textarea.tx:focus,.ed:focus{border-color:var(--a2);box-shadow:0 0 0 3px rgba(59,130,196,.18)}textarea.tx{resize:vertical;min-height:130px;line-height:1.5}'
  + '.acts{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px}@media(max-width:620px){.acts,.cc2{grid-template-columns:1fr !important}}'
  + '.act{border:1.5px solid var(--line);border-radius:14px;padding:16px;background:var(--soft2)}.act h3{margin:0 0 4px;font-size:15px}.act p{margin:0 0 12px;color:var(--muted2);font-size:13px;line-height:1.5}'
  + '.b{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px 18px;border:0;border-radius:999px;font:inherit;font-weight:bold;font-size:14px;color:var(--on);cursor:pointer;position:relative;overflow:hidden;transition:transform .15s,opacity .2s,filter .2s}'
  + '.b:hover{filter:brightness(1.08)}.b:active{transform:scale(.98)}.b:disabled{opacity:.6;cursor:progress}.b.red{background:var(--red)}.b.blue{background:var(--a)}.b.auto{width:auto;padding:13px 30px}'
  + '.tb{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:var(--soft);border:1.5px solid var(--line2);border-bottom:0;border-radius:10px 10px 0 0;padding:8px}'
  + '.tg{display:flex;gap:3px;padding-right:8px;margin-right:2px;border-right:1px solid var(--line2)}.tg:last-child{border:0}'
  + '.tb button{border:1px solid transparent;background:transparent;border-radius:6px;min-width:32px;height:32px;padding:0 8px;font-size:14px;cursor:pointer;color:var(--muted)}.tb button:hover{background:var(--surface);border-color:var(--line2)}'
  + '.tb select{height:32px;border:1px solid var(--line2);border-radius:6px;background:var(--surface);padding:0 6px;font:inherit;font-size:13px;color:var(--muted)}.tb input[type=color]{width:34px;height:32px;border:1px solid var(--line2);border-radius:6px;padding:2px;background:var(--surface);cursor:pointer}'
  + '.ed{min-height:260px;border:1.5px solid var(--line2);border-radius:0 0 10px 10px;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;outline:none;background:#fff;color:#1c2430}'
  + '.dz{border:2px dashed var(--line2);border-radius:12px;padding:18px;text-align:center;color:var(--muted2);font-size:14px;cursor:pointer;background:var(--soft2);transition:.2s}.dz.on{border-color:var(--a2);background:var(--tb)}.dz b{color:var(--a)}'
  + '.fl{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.fc{display:flex;align-items:center;gap:8px;background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:6px 8px 6px 12px;font-size:13px}.fc i{font-style:normal;color:var(--faint)}.fc button{border:0;background:var(--soft);border-radius:50%;width:20px;height:20px;cursor:pointer;line-height:1;color:var(--muted)}'
  + '.msg{margin-top:14px;font-size:14px;line-height:1.5;min-height:20px}.msg.bad{color:var(--red)}'
  + '.st{text-align:center;padding:14px 4px}.ic{width:68px;height:68px;border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:34px;color:var(--on);background:var(--green)}.ic.info{background:var(--a2)}.ic.bad{background:var(--red)}'
  + '.ft{text-align:center;color:var(--faint);font-size:12px;margin-top:18px}.ft span{color:#e0245e;font-size:14px}';
var THEME_CSS_ = ":root,[data-theme=light]{--bg:#f4f7fa;--surface:#fff;--soft:#f1f5fb;--soft2:#f7f9fc;--line:#d9e0e9;--line2:#d3dbe8;--text:#0f1722;--muted:#435062;--muted2:#5b6675;--faint:#7a8594;--a:#0072B2;--a2:#3b9bd6;--on:#fff;--red:#b94700;--redl:#e6bfa6;--green:#007a5a;--greenl:#a9dccd;--warn:#8a6a00;--warnl:#e6cf7a;--tb:#eef5fd;--tg:#def3ec;--tr:#fbe9dd;--tw:#fff3d6;--amber:#D55E00;--teal:#009E73;--violet:#CC79A7;--brick:#E69F00;--sky:#56B4E9;--tan:#6e6e6e;--pink:#CC79A7;--shadow:0 24px 60px rgba(15,30,55,.08);--glow:rgba(0,114,178,.10);--ease:cubic-bezier(.22,1,.36,1);color-scheme:light}[data-theme=dark]{--bg:#0c0a09;--surface:#171412;--soft:#211c18;--soft2:#1b1714;--line:rgba(255,238,215,.14);--line2:rgba(255,238,215,.24);--text:#f0eae2;--muted:#c2bab0;--muted2:#aaa196;--faint:#8f877d;--a:#E69F00;--a2:#f2b840;--on:#1a1105;--red:#ff8a5c;--redl:rgba(255,138,92,.45);--green:#3fd0a4;--greenl:rgba(63,208,164,.45);--warn:#e8c36a;--warnl:rgba(232,195,106,.45);--tb:rgba(230,159,0,.14);--tg:rgba(63,208,164,.14);--tr:rgba(255,138,92,.14);--tw:rgba(232,195,106,.14);--amber:#56B4E9;--teal:#00B386;--violet:#CC79A7;--brick:#F0E442;--sky:#4a9ee0;--tan:#bdbdbd;--pink:#CC79A7;--shadow:0 24px 60px rgba(0,0,0,.45);--glow:rgba(230,159,0,.09);color-scheme:dark}html{background:var(--bg);scrollbar-color:var(--line2) transparent}body{background:transparent;color:var(--text);margin:0}body::before{content:\"\";position:fixed;inset:-20%;z-index:-1;pointer-events:none;background:radial-gradient(640px 420px at 14% 8%,var(--glow),transparent 70%),radial-gradient(520px 400px at 92% 28%,var(--glow),transparent 70%);animation:drift 24s ease-in-out infinite alternate}@keyframes drift{to{transform:translate3d(3%,4%,0) scale(1.07)}}::selection{background:var(--a);color:var(--on)}.pt{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--surface) 84%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid var(--line);padding:11px 18px;color:var(--text)}.pt::after{content:\"\";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:linear-gradient(90deg,transparent,var(--a),transparent);background-size:200% 100%;animation:sweep 7s linear infinite;opacity:.75}@keyframes sweep{to{background-position:-200% 0}}.pt .in{max-width:1180px;margin:0 auto;display:flex;align-items:center;gap:14px;flex-wrap:wrap}.pt .lg{width:38px;height:38px;border:1.5px solid var(--text);border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;flex:0 0 auto;transition:transform .5s var(--ease),background .2s,color .2s,border-color .2s}.pt .lg img{width:100%;height:100%;object-fit:cover;display:block}.pt .lg:hover{transform:rotate(-8deg) scale(1.07);background:var(--a);color:var(--on);border-color:var(--a)}.pt .t1{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.pt .t2{font-size:17px;margin-top:1px;color:var(--text)}.pt .sp{flex:1}.lgl{text-decoration:none;color:inherit;display:block}.nv{position:relative;display:flex;gap:2px;padding:4px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--surface) 72%,transparent);overflow-x:auto;overflow-y:hidden;max-width:100%;scrollbar-width:none;isolation:isolate;--mx:50%}.nv::-webkit-scrollbar{display:none}.nv::before{content:\"\";position:absolute;inset:0;z-index:-1;background:radial-gradient(130px circle at var(--mx) 50%,var(--tb),transparent 72%);opacity:0;transition:opacity .4s}.nv:hover::before{opacity:1}.nv .ind{position:absolute;z-index:0;left:0;top:4px;bottom:4px;width:0;border-radius:999px;background:var(--tb);border:1px solid color-mix(in srgb,var(--a) 60%,transparent);box-shadow:0 0 22px var(--tb);transition:transform .6s var(--ease),width .6s var(--ease),opacity .3s;opacity:0;pointer-events:none}.nv a{position:relative;z-index:1;flex:none;display:inline-flex;align-items:center;white-space:nowrap;padding:8px 16px;border-radius:999px;color:var(--muted);text-decoration:none;font-size:.96rem;font-weight:600;letter-spacing:.01em;transition:color .3s}.nv a .t{position:relative;display:block;height:1.35em;line-height:1.35em;overflow:hidden}.nv a .t>span{display:block;transition:transform .5s var(--ease)}.nv a .t>span+span{position:absolute;left:0;top:100%;color:var(--text)}.nv a:hover .t>span,.nv a:focus-visible .t>span{transform:translateY(-100%)}.nv a:hover,.nv a.cur{color:var(--text)}.nv a.cur{font-weight:700}.nv a.cur::before{content:\"\";flex:none;width:6px;height:6px;margin-inline-end:9px;background:var(--a);transform:rotate(45deg);animation:dpulse 2.4s ease-in-out infinite}@keyframes dpulse{50%{transform:rotate(45deg) scale(.7);opacity:.6}}.lo{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 14px;border-radius:999px;border:1.5px solid var(--text);background:var(--surface);color:var(--text);font-weight:bold;font-size:14px;text-decoration:none;white-space:nowrap}.lo svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.lo:hover{background:var(--text);color:var(--surface)}.lo:focus-visible{outline:2px solid var(--a);outline-offset:2px}.tgl{width:38px;height:38px;border-radius:50%;border:1px solid var(--line2);background:var(--surface);color:var(--text);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;transition:transform .5s var(--ease),background .2s,border-color .2s}.tgl:hover{transform:rotate(28deg);border-color:var(--a)}.tgl svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.tgl .mo{display:none}[data-theme=dark] .tgl .su{display:none}[data-theme=dark] .tgl .mo{display:block}.pw{max-width:980px;margin:28px auto 48px;padding:0 16px;color:var(--text)}.cd,.card,.kpi,.li,.act,.ses{animation:rise .65s var(--ease) both}@keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}.kpi:nth-child(2){animation-delay:.07s}.kpi:nth-child(3){animation-delay:.14s}.kpi:nth-child(4){animation-delay:.21s}.main>.card:nth-of-type(2),.pw>.cd{animation-delay:.05s}.kpi,.li,.act,.ses{transition:transform .3s var(--ease),border-color .3s,box-shadow .3s}.kpi:hover,.li:hover,.act:hover,.ses:hover{transform:translateY(-3px);border-color:var(--line2);box-shadow:0 16px 36px -18px rgba(0,0,0,.35)}tbody tr{animation:rowin .5s var(--ease) both}tbody tr:nth-child(2){animation-delay:.04s}tbody tr:nth-child(3){animation-delay:.08s}tbody tr:nth-child(4){animation-delay:.12s}tbody tr:nth-child(5){animation-delay:.16s}tbody tr:nth-child(n+6){animation-delay:.2s}@keyframes rowin{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}.b,.btn,.rp,.pill,.ab{transition:transform .25s var(--ease),box-shadow .25s,filter .2s,background .2s,border-color .2s,color .2s}.b:hover,.btn:hover,.ab:hover{transform:translateY(-1px);box-shadow:0 10px 22px -10px var(--a)}.b:active,.btn:active{transform:scale(.97)}.pill:hover,.rp:hover{transform:translateY(-1px)}a{transition:color .2s,opacity .2s}.st .ic{animation:pop .7s var(--ease) both}@keyframes pop{from{transform:scale(.3);opacity:0}60%{transform:scale(1.12)}to{transform:none;opacity:1}}@media(max-width:640px){.pt .in{gap:10px}.nv{order:3;width:100%}.pt .in>div:nth-child(2){min-width:0}.pt .sp{display:none}.tgl{margin-left:auto}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}@media(max-width:980px){.pt .in>.sp{flex:1}.tgl{order:2}.lo{order:2}.nv{order:3;width:100%}.pw{padding-left:16px;padding-right:16px}}@media(max-width:640px){.pt{padding:9px 12px}.pt .t1{font-size:10px}.nv a{padding:12px 16px}.nv{margin:0 -2px}.pw{padding-left:12px;padding-right:12px}.pw .cd{padding:18px 16px !important;border-radius:16px}button,.b,select,input,textarea{font-size:16px}button,.b,select,input[type=text],input[type=email],input[type=datetime-local],input[type=date]{min-height:44px}input[type=checkbox],input[type=radio]{min-height:0;width:20px;height:20px}.chips{gap:8px}.acts{grid-template-columns:1fr !important}}@media(min-width:641px) and (max-width:980px){.acts{grid-template-columns:1fr 1fr}}.rv{opacity:0;transform:translateY(22px) scale(.985);transition:opacity .8s var(--ease),transform .8s var(--ease);transition-delay:calc(var(--d,0)*85ms);will-change:opacity,transform}.rv.in{opacity:1;transform:none}.cd,.card,.kpi,.li,.act,.tile{position:relative}.nbadge{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#d1242f;color:#fff;font:bold 12px/1 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;box-shadow:0 0 0 2px var(--surface);z-index:2}.nbadge{position:absolute;top:12px;right:12px;min-width:26px;height:26px;font-size:13px;animation:tbp 2s ease-in-out 2}@keyframes tbp{50%{transform:scale(1.15)}}@media (prefers-reduced-motion:reduce){.nbadge{animation:none}}.mread{display:inline-flex;align-items:center;gap:8px;margin-top:14px;min-height:40px;padding:0 16px;border-radius:999px;border:1.5px solid var(--text);background:var(--surface);color:var(--text);font:inherit;font-size:14px;font-weight:bold;cursor:pointer}.mread svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.mread:hover{background:var(--text);color:var(--surface)}.mread:disabled{opacity:.6;cursor:default}.spot{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .35s;background:radial-gradient(380px circle at var(--px,50%) var(--py,50%),color-mix(in srgb,var(--a) 15%,transparent),transparent 65%)}:hover>.spot{opacity:1}button,.btn,.b,.ab,.rp,.tile,.pills button{position:relative;overflow:hidden}.rip{position:absolute;border-radius:50%;pointer-events:none;background:currentColor;opacity:.28;transform:scale(0);animation:rip .65s ease-out forwards}@keyframes rip{to{transform:scale(1);opacity:0}}.sp3{position:fixed;top:0;left:0;height:3px;width:0;z-index:60;background:linear-gradient(90deg,var(--a),var(--a2));box-shadow:0 0 12px var(--a);pointer-events:none}.kpi,.li,.act,.tile{transition:transform .45s var(--ease),box-shadow .45s,border-color .3s}.kpi:hover,.li:hover,.act:hover,.tile:hover{transform:translateY(-5px);box-shadow:var(--shadow);border-color:color-mix(in srgb,var(--a) 45%,var(--line))}.hero{padding:6px 0 22px}.hero .hi{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}.hero h1{margin:0 0 8px;font-size:clamp(26px,5vw,40px);line-height:1.12;background:linear-gradient(90deg,var(--text) 0%,var(--a) 45%,var(--text) 90%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 7s linear infinite}@keyframes shine{to{background-position:-220% 0}}.hero p{margin:0;color:var(--muted)}.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.tile{display:flex;flex-direction:column;gap:6px;padding:20px 20px 18px;border:1.5px solid var(--line);border-top:3px solid var(--c,var(--a));border-radius:18px;background:var(--surface);color:var(--text);text-decoration:none}.tile .ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--c,var(--a)) 16%,transparent);color:var(--c,var(--a));margin-bottom:6px;transition:transform .5s var(--ease)}.tile:hover .ic{transform:rotate(-8deg) scale(1.1)}.tile .ic svg{width:22px;height:22px}.tile .num{font-size:36px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.01em}.tile .lb{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.tile .hn{font-size:13px;color:var(--muted2)}.tile .ar{margin-top:auto;padding-top:10px;font-size:13px;font-weight:600;color:var(--c,var(--a));display:flex;align-items:center;gap:6px}.tile .ar i{display:inline-block;font-style:normal;transition:transform .4s var(--ease)}.tile:hover .ar i{transform:translateX(6px)}.seg{display:inline-flex;border:1px solid var(--line2);border-radius:999px;padding:3px;background:var(--soft2)}.seg button{border:0;background:transparent;color:var(--muted);font-weight:600;font-size:13px;padding:6px 14px;border-radius:999px;cursor:pointer;min-height:0;transition:background .3s,color .3s}.seg button.on{background:var(--tb);color:var(--text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 55%,transparent)}body.simple .adv{display:none !important}.totop{position:fixed;right:18px;bottom:18px;width:48px;height:48px;min-height:0 !important;padding:0;border:0;border-radius:50%;background:var(--surface);color:var(--text);box-shadow:var(--shadow);display:grid;place-items:center;font-size:20px;cursor:pointer;z-index:55;opacity:0;transform:translateY(16px) scale(.85);pointer-events:none;transition:opacity .4s,transform .5s var(--ease),color .3s}.totop.on{opacity:1;transform:none;pointer-events:auto}.totop:hover{color:var(--a);transform:translateY(-3px)}.totop svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}.totop circle{fill:none;stroke-width:3}.totop .bg{stroke:var(--line2)}.totop .fg{stroke:var(--a);stroke-linecap:round;stroke-dasharray:138.2;stroke-dashoffset:138.2}.totop span{position:relative;line-height:1}@media(max-width:640px){.totop{right:14px;bottom:14px}}";
PORTAL_CSS += THEME_CSS_;
var THEME_JS_ = "(function(){var t='';try{t=localStorage.getItem('apt')||''}catch(e){}if(t!=='dark'&&t!=='light')t=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.setAttribute('data-theme',t);window.__tt=function(){var n=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('apt',n)}catch(e){}try{window.dispatchEvent(new Event('themechange'))}catch(e){}};document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href^=\"https://anandu-prabhakaran.pages.dev\"]');if(!a)return;try{var u=new URL(a.href);u.searchParams.set('theme',document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light');a.href=u.toString()}catch(x){}},true);})();";
var THEME_TOGGLE_ = "<button class=\"tgl\" type=\"button\" onclick=\"__tt()\" aria-label=\"Switch between light and dark theme\" title=\"Light or dark theme\"><svg class=\"su\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"4.2\"/><path d=\"M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6\"/></svg><svg class=\"mo\" viewBox=\"0 0 24 24\"><path d=\"M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z\"/></svg></button>";
/* top bar shared by every portal page: brand, the portal links and the light/dark switch */
var FX_JS_ = "(function(){var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches,SEL='.cd,.card,.kpi,.li,.act,.tile',pend=0;\nvar io=!rm&&('IntersectionObserver' in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var t=e.target;io.unobserve(t);requestAnimationFrame(function(){t.classList.add('in')});setTimeout(function(){t.classList.remove('rv','in');t.style.removeProperty('--d')},1700)})},{threshold:.06}):null;\nfunction cu(el){var to=+el.getAttribute('data-count')||0,t0=null;function st(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/900),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e).toLocaleString('en-IN');if(k<1)requestAnimationFrame(st)}if(rm){el.textContent=to.toLocaleString('en-IN');return}requestAnimationFrame(st)}\nfunction scan(){pend=0;[].forEach.call(document.querySelectorAll(SEL),function(el){if(el.__fx)return;el.__fx=1;var s=document.createElement('i');s.className='spot';el.appendChild(s);if(io){var k=el.parentNode?[].indexOf.call(el.parentNode.children,el):0;el.style.setProperty('--d',Math.min(k,9));el.classList.add('rv');io.observe(el)}});[].forEach.call(document.querySelectorAll('[data-count]'),function(el){if(el.__cu)return;el.__cu=1;cu(el)})}\nfunction later(){if(!pend){pend=1;requestAnimationFrame(scan)}}\ndocument.addEventListener('pointermove',function(e){var t=e.target.closest&&e.target.closest(SEL);if(!t)return;var r=t.getBoundingClientRect();t.style.setProperty('--px',(e.clientX-r.left)+'px');t.style.setProperty('--py',(e.clientY-r.top)+'px')},{passive:true});\ndocument.addEventListener('pointerdown',function(e){if(rm)return;var b=e.target.closest&&e.target.closest('button,.btn,.b,.ab,.rp,.tile');if(!b)return;var r=b.getBoundingClientRect(),d=Math.max(r.width,r.height)*2,s=document.createElement('span');s.className='rip';s.style.cssText='width:'+d+'px;height:'+d+'px;left:'+(e.clientX-r.left-d/2)+'px;top:'+(e.clientY-r.top-d/2)+'px';b.appendChild(s);setTimeout(function(){if(s.parentNode)s.parentNode.removeChild(s)},700)});\nvar bar=document.createElement('div');bar.className='sp3';document.body.appendChild(bar);window.addEventListener('scroll',function(){var h=document.scrollingElement||document.documentElement,m=h.scrollHeight-h.clientHeight;bar.style.width=(m>0?Math.min(100,h.scrollTop/m*100):0)+'%'},{passive:true});\nvar tt=document.createElement('button');tt.type='button';tt.className='totop';tt.setAttribute('aria-label','Back to top');tt.innerHTML='<svg viewBox=\\'0 0 50 50\\'><circle class=\\'bg\\' cx=\\'25\\' cy=\\'25\\' r=\\'22\\'/><circle class=\\'fg\\' cx=\\'25\\' cy=\\'25\\' r=\\'22\\'/></svg><span>&uarr;</span>';document.body.appendChild(tt);var fg=tt.querySelector('.fg');function tp(){var h=document.scrollingElement||document.documentElement,m=h.scrollHeight-h.clientHeight,k=m>0?Math.min(1,h.scrollTop/m):0;fg.style.strokeDashoffset=String(138.2*(1-k));tt.classList.toggle('on',h.scrollTop>260)}window.addEventListener('scroll',tp,{passive:true});tp();tt.addEventListener('click',function(){window.scrollTo({top:0,behavior:rm?'auto':'smooth'})});scan();try{new MutationObserver(later).observe(document.body,{childList:true,subtree:true})}catch(x){}\nsetTimeout(function(){[].forEach.call(document.querySelectorAll('.rv:not(.in)'),function(el){el.classList.add('in')})},3500);})();";
var SITE_URL_ = 'https://anandu-prabhakaran.pages.dev/';
var PHOTO_URL_ = 'https://anandu-prabhakaran.pages.dev/home';
var NAV_JS_ = "(function(){var n=document.querySelector('.nv');if(!n)return;var ind=n.querySelector('.ind'),cur=n.querySelector('a.cur');function mv(a,show){if(!a||!ind)return;ind.style.width=a.offsetWidth+'px';ind.style.transform='translateX('+a.offsetLeft+'px)';ind.style.opacity=show?'1':'0'}function rest(){mv(cur,!!cur)}[].forEach.call(n.querySelectorAll('a'),function(a){a.addEventListener('mouseenter',function(){mv(a,true)});a.addEventListener('focus',function(){mv(a,true)})});n.addEventListener('mouseleave',rest);n.addEventListener('mousemove',function(e){var r=n.getBoundingClientRect();n.style.setProperty('--mx',(e.clientX-r.left+n.scrollLeft)+'px')});window.addEventListener('resize',rest);if(cur){try{var l=cur.offsetLeft-(n.clientWidth-cur.offsetWidth)/2;n.scrollLeft=Math.max(0,l)}catch(e){}}rest();setTimeout(rest,250);})();";
/* ---- red number badges (like chat apps): what is new in each section since you last opened it ----
   Shown on the portal Home tiles only. Opening a section clears its badge; a new item after that brings it back. Counts are kept for 2 minutes to keep pages fast. */
var NOTIF_KEYS_ = ['messages', 'appts', 'visitors', 'admin'];
function notifSeen_() {
  var sp = PropertiesService.getScriptProperties(), raw = sp.getProperty('NOTIF_SEEN'), now = Date.now(), s = raw ? JSON.parse(raw) : {}, ch = !raw;
  NOTIF_KEYS_.forEach(function (k) { if (!s[k]) { s[k] = now; ch = true; } });
  if (ch) sp.setProperty('NOTIF_SEEN', JSON.stringify(s));
  return s;
}
function markSeen_(k) {
  if (NOTIF_KEYS_.indexOf(k) < 0) return;
  var s = notifSeen_(); s[k] = Date.now();
  PropertiesService.getScriptProperties().setProperty('NOTIF_SEEN', JSON.stringify(s));
  try { CacheService.getScriptCache().remove('NOTIF'); } catch (e) { }
}
function notifCounts_() {
  var c = null; try { c = CacheService.getScriptCache().get('NOTIF'); } catch (e) { }
  if (c) return JSON.parse(c);
  var s = notifSeen_(), n = { messages: 0, appts: 0, visitors: 0, admin: 0 }, now = Date.now();
  try { var pr = PropertiesService.getScriptProperties().getProperties(); Object.keys(pr).forEach(function (k) {
    if (k.indexOf('MSG_') === 0) { try { if (+JSON.parse(pr[k]).t > s.messages) n.messages++; } catch (x) { } }
    else if (k.indexOf('SUB_') === 0) { try { var r = JSON.parse(pr[k]); if (r.s === 'active' && +r.t > s.admin) n.admin++; } catch (x) { } } }); } catch (e) { }
  try { visRows_(s.visitors, now + 1).forEach(function (r) { if (!r.x && r.f) n.visitors++; }); } catch (e) { }
  try { CalendarApp.getDefaultCalendar().getEvents(new Date(now - 60 * 86400000), new Date(now + (DAYS_AHEAD + 30) * 86400000)).forEach(function (e) {
    if (/^(REQUEST|Appointment:)/.test(e.getTitle()) && e.getDateCreated().getTime() > s.appts) n.appts++; }); } catch (e) { }
  try { CacheService.getScriptCache().put('NOTIF', JSON.stringify(n), 120); } catch (e) { }
  return n;
}
function notifClearAll(sig) {
  if (sign_('admin', 'notif') !== sig) throw new Error('This link is not valid. Reload the page.');
  var s = notifSeen_(), now = Date.now(); NOTIF_KEYS_.forEach(function (k) { s[k] = now; });
  PropertiesService.getScriptProperties().setProperty('NOTIF_SEEN', JSON.stringify(s));
  try { CacheService.getScriptCache().remove('NOTIF'); } catch (e) { }
  return true;
}
function badge_(n, cls) { return n > 0 ? '<span class="' + cls + '" aria-label="' + n + ' new">' + (n > 99 ? '99+' : n) + '</span>' : ''; }
function navBar_(cur) {
  var a = function (k, t, u, x) { return '<a href="' + u + '" target="_top"' + (k === cur ? ' class="cur" aria-current="page"' : '') + (x || '') + '><span class="t"><span>' + t + '</span><span>' + t + '</span></span>' + '</a>'; };
  return '<nav class="nv" aria-label="Admin menu"><span class="ind"></span>' + a('site', 'Go to website', SITE_URL_, ' rel="noopener"') + a('home', 'Home', portalBase_() + '?action=go') + a('admin', 'Subscribers', adminUrl_()) + a('compose', 'Email', mailUrl_()) + a('messages', 'Messages', msgUrl_()) + a('appts', 'Appointments', apptUrl_()) + a('visitors', 'Visitors', visUrl_()) + a('cv', 'CV', cvUrl_()) + '</nav>';
}
/* top-right Log out: leaves the portal for the website (the theme goes along) */
var LOGOUT_ = '<a class="lo" href="https://anandu-prabhakaran.pages.dev/home" target="_top" title="Log out and go to the website"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/></svg><span>Log out</span></a>';
function topbar_(nav, cur) {
  return '<header class="pt"><div class="in"><a class="lgl" href="' + PHOTO_URL_ + '" target="_top" title="Go to the website" aria-label="Go to the website"><div class="lg"><img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBAUEBAYFBQUGBgYHCQ4JCQgICRINDQoOFRIWFhUSFBQXGiEcFxgfGRQUHScdHyIjJSUlFhwpLCgkKyEkJST/2wBDAQYGBgkICREJCREkGBQYJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCT/wAARCABgAGADASIAAhEBAxEB/8QAHAAAAQUBAQEAAAAAAAAAAAAABgIDBAUHAQgA/8QAMRAAAQMDAwIFAwQCAwEAAAAAAQIDEQAEBRIhMQZBBxMiUWFxgZEUIzJCobEVQ4LB/8QAGgEAAgMBAQAAAAAAAAAAAAAABAUBAgMGAP/EACMRAAIDAQACAQQDAAAAAAAAAAECAAMRBBIxIQVBQlETIzP/2gAMAwEAAhEDEQA/AIBJ1J57zx710AAEyfakrQBBGng8fWvjuDzua58ToZITulPcn2HFcgpJgiaS2pUjSe570m7vGbO3XcvrCGmgVKUf6gc14D5yQT+44g6SCshKBvq7CoFz1JirXShd4hRjhsFRG89qzbLdYX+adhDi0sSSlhI/in59zUBNw48lttlS0IT6pKNMmmdX08Ea5i6zuIOIJpaeu8EpwMruHmd41OsqCfzVzbXtpethy1uGrhuJ1Nqmsae89MtrfDhJ3SqDTLVxdYt/9RYLU06BulJiR8dj9DV3+nr+JlU72/ITcDG3pH2rhmFAapJoJ6V8Qk5B1uzyKkoeJCUuGE6jPeKNzABkd4mTS6ytqzjRhXYtg1ZxUhSQCo896YWDJntPeafVupJP13PamVd5j8D3qgljPpKSTv3/AN0ooITHJ1cAUjVMiN+8UsqJGqfmqy0+KNojkmhLxMvFsYRNs2qBcOhP1A3j8xRgTKdyfYSPrQZ4hNfqb/DWhEpU6pSUjeT6QKI5h/YNg/R/mckTE+D+QyeJtbxi/aYuXBqW24k7J7biu5Pwy6owDJN1bF1j+r6DqQr8cfetYwRcZSy2UyQkBUdqMDcvotdKYLZEFKoINXTttDHfUluGoqM9zybd9LZ1lYcFq4oGTqAnaqx9q6YSlK7YhYM6q9Tu49CHVvuMohXKRQd1FiMc5eeYizQ2DtAGxrdO4n2JjZ9PAHwZ59cyLzbhDqNKp1bpj7itn6CzTmewKXnt1tL8oqP9oHNA3iHhrS3LNwhsA+ZpITtIijvojEuYzAW4U35SnP3NPBgjafmp6nD1Bj7mXMjJaVEv1CAn1fGwqMuZO80+okHcieKaWBoPqgciKXCMTPkzwYnalIB0jdP23pCdtz7e1LQn+I2Hv+KrJihK4P4gUO5xDRucdkLm2U1eMhxbCgvUkoSrZSh2n294ogSJgJJk+1R77ANKy+WbDS/1D9snUHFAwpQUUgew/iY+a2pOHZlavkuQab6z6hukM3Vkl+281vzGiy4lQI41aSQd/kTXcV4x5yxuPLypRcCdJOgtr/Bq5w2ExeZwbOJunP0d1ZNo8p1K9LrJ0gKQpPPM8/aoD3QHT790zg8Vd3GSzeRcCDcrny7dv/sdI76Rx7qIow/xkYRMALQQytCK88Y8fa6WnGlKJTqMpO1VFz17hM2lS0XS23QNgWzBoWz3QAx2azeLxb1xdJsnkhj9SuXFNlAO8QO54iq6yxmRDiWSy+yUplQehaB8id/815KKs0GRZ027hEnZVgZ3qTD49KfNQpfnOe2hJkk/G1aUsQEkDT8TWe9DquX8qi9UPM1BdpKUwlABKiQTueE/G8VoPqEK3P34ofqOMF/U05hoLfuJWNAnbc7006YHPanlncEzyKjPqO4G/PahhCDFJgzPbsKUkfxJBntI+KbCwVHSofSrPH9P5fIoCrPF31wCB6m2VFP5iK8AT6kEge5CQkykCSvhMDee1UNrlv8AhOrb4XZMPxJO+8CCa2nw06EumMscjmbJ1n9KoBlp9ManOdUdwP8AZ+Ky/rHo/HdE9cXOJyKfOtL5eq1dmFNtrJ0/dJ2+00x5eUuDv3gHR1BSM+0G+vbuxeuGU3IC1OCGtIlX2PIpmx6p6h6OShOLxLbto2iXlt+q5neApUk6ROwjaTVc5iGclnX2Mit0tYo+WpLailSwCdwaskZLw+I/TWuRuLVI3U28NUqiP5EfJq4qCjwPzLq5c+YOStX1Re5XLLzwYSxkXBoet1rIKgD6VRE7CRwf8VYO5C/yLbiU27bLhbMrDoKEE/2IgExuY96oMraKbv7W8RepftUupDSyPWkfUcipF5l7rMLGPs0hC7hflykbx3JPwJNT44QRM2c/IaFHQtoxb4ovsJOl1akoneED0j8xNEQUdiI4+ah463asLZu1ZTDbaQgf6qTrgbdv80ssbyYmH1r4qBOL5HMSOTTb4JT2A32Apa1gq59u5pl71RO8bc1AkmepbfHWVnpSzZ2zKe3lMpTv9hUhwAkJJ2PAjY0opAUWlfxVuk0hSFOILaoJHIPf5FdBg+05+MXF1a2SA7cvoZQg/wBjzHsO/wBqwfxoxS+uOocbfY1sptv0y7d9aj6kKSqUmOx9RrX+qUM2mO8+6UXW0khKVcyRx81kWRzarR1DVujUXCdp2TQd/Q9TYsO5eVbQS3qCb/hxeMXbeUtcsW7jykh3YfuKAgz9YrPOqcyhm/ONzGCx8NSpL6WQhTo7HUOa3VFw4Wv3wkA7/Q0Bdc9PjOBbLCtD4SosLIgBccfQ8fisKuks+vDLuVVTK5kd5kU3ikJYQW2UfxbSIArRfDjBJf6We6gat1uOpuyw45zobKQUke3qkE/Iqu6D8I7nqmwcyWUvlYvG6y15vllbz6gPUlpOwgcFRMA7b1sfRxR0/ZKwuPxbYxBUEOJuFaluAiASRAEwdoPIoq1lK+MXVkq/lA7WkIMEyBXS7pGx370UdR9C3VmtV3im1XNi4dQbSCXGh7EdwPcUJqkLVMggwQREUresocMaJYrjRPi7yT/bf/FIWs6Rsfx8UleqQPTEd6SraCIBBqAJOz1sD5jKD/ZO1KVuErHIqNaPJU2uTAG8n25oK6j8RWXGzaYhwLUolJf7D6e9O3sVF1olrqaw+KyL4o5pt9VtYW7gUtBK3dJ24gf/AGsvvEjSp4uwtPAq2vH20EuXLm6z6lEySaEOoMwyyS3bqDilcR70nsc2uWjutBUgWLHUDy2dHmkPhW6Qe1Lylut5y8u7fJMOKtkJeZtir1OQRqH2G4q78LfC266ivW87lkFNgFag2rYve3/n/da1deHXT7SSoY23Kp1A+WNvpRVfOc2CW9QByVXTNv8Ar+nMe7cpSSq3SNMD0jfiKlpwOOt0oLVohIQZUdySDsZNT0WqLRlthkBLbY0pSBsBSwvSdxRwrGYYtZtJIkdFs4yylCU8d+arc30nic02DeW/78QHmjoWPuOfvNXnnJ4INJP7i0mNhVigIwiQGIOiYz1X0Zc9NOB4KU/ZOGEvARpM/wAVex/waG3Arcgj8969FXmNt8nY3FpctpcZdQUqSfng/Wdx9K88XLDjDq2loVqQ4Uq24ImQaWdNIrbR6Mac1xsGH2J//9k=" alt="Anandu Prabhakaran" width="38" height="38"></div></a><div><div class="t1">Website admin</div><div class="t2">Anandu Prabhakaran</div></div><span class="sp"></span>' + (nav ? navBar_(cur) : '') + THEME_TOGGLE_ + (nav ? LOGOUT_ : '') + '</div></header>' + (nav ? '<script>' + NAV_JS_ + FX_JS_ + '<\/script>' : '');
}
function shell_(title, sub, inner, nav, curOv) {
  var cur = curOv || (/^Subscribers/.test(title) ? 'admin' : /^(New email|Reply|Email)/.test(title) ? 'compose' : /^Messages/.test(title) ? 'messages' : /^Appointments/.test(title) ? 'appts' : '');
  return '<script>' + THEME_JS_ + '<\/script><style>' + PORTAL_CSS + '</style>' + topbar_(nav, cur)
    + '<div class="pw"><div class="cd" style="padding:28px">' + (title ? '<h1>' + title + '</h1>' : '') + (sub ? '<p class="sub">' + sub + '</p>' : '') + inner + '</div>'
    + '<div class="ft">Created with <span>&#10084;</span> by Anandu Prabhakaran</div></div>';
}
function statusHtml_(title, msg, kind) {
  var sym = kind === 'bad' ? '!' : (kind === 'info' ? 'i' : '&#10003;');
  return shell_('', '', '<div class="st"><div class="ic ' + (kind || 'ok') + '">' + sym + '</div><h1 style="margin:0 0 8px;font-size:22px">' + esc_(title) + '</h1><p class="sub" style="margin:0">' + msg + '</p></div>', owner_(), 'appts');
}
var FAVICON_ = 'https://anandu-prabhakaran.pages.dev/img/fire-icon.png';
function out_(html, title) {
  if (THEME_Q_) { var tq = '<script>try{localStorage.setItem("apt","' + THEME_Q_ + '")}catch(e){}<\/script>'; html = /<head>/i.test(html) ? html.replace(/<head>/i, function (h) { return h + tq; }) : tq + html; }
  return HtmlService.createHtmlOutput(html).setFaviconUrl(FAVICON_).setTitle(title || 'Website admin').addMetaTag('viewport', 'width=device-width, initial-scale=1'); }
function page_(title, msg, kind) { return out_(statusHtml_(title, msg, kind), title); }

/* ---- availability (GET) and approve / decline links ---- */
/* a theme handed over by the website (?theme=dark|light) becomes the portal's saved theme, so the site, the admin login and the portal match */
var THEME_Q_ = '';
function doGet(e) {
  THEME_Q_ = (e && e.parameter && /^(dark|light)$/.test(e.parameter.theme || '')) ? e.parameter.theme : '';
  if (e && e.parameter && e.parameter.action) { var blocked = gate_(e.parameter); return blocked || act_(e.parameter); }
  var now = new Date(), end = new Date(now.getTime() + DAYS_AHEAD * 86400000);
  var busy = [], daysOff = {};
  CalendarApp.getDefaultCalendar().getEvents(now, end).forEach(function (ev) {
    if (ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.NO) return;
    if (ev.isAllDayEvent()) {
      var s = ev.getAllDayStartDate(), t = ev.getAllDayEndDate();
      for (var d = new Date(s); d < t; d = new Date(d.getTime() + 86400000)) daysOff[Utilities.formatDate(d, TZ, 'yyyy-MM-dd')] = 1;
    } else busy.push([ev.getStartTime().getTime(), ev.getEndTime().getTime()]);
  });
  try {
    var h = CalendarApp.getCalendarById(HOLIDAY_CAL);
    if (h) h.getEvents(now, end).forEach(function (ev) {
      var s = ev.getAllDayStartDate(), t = ev.getAllDayEndDate();
      for (var d = new Date(s); d < t; d = new Date(d.getTime() + 86400000)) daysOff[Utilities.formatDate(d, TZ, 'yyyy-MM-dd')] = 1;
    });
  } catch (err) { }
  BLOCK_DAYS.forEach(function (d) { daysOff[d] = 1; });
  Object.keys(BLOCK_FROM).forEach(function (d) { busy.push([new Date(d + 'T' + ('0' + BLOCK_FROM[d]).slice(-2) + ':00:00+05:30').getTime(), new Date(d + 'T23:59:59+05:30').getTime()]); });
  return json_({ busy: busy, daysOff: Object.keys(daysOff), now: now.getTime() });
}

function act_(p) {
  var action = p.action, id = p.id || '';
  if (action === 'reply') return replyPage_(p);
  if (action === 'compose') return composePage_(p);
  if (action === 'mail') return mailHubPage_(p);
  if (action === 'draft') return draftPage_(p);
  if (action === 'unsub') return nlUnsubPage_(p);
  if (action === 'login') return loginPage_();
  if (action === 'whoami') return whoamiPage_();
  if (action === 'go') return homePage_();
  if (action === 'open') return openPage_(p); /* owner-only: gate_ has already checked the signed-in account */
  if (action === 'admin' || action === 'visitors' || action === 'messages' || action === 'appts') markSeen_(action);
  if (action === 'admin') return adminPage_(p);
  if (action === 'visitors') return visitorsPage_(p);
  if (action === 'cv') return cvPage_(p);
  if (action === 'messages') return messagesPage_(p);
  if (action === 'appts') return appointmentsPage_(p);
  if (action === 'apedit') return apptEditPage_(p);
  if (action === 'apdel') return apptDelPage_(p);
  if (action === 'arch') return apptArchive_(p);
  if (action === 'unarch') return apptUnarchive_(p);
  if (action === 'apthist') return apptHistoryPage_(p);
  if (action === 'msgarc') return messagesPage_(p, true);
  if (action === 'acc_ok' || action === 'acc_no') return accessDecide_(p);
  if (action === 'acc_rv') return accessRevoke_(p);
  if ((action !== 'approve' && action !== 'decline') || !id || sign_(action, id) !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var cal = CalendarApp.getDefaultCalendar(), ev = cal.getEventById(id);
  if (!ev) return page_('Already handled', 'This request is no longer on the calendar. It was probably approved or declined already.', 'info');
  if (!/^REQUEST/.test(ev.getTitle())) return page_('Already handled', 'This request was already handled: ' + esc_(ev.getTitle()), 'info');
  var name = ev.getTag('name') || 'the visitor', email = ev.getTag('email') || '', when = whenText_(ev.getStartTime(), ev.getEndTime());
  var len = Math.round((ev.getEndTime().getTime() - ev.getStartTime().getTime()) / 60000);
  if (action === 'approve') return approvePage_(p, name, email, when, len);
  // Decline: portal page with a box for the reason and two actions; declineWith() does the work
  var inner = '<div class="chips"><span class="chip"><b>' + esc_(name) + '</b></span><span class="chip">' + esc_(when) + '</span>' + (email ? '<span class="chip">' + esc_(email) + '</span>' : '') + '</div>'
    + '<label class="l" for="r">Reason <span class="hint">(optional, included in the email to the visitor)</span></label>'
    + '<textarea id="r" class="tx" placeholder="For example: I am travelling that week. Please pick a slot after 9 November."></textarea>'
    + '<div class="acts">'
    + '<div class="act"><h3>Block this slot</h3><p>Decline and keep the time marked busy on the website. Use this when you are not available.</p><button id="b1" class="b red">Block slot and decline</button></div>'
    + '<div class="act"><h3>Free this slot</h3><p>Decline and open the time again so someone else can book it.</p><button id="b0" class="b blue">Unblock slot and decline</button></div>'
    + '</div><div id="m" class="msg"></div>'
    + '<script>function go(btn,blk){var bs=document.querySelectorAll(".b");for(var i=0;i<bs.length;i++)bs[i].disabled=true;var t=btn.textContent;btn.textContent="Sending...";'
    + 'google.script.run.withSuccessHandler(function(h){document.open();document.write(h);document.close();}).withFailureHandler(function(){for(var i=0;i<bs.length;i++)bs[i].disabled=false;btn.textContent=t;var m=document.getElementById("m");m.className="msg bad";m.textContent="Something went wrong. Please try again.";})'
    + '.declineWith(' + JSON.stringify(id) + ',' + JSON.stringify(p.sig) + ',document.getElementById("r").value,blk);}'
    + 'document.getElementById("b1").onclick=function(){go(this,true);};document.getElementById("b0").onclick=function(){go(this,false);};<\/script>';
  return out_(shell_('Decline this request', 'The visitor gets a polite email. Choose what happens to the time slot.', inner, true, 'appts'), 'Decline request');
}

// Called from the decline page. Verifies the signed link again, removes the request and emails the visitor with the reason.
function declineWith(id, sig, reason, block) {
  var wrap = function (title, msg) { return statusHtml_(title, msg, /valid|Not found|Already/.test(title) ? 'info' : 'ok'); };
  if (!id || sign_('decline', id) !== sig) return wrap('Link not valid', 'This link is not valid.');
  var ev = CalendarApp.getDefaultCalendar().getEventById(id);
  if (!ev || !/^REQUEST/.test(ev.getTitle())) return wrap('Already handled', 'This request was already approved or declined.');
  var name = ev.getTag('name') || 'the visitor', email = ev.getTag('email') || '', when = whenText_(ev.getStartTime(), ev.getEndTime());
  reason = String(reason || '').trim().slice(0, 1000);
  if (block) {
    try { ev.setTitle('Blocked (declined): ' + name); ev.setColor(CalendarApp.EventColor.GRAY); ev.setDescription('Declined request, slot kept blocked on the website.\n\n' + ev.getDescription()); } catch (x) { console.error('block failed: ' + x); }
  } else ev.deleteEvent();
  if (email) {
    var reasonHtml = reason ? '<div style="margin:14px 0 0;padding:12px 14px;background:#f3f6fb;border-left:4px solid #1f4e9c;border-radius:4px;line-height:1.5"><b>Reason:</b><br>' + esc_(reason).replace(/\n/g, '<br>') + '</div>' : '';
    try {
      MailApp.sendEmail({ to: email, name: OWNER_NAME, subject: 'About your appointment request: ' + when,
        body: 'Hello ' + name + ', I am sorry, I cannot meet at ' + when + '.' + (reason ? '\n\nReason: ' + reason : '') + '\n\nYou are welcome to choose another time at ' + SITE_URL,
        htmlBody: mail_('About your appointment request', 'Hello ' + esc_(name) + ', I am sorry, I cannot meet at the time you requested (' + esc_(when) + ').' + reasonHtml,
          [], [['Choose another time', SITE_URL, '#1f4e9c']], OWNER_NAME) });
    } catch (x) { console.error('decline mail failed: ' + x); }
  }
  return wrap('Declined', 'The request from ' + esc_(name) + ' for ' + esc_(when) + ' ' + (block ? 'was declined and the slot stays blocked on the website (it is on your calendar as "Blocked (declined)"; delete that event to free it).' : 'was declined and the slot is free again.') + (email ? ' An email' + (reason ? ' with your reason' : '') + ' was sent to ' + esc_(email) + '.' : ''));
}

/* ---- email verification (OTP) ---- */
var OTP_VALID_MIN = 20;          /* verified email stays valid this long after the OTP is accepted */
var OTP_TTL_SEC = 600;           /* a sent OTP can be entered for 10 minutes */
var OTP_PER_EMAIL_HOUR = 3, OTP_PER_DAY = 60;
var BLOCK_WORDS = ['director', 'registrar', 'chairman', 'chairperson', 'chancellor', 'associatedean', 'assistantdean', 'deputydean', 'assocdean', 'headofdept', 'headofdepartment', 'headofthedepartment', 'headofdivision'];
var BLOCK_TOKENS = ['dean', 'hod', 'head'];
function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
function restricted_(email) {
  var whole = normEmail_(email), flat = whole.replace(/[^a-z0-9]/g, ''), toks = whole.split(/[^a-z0-9]+/);
  for (var i = 0; i < BLOCK_WORDS.length; i++) if (flat.indexOf(BLOCK_WORDS[i]) >= 0) return true;
  for (var j = 0; j < toks.length; j++) if (BLOCK_TOKENS.indexOf(toks[j]) >= 0) return true;
  return false;
}
/* A restricted address (director, dean, HOD ...) is refused unless the owner approved a request for exactly that address. */
function blockedEmail_(email) {
  if (!restricted_(email)) return false;
  return !PropertiesService.getScriptProperties().getProperty('ALLOW_' + subId_(email));
}
/* An address the owner approved is on the portal list and skips the OTP (not for newsletter subscriptions). Every appointment is still confirmed by the owner by email. */
function bypass_(email) {
  if (!restricted_(email)) return false;
  var props = PropertiesService.getScriptProperties(), id = subId_(email);
  if (!props.getProperty('ALLOW_' + id)) return false;
  try { var r = JSON.parse(props.getProperty('ACC_' + id) || '{}'); return r.s === 'approved' && normEmail_(r.e) === normEmail_(email); } catch (x) { return false; }
}
function otpSend_(p) {
  var email = normEmail_(p.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return json_({ ok: false, error: 'invalid' });
  if (blockedEmail_(email)) return json_({ ok: false, error: 'blocked' });
  if (p.purpose !== 'subscribe' && bypass_(email)) { var bexp = Date.now() + OTP_VALID_MIN * 60000; return json_({ ok: true, bypass: true, token: bexp + '.' + sign_('tok', email + '|' + bexp), exp: bexp }); }
  if (p.purpose === 'subscribe') { var cs = subGet_(subId_(email)); if (cs && cs.s === 'ban') return json_({ ok: false, error: 'banned' }); if (cs && (cs.s === 'active' || cs.s === 'watch')) return json_({ ok: false, error: 'subscribed' }); }
  var cache = CacheService.getScriptCache(), props = PropertiesService.getScriptProperties();
  var nk = 'otpn_' + sign_('n', email).slice(0, 32), n = +(cache.get(nk) || 0);
  if (n >= OTP_PER_EMAIL_HOUR) return json_({ ok: false, error: 'rate' });
  var dk = 'OTPDAY_' + ymd_(new Date()), dn = +(props.getProperty(dk) || 0);
  if (dn >= OTP_PER_DAY) return json_({ ok: false, error: 'busy' });
  var code = ('000000' + (parseInt(sign_('code', Utilities.getUuid() + Date.now()).slice(0, 8), 16) % 1000000)).slice(-6);
  cache.put('otp_' + sign_('o', email).slice(0, 32), JSON.stringify({ h: sign_('v:' + email, code), t: 0 }), OTP_TTL_SEC);
  cache.put(nk, String(n + 1), 3600); props.setProperty(dk, String(dn + 1));
  try {
    MailApp.sendEmail({ to: email, name: MSG_SENDER, subject: 'Your verification code',
      body: 'Your OTP is ' + code + '\n\nThis is system generated mail and do not respond here.\nThe OTP is valid for ' + (OTP_TTL_SEC / 60) + ' minutes.\n\nThis email is sent from a custom domain developed and maintained by Anandu Prabhakaran.',
      htmlBody: mail_('Email verification', 'Your OTP is <span style="display:inline-block;margin-left:4px;padding:6px 14px;background:#eef5fd;border:1px solid #cfe0f5;border-radius:8px;font-size:26px;letter-spacing:.28em;font-weight:bold;color:#1f4e9c">' + code + '</span>', [], [],
        'This is system generated mail and do not respond here. The OTP is valid for ' + (OTP_TTL_SEC / 60) + ' minutes. If you did not ask for it, ignore this email.') });
  } catch (x) { console.error('otp mail failed: ' + x); return json_({ ok: false, error: 'mail' }); }
  if (p.purpose === 'subscribe') { try { var pid = subId_(email), po = pendGet_(pid); props.setProperty('PEND_' + pid, JSON.stringify({ e: email, t: po ? po.t : Date.now(), l: Date.now() })); } catch (x2) { } }   /* asked for an OTP to subscribe, not finished yet */
  return json_({ ok: true });
}
function otpVerify_(p) {
  var email = normEmail_(p.email), code = String(p.otp || '').replace(/\D/g, '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || code.length !== 6) return json_({ ok: false, error: 'invalid' });
  var cache = CacheService.getScriptCache(), k = 'otp_' + sign_('o', email).slice(0, 32), raw = cache.get(k);
  if (!raw) return json_({ ok: false, error: 'expired' });
  var r = JSON.parse(raw);
  if (r.t >= 5) { cache.remove(k); return json_({ ok: false, error: 'locked' }); }
  if (r.h !== sign_('v:' + email, code)) { r.t++; cache.put(k, JSON.stringify(r), OTP_TTL_SEC); return json_({ ok: false, error: 'wrong', left: 5 - r.t }); }
  cache.remove(k);
  var exp = Date.now() + OTP_VALID_MIN * 60000;
  return json_({ ok: true, token: exp + '.' + sign_('tok', email + '|' + exp), exp: exp });
}
function tokenOk_(email, tok) {
  var m = String(tok || '').match(/^(\d{10,16})\.([0-9a-f]{64})$/);
  return !!m && +m[1] > Date.now() && sign_('tok', normEmail_(email) + '|' + m[1]) === m[2];
}

/* ---- contact form message (POST with kind:'message') ---- */
function message_(p) {
  var name = String(p.name || '').trim().slice(0, 80), email = String(p.email || '').trim().slice(0, 120), msg = String(p.message || '').trim().slice(0, 3000);
  if (!name || !msg || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json_({ ok: false, error: 'invalid' });
  if (blockedEmail_(email) || !tokenOk_(email, p.vtoken)) return json_({ ok: false, error: 'unverified' });
  var props = PropertiesService.getScriptProperties(), day = ymd_(new Date()), key = 'MSGCOUNT_' + day, n = +(props.getProperty(key) || 0);
  if (n >= 40) return json_({ ok: false, error: 'busy' });   /* daily cap protects the mail quota */
  props.setProperty(key, String(n + 1));
  var rid = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  try {
    props.setProperty('MSG_' + rid, JSON.stringify({ n: name, e: email, m: msg, t: Date.now() }));
    var all = props.getProperties(), cut = Date.now() - MSG_KEEP_DAYS * 86400000;
    Object.keys(all).forEach(function (k) { if (k.indexOf('MSG_') === 0) { try { if (JSON.parse(all[k]).t < cut) props.deleteProperty(k); } catch (z) { props.deleteProperty(k); } } });
  } catch (x) { console.error('store failed: ' + x); }
  var html = esc_(msg).replace(/\n/g, '<br>'), sent = Utilities.formatDate(new Date(), TZ, 'EEEE d MMMM yyyy, HH:mm') + ' IST';
  try {
    MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), name: MSG_SENDER, replyTo: email, subject: 'New message from ' + name + ' via your website',
      body: 'Name: ' + name + '\nEmail: ' + email + '\n\n' + msg,
      htmlBody: mail_('New message from your website', 'Someone sent you a message through the contact form. Reply to this email to answer them directly.',
        [['Name', esc_(name)], ['Email', '<a href="mailto:' + esc_(email) + '">' + esc_(email) + '</a>'], ['Message', html], ['Received', esc_(sent)]], [['Reply to this message', link_('reply', rid), '#1f4e9c'], ['Write a new email', link_('compose', 'new'), '#5b6675']],
        'Reply to this message opens an editor (fonts, bold, alignment, attachments) and sends your answer to the visitor from Anandu Prabhakaran. Replying to this email directly also reaches the visitor.') });
  } catch (x) { console.error('message mail failed: ' + x); return json_({ ok: false, error: 'mail' }); }
  try {
    MailApp.sendEmail({ to: email, name: MSG_SENDER, subject: 'Your message has been received',
      body: 'Hello ' + name + ', your message has been received.\n\nName: ' + name + '\nEmail: ' + email + '\nMessage:\n' + msg + '\n\nThe details above are the details you filled in on the website.\nPlease do not respond to this email. It is system generated and you will be contacted by Anandu soon.',
      htmlBody: mail_('Your message has been received', 'Hello ' + esc_(name) + ', thank you for writing. Your message has been forwarded to Anandu.',
        [['Name', esc_(name)], ['Email', esc_(email)], ['Message', html]], [],
        'The details shown above are the details you filled in on the website.<br><br>Please do not respond to this email. It is system generated and you will be contacted by Anandu soon.') });
  } catch (x) { console.error('ack mail failed: ' + x); }
  return json_({ ok: true });
}

/* ---- reply editor (opened from the message notification) ---- */
function replyPage_(p) {
  var id = p.id || '';
  if (!id || sign_('reply', id) !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var raw = PropertiesService.getScriptProperties().getProperty('MSG_' + id);
  if (!raw) return page_('Not found', 'This message is no longer stored (messages are kept for ' + MSG_KEEP_DAYS + ' days).', 'info');
  return editorPage_('reply', p, JSON.parse(raw), null);
}
function composePage_(p) {
  if (sign_('compose', 'new') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  return editorPage_('compose', p, null, null);
}
function editorPage_(mode, p, r, D) {
  var id = p.id || '', reply = mode === 'reply';
  var fonts = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Courier New', 'Tahoma'];
  var tbtn = function (c, label, st, tip) { return '<button type="button" data-c="' + c + '" title="' + tip + '" style="' + (st || '') + '">' + label + '</button>'; };
  var inner = (reply
      ? '<div class="chips"><span class="chip"><b>' + esc_(r.n) + '</b></span><span class="chip">' + esc_(r.e) + '</span><span class="chip">Sending from your own email address</span></div>'
        + '<div class="q"><small>Their message</small>' + esc_(r.m).replace(/\n/g, '<br>') + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px" class="cc2"><div><label class="l" for="cc">Cc <span class="hint">(optional, separate with commas)</span></label><input id="cc" class="tx" placeholder="cc@example.com" autocomplete="off"></div><div><label class="l" for="bcc">Bcc <span class="hint">(hidden recipients)</span></label><input id="bcc" class="tx" placeholder="bcc@example.com" autocomplete="off"></div></div>' + '<label class="l" for="sub">Subject</label><input id="sub" class="tx" value="Re: your message on my website" style="margin-bottom:16px">'
      : '<div class="chips"><span class="chip">Sending from your own email address</span><span class="chip">New conversation</span></div>'
        + '<label class="l">Send to</label><div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:12px;font-size:14px"><label><input type="radio" name="aud" id="aud-one" checked> One person</label><label><input type="radio" name="aud" id="aud-all"> All newsletter subscribers (<b>' + nlActive_().length + '</b>)</label><label><input type="radio" name="aud" id="aud-watch"> Yellow list (<b>' + nlWatch_().length + '</b>)</label><a href="' + adminUrl_() + '" target="_top" style="color:#1f4e9c;text-decoration:none">View subscribers</a></div>'
        + '<div id="tow"><label class="l" for="to">To</label><input id="to" class="tx" list="subl" value="' + esc_(p.to || '') + '" placeholder="name@example.com, or type a name to search your subscribers" autocomplete="off" style="margin-bottom:14px"><datalist id="subl">' + nlActive_().map(function (r) { return '<option value="' + esc_(r.e) + '">' + esc_(r.n || '') + '</option>'; }).join('') + '</datalist></div>' + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px" class="cc2"><div><label class="l" for="cc">Cc <span class="hint">(optional, separate with commas)</span></label><input id="cc" class="tx" placeholder="cc@example.com" autocomplete="off"></div><div><label class="l" for="bcc">Bcc <span class="hint">(hidden recipients)</span></label><input id="bcc" class="tx" placeholder="bcc@example.com" autocomplete="off"></div></div>'
        + '<label class="l" for="sub">Subject</label><input id="sub" class="tx" placeholder="Subject" style="margin-bottom:16px">')
    + '<label style="display:flex;gap:8px;align-items:flex-start;margin:0 0 14px;font-size:14px;font-weight:600"><input type="checkbox" id="pl" style="margin-top:3px"> <span>Send as normal email <span class="hint" style="font-weight:400">(only your text, like a regular Gmail message: no header bar, box or footer)</span></span></label>'
    + '<div id="hdw"><label class="l" for="hd">Email header <span class="hint">(the title bar at the top of the email)</span></label><input id="hd" class="tx" maxlength="80" value="Email from ' + OWNER_NAME + '" style="margin-bottom:16px"></div>'
    + '<div style="margin:0 0 16px;padding:12px 14px;border:1px solid var(--bd,#d5dce8);border-radius:12px"><label style="display:flex;gap:8px;align-items:center;font-size:14px;font-weight:600"><input type="checkbox" id="mton"> Schedule a meeting with them (blocks the time on the website calendar)</label>'
    + '<div id="mtbox" style="display:none;margin-top:12px"><div style="display:flex;flex-wrap:wrap;gap:12px;margin:0 0 12px"><label class="l" style="flex:1 1 150px">Date<input id="mtd" class="tx" style="min-height:0" type="date" min="' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd') + '"></label>'
    + '<label class="l" style="flex:1 1 120px">Start time (IST)<input id="mtt" class="tx" style="min-height:0" type="time" step="300"></label>'
    + '<label class="l" style="flex:1 1 120px">Length in minutes<input id="mtn" class="tx" style="min-height:0" type="number" min="1" max="1440" step="1" value="30"></label></div><p class="sub" style="margin:-4px 0 10px">Any length from 1 to 1440 minutes. Booking slots that overlap the meeting are blocked on the website, so 75 minutes from 10:00 blocks 10:00, 10:30 and 11:00 (until 11:30).</p>'
    + '<label class="l" for="mta">Meeting agenda <span class="hint">(optional, added to the calendar event and the email)</span></label><textarea id="mta" class="tx" style="min-height:70px"></textarea>'
    + (hasCalApi_() ? '<label style="display:flex;gap:8px;align-items:center;margin:10px 0 0;font-size:14px"><input type="checkbox" id="mtm" checked> Include a Google Meet link</label>' : '<p class="sub" style="margin:10px 0 0">Google Meet links need the Google Calendar service to be switched on in the script.</p>')
    + '<p class="sub" style="margin:10px 0 0">A calendar invitation is sent to them, the meeting details are added at the end of your email, and the slot becomes unavailable on the booking calendar.</p></div></div>'
    + '<label class="l">' + (reply ? 'Your reply' : 'Message') + '</label>'
    + '<div class="tb">'
    + '<div class="tg"><select id="ff"><option value="">Font</option>' + fonts.map(function (f) { return '<option>' + f + '</option>'; }).join('') + '</select>'
    + '<select id="fs"><option value="">Size</option><option value="2">Small</option><option value="3">Normal</option><option value="4">Large</option><option value="5">Larger</option><option value="6">Huge</option></select></div>'
    + '<div class="tg">' + tbtn('bold', 'B', 'font-weight:bold', 'Bold') + tbtn('italic', 'I', 'font-style:italic', 'Italic') + tbtn('underline', 'U', 'text-decoration:underline', 'Underline') + tbtn('strikeThrough', 'S', 'text-decoration:line-through', 'Strikethrough')
    + '<input type="color" id="fc" value="#1c2430" title="Text colour"></div>'
    + '<div class="tg">' + tbtn('justifyLeft', '&#8676;', '', 'Align left') + tbtn('justifyCenter', '&#8596;', '', 'Centre') + tbtn('justifyRight', '&#8677;', '', 'Align right') + tbtn('justifyFull', '&#9776;', '', 'Justify') + '</div>'
    + '<div class="tg">' + tbtn('insertUnorderedList', '&#8226; List', '', 'Bullet list') + tbtn('insertOrderedList', '1. List', '', 'Numbered list') + tbtn('outdent', '&#8656;', '', 'Outdent') + tbtn('indent', '&#8658;', '', 'Indent') + '</div>'
    + '<div class="tg"><button type="button" id="lk" title="Add a hyperlink to the selected text, or insert a new one">Hyperlink</button>' + tbtn('unlink', 'Remove link', '', 'Remove the hyperlink from the selected text') + '<button type="button" id="apl" title="Insert a button that opens the appointment booking page on your website">Add appointment link</button><button type="button" id="mlk" title="Insert a button that opens the message form on your website">Add message link</button>' + tbtn('removeFormat', 'Clear', '', 'Clear formatting') + '</div>'
    + '</div>'
    + '<div id="ed" class="ed" contenteditable="true">' + (reply ? 'Hello ' + esc_(r.n) + ',<br><br><br>Best regards,<br>Anandu Prabhakaran' : '') + '</div>'
    + '<div style="display:flex;gap:10px 16px;align-items:center;flex-wrap:wrap;margin:10px 0 0;font-size:14px"><label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="sg"> Add my signature</label><button type="button" id="sgr" class="b auto" style="background:var(--soft);color:var(--text);padding:7px 14px;font-size:13px">Refresh from Gmail</button><button type="button" id="sge" class="b auto" style="background:var(--soft);color:var(--text);padding:7px 14px;font-size:13px">Edit signature</button><span id="sgm" class="sub" style="margin:0"></span></div>'
    + '<div id="sgk" style="display:none;position:fixed;inset:0;background:rgba(15,25,45,.45);z-index:50;align-items:center;justify-content:center;padding:16px"><div style="background:var(--card,#fff);color:var(--text,#1c2430);border-radius:14px;padding:22px;max-width:560px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.25)"><h3 style="margin:0 0 6px;font-size:17px">Your signature</h3><p class="sub" style="margin:0 0 12px">Edit it here, or paste it from Gmail. Saving keeps this version (Refresh from Gmail brings the Gmail one back).</p><div id="sgx" class="ed" contenteditable="true" style="min-height:120px"></div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px"><button type="button" id="sgc" class="b auto" style="background:var(--soft);color:var(--text);padding:10px 18px">Cancel</button><button type="button" id="sgs" class="b blue auto" style="padding:10px 18px">Save signature</button></div></div></div>'
    + '<label class="l" style="margin-top:18px">Attachments <span class="hint">(up to 15 MB in total)</span></label>'
    + '<div id="lkm" style="display:none;position:fixed;inset:0;background:rgba(15,25,45,.45);z-index:50;align-items:center;justify-content:center;padding:16px"><div style="background:#fff;border-radius:14px;padding:22px;max-width:420px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.25)"><h3 style="margin:0 0 14px;font-size:17px">Add a hyperlink</h3><label class="l" for="lkt">Text to show</label><input id="lkt" class="tx" placeholder="For example: my website" style="margin-bottom:12px"><label class="l" for="lku">Web address</label><input id="lku" class="tx" placeholder="https://example.com" style="margin-bottom:16px"><div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" id="lkx" class="b auto" style="background:var(--soft);color:var(--text);padding:10px 18px">Cancel</button><button type="button" id="lko" class="b blue auto" style="padding:10px 18px">Insert link</button></div></div></div>'
    + '<div id="dz" class="dz"><b>Click to add files</b> or drop them here</div><input type="file" id="fl" multiple style="display:none"><div id="fls" class="fl"></div>'
    + '<div style="margin:18px 0 0;padding:12px 14px;border:1px solid var(--bd,#d5dce8);border-radius:12px"><b style="font-size:14px">Send options</b>'
    + '<label class="l" for="fn" style="margin-top:10px">Sender name <span class="hint">(the name recipients see; the email address stays the same)</span></label><input id="fn" class="tx" maxlength="60" value="' + esc_(OWNER_NAME) + '" style="margin-bottom:4px">'
    + '<label style="display:flex;gap:8px;align-items:center;margin:10px 0 0;font-size:14px"><input type="checkbox" id="sl"> Send later (one person only, no meeting, attachments allowed)</label>'
    + '<div id="slb" style="display:none;gap:12px;flex-wrap:wrap;margin:8px 0 0"><label class="l" style="flex:1 1 150px">Date<input id="sld" class="tx" style="min-height:0" type="date" min="' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd') + '"></label><label class="l" style="flex:1 1 120px">Time (IST)<input id="slt" class="tx" style="min-height:0" type="time" step="300"></label></div>'
    + '<label class="l" for="dad" style="margin-top:12px">Delete my copy from Gmail Sent after <input id="dad" class="tx" type="number" min="1" max="365" placeholder="days" style="width:90px;display:inline-block;min-height:0;margin:0 4px"> days <span class="hint">(leave empty to keep it; the recipient is not told, one person only)</span></label>'
    + '<div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button type="button" id="sd" class="b auto">Save draft</button><span id="ds" class="sub" style="margin:0"></span></div></div>'
    + '<div style="margin-top:22px"><button id="send" class="b blue auto">' + (reply ? 'Send reply' : 'Send email') + '</button></div><div id="m" class="msg"></div>'
    + '<script>(function(){var ed=document.getElementById("ed"),m=document.getElementById("m"),files=[],MAX=15*1024*1024;'
    + 'function ex(c,v){ed.focus();document.execCommand(c,false,v||null);}'
    + (reply ? '' : 'var ao=document.getElementById("aud-all"),aw=document.getElementById("aud-watch"),a1=document.getElementById("aud-one"),tw=document.getElementById("tow");var hd=document.getElementById("hd"),hc=false;hd.oninput=function(){hc=true;};function aud(){tw.style.display=(ao.checked||aw.checked)?"none":"block";if(!hc)hd.value=ao.checked?"News Letter from Anandu Prabhakaran":"Email from Anandu Prabhakaran";}ao.onchange=aud;aw.onchange=aud;a1.onchange=aud;')
    + 'var bs=document.querySelectorAll("[data-c]");for(var i=0;i<bs.length;i++){bs[i].onmousedown=function(e){e.preventDefault();};bs[i].onclick=function(){ex(this.getAttribute("data-c"));};}'
    + 'document.getElementById("ff").onchange=function(){if(this.value)ex("fontName",this.value);};'
    + 'document.getElementById("fs").onchange=function(){if(this.value)ex("fontSize",this.value);};'
    + 'document.getElementById("fc").oninput=function(){ex("foreColor",this.value);};'
    + 'var sel=null,lkm=document.getElementById("lkm"),lkt=document.getElementById("lkt"),lku=document.getElementById("lku");function saveSel(){var g=window.getSelection();if(g.rangeCount&&ed.contains(g.getRangeAt(0).commonAncestorContainer))sel=g.getRangeAt(0).cloneRange();}'
    + 'ed.addEventListener("keyup",saveSel);ed.addEventListener("mouseup",saveSel);'
    + 'document.getElementById("lk").onmousedown=function(e){saveSel();e.preventDefault();};'
    + 'document.getElementById("lk").onclick=function(){lkt.value=sel?String(sel):"";lku.value="";lkm.style.display="flex";(lkt.value?lku:lkt).focus();};'
    + 'document.getElementById("lkx").onclick=function(){lkm.style.display="none";};'
    + 'document.getElementById("lko").onclick=function(){var u=lku.value.trim(),t=lkt.value.trim();if(!u)return;if(!/^(https?:\\/\\/|mailto:)/i.test(u))u=(/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(u)?"mailto:":"https://")+u;lkm.style.display="none";ed.focus();var g=window.getSelection();if(sel){g.removeAllRanges();g.addRange(sel);}var h="<a href=\\""+u.replace(/"/g,"&quot;")+"\\" style=\\"color:#1f4e9c\\">"+(t||u).replace(/</g,"&lt;")+"</a>";document.execCommand("insertHTML",false,h);};'
    + 'var apl=document.getElementById("apl");function apls(){apl.textContent=ed.querySelector("[data-apl]")?"Remove appointment link":"Add appointment link";}apl.onclick=function(){var x=ed.querySelector("[data-apl]");if(x){x.parentNode.removeChild(x);}else{ex("insertHTML",' + JSON.stringify('<div data-apl="1"><p>To book an appointment with me, please choose a convenient time here:</p><p><a href="' + SITE_URL + '#appt" style="display:inline-block;background:#1f4e9c;color:#ffffff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:bold;font-family:Arial,sans-serif">Book an appointment</a></p></div>') + ');}apls();};ed.addEventListener("input",apls);'
    + 'var mlk=document.getElementById("mlk");function mlks(){mlk.textContent=ed.querySelector("[data-mlk]")?"Remove message link":"Add message link";}mlk.onclick=function(){var x=ed.querySelector("[data-mlk]");if(x){x.parentNode.removeChild(x);}else{ex("insertHTML",' + JSON.stringify('<div data-mlk="1"><p>To send me a message, please use the contact form here:</p><p><a href="' + SITE_URL + '#cform" style="display:inline-block;background:#1f4e9c;color:#ffffff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:bold;font-family:Arial,sans-serif">Send me a message</a></p></div>') + ');}mlks();};ed.addEventListener("input",mlks);'
    + 'function size(n){return n>1048576?(n/1048576).toFixed(1)+" MB":Math.max(1,Math.round(n/1024))+" KB";}'
    + 'function tot(){var t=0;for(var i=0;i<files.length;i++)t+=files[i].size;return t;}'
    + 'function paint(){var l=document.getElementById("fls");l.innerHTML="";files.forEach(function(f,i){var c=document.createElement("span");c.className="fc";c.innerHTML="<span></span><i></i><button type=button title=Remove>&times;</button>";c.firstChild.textContent=f.name;c.children[1].textContent=size(f.size);c.lastChild.onclick=function(){files.splice(i,1);paint();};l.appendChild(c);});'
    + 'if(tot()>MAX){m.className="msg bad";m.textContent="Attachments total "+size(tot())+", over the 15 MB limit. Remove some.";}else{m.className="msg";m.textContent="";}}'
    + 'function add(list){for(var i=0;i<list.length;i++){(function(f){var rd=new FileReader();rd.onload=function(){files.push({name:f.name,type:f.type||"application/octet-stream",size:f.size,data:String(rd.result).split(",")[1]});paint();};rd.readAsDataURL(f);})(list[i]);}}'
    + 'var dz=document.getElementById("dz"),fl=document.getElementById("fl");dz.onclick=function(){fl.click();};fl.onchange=function(){add(this.files);this.value="";};'
    + 'dz.ondragover=function(e){e.preventDefault();dz.className="dz on";};dz.ondragleave=function(){dz.className="dz";};dz.ondrop=function(e){e.preventDefault();dz.className="dz";add(e.dataTransfer.files);};'
    + 'var mton=document.getElementById("mton"),mtbox=document.getElementById("mtbox");mton.onchange=function(){mtbox.style.display=mton.checked?"block":"none";};'
    + 'function MT(){if(!mton.checked)return null;var mm=document.getElementById("mtm");return {on:true,date:document.getElementById("mtd").value,time:document.getElementById("mtt").value,len:document.getElementById("mtn").value,meet:mm?mm.checked:false,agenda:document.getElementById("mta").value};}'
    + 'var MODE=' + JSON.stringify(mode) + ',RID=' + JSON.stringify(id) + ',SIG=' + JSON.stringify(p.sig) + ',D=' + JSON.stringify(D || null) + ',DID=(D&&D.id)||"",sentFlag=false,sl=document.getElementById("sl"),slb=document.getElementById("slb"),sbtn=document.getElementById("send"),q2=function(i){return document.getElementById(i);};'
    + 'sl.onchange=function(){slb.style.display=sl.checked?"flex":"none";sbtn.textContent=sl.checked?"Schedule email":(MODE==="reply"?"Send reply":"Send email");};'
    + 'function OPT(){return {draft:DID,fn:q2("fn").value,da:+q2("dad").value||0,at:sl.checked?(q2("sld").value+"T"+q2("slt").value):"",pl:q2("pl").checked};}var plc=q2("pl");function plv(){q2("hdw").style.display=plc.checked?"none":"block";}plc.onchange=function(){plv();try{localStorage.setItem("mailpl",plc.checked?"1":"0");}catch(e){}};if(D){plc.checked=!!D.pl;}else{try{plc.checked=localStorage.getItem("mailpl")==="1";}catch(e){}}plv();var SIGH=' + JSON.stringify(sigGet_()).replace(/</g, '\\u003c') + ',sg=q2("sg"),sgm=q2("sgm"),sgk=q2("sgk"),sgx=q2("sgx");function sgBlk(){return ed.querySelector("[data-sig]");}function sgPut(){var x=sgBlk();if(x)x.parentNode.removeChild(x);if(sg.checked&&SIGH){if(!ed.textContent.trim()&&!ed.querySelector("img"))ed.innerHTML="<div><br></div>";var d=document.createElement("div");d.setAttribute("data-sig","1");d.style.marginTop="18px";d.innerHTML=SIGH;ed.appendChild(d);}sgm.textContent=SIGH?"":"No signature found yet. Use Refresh from Gmail or Edit signature.";}sg.onchange=function(){sgPut();try{localStorage.setItem("mailsig",sg.checked?"1":"0");}catch(e){}};if(D){setTimeout(function(){sg.checked=!!ed.querySelector("[data-sig]")||!!(SIGH&&ed.innerHTML.indexOf(SIGH.slice(0,40))>=0);},0);}else{var sv="1";try{sv=localStorage.getItem("mailsig")||"1";}catch(e){}sg.checked=sv==="1";if(sg.checked&&SIGH){ed.innerHTML=ed.innerHTML.replace("Best regards,<br>Anandu Prabhakaran","Best regards,");sgPut();}}if(!SIGH)sgm.textContent="No signature found yet. Use Refresh from Gmail or Edit signature.";q2("sgr").onclick=function(){sgm.textContent="Reading your Gmail signature...";google.script.run.withSuccessHandler(function(h){SIGH=h;sgPut();sgm.textContent="Signature updated from Gmail.";}).withFailureHandler(function(e){sgm.textContent=(e&&e.message)||"Could not read the signature.";}).sigRefresh(MODE,RID,SIG);};q2("sge").onclick=function(){sgx.innerHTML=SIGH;sgk.style.display="flex";sgx.focus();};q2("sgc").onclick=function(){sgk.style.display="none";};q2("sgs").onclick=function(){var b=this;b.disabled=true;google.script.run.withSuccessHandler(function(h){b.disabled=false;SIGH=h;sgk.style.display="none";sg.checked=true;sgPut();sgm.textContent="Signature saved.";}).withFailureHandler(function(e){b.disabled=false;sgm.textContent=(e&&e.message)||"Could not save.";}).sigSave(MODE,RID,SIG,sgx.innerHTML);};'
    + 'function aud2(){return (typeof ao!=="undefined"&&ao.checked)?"all":(typeof aw!=="undefined"&&aw.checked)?"watch":"one";}'
    + 'function fv(i){var e=q2(i);return e?e.value:"";}'
    + 'function snap(){return JSON.stringify([fv("fn"),aud2(),fv("to"),fv("cc"),fv("bcc"),fv("sub"),fv("hd"),ed.innerHTML,q2("pl").checked]);}'
    + 'if(D){if(D.aud==="all"&&typeof ao!=="undefined"){ao.checked=true;ao.onchange&&ao.onchange();}else if(D.aud==="watch"&&typeof aw!=="undefined"){aw.checked=true;aw.onchange&&aw.onchange();}if(q2("to"))q2("to").value=D.to||"";if(q2("cc"))q2("cc").value=D.cc||"";if(q2("bcc"))q2("bcc").value=D.bcc||"";if(q2("sub"))q2("sub").value=D.s||"";if(D.fn&&q2("fn"))q2("fn").value=D.fn;if(q2("hd")){q2("hd").value=D.h||"";if(typeof hc!=="undefined")hc=true;}ed.innerHTML=D.body||"";}'
    + 'var lastSnap=snap();function saveDraft(manual){if(sentFlag)return;var s0=snap();var ds=q2("ds");if(!manual&&s0===lastSnap)return;lastSnap=s0;ds.textContent="Saving draft...";google.script.run.withSuccessHandler(function(id){DID=id;ds.textContent="Draft saved at "+new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});}).withFailureHandler(function(e){ds.textContent="Draft not saved: "+(e&&e.message?e.message:"try again");}).saveDraft(MODE,RID,SIG,DID,fv("to"),fv("cc"),fv("bcc"),fv("sub"),fv("hd"),ed.innerHTML,aud2(),fv("fn"),q2("pl").checked);}'
    + 'q2("sd").onclick=function(){saveDraft(true);};setInterval(function(){saveDraft(false);},15000);'
    + 'document.getElementById("send").onclick=function(){var b=this;if(tot()>MAX){return;}sentFlag=true;b.disabled=true;b.textContent="Sending...";m.className="msg";m.textContent="";'
    + 'var out=files.map(function(f){return {name:f.name,type:f.type,data:f.data};});'
    + 'google.script.run.withSuccessHandler(function(h){document.open();document.write(h);document.close();}).withFailureHandler(function(e){sentFlag=false;b.disabled=false;b.textContent=sl.checked?"Schedule email":"Send";m.className="msg bad";m.textContent="Could not send: "+(e&&e.message?e.message:"please try again.");})'
    + (reply ? '.sendReply(' + JSON.stringify(id) + ',' + JSON.stringify(p.sig) + ',document.getElementById("sub").value,ed.innerHTML,out,document.getElementById("cc").value,document.getElementById("bcc").value,document.getElementById("hd").value,MT(),OPT());};'
      : '.sendNew(' + JSON.stringify(p.sig) + ',(ao.checked?"__subscribers__":aw.checked?"__watch__":document.getElementById("to").value),document.getElementById("sub").value,ed.innerHTML,out,document.getElementById("cc").value,document.getElementById("bcc").value,document.getElementById("hd").value,MT(),OPT());};')
    + '})();<\/script>';
  return reply
    ? out_(shell_('Reply to ' + esc_(r.n), 'Your reply is sent as a formatted email from Anandu Prabhakaran, with their message quoted underneath.', inner, true), 'Reply to ' + r.n)
    : out_(shell_('New email', 'Start a fresh conversation. It is sent as a formatted email from Anandu Prabhakaran, and replies come to your Gmail.', inner, true), 'New email');
}

// Shared by reply and new-email: builds the styled HTML email and sends it as Anandu Prabhakaran.
function addrs_(v, label) {
  var list = String(v || '').split(/[,;\s]+/).filter(function (x) { return x; });
  list.forEach(function (x) { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)) throw new Error(label + ': "' + x + '" is not a valid email address.'); });
  if (list.length > 20) throw new Error(label + ': too many addresses (max 20).');
  return list.join(',');
}
function fromName_(v) { var n = String(v || '').replace(/[<>"\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); return n || OWNER_NAME; }
function deliver_(to, subject, bodyHtml, files, quoted, cc, bcc, unsubUrl, header, fromName, simple) {
  header = String(header || '').trim().slice(0, 80) || 'Email from ' + OWNER_NAME;
  cc = addrs_(cc, 'Cc'); bcc = addrs_(bcc, 'Bcc');
  var blobs = [], total = 0;
  (files || []).forEach(function (f) {
    var bytes = Utilities.base64Decode(f.data); total += bytes.length;
    blobs.push(Utilities.newBlob(bytes, String(f.type || 'application/octet-stream'), String(f.name || 'attachment').slice(0, 120)));
  });
  if (total > 15 * 1024 * 1024) throw new Error('Attachments are over 15 MB.');
  var clean = String(bodyHtml || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/ on[a-z]+="[^"]*"/gi, '').replace(/javascript:/gi, '');
  var plain = clean.replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  subject = String(subject || '').trim().slice(0, 150);
  /* "Send as normal email": the same formatted text, but no header bar, card, footer or button boxes, so it looks like an ordinary Gmail message */
  if (simple) clean = clean.replace(/style="display:inline-block;background:[^"]*"/gi, 'style="color:#1a56b8"').replace(/<div style="margin:22px 0 0;padding:14px 16px;background:#f3f6fb;[^"]*">/gi, '<div style="margin:18px 0 0">');
  var html = simple ? '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222222">' + clean
      + (quoted ? '<br><div style="color:#555555">Your message:</div><blockquote style="margin:4px 0 0 .8ex;border-left:1px solid #cccccc;padding-left:1ex;color:#555555">' + esc_(quoted).replace(/\n/g, '<br>') + '</blockquote>' : '')
      + (unsubUrl ? '<p style="color:#888888;font-size:12px;margin-top:20px">You are receiving this email because you subscribed to news and information from Anandu Prabhakaran on his website. <a href="' + unsubUrl + '" style="color:#888888">Unsubscribe</a></p>' : '') + '</div>'
    : '<div style="background:#eef2f8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1c2430"><div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(31,78,156,.12)">'
    + '<div style="background:#1f4e9c;background-image:linear-gradient(135deg,#1f4e9c,#3b82c4);color:#ffffff;padding:20px 28px;font-size:18px;font-weight:bold">' + esc_(header) + '</div>'
    + '<div style="padding:26px 28px;font-size:15px;line-height:1.6">' + clean + '</div>'
    + (quoted ? '<div style="margin:0 28px 24px;padding:12px 14px;background:#f7f9fc;border-left:4px solid #c9d0da;border-radius:4px;color:#5b6675;font-size:13px;line-height:1.5"><b>Your message</b><br>' + esc_(quoted).replace(/\n/g, '<br>') + '</div>' : '')
    + (unsubUrl ? '<div style="padding:0 28px 18px;color:#7a8594;font-size:12px;line-height:1.5">You are receiving this email because you subscribed to news and information from Anandu Prabhakaran on his website. <a href="' + unsubUrl + '" style="color:#1f4e9c">Unsubscribe</a></div>' : '')
    + '<div style="background:#f7f9fc;padding:14px 28px;text-align:center;color:#7a8594;font-size:12px;border-top:1px solid #e6ebf2">This email is sent from a custom domain developed and maintained by Anandu Prabhakaran.</div></div></div>';
  var opts = { to: to, name: fromName_(fromName), replyTo: Session.getEffectiveUser().getEmail(), subject: subject, body: plain + (quoted ? '\n\n---\nYour message:\n' + quoted : '') + (unsubUrl ? '\n\n---\nYou are receiving this because you subscribed on the website. Unsubscribe: ' + unsubUrl : ''), htmlBody: html };
  if (blobs.length) opts.attachments = blobs;
  if (cc) opts.cc = cc;
  if (bcc) opts.bcc = bcc;
  MailApp.sendEmail(opts);
  return blobs.length;
}
function sentHtml_(n, to, nb) {
  return statusHtml_('Email sent', 'Your email was sent to ' + esc_(n ? n + ' (' + to + ')' : to) + (nb ? ' with ' + nb + ' attachment' + (nb > 1 ? 's' : '') : '') + '. You can close this tab, <a href="' + link_('compose', 'new') + '" target="_top">write another email</a> or <a href="' + mailUrl_() + '" target="_top">see your Sent emails</a>.', 'ok');
}

// Called from the reply editor.
function sendReply(id, sig, subject, bodyHtml, files, cc, bcc, header, mt, opt) {
  if (!id || sign_('reply', id) !== sig) return statusHtml_('Link not valid', 'This link is not valid.', 'bad');
  var raw = PropertiesService.getScriptProperties().getProperty('MSG_' + id);
  if (!raw) return statusHtml_('Not found', 'This message is no longer stored.', 'info');
  var r = JSON.parse(raw);
  opt = opt || {}; subject = subject || 'Re: your message'; if (mt && mt.on) mt.subject = subject;
  if (opt.at) return scheduleMail_({ to: r.e, cc: cc, bcc: bcc, s: subject, h: header, ri: id, pl: opt.pl }, bodyHtml, files, mt, opt);
  return sendWithMeeting_(r.n, r.e, mt, function (extra) { return deliver_(r.e, subject, bodyHtml + extra, files, r.m, cc, bcc, '', header, opt.fn, opt.pl); }, '', { fn: opt.fn, to: r.e, cc: cc, s: subject, h: header, body: bodyHtml, files: files, da: opt.da, ri: id, draft: opt.draft });
}

// Called from the new-email editor (fresh conversation).
function sendNew(sig, to, subject, bodyHtml, files, cc, bcc, header, mt, opt) {
  if (sign_('compose', 'new') !== sig) return statusHtml_('Link not valid', 'This link is not valid.', 'bad');
  to = String(to || '').trim();
  if ((to === '__subscribers__' || to === '__watch__') && mt && mt.on) throw new Error('A meeting can only be scheduled when the email goes to one person.');
  opt = opt || {}; if (mt && mt.on) mt.subject = subject;
  if ((to === '__subscribers__' || to === '__watch__') && opt.at) throw new Error('Send later works for one person only. Remove the schedule to send to a group.');
  if (to === '__subscribers__' || to === '__watch__') {
    var bulk = sendNews_(subject, bodyHtml, files, header, to === '__watch__', opt.fn, opt.pl);
    recordSent_({ to: to === '__watch__' ? 'Yellow list' : 'Newsletter subscribers', s: subject, h: header, body: bodyHtml, files: files, da: 0 });
    deleteDraft_(opt.draft);
    return bulk;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error('Enter a valid email address.');
  if (!String(subject || '').trim()) throw new Error('Add a subject.');
  if (opt.at) return scheduleMail_({ to: to, cc: cc, bcc: bcc, s: subject, h: header, ri: '', pl: opt.pl }, bodyHtml, files, mt, opt);
  var nm = to.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  return sendWithMeeting_('', to, mt, function (extra) { return deliver_(to, subject, bodyHtml + extra, files, '', cc, bcc, '', header, opt.fn, opt.pl); }, nm, { fn: opt.fn, to: to, cc: cc, s: subject, h: header, body: bodyHtml, files: files, da: opt.da, ri: '', draft: opt.draft });
}
/* Optional meeting attached to an email: creates the calendar event (with a Meet link if asked), so the slot is busy on the booking calendar. */
function sendWithMeeting_(n, to, mt, send, nm, rec) {
  if (!mt || !mt.on) { var nb0 = send(''); finishSend_(rec); return sentHtml_(n, to, nb0); }
  return locked_(function () {
    var m = scheduleMeeting_(nm || n || to.split('@')[0], to, mt), nb;
    try { nb = send(meetingBlock_(m)); } catch (x) { removeMeeting_(m); throw x; }
    if (rec) rec.body = String(rec.body || '') + '<br>Meeting: ' + m.when + (m.agenda ? '. Agenda: ' + m.agenda : '') + (m.meet ? '. Google Meet: ' + m.meet : '');
    finishSend_(rec);
    var h = sentHtml_(n, to, nb);
    return h.replace('You can close this tab', 'The meeting on ' + esc_(m.when) + ' is in your calendar' + (m.meet ? ' with a Google Meet link' : '') + ' and the slot is blocked on the website. You can close this tab');
  });
}
function scheduleMeeting_(name, email, mt) {
  var cal = CalendarApp.getDefaultCalendar(), len = Math.round(+mt.len);
  if (!(len >= 1 && len <= 1440)) throw new Error('Enter the meeting length in minutes, from 1 to 1440.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(mt.date)) || !/^\d{2}:\d{2}$/.test(String(mt.time))) throw new Error('Choose a date and a start time for the meeting.');
  var ns = new Date(Date.parse(mt.date + 'T' + mt.time + ':00+05:30')); if (isNaN(ns.getTime())) throw new Error('Choose a valid meeting date and time.');
  if (ns.getTime() < Date.now()) throw new Error('The meeting time has already passed. Choose a time in the future.');
  var ne = new Date(ns.getTime() + len * 60000);
  if (cal.getEvents(ns, ne).some(function (x) { return !(x.getMyStatus && x.getMyStatus() === CalendarApp.GuestStatus.NO); })) throw new Error('Another event on your calendar overlaps that time. Choose a different time.');
  var agenda = String(mt.agenda || '').trim().slice(0, 2000), purpose = 'Meeting arranged by ' + OWNER_NAME + ' by email' + (mt.subject ? ': ' + String(mt.subject).slice(0, 150) : '.'), meet = '', id = '', api = false;
  if (hasCalApi_()) {
    try {
      var body = { summary: 'Appointment: ' + name, description: descFor_(name, email, len, purpose, agenda, ''), colorId: '10',
        start: { dateTime: iso_(ns), timeZone: TZ }, end: { dateTime: iso_(ne), timeZone: TZ }, attendees: [{ email: email }],
        extendedProperties: { private: { name: name, email: email, agenda: agenda } } };
      if (mt.meet) body.conferenceData = { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
      var res = Calendar.Events.insert(body, 'primary', { conferenceDataVersion: 1, sendUpdates: 'all' });
      api = true; id = res.id; meet = meetOf_(res);
      for (var k = 0; mt.meet && k < 3 && !meet; k++) { Utilities.sleep(900); try { meet = meetOf_(Calendar.Events.get('primary', res.id)); } catch (x) { } }
      if (meet) { try { Calendar.Events.patch({ description: descFor_(name, email, len, purpose, agenda, meet), extendedProperties: { private: { name: name, email: email, agenda: agenda, meet: meet } } }, 'primary', res.id, { sendUpdates: 'none' }); } catch (x) { } }
    } catch (x) { console.error('meeting insert failed: ' + x); if (!id) api = false; }
  }
  if (!api) {
    var ev = cal.createEvent('Appointment: ' + name, ns, ne, { description: descFor_(name, email, len, purpose, agenda, ''), guests: email, sendInvites: true });
    try { ev.setColor(CalendarApp.EventColor.GREEN); } catch (x) { }
    ev.setTag('name', name); ev.setTag('email', email); ev.setTag('agenda', agenda); id = ev.getId();
  }
  ensureReminderTrigger_();
  return { id: id, api: api, when: whenText_(ns, ne), len: len, agenda: agenda, meet: meet };
}
function removeMeeting_(m) {
  try { if (m.api) Calendar.Events.remove('primary', m.id, { sendUpdates: 'all' }); else CalendarApp.getDefaultCalendar().getEventById(m.id).deleteEvent(); } catch (x) { console.error('meeting rollback failed: ' + x); }
}
function meetingBlock_(m) {
  return '<div style="margin:22px 0 0;padding:14px 16px;background:#f3f6fb;border-left:4px solid #1f4e9c;border-radius:4px;line-height:1.6"><b>Meeting</b><br>When: ' + esc_(m.when) + '<br>Length: ' + m.len + (m.len === 1 ? ' minute' : ' minutes')
    + (m.agenda ? '<br>Agenda: ' + esc_(m.agenda).replace(/\n/g, '<br>') : '')
    + (m.meet ? '<br>Google Meet: <a href="' + esc_(m.meet) + '" style="color:#1f4e9c">' + esc_(m.meet) + '</a>' : '') + '<br><span style="color:#5b6675;font-size:13px">A Google Calendar invitation has also been sent to you.</span></div>';
}

/* ---- newsletter: subscribe (email OTP, same check as the forms), unsubscribe, send to all ----
 * Subscribers live in this script's private Script Properties (keys SUB_<hash>), never in the public GitHub repository.
 * Records: {e: email, s: 'pending'|'active', t: timestamp}. Unsubscribing deletes the record, so the person must subscribe again. */
var NL_PENDING_DAYS = 7;
function subId_(email) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, normEmail_(email));
  return d.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('').slice(0, 24);
}
function subGet_(id) { var raw = PropertiesService.getScriptProperties().getProperty('SUB_' + id); return raw ? JSON.parse(raw) : null; }
function nlAll_() {
  var all = PropertiesService.getScriptProperties().getProperties(), out = [], cut = Date.now() - NL_PENDING_DAYS * 86400000;
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('SUB_') !== 0) return;
    try { var r = JSON.parse(all[k]); r.id = k.slice(4); out.push(r); } catch (err) { }
  });
  return out.filter(function (r) { if (r.s === 'pending' && r.t < cut) { PropertiesService.getScriptProperties().deleteProperty('SUB_' + r.id); return false; } return true; });
}
function nlWatch_() { return nlAll_().filter(function (r) { return r.s === 'watch'; }); }
function nlActive_() { return nlAll_().filter(function (r) { return r.s === 'active'; }); }
function nlUnsubUrl_(id) { return ScriptApp.getService().getUrl() + '?action=unsub&id=' + encodeURIComponent(id) + '&sig=' + sign_('unsub', id); }
function subscribe_(p) {
  var email = normEmail_(p.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return json_({ ok: false, error: 'invalid' });
  if (blockedEmail_(email)) return json_({ ok: false, error: 'blocked' });
  if (!tokenOk_(email, p.vtoken)) return json_({ ok: false, error: 'unverified' });   /* same email OTP as the message and appointment forms */
  var id = subId_(email), prev = subGet_(id), nm = String(p.name || '').trim().slice(0, 80) || (prev && prev.n) || '';
  if (prev && prev.s === 'ban') return json_({ ok: false, error: 'banned' });
  if (prev && prev.s === 'watch') return json_({ ok: false, error: 'subscribed' });
  PropertiesService.getScriptProperties().deleteProperty('PEND_' + id);
  /* one record per email address (the id is a hash of the address), so re-subscribing never creates a duplicate */
  PropertiesService.getScriptProperties().setProperty('SUB_' + id, JSON.stringify({ e: email, n: nm, s: 'active', t: Date.now(), t0: (prev && (prev.t0 || prev.t)) || Date.now(), re: prev && prev.s === 'unsub' ? (prev.re || 0) + 1 : (prev && prev.re) || 0 }));
  if (OWNER_NOTIFY) { try { MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), name: MSG_SENDER, subject: 'New newsletter subscriber', body: 'New subscriber: ' + email + '\nAll subscribers: ' + adminUrl_(), htmlBody: mail_('New subscriber', '', [['Name', esc_(String(p.name || '').trim().slice(0, 80) || '(not given)')], ['Email', esc_(email)], ['Total', String(nlActive_().length)]], [['View subscribers', adminUrl_(), '#1f4e9c']], '') }); } catch (err2) { } }
  try {
    var un = nlUnsubUrl_(id);
    MailApp.sendEmail({ to: email, name: OWNER_NAME, replyTo: Session.getEffectiveUser().getEmail(), subject: 'You are subscribed',
      body: 'You are now subscribed to news and information from Anandu Prabhakaran.\n\nUnsubscribe at any time: ' + un + '\n\nThis email is sent from a custom domain developed and maintained by Anandu Prabhakaran.',
      htmlBody: mail_('You are subscribed', 'Thank you for subscribing. You will now receive news and information from Anandu Prabhakaran by email.', [], [],
        'You are receiving this email because this address was verified and subscribed on the website. <a href="' + un + '" style="color:#1f4e9c">Unsubscribe</a>') });
  } catch (err) { }
  return json_({ ok: true, status: 'active' });
}
function nlUnsubPage_(p) {
  var id = p.id || '';
  if (!id || sign_('unsub', id) !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var cu = subGet_(id); if (!cu || (cu.s !== 'active' && cu.s !== 'watch')) return page_('Already unsubscribed', 'This address is not subscribed. To receive emails again, subscribe on the website.', 'info');
  var inner = '<div class="acts" style="display:block"><div class="act"><h3>Unsubscribe from news and information</h3><p>You will stop receiving emails from Anandu Prabhakaran. To receive them again later, you will need to subscribe again on the website.</p><button id="u" class="b red">Unsubscribe</button></div></div><div id="m" class="msg"></div>'
    + '<script>document.getElementById("u").onclick=function(){var b=this;b.disabled=true;b.textContent="Working...";google.script.run.withSuccessHandler(function(h){document.open();document.write(h);document.close();}).withFailureHandler(function(){b.disabled=false;b.textContent="Unsubscribe";var m=document.getElementById("m");m.className="msg bad";m.textContent="Something went wrong. Please try again.";}).nlUnsub(' + JSON.stringify(id) + ',' + JSON.stringify(p.sig) + ');};<\/script>';
  return out_(shell_('Unsubscribe', 'Click the button below to unsubscribe.', inner), 'Unsubscribe');
}
// Called from the unsubscribe page. Deletes the record.
function nlUnsub(id, sig) {
  if (!id || sign_('unsub', id) !== sig) return statusHtml_('Link not valid', 'This link is not valid.', 'bad');
  var cu = subGet_(id);
  if (cu && (cu.s === 'active' || cu.s === 'watch')) { cu.s = 'unsub'; cu.u = Date.now(); cu.by = 'self'; PropertiesService.getScriptProperties().setProperty('SUB_' + id, JSON.stringify(cu)); }   /* record kept (no duplicates, can be contacted for important notices); a banned person stays banned */
  return statusHtml_('You have been unsubscribed', 'You will no longer receive emails from Anandu Prabhakaran. You can subscribe again at any time on the website.', 'ok');
}
// Sends one email to every confirmed subscriber, each with its own unsubscribe link.
function sendNews_(subject, bodyHtml, files, header, yellow, fn, pl) {
  if (!String(subject || '').trim()) throw new Error('Add a subject.');
  var subs = yellow ? nlWatch_() : nlActive_();
  if (!subs.length) throw new Error(yellow ? 'Nobody is on the yellow list.' : 'There are no confirmed subscribers yet.');
  var left = MailApp.getRemainingDailyQuota();
  if (subs.length > left) throw new Error('Gmail allows ' + left + ' more recipients today, and there are ' + subs.length + ' subscribers. Try again tomorrow.');
  var ok = 0, bad = 0;
  subs.forEach(function (r) { try { deliver_(r.e, subject, bodyHtml, files, '', '', '', nlUnsubUrl_(r.id), header, fn, pl); ok++; } catch (err) { bad++; } });
  if (ok && !yellow) PropertiesService.getScriptProperties().setProperty('LASTNEWS', String(Date.now()));
  return statusHtml_(yellow ? 'Sent to the yellow list' : 'Sent to subscribers', 'Your email went to ' + ok + (yellow ? ' yellow-listed person' : ' subscriber') + (ok === 1 ? '' : 's') + (bad ? ' (' + bad + ' failed)' : '') + '. You can close this tab, <a href="' + link_('compose', 'new') + '" target="_top">write another email</a> or <a href="' + mailUrl_() + '" target="_top">see your Sent emails</a>.', 'ok');
}

/* ---- restricted addresses: request approval by email (no OTP), approve or decline, subscribers platform ---- */
function adminUrl_() { return portalBase_() + '?action=admin&sig=' + sign_('admin', 'subs'); }
var ACC_COOL_DAYS = 30;   /* a declined address cannot ask again for 30 days; a decline is never emailed */
function accessRequest_(p) {
  var email = normEmail_(p.email), name = String(p.name || '').trim().slice(0, 80), purpose = { Message: 1, Appointment: 1, Newsletter: 1 }[p.purpose] ? p.purpose : 'Website';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120 || !name) return json_({ ok: false, error: 'invalid' });
  if (!blockedEmail_(email)) return json_({ ok: true, status: 'allowed' });
  var props = PropertiesService.getScriptProperties(), id = subId_(email), cur = props.getProperty('ACC_' + id);
  if (cur) { var r0 = JSON.parse(cur); if (r0.s === 'pending') return json_({ ok: true, status: 'pending' }); if (r0.s === 'declined' && Date.now() - r0.t < ACC_COOL_DAYS * 86400000) return json_({ ok: false, error: 'declined' }); }
  var dk = 'ACCDAY_' + ymd_(new Date()), dn = +(props.getProperty(dk) || 0);
  if (dn >= 15) return json_({ ok: false, error: 'busy' });
  props.setProperty(dk, String(dn + 1));
  props.setProperty('ACC_' + id, JSON.stringify({ e: email, n: name, p: purpose, s: 'pending', t: Date.now() }));
  try {
    MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), name: MSG_SENDER, subject: 'Approval request: ' + email,
      body: name + ' (' + email + ') asks to use the website (' + purpose + '). Approve: ' + link_('acc_ok', id) + '\nDecline: ' + link_('acc_no', id),
      htmlBody: mail_('Approval request', 'Someone whose address is on the restricted list asks to use the website. No OTP was needed to send this request. If you approve, this exact address is added to the approved list on the Subscribers portal and can book an appointment or send a message without an OTP. You still confirm every appointment by email.', [['Name', esc_(name)], ['Email', esc_(email)], ['For', esc_(purpose)]],
        [['Approve', link_('acc_ok', id), '#1e8e4e'], ['Decline', link_('acc_no', id), '#c5221f'], ['Subscribers and requests', adminUrl_(), '#1f4e9c']], 'Approving allows only this exact address. You can remove it again from the Subscribers portal.') });
  } catch (x) { console.error('access mail failed: ' + x); return json_({ ok: false, error: 'mail' }); }
  return json_({ ok: true, status: 'pending' });
}
function accessDecide_(p) {
  var id = p.id || '';
  if (!id || sign_(p.action, id) !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var props = PropertiesService.getScriptProperties(), raw = props.getProperty('ACC_' + id);
  if (!raw) return page_('Not found', 'This request is no longer stored.', 'info');
  var r = JSON.parse(raw), ok = p.action === 'acc_ok';
  if (r.s !== 'pending') return page_('Already handled', 'This request was already ' + esc_(r.s) + '.', 'info');
  r.s = ok ? 'approved' : 'declined'; r.t = Date.now(); props.setProperty('ACC_' + id, JSON.stringify(r));
  if (ok) props.setProperty('ALLOW_' + id, '1'); else props.deleteProperty('ALLOW_' + id);
  if (ok) try {   /* a decline is silent: the person is not emailed */
    MailApp.sendEmail({ to: r.e, name: OWNER_NAME, replyTo: Session.getEffectiveUser().getEmail(), subject: 'Your request was approved',
      body: ok ? 'Hello ' + r.n + ', your request is approved. Go back to the website, enter this email address and press Send OTP; no code is needed for this address. You can then request an appointment, which I will confirm by email: ' + SITE_URL : 'Hello ' + r.n + ', your request for this email address was not approved. You are welcome to use a different email address.',
      htmlBody: ok ? mail_('Request approved', 'Hello ' + esc_(r.n) + ', your request is approved. Go back to the website, enter this email address and press Send OTP; no code is needed for this address. You can then request an appointment, which I will confirm by email.', [], [['Open the website', SITE_URL, '#1f4e9c']], 'Only this email address was approved.')
                   : mail_('About your request', 'Hello ' + esc_(r.n) + ', your request to use this email address on the website was not approved. You are welcome to use a different email address.', [], [], '') });
  } catch (x) { }
  return page_(ok ? 'Approved' : 'Declined', (ok ? esc_(r.e) + ' is now on the approved list and skips the OTP on the website. They were notified by email. You still confirm each appointment yourself.' : esc_(r.e) + ' was declined. They were not notified.'), ok ? 'ok' : 'info');
}
function accessRevoke_(p) {
  var id = p.id || '';
  if (!id || sign_(p.action, id) !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var props = PropertiesService.getScriptProperties(), raw = props.getProperty('ACC_' + id);
  if (!raw) return page_('Not found', 'This request is no longer stored.', 'info');
  var r = JSON.parse(raw); r.s = 'revoked'; r.t = Date.now(); props.setProperty('ACC_' + id, JSON.stringify(r)); props.deleteProperty('ALLOW_' + id);
  return page_('Removed', esc_(r.e) + ' was removed from the approved list. It needs a new approval before it can be used again.', 'ok');
}
/* ---- pending OTP verifications: someone asked for a subscription OTP but did not finish. The admin can approve them without the OTP. ---- */
var PEND_KEEP_DAYS = 30;
function pendGet_(id) { var raw = PropertiesService.getScriptProperties().getProperty('PEND_' + id); return raw ? JSON.parse(raw) : null; }
function pendAll_() {
  var props = PropertiesService.getScriptProperties(), all = props.getProperties(), out = [], cut = Date.now() - PEND_KEEP_DAYS * 86400000;
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('PEND_') !== 0) return;
    try {
      var r = JSON.parse(all[k]); r.id = k.slice(5);
      var cur = subGet_(r.id);
      if (r.l < cut || (cur && cur.s === 'active')) { props.deleteProperty(k); return; }
      out.push(r);
    } catch (err) { }
  });
  return out.sort(function (a, b) { return b.t - a.t; });
}
function approvePend(sig, id) {
  if (sign_('admin', 'subs') !== sig || !id) throw new Error('Not allowed');
  var props = PropertiesService.getScriptProperties(), r = pendGet_(id);
  if (!r) return false;
  var prev = subGet_(id), email = r.e;
  props.setProperty('SUB_' + id, JSON.stringify({ e: email, n: (prev && prev.n) || '', s: 'active', t: Date.now(), t0: (prev && (prev.t0 || prev.t)) || Date.now(), re: (prev && prev.re) || 0, ap: 1 }));
  props.deleteProperty('PEND_' + id);
  try {
    var un = nlUnsubUrl_(id);
    MailApp.sendEmail({ to: email, name: OWNER_NAME, replyTo: Session.getEffectiveUser().getEmail(), subject: 'Your subscription is approved',
      body: 'Hey, the Admin has noticed and approved your pending OTP verification. You are now subscribed to news and information from Anandu Prabhakaran.\n\nUnsubscribe at any time: ' + un + '\n\nThis email is sent from a custom domain developed and maintained by Anandu Prabhakaran.',
      htmlBody: mail_('You are approved', 'Hey, the Admin has noticed and approved your pending OTP verification. You are now subscribed to news and information from Anandu Prabhakaran.', [], [],
        'You are receiving this email because this address asked to subscribe on the website. <a href="' + un + '" style="color:#1f4e9c">Unsubscribe</a>') });
  } catch (err) { }
  return true;
}
/* Admin adds a subscriber by hand (name + email). They get a styled email with an Unsubscribe button. */
function addSub(sig, name, email) {
  if (sign_('admin', 'subs') !== sig) throw new Error('Not allowed');
  email = normEmail_(email); name = String(name || '').trim().slice(0, 80);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return { ok: false, error: 'invalid' };
  var props = PropertiesService.getScriptProperties(), id = subId_(email), prev = subGet_(id);
  if (prev && prev.s === 'ban') return { ok: false, error: 'banned' };
  if (prev && (prev.s === 'active' || prev.s === 'watch')) return { ok: false, error: 'exists' };   /* one record per address: no duplicates */
  props.setProperty('SUB_' + id, JSON.stringify({ e: email, n: name || (prev && prev.n) || '', s: 'active', t: Date.now(), t0: (prev && (prev.t0 || prev.t)) || Date.now(), re: prev && prev.s === 'unsub' ? (prev.re || 0) + 1 : (prev && prev.re) || 0, ad: 1 }));
  props.deleteProperty('PEND_' + id);
  var un = nlUnsubUrl_(id), sent = true;
  try {
    MailApp.sendEmail({ to: email, name: OWNER_NAME, replyTo: Session.getEffectiveUser().getEmail(), subject: 'You have been added to the newsletter',
      body: 'Hey' + (name ? ' ' + name : '') + ', you have been added to the newsletter subscribers by ' + OWNER_NAME + ' and you may be notified of further updates later. If there has been any issue, you may please unsubscribe using this link: ' + un + '\n\nThanks\n\nThis email is sent from a custom domain developed and maintained by Anandu Prabhakaran.',
      htmlBody: mail_('You have been added', 'Hey' + (name ? ' ' + esc_(name) : '') + ', you have been added to the newsletter subscribers by ' + OWNER_NAME + ' and you may be notified of further updates later.<br><br>If there has been any issue, you may please unsubscribe using the button below.<br><br>Thanks', [], [['Unsubscribe', un, '#c5221f']],
        'You are receiving this email because ' + OWNER_NAME + ' added this address to his newsletter. <a href="' + un + '" style="color:#1f4e9c">Unsubscribe</a>') });
  } catch (err) { sent = false; }
  return { ok: true, mailed: sent };
}
function dismissPend(sig, id) {
  if (sign_('admin', 'subs') !== sig || !id) throw new Error('Not allowed');
  PropertiesService.getScriptProperties().deleteProperty('PEND_' + id);
  return true;
}
/* Runs every day around 12:00. One email to the owner when someone has been waiting since an earlier day. */
function pendingCheck() {
  var startToday = new Date(Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'00:00:00+05:30")).getTime();
  var waiting = pendAll_().filter(function (r) { return r.t < startToday; });
  if (!waiting.length) return;
  var list = waiting.slice(0, 15).map(function (r) { return [esc_(r.e), 'asked ' + Utilities.formatDate(new Date(r.t), TZ, 'd MMM, HH:mm')]; });
  MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), name: MSG_SENDER, subject: waiting.length + ' pending OTP verification' + (waiting.length === 1 ? '' : 's') + ' waiting for you',
    body: waiting.length + ' people asked to subscribe but did not finish the OTP. Review and approve: ' + adminUrl_(),
    htmlBody: mail_('Pending OTP verifications', '<b>' + waiting.length + '</b> ' + (waiting.length === 1 ? 'person asked' : 'people asked') + ' to subscribe but did not finish the OTP. You can approve them without the OTP, or dismiss them, on the subscribers page.', list, [['Review pending', adminUrl_(), '#1f4e9c']], 'This reminder comes at most once a day, around 12:00, while someone is waiting.') });
}
function setupPendingCheck() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'pendingCheck') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('pendingCheck').timeBased().everyDays(1).atHour(12).inTimezone(TZ).create();
}

function adminPage_(p) {
  if (sign_('admin', 'subs') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var all = nlAll_(), subs = all.filter(function (r) { return r.s === 'active'; }).sort(function (a, b) { return b.t - a.t; }),
    watch = all.filter(function (r) { return r.s === 'watch'; }).sort(function (a, b) { return (b.w || 0) - (a.w || 0); }),
    bans = all.filter(function (r) { return r.s === 'ban'; }).sort(function (a, b) { return (b.b || 0) - (a.b || 0); }),
    unsubs = all.filter(function (r) { return r.s === 'unsub'; }).sort(function (a, b) { return (b.u || 0) - (a.u || 0); }),
    pends = pendAll_(), props = PropertiesService.getScriptProperties().getProperties(), reqs = [];
  Object.keys(props).forEach(function (k) { if (k.indexOf('ACC_') === 0 && k.indexOf('ACCDAY_') !== 0) { try { var r = JSON.parse(props[k]); r.id = k.slice(4); reqs.push(r); } catch (x) { } } });
  reqs.sort(function (a, b) { return b.t - a.t; });
  var fmt = function (t) { return Utilities.formatDate(new Date(t), TZ, 'd MMM yyyy, HH:mm'); };
  var th = 'text-align:left;padding:9px 10px;font-size:12px;color:var(--muted2);border-bottom:2px solid var(--line);white-space:nowrap', td = 'padding:10px;border-bottom:1px solid var(--soft);font-size:14px;vertical-align:middle';
  var pill = function (cls, to, id, label, col, warn) { return '<button class="' + cls + '"' + (warn ? ' data-self="1"' : '') + ' data-to="' + to + '" data-id="' + esc_(id) + '" style="border:1px solid ' + col[0] + ';background:var(--surface);color:' + col[1] + ';border-radius:999px;padding:5px 11px;font:inherit;font-size:12px;cursor:pointer;margin:2px 0 2px 5px;white-space:nowrap;line-height:1.2;height:auto;min-height:0;min-width:0;display:inline-block">' + label + '</button>'; };
  var RED = ['var(--redl)', 'var(--red)'], YEL = ['var(--warnl)', 'var(--warn)'], GRN = ['var(--greenl)', 'var(--green)'], BLU = ['var(--line2)', 'var(--a)'];
  var write = function (r) { return '<a href="' + link_('compose', 'new') + '&to=' + encodeURIComponent(r.e) + '" target="_top" style="color:var(--a);font-size:12px;font-weight:bold;text-decoration:none">Write</a>'; };
  var edit = function (r) { return pill('x-ed', '', r.id, 'Edit', BLU); };
  var tbl = function (id, head, rows, empty) { return '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr>' + head.map(function (h) { return '<th style="' + th + '">' + h + '</th>'; }).join('') + '</tr></thead><tbody id="' + id + '">' + (rows || '<tr><td colspan="' + head.length + '" style="' + td + ';color:var(--faint);text-align:center">' + empty + '</td></tr>') + '</tbody></table></div>'; };
  var row = function (r, i, when, acts) { return '<tr data-s="' + esc_((r.n + ' ' + r.e).toLowerCase()) + '" data-id="' + esc_(r.id) + '"><td style="' + td + ';color:var(--faint)">' + (i + 1) + '</td><td class="cn" style="' + td + '">' + esc_(r.n || '') + '</td><td class="ce" style="' + td + '">' + esc_(r.e) + '</td><td style="' + td + ';color:var(--muted2);white-space:nowrap">' + when + '</td><td class="ca" style="' + td + ';text-align:right">' + acts + '</td></tr>'; };
  var H = ['#', 'Name', 'Email', 'Subscribed', ''];
  var rows = subs.map(function (r, i) { return row(r, i, fmt(r.t0 || r.t), write(r) + edit(r) + pill('x-st', 'unsub', r.id, 'Unsubscribe', RED) + pill('x-st', 'watch', r.id, 'Yellow list', YEL) + pill('x-st', 'ban', r.id, 'Ban', RED)); }).join('');
  var wrows = watch.map(function (r, i) { return row(r, i, r.w ? fmt(r.w) : '', write(r) + edit(r) + pill('x-st', 'active', r.id, 'Back to normal', GRN) + pill('x-st', 'ban', r.id, 'Ban', RED)); }).join('');
  var brows = bans.map(function (r, i) { return row(r, i, r.b ? fmt(r.b) : '', write(r) + edit(r) + pill('x-st', 'unban', r.id, 'Unban', GRN) + pill('x-st', 'active', r.id, 'Move to subscribers', GRN) + pill('x-del', '', r.id, 'Delete data', RED)); }).join('');
  var BY = { self: 'Unsubscribed by themselves', admin: 'Removed by ' + OWNER_NAME.split(' ')[0], unban: 'Unbanned by ' + OWNER_NAME.split(' ')[0] };
  var urows = unsubs.map(function (r, i) { return row(r, i, (r.u ? fmt(r.u) : '') + '<br><span style="display:inline-block;margin-top:3px;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:bold;background:' + (r.by === 'self' ? 'var(--soft);color:var(--muted2)' : 'var(--tr);color:var(--red)') + '">' + (BY[r.by] || 'Unsubscribed') + '</span>', write(r) + edit(r) + pill('x-st', 'active', r.id, 'Move to subscribers', GRN, r.by === 'self') + pill('x-st', 'ban', r.id, 'Ban', RED) + pill('x-del', '', r.id, 'Delete data', RED)); }).join('');
  var prow = pends.map(function (r) { return '<tr data-s="' + esc_(r.e.toLowerCase()) + '"><td style="' + td + '">' + esc_(r.e) + '</td><td style="' + td + ';color:var(--muted2);white-space:nowrap">' + fmt(r.t) + '</td><td style="' + td + ';text-align:right;white-space:nowrap"><button class="x-ap" data-id="' + esc_(r.id) + '" style="border:1px solid var(--greenl);background:var(--surface);color:var(--green);border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;font-weight:bold;cursor:pointer;margin-right:8px">Approve</button><button class="x-dp" data-id="' + esc_(r.id) + '" style="border:1px solid var(--redl);background:var(--surface);color:var(--red);border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer">Dismiss</button></td></tr>'; }).join('');
  var rq = reqs.map(function (r) {
    var st = r.s === 'pending' ? '<a href="' + link_('acc_ok', r.id) + '" target="_top" style="color:var(--green);font-weight:bold;text-decoration:none">Approve</a> &nbsp; <a href="' + link_('acc_no', r.id) + '" target="_top" style="color:var(--red);font-weight:bold;text-decoration:none">Decline</a>' : (r.s === 'approved' ? '<span style="color:var(--green);font-weight:bold">Approved, no OTP needed</span> &nbsp; <a href="' + link_('acc_rv', r.id) + '" target="_top" style="color:var(--red);font-weight:bold;text-decoration:none">Remove</a>' : '<span style="color:var(--muted2)">' + esc_(r.s) + '</span>');
    return '<tr><td style="' + td + '">' + esc_(r.n) + '</td><td style="' + td + '">' + esc_(r.e) + '</td><td style="' + td + '">' + esc_(r.p) + '</td><td style="' + td + ';white-space:nowrap">' + fmt(r.t) + '</td><td style="' + td + '">' + st + '</td></tr>';
  }).join('');
  var data = JSON.stringify(all.filter(function (r) { return r.s !== 'pending'; }).map(function (r) { return [r.n || '', r.e, fmt(r.t0 || r.t), { active: 'Subscribed', watch: 'Yellow list', ban: 'Banned', unsub: 'Unsubscribed' }[r.s] || r.s]; })).replace(/</g, '\\x3c');
  var h2 = function (t, d) { return '<h2 style="font-size:17px;margin:30px 0 8px">' + t + '</h2>' + (d ? '<p class="sub" style="margin:0 0 10px">' + d + '</p>' : ''); };
  var pendN = reqs.filter(function (r) { return r.s === 'pending'; }).length;
  var inner = '<div class="chips"><span class="chip"><b>' + subs.length + '</b> subscriber' + (subs.length === 1 ? '' : 's') + '</span><span class="chip"><b>' + watch.length + '</b> yellow-listed</span><span class="chip"><b>' + bans.length + '</b> banned</span><span class="chip"><b>' + unsubs.length + '</b> unsubscribed</span><span class="chip"><b>' + pends.length + '</b> pending OTP</span><span class="chip"><b>' + pendN + '</b> pending request' + (pendN === 1 ? '' : 's') + '</span></div>'
    + '<details style="margin:0 0 14px;border:1.5px solid var(--line2);border-radius:12px;padding:12px 14px;background:var(--soft2)"><summary style="cursor:pointer;font-weight:bold;color:var(--a)">Add a subscriber</summary><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;align-items:center"><input id="an" class="tx" placeholder="Name" maxlength="80" style="flex:1;min-width:160px;width:auto"><input id="ae" class="tx" type="email" placeholder="Email address" style="flex:1.4;min-width:200px;width:auto"><button id="ab" class="b blue auto" style="padding:11px 20px">Add subscriber</button></div><p class="hint" style="margin:8px 0 0">They receive an email saying you added them, with an Unsubscribe button.</p></details>'
    + '<div style="display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px"><input id="q" class="tx" placeholder="Search name or email in every list" style="flex:1;min-width:200px;width:auto"><button id="cp" class="b blue auto" style="padding:11px 20px">Copy subscriber emails</button><button id="dl" class="b blue auto" style="padding:11px 20px">Download CSV</button><a class="b blue auto" style="text-decoration:none;padding:11px 20px" target="_top" href="' + link_('compose', 'new') + '">Write to subscribers</a></div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px;align-items:center"><button id="rm15" class="b blue auto" style="padding:9px 18px;font-size:13px">Turn on reminders</button><button id="rmt" class="b blue auto" style="padding:9px 18px;font-size:13px;background:var(--surface);color:var(--text);border:2px solid var(--muted)">Send a test reminder now</button><span class="hint">A reminder email comes to you on the 15th of every month, and around 12:00 on days when someone is waiting for OTP approval.</span></div>'
    + tbl('tb', H, rows, 'No subscribers yet.')
    + h2('Yellow list', 'People you are keeping an eye on. They stay out of the newsletter. You can write to them separately (choose "Yellow-listed" in the editor), bring them back to normal, or ban them.') + tbl('wb', ['#', 'Name', 'Email', 'Yellow-listed', ''], wrows, 'Nobody is on the yellow list.')
    + h2('Banned', 'Banned people cannot subscribe again. They see "Unfortunately, you cannot subscribe here." Unban lets them subscribe again if they choose to.') + tbl('bb', ['#', 'Name', 'Email', 'Banned', ''], brows, 'Nobody is banned.')
    + h2('Pending OTP verification', 'People who asked for a subscription code but did not enter it. Approve to subscribe them without the OTP (they get a confirmation email with an unsubscribe link), or dismiss. You get one reminder email a day around 12:00 while someone is waiting.')
    + tbl('pb', ['Email', 'Asked', ''], prow, 'Nobody is waiting.')
    + h2('Unsubscribed', 'People who unsubscribed. Their name and email are kept here (one record per address, so there are no duplicates) and they do not receive newsletters. You can still write to one of them individually.') + tbl('ub', ['#', 'Name', 'Email', 'Unsubscribed (and who did it)', ''], urows, 'Nobody has unsubscribed.')
    + h2('Approval requests', 'People whose address is on the restricted list (director, dean, HOD and similar) can ask here without an OTP. Approving adds that exact address to the approved list below: it skips the OTP, and you still confirm every appointment by email. Remove an address to take that away. A decline is silent: they are not emailed.')
    + '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr><th style="' + th + '">Name</th><th style="' + th + '">Email</th><th style="' + th + '">For</th><th style="' + th + '">Asked</th><th style="' + th + '">Status</th></tr></thead><tbody>' + (rq || '<tr><td colspan="5" style="' + td + ';color:var(--faint);text-align:center">No requests.</td></tr>') + '</tbody></table></div><div id="m" class="msg"></div>'
    + '<script>(function(){var D=' + data + ',SIG=' + JSON.stringify(p.sig) + ',ADM=' + JSON.stringify(adminUrl_()) + ',m=document.getElementById("m"),G=google.script.run;'
    + 'function bad(t){m.className="msg bad";m.textContent=t||"That did not work. Try again.";}function reload(){window.open(ADM,"_top");}'
    + 'document.getElementById("q").oninput=function(){var v=this.value.toLowerCase();var r=document.querySelectorAll("tr[data-s]");for(var i=0;i<r.length;i++)r[i].style.display=r[i].getAttribute("data-s").indexOf(v)<0?"none":"";};'
    + 'document.getElementById("cp").onclick=function(){var t=D.filter(function(x){return x[3]==="Subscribed";}).map(function(x){return x[1];}).join(", "),b=this;var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");b.textContent="Copied";}catch(e){b.textContent="Copy failed";}document.body.removeChild(ta);setTimeout(function(){b.textContent="Copy subscriber emails";},1600);};'
    + 'document.getElementById("dl").onclick=function(){var q=function(s){return "\\""+String(s).replace(/"/g,"\\"\\"")+"\\"";};var c="Name,Email,Subscribed on,Status\\n"+D.map(function(x){return x.map(q).join(",");}).join("\\n");var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([c],{type:"text/csv"}));a.download="subscribers.csv";document.body.appendChild(a);a.click();document.body.removeChild(a);};'
    + 'function act(id,fn,ok){document.getElementById(id).onclick=function(){var b=this,t=b.textContent;b.disabled=true;G.withSuccessHandler(function(){b.disabled=false;b.textContent=ok;setTimeout(function(){b.textContent=t;},2200);}).withFailureHandler(function(){b.disabled=false;bad();})[fn](SIG);};}act("rm15","enableReminder","Reminders are on");act("rmt","testReminder","Test sent");'
    + 'document.getElementById("ab").onclick=function(){var b=this,n=document.getElementById("an"),e=document.getElementById("ae");if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(e.value.trim())){bad("Enter a valid email address.");return;}b.disabled=true;G.withSuccessHandler(function(r){b.disabled=false;if(r&&r.ok){m.className="msg";m.textContent="Added"+(r.mailed?" and emailed.":", but the email could not be sent.");n.value="";e.value="";setTimeout(reload,1200);}else bad(r&&r.error==="exists"?"That email is already subscribed.":r&&r.error==="banned"?"That person is banned. Unban them first.":"Enter a valid email address.");}).withFailureHandler(function(){b.disabled=false;bad();}).addSub(SIG,n.value,e.value);};'
    + 'document.getElementById("pb").onclick=function(e){var b=e.target.closest(".x-ap,.x-dp");if(!b)return;var ap=b.className==="x-ap";if(ap&&!confirm("Subscribe this person without the OTP and email them?"))return;b.disabled=true;G.withSuccessHandler(function(){reload();}).withFailureHandler(function(){b.disabled=false;bad();})[ap?"approvePend":"dismissPend"](SIG,b.getAttribute("data-id"));};'
    + 'var TXT={unsub:"Unsubscribe this person? Their details stay in the Unsubscribed list.",watch:"Move this person to the Yellow list? They will stop receiving the newsletter.",ban:"Ban this person? They will not be able to subscribe again until you unban them.",active:"Move this person to the normal subscribers list? They will receive the newsletter again.",unban:"Unban this person? They can subscribe again if they choose to."};'
    + 'document.body.addEventListener("click",function(e){'
    + 'var b=e.target.closest(".x-st");if(b){var to=b.getAttribute("data-to");if(!confirm(to==="active"&&b.getAttribute("data-self")?"This person unsubscribed themselves. Move them back to subscribers anyway? They will receive the newsletter again.":TXT[to]))return;b.disabled=true;G.withSuccessHandler(reload).withFailureHandler(function(){b.disabled=false;bad();}).setSub(SIG,b.getAttribute("data-id"),to);return;}'
    + 'b=e.target.closest(".x-del");if(b){if(!confirm("Delete this person\'s saved name and email permanently?"))return;b.disabled=true;G.withSuccessHandler(reload).withFailureHandler(function(){b.disabled=false;bad();}).deleteSub(SIG,b.getAttribute("data-id"));return;}'
    + 'b=e.target.closest(".x-ed");if(b){var tr=b.closest("tr"),cn=tr.querySelector(".cn"),ce=tr.querySelector(".ce"),ca=tr.querySelector(".ca"),old=[cn.textContent,ce.textContent,ca.innerHTML];cn.innerHTML="<input class=\\"tx\\" style=\\"min-width:120px\\">";ce.innerHTML="<input class=\\"tx\\" type=\\"email\\" style=\\"min-width:180px\\">";cn.firstChild.value=old[0];ce.firstChild.value=old[1];ca.innerHTML="<button class=\\"x-sv\\" style=\\"border:1px solid var(--greenl);background:var(--surface);color:var(--green);border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;font-weight:bold;cursor:pointer\\">Save</button><button class=\\"x-cx\\" style=\\"border:1px solid var(--line2);background:var(--surface);color:var(--muted2);border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer;margin-left:6px\\">Cancel</button>";tr._old=old;return;}'
    + 'b=e.target.closest(".x-cx");if(b){var t2=b.closest("tr");t2.querySelector(".cn").textContent=t2._old[0];t2.querySelector(".ce").textContent=t2._old[1];t2.querySelector(".ca").innerHTML=t2._old[2];return;}'
    + 'b=e.target.closest(".x-sv");if(b){var t3=b.closest("tr"),nm=t3.querySelector(".cn input").value,em=t3.querySelector(".ce input").value;if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(em.trim())){bad("Enter a valid email address.");return;}b.disabled=true;G.withSuccessHandler(function(r){if(r&&r.ok)reload();else{b.disabled=false;bad(r&&r.error==="exists"?"Another subscriber already uses that email.":"Enter a valid email address.");}}).withFailureHandler(function(){b.disabled=false;bad();}).editSub(SIG,t3.getAttribute("data-id"),nm,em);}'
    + '});'
    + '})();<\/script>';
  return out_(shell_('Subscribers', 'Everyone who verified their email and subscribed to news and information, plus the yellow, banned and unsubscribed lists. Newest first.', inner, true), 'Subscribers');
}
// Called from the subscribers page.
function setSub(sig, id, to) {   /* status changes from the subscribers page; the record is always kept */
  if (sign_('admin', 'subs') !== sig || !id) throw new Error('Not allowed');
  var props = PropertiesService.getScriptProperties(), cu = subGet_(id), now = Date.now();
  if (!cu) throw new Error('Not found');
  var ok = { unsub: ['active', 'watch'], watch: ['active'], ban: ['active', 'watch', 'unsub'], active: ['watch', 'ban', 'unsub'], unban: ['ban'] };
  if (!ok[to] || ok[to].indexOf(cu.s) < 0) throw new Error('Not allowed');
  if (to === 'unsub') { cu.s = 'unsub'; cu.u = now; cu.by = 'admin'; }
  else if (to === 'watch') { cu.s = 'watch'; cu.w = now; }
  else if (to === 'ban') { cu.s = 'ban'; cu.b = now; }
  else if (to === 'active') { cu.s = 'active'; delete cu.w; delete cu.b; delete cu.u; delete cu.by; }
  else if (to === 'unban') { cu.s = 'unsub'; cu.u = now; cu.by = 'unban'; delete cu.b; }
  props.setProperty('SUB_' + id, JSON.stringify(cu));
  return true;
}
function editSub(sig, id, name, email) {
  if (sign_('admin', 'subs') !== sig || !id) throw new Error('Not allowed');
  var props = PropertiesService.getScriptProperties(), cu = subGet_(id);
  if (!cu) throw new Error('Not found');
  email = normEmail_(email); name = String(name || '').trim().slice(0, 80);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return { ok: false, error: 'invalid' };
  var nid = subId_(email);
  if (nid !== id) {
    if (subGet_(nid)) return { ok: false, error: 'exists' };   /* one record per address */
    props.deleteProperty('SUB_' + id);
  }
  cu.e = email; cu.n = name;
  props.setProperty('SUB_' + nid, JSON.stringify(cu));
  return { ok: true };
}
function deleteSub(sig, id) {
  if (sign_('admin', 'subs') !== sig || !id) throw new Error('Not allowed');
  var cu = subGet_(id);
  if (cu && (cu.s === 'unsub' || cu.s === 'ban')) PropertiesService.getScriptProperties().deleteProperty('SUB_' + id);
  return true;
}

/* ---- monthly reminder: an email on the 15th of every month (time-driven trigger; run setupMonthlyReminder once, or press the button on the subscribers page) ---- */
function reminderMail_() {
  var n = nlActive_().length, last = +(PropertiesService.getScriptProperties().getProperty('LASTNEWS') || 0);
  var lastTxt = last ? Utilities.formatDate(new Date(last), TZ, 'd MMMM yyyy') : 'No newsletter sent yet';
  MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), name: MSG_SENDER, subject: 'Your newsletter subscribers are waiting',
    body: 'It is the 15th. ' + n + ' subscriber' + (n === 1 ? ' is' : 's are') + ' waiting to hear from you.\nWrite the newsletter: ' + link_('compose', 'new') + '\nView subscribers: ' + adminUrl_(),
    htmlBody: mail_('Newsletter day', 'It is the 15th. Your <b>' + n + '</b> subscriber' + (n === 1 ? ' is' : 's are') + ' waiting to hear from you. A short update with news, a new paper or an event keeps them engaged. In the editor you can add buttons that send readers to book an appointment or to message you.',
      [['Subscribers', String(n)], ['Last newsletter', esc_(lastTxt)]], [['Write the newsletter', link_('compose', 'new'), '#1f4e9c'], ['View subscribers', adminUrl_(), '#1e8e4e']], 'This reminder arrives on the 15th of every month.') });
}
function monthlyReminder() { reminderMail_(); }
function setupMonthlyReminder() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'monthlyReminder') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('monthlyReminder').timeBased().onMonthDay(15).atHour(9).inTimezone(TZ).create();
  setupPendingCheck();
  try { setupVisitCleanup(); } catch (x) { }
}
// Called from the subscribers page.
function enableReminder(sig) { if (sign_('admin', 'subs') !== sig) throw new Error('Not allowed'); setupMonthlyReminder(); return true; }
function testReminder(sig) { if (sign_('admin', 'subs') !== sig) throw new Error('Not allowed'); reminderMail_(); return true; }

/* ---- visitors: only the country, the tab and the time are stored (no IP address, no personal data) ----
   Every page view is appended to a Google Sheet that the script creates in your Drive ("Website visits log"). Indian visits are
   logged but never emailed. Once a day (about 19:00 IST) the script checks for countries outside India visiting for the first time;
   only then does it send ONE email (see visitSummary_). A daily trigger moves these emails to the Trash after 30 days. The Visitors portal shows minutes, hours, days, weeks, months, years and
   any custom range. (Gmail and Sheets permission is asked once when you press "Turn on reminders".) */
var VISIT_MAIL = true, VISIT_MAIL_DAYS = 30, HOME_CC = 'IN', SUMMARY_HOUR = 19;
var TABS_ = { index: 'Home', home: 'Home', about: 'About me', research: 'Research', publications: 'Publications', workshops: 'Workshops', gallery: 'Gallery', contact: 'Contact' };
var LANG_ = { en: 'English', ml: 'Malayalam', hi: 'Hindi', ar: 'Arabic', zh: 'Chinese', fr: 'French', de: 'German', ja: 'Japanese', pt: 'Portuguese', es: 'Spanish', sv: 'Swedish' };
function visUrl_() { return portalBase_() + '?action=visitors&sig=' + sign_('admin', 'visitors'); }
function visSheet_() {
  var sp = PropertiesService.getScriptProperties(), id = sp.getProperty('VISSHEET'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (x) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('Website visits log (written by the website script)');
    ss.getSheets()[0].appendRow(['Time (ms)', 'Country code', 'Country', 'Tab', 'New visitor (1 = first page of a session)', 'Language', 'Date and time (IST)']);
    sp.setProperty('VISSHEET', ss.getId());
  }
  var sh0 = ss.getSheets()[0];
  if (sh0.getRange(1, 12).getValue() === '') sh0.getRange(1, 8, 1, 5).setValues([['Seconds on the tab (rows where Event = x)', 'Event (blank = tab opened, x = tab left or closed)', 'Session id (random, no personal data)', 'Idle seconds (tab left open, no activity)', 'Indian state (approximate, India only)']]);
  return sh0;
}
/* rows with from <= time < to, oldest first. Rows are appended in time order, so read from the bottom. */
function visRows_(from, to) {
  var sh = visSheet_(), last = sh.getLastRow(), out = [];
  if (last < 2) return out;
  var end = last;
  while (end >= 2) {
    var start = Math.max(2, end - 4999), v = sh.getRange(start, 1, end - start + 1, 12).getValues(), stop = false;
    for (var j = v.length - 1; j >= 0; j--) { var t = +v[j][0]; if (t < from) { stop = true; break; } if (t < to) out.push({ t: t, cc: String(v[j][1]), n: String(v[j][2]), tab: String(v[j][3]), f: +v[j][4] === 1, l: String(v[j][5]), s: +v[j][7] || 0, x: String(v[j][8]) === 'x', sid: String(v[j][9] || ''), i: +v[j][10] || 0, g: String(v[j][11] || '') }); }
    if (stop) break; end = start - 1;
  }
  return out.reverse();
}
/* Indian states and union territories. Only these exact names are stored, so nothing else can enter the sheet through the region field. */
var IN_STATES_ = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];
var IN_ALIAS_ = { 'orissa': 'Odisha', 'pondicherry': 'Puducherry', 'nct of delhi': 'Delhi', 'national capital territory of delhi': 'Delhi', 'new delhi': 'Delhi', 'andaman and nicobar': 'Andaman and Nicobar Islands', 'andaman & nicobar islands': 'Andaman and Nicobar Islands', 'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu', 'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu', 'jammu & kashmir': 'Jammu and Kashmir', 'uttaranchal': 'Uttarakhand' };
function stateOf_(cc, raw) {
  if (cc !== HOME_CC) return '';
  var k = String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!k || k.length > 60) return '';
  if (IN_ALIAS_[k]) return IN_ALIAS_[k];
  for (var i = 0; i < IN_STATES_.length; i++) if (IN_STATES_[i].toLowerCase() === k) return IN_STATES_[i];
  return '';
}
function leave_(p) {
  var cc = String(p.cc || '').toUpperCase(), secs = Math.round(+p.secs);
  if (!/^[A-Z]{2}$/.test(cc) || !(secs >= 1)) return json_({ ok: false });
  secs = Math.min(secs, 21600); var idl = Math.max(0, Math.min(Math.round(+p.idle) || 0, secs)); var sid = /^[a-f0-9]{12}$/.test(String(p.sid || '')) ? String(p.sid) : '';
  var nm = String(p.name || '').trim(); if (!/^[A-Za-z .,'()\-]{2,45}$/.test(nm)) nm = cc;
  var tab = TABS_[String(p.page || '').toLowerCase()] || 'Home', now = Date.now();
  visSheet_().appendRow([now, cc, nm, tab, 0, '', Utilities.formatDate(new Date(now), TZ, 'yyyy-MM-dd HH:mm:ss'), secs, 'x', sid, idl || '', stateOf_(cc, p.rg)]);
  return json_({ ok: true });
}
function visit_(p) {
  var cc = String(p.cc || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return json_({ ok: false });
  var nm = String(p.name || '').trim();
  if (!/^[A-Za-z .,'()\-]{2,45}$/.test(nm)) nm = cc;
  var tab = TABS_[String(p.page || '').toLowerCase()] || 'Home', lang = LANG_[String(p.lang || '').toLowerCase()] || 'English', first = p.first === true, now = Date.now(), sid = /^[a-f0-9]{12}$/.test(String(p.sid || '')) ? String(p.sid) : '';
  visSheet_().appendRow([now, cc, nm, tab, first ? 1 : 0, lang, Utilities.formatDate(new Date(now), TZ, 'yyyy-MM-dd HH:mm:ss'), '', '', sid, '', stateOf_(cc, p.rg)]);
  return json_({ ok: true });
}
/* New-country email (checked once a day at about 19:00 IST). An email goes out ONLY when a country outside India visits for the
   first time ever. It then lists the new countries, visits from countries already seen before, and Indian visits by state, all since
   the last email, with one link: the Visitors portal. A country that has visited before never triggers an email again. */
var VIS_LINK_ = 'https://anandu-prabhakaran.pages.dev/visitors';
function visKnown_(sp, now) {
  var k = sp.getProperty('VISKNOWN');
  if (k) return JSON.parse(k);
  /* first run: every country already in the log counts as known, so only genuinely new countries trigger an email */
  var seen = {}; visRows_(0, now + 1).forEach(function (r) { if (r.cc !== HOME_CC) seen[r.cc] = 1; });
  return Object.keys(seen);
}
function visitSummary_(force) {
  var sp = PropertiesService.getScriptProperties(), now = Date.now(), last = +(sp.getProperty('VISLASTMAIL') || 0), chk = +(sp.getProperty('VISLASTCHECK') || 0);
  var known = visKnown_(sp, now), knownSet = {}; known.forEach(function (c) { knownSet[c] = 1; });
  if (!sp.getProperty('VISKNOWN')) { sp.setProperty('VISKNOWN', JSON.stringify(known)); if (!chk) { sp.setProperty('VISLASTCHECK', String(now)); if (!force) return false; } }
  /* new countries since the last daily check */
  var fresh = {}, freshOrder = [];
  visRows_(chk, now + 1).forEach(function (r) { if (r.x || r.cc === HOME_CC || knownSet[r.cc] || fresh[r.cc]) return; fresh[r.cc] = r.n; freshOrder.push(r.cc); });
  freshOrder.forEach(function (c) { known.push(c); });
  sp.setProperty('VISKNOWN', JSON.stringify(known)); sp.setProperty('VISLASTCHECK', String(now));
  /* no new country: still send a summary once 30 days have passed since the last email */
  var monthly = !freshOrder.length && last && now - last >= VISIT_MAIL_DAYS * 86400000;
  if (!freshOrder.length && !force && !monthly) return false;
  /* everything since the last email */
  var rows = visRows_(last, now + 1), others = {}, order = [], inN = 0, st = {}, stOrder = [];
  rows.forEach(function (r) {
    if (r.x) return;
    if (r.cc === HOME_CC) { if (r.f) { inN++; var g = r.g || 'State not known'; if (!st[g]) { st[g] = 0; stOrder.push(g); } st[g]++; } return; }
    var o = others[r.cc]; if (!o) { o = others[r.cc] = { n: r.n, v: 0, tabs: {} }; order.push(r.cc); }
    if (r.f) o.v++; o.tabs[r.tab] = (o.tabs[r.tab] || 0) + 1;
  });
  var line = function (c) { var o = others[c] || { n: fresh[c], v: 0, tabs: {} }, tabs = Object.keys(o.tabs).map(function (k) { return k + ' ' + o.tabs[k]; }).join(', '); return [o.n, o.v + (o.v === 1 ? ' visitor' : ' visitors') + (tabs ? ' (tabs: ' + tabs + ')' : '')]; };
  var since = last ? Utilities.formatDate(new Date(last), TZ, 'd MMM yyyy, HH:mm') + ' IST' : 'the start of the log';
  var rowsH = [['Period', esc_('Since ' + since)]], plain = '';
  var newNames = freshOrder.map(function (c) { return fresh[c]; });
  plain += (freshOrder.length ? 'New countr' + (freshOrder.length === 1 ? 'y' : 'ies') + ' visiting your website for the first time: ' + newNames.join(', ') : monthly ? 'Website visitors summary since the last email (no new country in ' + VISIT_MAIL_DAYS + ' days)' : 'Test email: no new country since the last check') + '\nPeriod: since ' + since + '\n\n';
  freshOrder.forEach(function (c) { var l = line(c); rowsH.push(['New: ' + esc_(l[0]), esc_(l[1])]); plain += 'NEW ' + l[0] + ': ' + l[1] + '\n'; });
  var prev = order.filter(function (c) { return !fresh[c]; });
  if (prev.length) { plain += '\nOther countries (visited before):\n'; prev.forEach(function (c) { var l = line(c); rowsH.push([esc_(l[0]), esc_(l[1])]); plain += ' - ' + l[0] + ': ' + l[1] + '\n'; }); }
  else rowsH.push(['Other countries', 'No visits from countries seen before']);
  stOrder.sort(function (a, b) { return st[b] - st[a]; });
  rowsH.push(['India, all states', inN + (inN === 1 ? ' visitor' : ' visitors')]); plain += '\nIndia: ' + inN + ' visitors\n';
  stOrder.forEach(function (g) { rowsH.push(['India: ' + esc_(g), String(st[g])]); plain += ' - ' + g + ': ' + st[g] + '\n'; });
  plain += '\nVisitors portal: ' + VIS_LINK_ + '\n\n' + VISIT_MARK_ + ' ' + VISIT_MAIL_DAYS + ' days.';
  MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), name: MSG_SENDER,
    subject: freshOrder.length ? '[Site visit] New countr' + (freshOrder.length === 1 ? 'y' : 'ies') + ': ' + newNames.join(', ') : monthly ? '[Site visit] Website visitors summary since the last email' : '[Site visit] Test', body: plain,
    htmlBody: mail_(freshOrder.length ? 'New country on your website' : 'Website visitors summary since the last email', freshOrder.length ? 'First visit ever from ' + esc_(newNames.join(', ')) + '. Below: all visits since the last email, including countries seen before and Indian states.' : monthly ? 'No new country in the last ' + VISIT_MAIL_DAYS + ' days. Here are all visits since the last email, by country and by Indian state.' : 'Test email. No new country since the last check.', rowsH,
      [['Open the Visitors portal', VIS_LINK_, '#1f4e9c']],
      'Only the country, the Indian state and the tab are counted. No IP address or personal data is stored. You get this email when a country outside India visits for the first time, or as a summary after ' + VISIT_MAIL_DAYS + ' days without one. ' + VISIT_MARK_ + ' ' + VISIT_MAIL_DAYS + ' days.') });
  sp.setProperty('VISLASTMAIL', String(now));
  return true;
}
/* the daily check runs at about SUMMARY_HOUR (IST). If its trigger still fires at an old hour, it moves itself to the new hour and skips that run. */
function dailyVisitSummary() {
  var h = +Utilities.formatDate(new Date(), TZ, 'H');
  if (h < SUMMARY_HOUR || h > SUMMARY_HOUR + 1) { setupVisitCleanup(); if (VISIT_MAIL && !PropertiesService.getScriptProperties().getProperty('VISKNOWN')) visitSummary_(false); return; }
  if (VISIT_MAIL) visitSummary_(false);
}
function testVisitSummary() { visitSummary_(true); }
/* Moves only this script's own visit emails to the Trash after VISIT_MAIL_DAYS. A thread is touched only when ALL of these hold:
   it is in Sent, it is older than the limit, it holds a single message, the sender name is MSG_SENDER, the subject starts with "[Site visit] "
   and the body carries the script's own footer sentence. Every other email is left alone. */
var VISIT_MARK_ = 'This email is moved to the Trash after';
function cleanVisitMails() {
  try { cleanOtpMails_(); } catch (x) { console.error('otp clean failed: ' + x); }
  GmailApp.search('from:me subject:"[Site visit]" older_than:' + VISIT_MAIL_DAYS + 'd -in:trash', 0, 100).forEach(function (t) {
    var ms = t.getMessages();
    if (ms.length !== 1) return;
    var m = ms[0];
    if (m.getSubject().indexOf('[Site visit] ') !== 0) return;
    if (String(m.getFrom()).indexOf(MSG_SENDER) < 0) return;
    if (m.getPlainBody().indexOf(VISIT_MARK_) < 0) return;
    t.moveToTrash();
  });
}
/* Same rule for the OTP emails: only this script's own "Your verification code" mails are moved to the Trash, after OTP_MAIL_DAYS (2 months). Nothing else is touched. */
var OTP_MAIL_DAYS = 60;
function cleanOtpMails_() {
  GmailApp.search('in:sent from:me subject:"Your verification code" older_than:' + OTP_MAIL_DAYS + 'd', 0, 100).forEach(function (t) {
    var ms = t.getMessages();
    if (ms.length !== 1) return;
    var m = ms[0];
    if (m.getSubject() !== 'Your verification code') return;
    if (String(m.getFrom()).indexOf(MSG_SENDER) < 0) return;
    var b = m.getPlainBody();
    if (b.indexOf('Your OTP is ') !== 0 || b.indexOf('This is system generated mail and do not respond here.') < 0 || b.indexOf('custom domain developed and maintained by') < 0) return;
    t.moveToTrash();
  });
}
function setupVisitCleanup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { var f = t.getHandlerFunction(); if (f === 'cleanVisitMails' || f === 'dailyVisitSummary') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('cleanVisitMails').timeBased().everyDays(1).atHour(3).inTimezone(TZ).create();
  ScriptApp.newTrigger('dailyVisitSummary').timeBased().everyDays(1).atHour(SUMMARY_HOUR).inTimezone(TZ).create();
}
var BKT_ = { minute: ['yyyyMMddHHmm', 'd MMM, HH:mm'], hour: ['yyyyMMddHH', 'd MMM, HH:00'], day: ['yyyyMMdd', 'EEE, d MMM yyyy'], week: ['yyyyMMdd', "'Week of' d MMM yyyy"], month: ['yyyyMM', 'MMMM yyyy'], year: ['yyyy', 'yyyy'] };
/* group rows into visitor sessions: the tabs opened, in order, and the seconds spent on each */
function buildSessions_(rows) {
  var by = {}, order = [];
  rows.forEach(function (r) {
    var k = r.sid || ('o' + r.t + r.cc), s = by[k];
    if (!s) { s = by[k] = { cc: r.cc, n: r.n, g: '', t0: r.t, t1: r.t, steps: [], f: false }; order.push(k); }
    if (r.g) s.g = r.g;
    if (r.t > s.t1) s.t1 = r.t;
    if (r.x) {
      for (var i = s.steps.length - 1; i >= 0; i--) if (s.steps[i].tab === r.tab) { s.steps[i].s += r.s; s.steps[i].i += r.i; return; }
      s.steps.push({ tab: r.tab, t: r.t - r.s * 1000, s: r.s, i: r.i }); if (r.t - r.s * 1000 < s.t0) s.t0 = r.t - r.s * 1000;
    } else { s.steps.push({ tab: r.tab, t: r.t, s: 0, i: 0 }); if (r.f) s.f = true; }
  });
  return order.map(function (k) { return by[k]; }).sort(function (a, b) { return b.t0 - a.t0; }).slice(0, 60).map(function (s) {
    var tot = 0; s.steps.sort(function (a, b) { return a.t - b.t; });
    return { cc: s.cc, n: s.n, g: s.g, w: Utilities.formatDate(new Date(s.t0), TZ, 'd MMM yyyy, HH:mm:ss'), f: s.f, steps: s.steps.map(function (st) { var a = Math.max(0, st.s - st.i); tot += a; return { tab: st.tab, w: Utilities.formatDate(new Date(st.t), TZ, 'HH:mm:ss'), s: a, i: st.i, g: st.tab === 'Gallery' }; }), total: tot };
  });
}
function visitData(sig, from, to, bucket) {
  if (sign_('admin', 'visitors') !== sig) throw new Error('Not allowed');
  from = +from; to = +to; if (!BKT_[bucket]) bucket = 'day';
  var spanMs = { minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6 }[bucket];
  if ((to - from) / spanMs > 1500) throw new Error('Too many rows for this unit. Choose a larger unit or a shorter range.');
  var rows = visRows_(from, to), map = {}, keys = [], tc = {}, tt = {}, cm = {}, ts = {}, sc = {}, vis = 0, ind = 0, views = 0;
  rows.forEach(function (r) {
    if (r.x) { ts[r.tab] = (ts[r.tab] || 0) + Math.max(0, r.s - r.i); return; }
    views++;
    var t = r.t; if (bucket === 'week') t = r.t - (+Utilities.formatDate(new Date(r.t), TZ, 'u') - 1) * 864e5;
    var key = Utilities.formatDate(new Date(t), TZ, BKT_[bucket][0]), b = map[key];
    if (!b) { b = map[key] = { k: key, label: (bucket === 'week' ? Utilities.formatDate(new Date(t), TZ, BKT_[bucket][1]) : Utilities.formatDate(new Date(r.t), TZ, BKT_[bucket][1])), v: 0, i: 0, o: 0, c: {}, t: {}, w: 0 }; keys.push(key); }
    b.w++; b.t[r.tab] = (b.t[r.tab] || 0) + 1; tt[r.tab] = (tt[r.tab] || 0) + 1;
    if (r.f) { if (r.g) sc[r.g] = (sc[r.g] || 0) + 1; b.v++; vis++; if (r.cc === HOME_CC) { b.i++; ind++; } else b.o++; cm[r.n] = r.cc; var c = b.c[r.n] = (b.c[r.n] || 0) + 1; tc[r.n] = (tc[r.n] || 0) + 1; }
  });
  /* fill empty periods with zeros so the line chart has no gaps (IST has no daylight saving) */
  var stepMs = { minute: 6e4, hour: 36e5, day: 864e5, week: 864e5, month: 2419200000, year: 2419200000 }[bucket], guard = 0;
  for (var ft = from; ft <= to && guard < 4000; ft += stepMs, guard++) {
    var fb = ft; if (bucket === 'week') fb = ft - (+Utilities.formatDate(new Date(ft), TZ, 'u') - 1) * 864e5;
    var fk = Utilities.formatDate(new Date(fb), TZ, BKT_[bucket][0]);
    if (!map[fk]) { map[fk] = { k: fk, label: Utilities.formatDate(new Date(fb), TZ, BKT_[bucket][1]), v: 0, i: 0, o: 0, c: {}, t: {}, w: 0 }; keys.push(fk); }
  }
  keys.sort();
  var log = rows.slice(-400).reverse().map(function (r) { return { w: Utilities.formatDate(new Date(r.t), TZ, 'd MMM yyyy, HH:mm:ss'), cc: r.cc, n: r.n, tab: r.tab, f: r.f, x: r.x, s: Math.max(0, r.s - r.i), i: r.i, g: r.tab === 'Gallery', rg: r.g }; });
  rows.forEach(function (r) { cm[r.n] = r.cc; });
  return { states: sc, sessions: buildSessions_(rows), ts: ts, log: log, cm: cm, buckets: keys.map(function (k) { return map[k]; }), vis: vis, ind: ind, oth: vis - ind, views: views, countries: tc, tabs: tt };
}
var VIS_HTML_ = "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><base target=\"_top\"><script>__THEMEJS__</script><style>__THEMECSS__\n*{box-sizing:border-box}\n:root{--ink:var(--text);--mut:var(--muted);--card:var(--surface);--blue:var(--a);--blue2:var(--a);--green:var(--teal)}\nbody{font-family:Calibri,Carlito,\"Segoe UI\",system-ui,-apple-system,Roboto,Arial,sans-serif;font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}\n.sp{flex:1}\nmain{max-width:1180px;margin:26px auto 40px;padding:0 16px}\n.card{background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 24px 60px rgba(15,30,55,.08);padding:22px;margin:0 0 18px}\n.hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 4px}\nh1{font-size:34px;font-weight:400;margin:0;letter-spacing:-.015em}h2{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin:0 0 14px}\n.sub{color:var(--mut);margin:0 0 16px;max-width:860px}\n.btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:8px;font:inherit;font-weight:700;font-size:13px;cursor:pointer;padding:9px 18px;background:var(--blue);color:var(--on);transition:filter .15s,transform .1s}\n.btn:hover{filter:brightness(1.1)}.btn:active{transform:scale(.97)}.btn:disabled{opacity:.6;cursor:progress}\n.btn.ghost{background:var(--surface);color:var(--blue);border:1.5px solid var(--line2)}\n.spin{width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:var(--surface);border-radius:50%;display:none;animation:r .7s linear infinite}.busy .spin{display:inline-block}.busy .ico{display:none}\n@keyframes r{to{transform:rotate(360deg)}}\n.upd{color:var(--mut);font-size:12px}\n.pills{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}\n.pill{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:8px;padding:7px 15px;font:inherit;font-weight:700;font-size:13px;cursor:pointer}\n.pill.on{background:var(--blue);border-color:var(--blue);color:var(--on)}\n.rg{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}\n.fld{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:var(--muted)}\n.fld input,.fld select{border:1.5px solid var(--line2);border-radius:10px;padding:9px 10px;font:inherit;font-size:13px;font-weight:400;color:var(--ink);background:var(--surface)}\n.chk{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--mut);margin-left:auto}\n.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:0 0 18px}\n.kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 24px 60px rgba(15,30,55,.08);padding:18px 20px;border-top:3px solid var(--blue2)}\n.kpi.a{border-top-color:var(--amber)}.kpi.g{border-top-color:var(--green)}.kpi.p{border-top-color:#6b5b95}\n.kpi .n{font-size:38px;font-weight:400;letter-spacing:-.02em;line-height:1.1}.kpi .l{color:var(--mut);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-top:4px}\n.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.grid2>.card,.card{min-width:0}\n.chart{display:flex;align-items:flex-end;gap:4px;height:180px;padding:6px 2px 0;overflow-x:auto;border-bottom:1px solid var(--line)}\n.col{flex:1 0 22px;max-width:60px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;position:relative}\n.col .s{width:100%;display:flex;flex-direction:column;justify-content:flex-end;border-radius:6px 6px 0 0;overflow:hidden;min-height:2px}\n.col .o{background:var(--blue2)}.col .i{background:var(--amber)}\n.col .v{font-size:11px;font-weight:700;color:var(--mut);margin-bottom:2px}\n.lab{display:flex;gap:4px;overflow:hidden;margin-top:6px}.lab span{flex:1 0 22px;max-width:60px;font-size:10px;color:var(--mut);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.legend{display:flex;gap:16px;margin-top:10px;font-size:12px;color:var(--mut)}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}\n.ctr{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)}.ctr:last-child{border:0}\n.ctr .nm{flex:0 0 170px;font-weight:600;display:flex;align-items:center;gap:8px;min-width:0}.ctr .nm span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.bar{flex:1;height:9px;background:var(--soft);border-radius:6px;overflow:hidden}.bar b{display:block;height:100%;background:var(--blue2);border-radius:6px}\n.ctr .c{flex:0 0 90px;text-align:right;color:var(--mut);font-variant-numeric:tabular-nums}.ctr .c b{color:var(--ink)}\n.flag{width:22px;height:16px;border-radius:3px;border:1px solid var(--line);object-fit:cover;flex:0 0 auto;background:var(--soft)}\n.tw{overflow:auto;max-height:520px;border:1px solid var(--line);border-radius:12px}\ntable{border-collapse:separate;border-spacing:0;width:100%}\nth{position:sticky;top:0;background:var(--bg);text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);padding:10px 14px;border-bottom:1px solid var(--line);white-space:nowrap;z-index:1}\ntd{padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:middle}tr:last-child td{border-bottom:0}tbody tr:hover td{background:var(--soft2)}\ntd.t{white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--muted)}td.num{white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}th.num{text-align:right}\n.cty{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;font-weight:600}\n.tag{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}\n.tag.n{background:var(--tg);color:var(--green)}.tag.v{background:var(--tb);color:var(--a)}.tag.x{background:var(--tw);color:var(--warn)}.tag.i{background:var(--soft);color:var(--muted2)}\n.empty{color:var(--faint);padding:18px;text-align:center}\n.err{background:var(--tr);color:var(--red);border-radius:10px;padding:10px 14px;margin:0 0 14px;display:none}\n.ft{text-align:center;color:var(--faint);font-size:12px;margin:6px 0 0}.ft span{color:#e0245e}\n@media(max-width:900px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.grid2{grid-template-columns:minmax(0,1fr)}.ctr .nm{flex-basis:130px}.chk{margin-left:0}}\n@media(max-width:640px){button,.rp,select,input{min-height:44px;font-size:16px}input[type=checkbox]{min-height:0}.tw{max-height:none}th,td{padding:10px 10px}.tw table.tt th:nth-child(4),.tw table.tt td:nth-child(4){display:none}.tw table.pp th:nth-child(n+5),.tw table.pp td:nth-child(n+5){display:none}.film{height:150px}.ctr .nm{flex-basis:110px}.ctr .c{flex-basis:72px}}\n@media(max-width:480px){.tw table.tt th:nth-child(5),.tw table.tt td:nth-child(5){display:none}}\n@media(max-width:480px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kpi .n{font-size:24px}h1{font-size:22px}.card{padding:16px}}\n\n.lc{position:relative}.lc svg{width:100%;height:auto;display:block;overflow:visible}\n.lg2{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}.lgb{display:inline-flex;align-items:center;gap:7px;border:1.5px solid var(--line);background:var(--surface);border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;font-weight:700;color:var(--muted);cursor:pointer}.lgb i{width:10px;height:10px;border-radius:50%}.lgb.off{opacity:.45}.lgb.off i{background:#c8d0dc!important}\n.tip{position:absolute;pointer-events:none;background:var(--text);color:var(--bg);border-radius:10px;padding:8px 12px;font-size:12px;line-height:1.5;box-shadow:0 6px 20px rgba(0,0,0,.25);display:none;white-space:nowrap;z-index:5}.tip b{display:block;margin-bottom:2px}.tip i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}\n.dn{display:flex;align-items:center;gap:18px;margin:0 0 12px;flex-wrap:wrap}.dn svg{width:130px;height:130px;flex:0 0 auto}.dn .k{font-size:12px;color:var(--mut)}.dn .k div{display:flex;align-items:center;gap:6px;margin:2px 0}.dn .k i{width:9px;height:9px;border-radius:50%}\n\n.ses{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:0 0 12px;background:var(--surface)}\n.ses .sh{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 10px}.ses .sh .tm{color:var(--mut);font-variant-numeric:tabular-nums}.ses .sh .tot{margin-left:auto;font-weight:700}\n.rp{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:8px;font:inherit;font-size:12px;font-weight:700;padding:5px 12px;cursor:pointer}.rp:hover{background:var(--soft)}\n.trk{display:flex;gap:3px;height:46px;border-radius:8px;overflow:hidden;background:#eef2f7}\n.sg{flex:1 1 0;min-width:34px;background:var(--c);color:var(--on);display:flex;flex-direction:column;justify-content:center;padding:0 10px;overflow:hidden;white-space:nowrap;transform-origin:left center;animation:grow .7s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i)*.45s);font-size:12px;line-height:1.25}\n.sg b{font-size:13px;overflow:hidden;text-overflow:ellipsis}.sg span{opacity:.9}\n@keyframes grow{from{opacity:0;transform:scaleX(0)}to{opacity:1;transform:none}}\n.stp{display:flex;flex-wrap:wrap;gap:4px 16px;margin:10px 0 0;font-size:12px;color:var(--mut)}.stp i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;vertical-align:0}\n.tlg{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0 0 12px;font-size:12px;color:var(--mut)}.tlg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}\n.tb2{height:8px;background:var(--soft);border-radius:6px;overflow:hidden;min-width:90px}.tb2 b{display:block;height:100%;border-radius:6px;transform-origin:left;animation:grow 1s cubic-bezier(.22,1,.36,1) both}\n\n.stage{overflow:hidden}\n.reel{position:relative;overflow:hidden;border-radius:12px;background:var(--soft2);border:1px solid var(--line);padding:12px 0;margin:6px 0 12px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}\n.rtrk{display:flex;gap:22px;width:max-content;animation:marq 48s linear infinite}.reel:hover .rtrk{animation-play-state:paused}\n@keyframes marq{to{transform:translateX(-50%)}}\n.ri{display:flex;align-items:center;gap:10px;white-space:nowrap;font-size:13px;color:var(--muted)}.ri b{color:var(--text)}\n.bf{width:34px;height:24px;object-fit:cover;border-radius:4px;box-shadow:0 4px 10px -3px rgba(0,0,0,.45);transform-origin:left center;animation:wv 2.6s ease-in-out infinite alternate;background:var(--soft)}\n@keyframes wv{0%{transform:perspective(200px) rotateY(-14deg) skewY(-3deg)}100%{transform:perspective(200px) rotateY(14deg) skewY(3deg)}}\n.film{position:relative;height:170px;border-radius:12px;border:1px solid var(--line);background:radial-gradient(120% 90% at 50% 120%,var(--tb),transparent 70%),var(--soft2);overflow:hidden}\n.film .ctl{position:absolute;left:14px;top:10px;font-size:12px;color:var(--muted);z-index:2}.film .ctl b{color:var(--text);font-size:15px}\n.fg{position:absolute;bottom:18px;display:flex;flex-direction:column;align-items:center;gap:5px;font-size:11px;color:var(--muted);animation:fly 1.4s var(--ease) both;will-change:transform}\n.fg img{width:56px;height:38px;object-fit:cover;border-radius:5px;box-shadow:0 10px 18px -6px rgba(0,0,0,.5);animation:wv 2s ease-in-out infinite alternate}\n.fg span{background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:1px 8px;white-space:nowrap}\n@keyframes fly{0%{opacity:0;transform:translate(-120px,60px) scale(.2) rotate(-24deg)}55%{opacity:1;transform:translate(0,-34px) scale(1.12) rotate(5deg)}100%{opacity:1;transform:translate(0,0) scale(1) rotate(0)}}\n.fg.out{animation:fout .6s ease-in both}@keyframes fout{to{opacity:0;transform:translateY(-30px) scale(.8)}}\n</style></head><body>\n__TOP__\n<main>\n<div class=\"card\"><div class=\"hd\"><h1>Visitors</h1><span class=\"sp\"></span><span class=\"upd\" id=\"upd\"></span><span class=\"seg\" id=\"vm\" role=\"group\" aria-label=\"View\"><button type=\"button\" data-m=\"s\">Simple</button><button type=\"button\" data-m=\"d\">Detailed</button></span><button class=\"btn\" id=\"rf\" type=\"button\"><span class=\"spin\"></span><span class=\"ico\">&#8635;</span> Refresh</button></div>\n<p class=\"sub adv\">Where your visitors come from and what they read. Only the country, the tab, the time and the time spent on each tab are stored. Indian visits are counted here but never emailed. All times are IST. A visitor is the first page of a browser session; tab views count every page opened.</p>\n<div class=\"pills\" id=\"pre\"></div>\n<div class=\"rg adv\"><label class=\"fld\">From<input type=\"datetime-local\" id=\"f\"></label><label class=\"fld\">To<input type=\"datetime-local\" id=\"t\"></label>\n<label class=\"fld\">Group by<select id=\"u\"><option value=\"minute\">Minutes</option><option value=\"hour\">Hours</option><option value=\"day\" selected>Days</option><option value=\"week\">Weeks</option><option value=\"month\">Months</option><option value=\"year\">Years</option></select></label>\n<button class=\"btn\" id=\"go\" type=\"button\">Show custom range</button>\n<label class=\"chk\"><input type=\"checkbox\" id=\"auto\"> Auto-refresh every minute</label></div></div>\n<div class=\"err\" id=\"err\"></div>\n<div id=\"out\"><div class=\"card\"><p class=\"sub\" style=\"margin:0\">Loading&hellip;</p></div></div>\n<div class=\"ft\">Created with <span>&#10084;</span> by Anandu Prabhakaran</div>\n</main>\n<script>(function(){\nvar SIG=__SIG__,G=google.script.run,IST=19800000,CM={},cur=2,timer=null;\nvar PRE=[[\"Last hour\",3600000,\"minute\"],[\"Last 24 hours\",86400000,\"hour\"],[\"Last 7 days\",604800000,\"day\"],[\"Last 30 days\",2592000000,\"day\"],[\"Last 12 months\",31536000000,\"month\"],[\"All time\",0,\"year\"]];\nfunction $(i){return document.getElementById(i);}\nfunction esc(s){return String(s).replace(/[&<>\"]/g,function(c){return {\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\"}[c];});}\nfunction z(n){return(n<10?\"0\":\"\")+n;}\nfunction toIn(ms){var d=new Date(ms+IST);return d.getUTCFullYear()+\"-\"+z(d.getUTCMonth()+1)+\"-\"+z(d.getUTCDate())+\"T\"+z(d.getUTCHours())+\":\"+z(d.getUTCMinutes());}\nfunction fromIn(v){var m=/^(\\d+)-(\\d+)-(\\d+)T(\\d+):(\\d+)/.exec(v||\"\");return m?Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5])-IST:NaN;}\nfunction dur(s){s=Math.round(s);if(s<60)return s+\" s\";var m=Math.floor(s/60);if(m<60)return m+\" min \"+z(s%60)+\" s\";return Math.floor(m/60)+\" h \"+z(m%60)+\" min\";}\nfunction idl(x){return x.i?'<em class=\"idl\">'+(x.g?'Static':'Left open')+' '+dur(x.i)+'</em>':'';}\nfunction fl(cc){cc=String(cc||\"\").toLowerCase();return '<img class=\"flag\" src=\"https://flagcdn.com/w40/'+esc(cc)+'.png\" alt=\"'+esc(cc.toUpperCase())+'\" loading=\"lazy\">';}\nfunction now(){var d=new Date(Date.now()+IST);return z(d.getUTCHours())+\":\"+z(d.getUTCMinutes())+\":\"+z(d.getUTCSeconds());}\nfunction sortKeys(o){return Object.keys(o).sort(function(a,b){return o[b]-o[a];});}\nfunction err(t){var e=$(\"err\");e.style.display=t?\"block\":\"none\";e.textContent=t||\"\";}\nfunction busy(b){$(\"rf\").disabled=b;$(\"go\").disabled=b;$(\"rf\").className=\"btn\"+(b?\" busy\":\"\");$(\"out\").style.opacity=b?\".55\":\"1\";}\nfunction V(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||\"#888\";}\nvar TC={};\nvar SER=[[\"Visitors\",\"v\",\"#000\"],[\"India\",\"i\",\"#000\"],[\"Other countries\",\"o\",\"#000\"],[\"Tab views\",\"w\",\"#000\"]],ON={v:1,i:1,o:1,w:0},LAST=null;\nfunction nice(m){var st=1,ks=[1,2,5,10],p=1;while(true){var f=false;for(var q=0;q<4;q++){var c=ks[q]*p;if(c*4>=m){st=c;f=true;break;}}if(f)break;p*=10;}return st*4;}\nfunction pal(){TC={Home:V(\"--a\"),\"About me\":V(\"--amber\"),Research:V(\"--teal\"),Publications:V(\"--violet\"),Workshops:V(\"--brick\"),Gallery:V(\"--sky\"),Contact:V(\"--tan\")};SER[0][2]=V(\"--a\");SER[1][2]=V(\"--amber\");SER[2][2]=V(\"--teal\");SER[3][2]=V(\"--violet\");}\nfunction lineChart(d){var B=d.buckets;if(!B.length)return '<div class=\"empty\">No visits in this range.</div>';\n var W=1000,H=300,L=46,R=18,T=14,Bm=38,n=B.length,pw=W-L-R,ph=H-T-Bm,mx=1;\n SER.forEach(function(s){if(ON[s[1]])B.forEach(function(b){if(b[s[1]]>mx)mx=b[s[1]];});});\n var top=nice(mx),X=function(k){return n===1?L+pw/2:L+k*pw/(n-1);},Y=function(v){return T+ph-v/top*ph;};\n var g='<defs><linearGradient id=\"ar\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"'+V(\"--a\")+'\" stop-opacity=\".28\"/><stop offset=\"1\" stop-color=\"'+V(\"--a\")+'\" stop-opacity=\"0\"/></linearGradient></defs>';\n for(var t=0;t<=4;t++){var v=top*t/4,y=Y(v);g+='<line x1=\"'+L+'\" x2=\"'+(W-R)+'\" y1=\"'+y+'\" y2=\"'+y+'\" stroke=\"'+V(\"--line\")+'\" stroke-width=\"1\"/><text x=\"'+(L-8)+'\" y=\"'+(y+4)+'\" text-anchor=\"end\" font-size=\"12\" fill=\"'+V(\"--muted2\")+'\">'+(Math.round(v*10)/10)+'</text>';}\n var step=Math.max(1,Math.ceil(n/8));\n B.forEach(function(b,k){if(k%step===0||k===n-1){if(k===n-1&&k%step&&n>2&&(n-1)%step<step/2)return;g+='<text x=\"'+X(k)+'\" y=\"'+(H-12)+'\" text-anchor=\"'+(k===0&&n>1?\"start\":k===n-1&&n>1?\"end\":\"middle\")+'\" font-size=\"12\" fill=\"'+V(\"--muted2\")+'\">'+esc(b.label.replace(/^[A-Za-z]{3}, /,\"\"))+'</text>';}});\n g+='<line x1=\"'+L+'\" x2=\"'+(W-R)+'\" y1=\"'+(T+ph)+'\" y2=\"'+(T+ph)+'\" stroke=\"'+V(\"--line2\")+'\"/>';\n if(ON.v){var a=\"M\"+X(0)+\",\"+Y(0);B.forEach(function(b,k){a+=\" L\"+X(k)+\",\"+Y(b.v);});a+=\" L\"+X(n-1)+\",\"+Y(0)+\" Z\";g+='<path d=\"'+a+'\" fill=\"url(#ar)\"/>';}\n SER.forEach(function(s){if(!ON[s[1]])return;var p=\"\";B.forEach(function(b,k){p+=(k?\" L\":\"M\")+X(k)+\",\"+Y(b[s[1]]);});\n  g+='<path d=\"'+p+'\" fill=\"none\" stroke=\"'+s[2]+'\" stroke-width=\"'+(s[1]===\"v\"?3:2.2)+'\" stroke-linejoin=\"round\" stroke-linecap=\"round\"'+(s[1]===\"w\"?' stroke-dasharray=\"6 5\"':'')+'/>';\n  if(n<=45)B.forEach(function(b,k){g+='<circle cx=\"'+X(k)+'\" cy=\"'+Y(b[s[1]])+'\" r=\"'+(s[1]===\"v\"?3.6:3)+'\" fill=\"'+V(\"--surface\")+'\" stroke=\"'+s[2]+'\" stroke-width=\"2\"/>';});});\n g+='<line id=\"gd\" x1=\"0\" x2=\"0\" y1=\"'+T+'\" y2=\"'+(T+ph)+'\" stroke=\"'+V(\"--faint\")+'\" stroke-dasharray=\"4 4\" style=\"display:none\"/>';\n var bw=n===1?pw:pw/(n-1);B.forEach(function(b,k){g+='<rect data-k=\"'+k+'\" x=\"'+(X(k)-bw/2)+'\" y=\"'+T+'\" width=\"'+bw+'\" height=\"'+ph+'\" fill=\"transparent\"/>';});\n var lg='<div class=\"lg2\">'+SER.map(function(s){return '<button type=\"button\" class=\"lgb'+(ON[s[1]]?\"\":\" off\")+'\" data-s=\"'+s[1]+'\"><i style=\"background:'+s[2]+'\"></i>'+s[0]+'</button>';}).join(\"\")+'</div>';\n return lg+'<div class=\"lc\" id=\"lc\"><svg viewBox=\"0 0 '+W+' '+H+'\" role=\"img\" aria-label=\"Visitors over time\">'+g+'</svg><div class=\"tip\" id=\"tip\"></div></div>';}\nfunction wireChart(){var lc=$(\"lc\");if(!lc||!LAST)return;var svg=lc.querySelector(\"svg\"),tip=$(\"tip\"),gd=$(\"gd\"),B=LAST.buckets,W=1000,L=46,R=18,n=B.length;\n [].forEach.call(document.querySelectorAll(\".lgb\"),function(b){b.onclick=function(){ON[b.getAttribute(\"data-s\")]^=1;$(\"chartbox\").innerHTML=lineChart(LAST);wireChart();};});\n [].forEach.call(svg.querySelectorAll(\"rect[data-k]\"),function(r){r.onmousemove=function(e){var k=+r.getAttribute(\"data-k\"),b=B[k],x=n===1?L+(W-L-R)/2:L+k*(W-L-R)/(n-1),box=svg.getBoundingClientRect(),sx=box.width/W;\n  gd.setAttribute(\"x1\",x);gd.setAttribute(\"x2\",x);gd.style.display=\"\";\n  tip.innerHTML=\"<b>\"+esc(b.label)+\"</b>\"+SER.map(function(s){return '<div><i style=\"background:'+s[2]+'\"></i>'+s[0]+\": \"+b[s[1]]+\"</div>\";}).join(\"\");tip.style.display=\"block\";\n  var tx=x*sx+14;if(tx+tip.offsetWidth>box.width)tx=x*sx-tip.offsetWidth-14;tip.style.left=Math.max(0,tx)+\"px\";tip.style.top=\"10px\";};\n  r.onmouseleave=function(){tip.style.display=\"none\";gd.style.display=\"none\";};});}\nfunction donut(d){var k=sortKeys(d.countries);if(!k.length)return \"\";var tot=k.reduce(function(a,x){return a+d.countries[x];},0),C=[V(\"--a\"),V(\"--amber\"),V(\"--teal\"),V(\"--violet\"),V(\"--brick\"),V(\"--sky\"),V(\"--tan\"),V(\"--pink\")],r=46,c=2*Math.PI*r,off=0,svg='<svg viewBox=\"0 0 120 120\" role=\"img\" aria-label=\"Share of visitors by country\"><g transform=\"rotate(-90 60 60)\"><circle cx=\"60\" cy=\"60\" r=\"'+r+'\" fill=\"none\" stroke=\"'+V(\"--soft\")+'\" stroke-width=\"16\"/>',kk=\"\";\n k.forEach(function(x,i){var f=d.countries[x]/tot,col=C[Math.min(i,C.length-1)],len=f*c;if(i<C.length-1||k.length<=C.length){svg+='<circle cx=\"60\" cy=\"60\" r=\"'+r+'\" fill=\"none\" stroke=\"'+col+'\" stroke-width=\"16\" stroke-dasharray=\"'+len+' '+(c-len)+'\" stroke-dashoffset=\"'+(-off)+'\"/>';off+=len;}\n  if(i<5)kk+='<div><i style=\"background:'+col+'\"></i>'+esc(x)+\" \"+Math.round(f*100)+\"%</div>\";});\n if(k.length>C.length){var rest=0;k.slice(C.length-1).forEach(function(x){rest+=d.countries[x];});svg+='<circle cx=\"60\" cy=\"60\" r=\"'+r+'\" fill=\"none\" stroke=\"'+C[C.length-1]+'\" stroke-width=\"16\" stroke-dasharray=\"'+(rest/tot*c)+' '+c+'\" stroke-dashoffset=\"'+(-off)+'\"/>';}\n svg+='</g><text x=\"60\" y=\"58\" text-anchor=\"middle\" font-size=\"20\" font-weight=\"800\" fill=\"'+V(\"--text\")+'\">'+tot+'</text><text x=\"60\" y=\"74\" text-anchor=\"middle\" font-size=\"9\" fill=\"'+V(\"--muted2\")+'\">VISITORS</text></svg>';\n return '<div class=\"dn\">'+svg+'<div class=\"k\">'+kk+'</div></div>';}\nfunction countries(d){var k=sortKeys(d.countries);if(!k.length)return '<div class=\"empty\">No visitors yet.</div>';var mx=d.countries[k[0]],tot=k.reduce(function(a,x){return a+d.countries[x];},0),h=\"\";\n k.forEach(function(x){var v=d.countries[x];h+='<div class=\"ctr\"><div class=\"nm\">'+fl(CM[x])+'<span>'+esc(x)+'</span></div><div class=\"bar\"><b style=\"width:'+Math.round(v/mx*100)+'%\"></b></div><div class=\"c\"><b>'+v+'</b> &middot; '+Math.round(v/tot*100)+'%</div></div>';});return h;}\nfunction states(d){var k=sortKeys(d.states||{});if(!k.length)return '<div class=\"empty\">No Indian state data yet. State is recorded for new visits from India only.</div>';var mx=d.states[k[0]],tot=k.reduce(function(a,x){return a+d.states[x];},0),h=\"\";k.forEach(function(x){var v=d.states[x];h+='<div class=\"ctr\"><div class=\"nm\"><span>'+esc(x)+'</span></div><div class=\"bar\"><b style=\"width:'+Math.round(v/mx*100)+'%\"></b></div><div class=\"c\"><b>'+v+'</b> &middot; '+Math.round(v/tot*100)+'%</div></div>';});return h;}\nfunction tc(t){return TC[t]||V(\"--faint\");}\nfunction tabs(d){var k=sortKeys(d.tabs);if(!k.length)return '<div class=\"empty\">No tab views yet.</div>';var mx=1;k.forEach(function(x){mx=Math.max(mx,(d.ts&&d.ts[x])||0);});\n var h='<div class=\"tw\"><table class=\"tt\"><thead><tr><th>Tab</th><th class=\"num\">Views</th><th class=\"num\">Total time</th><th></th><th class=\"num\">Average per view</th></tr></thead><tbody>';\n k.forEach(function(x,i){var t=(d.ts&&d.ts[x])||0;h+='<tr><td><b><span style=\"display:inline-block;width:10px;height:10px;border-radius:3px;background:'+tc(x)+';margin-right:8px\"></span>'+esc(x)+'</b></td><td class=\"num\">'+d.tabs[x]+'</td><td class=\"num\">'+dur(t)+'</td><td style=\"width:34%\"><div class=\"tb2\"><b style=\"width:'+Math.round(t/mx*100)+'%;background:'+tc(x)+';animation-delay:'+(i*.12)+'s\"></b></div></td><td class=\"num\">'+(t?dur(t/d.tabs[x]):\"-\")+'</td></tr>';});return h+'</tbody></table></div>';}\nfunction sessions(d){var S=d.sessions||[];if(!S.length)return '<div class=\"empty\">No sessions in this range.</div>';\n var seen={},lg=\"\";S.forEach(function(s){s.steps.forEach(function(st){if(!seen[st.tab]){seen[st.tab]=1;lg+='<span><i style=\"background:'+tc(st.tab)+'\"></i>'+esc(st.tab)+'</span>';}});});\n var h='<div class=\"tlg\">'+lg+'</div>';\n S.forEach(function(s,i){var seg=\"\",stp=\"\";s.steps.forEach(function(st,j){var w=Math.max(st.s+st.i*.4,5);\n   seg+='<div class=\"sg\" style=\"--c:'+tc(st.tab)+';--i:'+j+';flex-grow:'+w+'\" title=\"'+esc(st.tab)+' &middot; opened '+esc(st.w)+' &middot; '+(st.s?dur(st.s):\"time not reported\")+(st.i?' &middot; '+(st.g?'static ':'left open ')+dur(st.i):'')+'\"><b>'+esc(st.tab)+'</b><span>'+(st.s?dur(st.s):(st.i?\"idle\":\"open\"))+(st.i?' + '+(st.g?'static':'left open'):'')+'</span></div>';\n   stp+='<span><i style=\"background:'+tc(st.tab)+'\"></i>'+esc(st.w)+' '+esc(st.tab)+(st.s?' &middot; '+dur(st.s):'')+(st.i?' &middot; '+(st.g?'static ':'left open ')+dur(st.i):'')+'</span>';});\n  h+='<div class=\"ses\" id=\"ses'+i+'\"><div class=\"sh\"><span class=\"cty\">'+fl(s.cc)+esc(s.n)+(s.g?', '+esc(s.g):'')+'</span><span class=\"tm\">'+esc(s.w)+' IST</span><span class=\"tag '+(s.f?\"n\":\"v\")+'\">'+(s.f?\"New visitor\":\"Continued\")+'</span><span class=\"tot\">'+(s.total?dur(s.total)+\" in total\":\"time not reported\")+' &middot; '+s.steps.length+(s.steps.length===1?\" tab\":\" tabs\")+'</span><button class=\"rp\" type=\"button\" data-r=\"'+i+'\">&#9654; Replay</button></div><div class=\"trk\">'+seg+'</div><div class=\"stp\">'+stp+'</div></div>';});\n return h;}\nfunction byPeriod(d){if(!d.buckets.length)return '<div class=\"empty\">No visits in this range.</div>';\n var h='<div class=\"tw\"><table class=\"pp\"><thead><tr><th>Period</th><th class=\"num\">Visitors</th><th class=\"num\">India</th><th class=\"num\">Other</th><th>Countries</th><th class=\"num\">Tab views</th></tr></thead><tbody>';\n d.buckets.slice().reverse().forEach(function(b){var c=sortKeys(b.c).map(function(x){return '<span class=\"cty\" style=\"margin-right:12px\">'+fl(CM[x])+esc(x)+' '+b.c[x]+'</span>';}).join(\"\")||\"-\";\n  h+='<tr><td class=\"t\">'+esc(b.label)+'</td><td class=\"num\"><b>'+b.v+'</b></td><td class=\"num\">'+b.i+'</td><td class=\"num\">'+b.o+'</td><td>'+c+'</td><td class=\"num\">'+b.w+'</td></tr>';});return h+'</tbody></table></div>';}\nfunction log(d){if(!d.log.length)return '<div class=\"empty\">No visits in this range.</div>';\n var h='<div class=\"tw\"><table><thead><tr><th>Time (IST)</th><th>Country</th><th>Tab</th><th>What happened</th></tr></thead><tbody>';\n d.log.forEach(function(r){var w=r.x?'<span class=\"tag x\">Left after '+dur(r.s)+'</span>'+(r.i?' <span class=\"tag i\">'+(r.g?'Static ':'Left open ')+dur(r.i)+'</span>':''):(r.f?'<span class=\"tag n\">Opened &middot; new visitor</span>':'<span class=\"tag v\">Opened &middot; tab view</span>');\n  h+='<tr><td class=\"t\">'+esc(r.w)+'</td><td><span class=\"cty\">'+fl(r.cc)+esc(r.n)+(r.rg?', '+esc(r.rg):'')+'</span></td><td>'+esc(r.tab)+'</td><td>'+w+'</td></tr>';});return h+'</tbody></table></div>';}\nfunction replay(el){if(!el)return;var l=el.querySelectorAll(\".sg\");[].forEach.call(l,function(x){x.style.animation=\"none\";});void el.offsetWidth;[].forEach.call(l,function(x){x.style.animation=\"\";});}\nfunction wireReplay(){[].forEach.call(document.querySelectorAll(\"[data-r]\"),function(b){b.onclick=function(){replay($(\"ses\"+b.getAttribute(\"data-r\")));};});var a=$(\"rpall\");if(a)a.onclick=function(){[].forEach.call(document.querySelectorAll(\".ses\"),replay);};}\nfunction draw(d){pal();CM=d.cm||{};var ck=Object.keys(d.countries||{}),nAll=ck.length,nOth=ck.filter(function(x){return CM[x]!==\"IN\";}).length;\n var h='<div class=\"kpis\"><div class=\"kpi\"><div class=\"n\">'+d.vis+'</div><div class=\"l\">Visitors</div></div><div class=\"kpi a\"><div class=\"n\">'+d.ind+'</div><div class=\"l\">From India</div></div><div class=\"kpi g\"><div class=\"n\">'+d.oth+'</div><div class=\"l\">Visitors from other countries ('+nOth+(nOth===1?' country':' countries')+')</div></div><div class=\"kpi p\"><div class=\"n\">'+nAll+'</div><div class=\"l\">Countries visited</div></div></div>';\n \nh+='<div class=\"card stage adv\"><div class=\"hd\"><h2 style=\"margin:0\">Visit reel</h2><span class=\"sp\"></span><button class=\"rp\" type=\"button\" id=\"fplay\">&#9654; Play the visits</button></div><p class=\"sub\" style=\"margin:8px 0 10px\">Flags of the latest visits drift past below. Press play to watch them arrive one by one, oldest first.</p><div class=\"reel\"><div class=\"rtrk\" id=\"rtrk\"></div></div><div class=\"film\" id=\"film\"><div class=\"ctl\" id=\"fctl\">Ready</div></div></div>';\n h+='<div class=\"card\"><h2>Visitors over time</h2><div id=\"chartbox\">'+lineChart(d)+'</div></div>';\n h+='<div class=\"grid2\"><div class=\"card\"><h2>Countries</h2>'+donut(d)+countries(d)+'</div><div class=\"card\"><h2>Tabs and time spent</h2>'+tabs(d)+'</div></div>';\n h+='<div class=\"card adv\"><h2>Indian states <span class=\"upd\" style=\"font-weight:400\">(approximate, from the network location of visitors in India)</span></h2>'+states(d)+'</div>';\n h+='<div class=\"card adv\"><h2>By period</h2>'+byPeriod(d)+'</div>';\n h+='<div class=\"card adv\"><div class=\"hd\"><h2 style=\"margin:0\">Sessions: what each visitor opened and for how long</h2><span class=\"sp\"></span><button class=\"rp\" type=\"button\" id=\"rpall\">&#9654; Replay all</button></div><p class=\"sub\" style=\"margin:8px 0 14px\">Each bar is one visitor session. Tabs are in the order they were opened and their width shows the time spent on them. Hover a block for details.</p>'+sessions(d)+'</div>';\n h+='<div class=\"card adv\"><h2>Each visit <span class=\"upd\" style=\"font-weight:400\">(latest '+d.log.length+', time is approximate)</span></h2>'+log(d)+'</div>';\n $(\"out\").innerHTML=h;LAST=d;wireChart();wireReplay();countUp();reelBuild(d);var fp=$(\"fplay\");if(fp)fp.onclick=function(){filmPlay(d);};if(!window.__played){window.__played=1;setTimeout(function(){filmPlay(d);},900);}$(\"upd\").textContent=\"Updated \"+now()+\" IST\";}\n\nvar FT=[];\nfunction reelBuild(d){var L=(d.log||[]).filter(function(r){return !r.x;}).slice(0,24),t=$(\"rtrk\");if(!t)return;if(!L.length){t.innerHTML='<div class=\"ri\">No visits in this range yet.</div>';t.style.animation=\"none\";return;}\n var it=L.map(function(r){return '<div class=\"ri\"><img class=\"bf\" alt=\"\" src=\"https://flagcdn.com/w80/'+esc(String(r.cc).toLowerCase())+'.png\"><span><b>'+esc(r.n)+(r.rg?\", \"+esc(r.rg):\"\")+'</b> &middot; '+esc(r.tab)+' &middot; '+esc(r.w.replace(/^\\d+ \\w+ \\d+, /,\"\"))+'</span></div>';}).join(\"\");\n t.innerHTML=it+it;t.style.animationDuration=Math.max(24,L.length*3.2)+\"s\";}\nfunction filmPlay(d){FT.forEach(clearTimeout);FT=[];var f=$(\"film\");if(!f)return;[].forEach.call(f.querySelectorAll(\".fg\"),function(x){x.remove();});\n var L=(d.log||[]).filter(function(r){return !r.x;}).slice(0,16).reverse(),c=$(\"fctl\");if(!L.length){c.textContent=\"No visits to play in this range.\";return;}\n var W=f.clientWidth,n=L.length,cell=Math.max(62,(W-40)/n);\n L.forEach(function(r,i){FT.push(setTimeout(function(){var g=document.createElement(\"div\");g.className=\"fg\";var x=Math.min(W-80,16+i*Math.min(cell,96)+(i%2?0:0));g.style.left=x+\"px\";g.style.bottom=(14+(i%3)*18)+\"px\";g.innerHTML='<img alt=\"\" src=\"https://flagcdn.com/w80/'+esc(String(r.cc).toLowerCase())+'.png\"><span>'+esc(r.n)+'</span>';f.appendChild(g);c.innerHTML='Visit <b>'+(i+1)+'</b> of '+n+' &middot; '+esc(r.w);},i*650));});\n FT.push(setTimeout(function(){c.innerHTML='<b>'+n+'</b> visits played. Press play to watch again.';},n*650+800));}\nfunction countUp(){[].forEach.call(document.querySelectorAll(\".kpi .n\"),function(e){var v=+e.textContent;if(!(v>0)||v>1e6)return;var t0=null;function st(t){if(t0===null)t0=t;var p=Math.min(1,(t-t0)/800);e.textContent=Math.round(v*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(st);}e.textContent=\"0\";requestAnimationFrame(st);});}\nwindow.addEventListener(\"themechange\",function(){if(LAST)draw(LAST);});\nfunction load(a,b,u){err(\"\");busy(true);\n G.withSuccessHandler(function(d){busy(false);draw(d);}).withFailureHandler(function(e){busy(false);err((e&&e.message||\"That did not work.\").replace(/^Error: /,\"\"));}).visitData(SIG,a,b,u);}\nfunction custom(){var a=fromIn($(\"f\").value),b=fromIn($(\"t\").value);if(isNaN(a)||isNaN(b)||b<=a){err(\"Choose a valid From and To.\");return;}load(a,b,$(\"u\").value);}\nfunction setOn(i){cur=i;[].forEach.call(document.querySelectorAll(\"#pre .pill\"),function(p,j){p.className=\"pill\"+(j===i?\" on\":\"\");});}\nfunction preset(i){var p=PRE[i],n=Date.now();setOn(i);$(\"f\").value=toIn(p[1]?n-p[1]:Date.UTC(2024,0,1)-IST);$(\"t\").value=toIn(n+60000);$(\"u\").value=p[2];load(p[1]?n-p[1]:Date.UTC(2024,0,1)-IST,n+60000,p[2]);}\nfunction refresh(){if(cur>=0)preset(cur);else custom();}\nPRE.forEach(function(p,i){var b=document.createElement(\"button\");b.type=\"button\";b.className=\"pill\";b.textContent=p[0];b.onclick=function(){preset(i);};$(\"pre\").appendChild(b);});\n$(\"go\").onclick=function(){setOn(-1);custom();};\n$(\"rf\").onclick=refresh;\n$(\"auto\").onchange=function(){if(timer){clearInterval(timer);timer=null;}if(this.checked)timer=setInterval(function(){if(!document.hidden)refresh();},60000);};\npreset(2);\n})();\n(function(){var m=\"s\";try{m=localStorage.getItem(\"vm\")||\"s\"}catch(e){}function ap(){document.body.classList.toggle(\"simple\",m===\"s\");[].forEach.call(document.querySelectorAll(\"#vm button\"),function(b){b.classList.toggle(\"on\",b.getAttribute(\"data-m\")===m)})}\ndocument.addEventListener(\"click\",function(e){var b=e.target.closest&&e.target.closest(\"#vm button\");if(!b)return;m=b.getAttribute(\"data-m\");try{localStorage.setItem(\"vm\",m)}catch(x){}ap();if(m===\"d\"&&typeof LAST!==\"undefined\"&&LAST)setTimeout(function(){filmPlay(LAST)},350)});\nap();})();\n</script></body></html>\n";
function homePage_() {
  var hr = +Utilities.formatDate(new Date(), TZ, 'H'), hi = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  var subs = 0, msgs = 0, v7 = 0, in7 = 0, ot7 = 0;
  try { subs = nlActive_().length; } catch (e) { }
  try { PropertiesService.getScriptProperties().getKeys().forEach(function (k) { if (k.indexOf('MSG_') === 0) msgs++; }); } catch (e) { }
  try { visRows_(Date.now() - 7 * 86400000, Date.now()).forEach(function (r) { if (!r.x && r.f) { v7++; if (r.cc === 'IN') in7++; else ot7++; } }); } catch (e) { }
  var ic = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var nc = {}; try { nc = notifCounts_(); } catch (e) { }
  var tile = function (href, c, icon, num, lb, hn, go, key) { return '<a class="tile" target="_top" href="' + href + '" style="--c:' + c + '">' + badge_(key ? nc[key] || 0 : 0, 'nbadge') + '<span class="ic">' + icon + '</span>' + (num === null ? '' : '<span class="num" data-count="' + num + '">0</span>') + '<span class="lb">' + lb + '</span><span class="hn">' + hn + '</span><span class="ar">' + go + ' <i>&rarr;</i></span></a>'; };
  var tiles = '<div class="tiles">'
    + tile(visUrl_(), 'var(--a)', ic('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'), v7, 'Visitors, last 7 days', in7 + ' from India, ' + ot7 + ' from other countries', 'Open visitors', 'visitors')
    + tile(adminUrl_(), 'var(--teal)', ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M17 11.5a3 3 0 1 0-1-5.8M21.5 19c-.3-2.2-1.4-3.6-3.2-4.4"/>'), subs, 'Subscribers', 'People on your newsletter list', 'Manage subscribers', 'admin')
    + tile(msgUrl_(), 'var(--amber)', ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'), msgs, 'Messages', 'From the contact form, archived after 60 days', 'Read messages', 'messages')
    + tile(apptUrl_(), 'var(--violet)', ic('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'), null, 'Appointments', 'Requests and the booking calendar', 'Open appointments', 'appts')
    + tile(mailUrl_(), 'var(--sky)', ic('<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14 7l3 3"/>'), null, 'Email', 'Sent, drafts and scheduled emails, and a new email', 'Open Email')
    + tile(cvUrl_(), 'var(--teal)', ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'), null, 'CV', 'Edit the LaTeX, build and download the PDF', 'Open CV')
    + tile(SITE_URL_, 'var(--brick)', ic('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'), null, 'Your website', 'Open the live site', 'Go to website')
    + '</div>';
  var inner = '<div class="hero"><div class="hi">' + Utilities.formatDate(new Date(), TZ, 'EEEE, d MMMM yyyy') + '</div><h1>' + hi + ', Anandu</h1><p>Everything for your website in one place. Pick a tile to open it.</p>'
    + (NOTIF_KEYS_.some(function (k) { return (nc[k] || 0) > 0; }) ? '<button type="button" class="mread" id="mar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12.5l4 4L14 8.5M10 16.5l1.5 1.5L22 7.5"/></svg>Mark all as read</button>'
      + '<script>(function(){var b=document.getElementById("mar");b.onclick=function(){b.disabled=true;b.lastChild.textContent="Marking...";google.script.run.withSuccessHandler(function(){[].forEach.call(document.querySelectorAll(".nbadge"),function(x){x.remove()});b.remove()}).withFailureHandler(function(e){b.disabled=false;b.lastChild.textContent="Could not mark them. Try again"}).notifClearAll(' + JSON.stringify(sign_('admin', 'notif')) + ')}})();<\/script>' : '')
    + '</div>' + tiles;
  return out_(shell_('', '', inner, true, 'home'), 'Home');
}
function visitorsPage_(p) {
  if (sign_('admin', 'visitors') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  return out_(VIS_HTML_.replace('__THEMEJS__', function () { return THEME_JS_; }).replace('__THEMECSS__', function () { return THEME_CSS_; }).replace('__TOP__', function () { return topbar_(true, 'visitors'); }).replace('__SIG__', function () { return JSON.stringify(p.sig); }), 'Visitors');
}

/* ---- Messages and Appointments portals ---- */
function msgUrl_() { return portalBase_() + '?action=messages&sig=' + sign_('admin', 'messages'); }
function apptUrl_() { return portalBase_() + '?action=appts&sig=' + sign_('admin', 'appts'); }
function listStyle_() { return '<style>.li{border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;margin:0 0 10px;background:var(--surface)}.li .h{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;margin:0 0 6px}.li .n{font-weight:bold}.li .m{color:var(--muted2);font-size:12px}.li .b{display:block;width:auto;padding:0;border-radius:0;gap:0;overflow:visible;color:var(--text);font-weight:normal;white-space:pre-wrap;font-size:14px;margin:6px 0 10px}.pl{display:inline-block;font-size:12px;font-weight:bold;border-radius:12px;padding:2px 10px;margin-left:6px}.pl.y{background:var(--tw);color:var(--warn)}.pl.g{background:var(--tg);color:var(--green)}.pl.x{background:var(--soft);color:var(--muted2)}.ab{display:inline-block;text-decoration:none;border-radius:20px;padding:6px 14px;font-weight:bold;font-size:13px;margin:0 6px 4px 0;color:var(--on)}</style>'; }
function messagesPage_(p, arc) {
  if (sign_('admin', arc ? 'msgarc' : 'messages') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var props = PropertiesService.getScriptProperties().getProperties(), all = [], cut = Date.now() - MSG_ARCHIVE_DAYS * 86400000;
  Object.keys(props).forEach(function (k) { if (k.indexOf('MSG_') === 0) { try { var r = JSON.parse(props[k]); r.id = k.slice(4); all.push(r); } catch (x) { } } });
  all.sort(function (a, b) { return b.t - a.t; });
  var isArc = function (r) { return r.ar === 1 || (r.t < cut && r.ar !== 2); };
  var list = all.filter(function (r) { return arc ? isArc(r) : !isArc(r); }), nArc = all.filter(isArc).length;
  var api = hasCalApi_(), STN = { unread: 'Unread', read: 'Read', responded: 'Responded', ignored: 'Ignored' };
  var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var items = list.map(function (r) {
    var st = STN[r.st] ? r.st : 'unread', id = r.id, asg = sign_('msgact', id);
    var ab = function (act, label) { return '<button type="button" class="ab nu" data-a="' + act + '" style="cursor:pointer">' + label + '</button> '; };
    return '<div class="li mg" id="m' + id + '" data-id="' + id + '" data-st="' + st + '" data-ar="' + (arc ? 1 : 0) + '" data-asg="' + asg + '" data-dsg="' + sign_('msgdel', id) + '" data-rsg="' + sign_('reply', id) + '" data-s="' + esc_((r.n + ' ' + r.e + ' ' + r.m).toLowerCase()) + '">'
      + '<div class="h tg" style="cursor:pointer"><span class="n">' + esc_(r.n) + '</span><a href="mailto:' + esc_(r.e) + '" style="color:var(--a);font-size:13px">' + esc_(r.e) + '</a><span class="m">' + Utilities.formatDate(new Date(r.t), TZ, 'd MMM yyyy, HH:mm') + ' IST</span><span class="stc">' + STN[st] + '</span></div>'
      + '<div class="b pv">' + esc_(String(r.m).slice(0, 180)) + (String(r.m).length > 180 ? '...' : '') + '</div>'
      + '<div class="dt" style="display:none"><div class="b">' + esc_(r.m).replace(/\n/g, '<br>') + '</div>'
      + '<div class="ac">' + ab('unread', 'Mark unread') + ab('read', 'Mark read') + ab('ignored', 'Ignore') + ab(arc ? 'inbox' : 'arc', arc ? 'Move to inbox' : 'Archive')
      + '<button type="button" class="ab md" style="background:var(--red,#b94700);border:0;cursor:pointer">Delete</button> <a class="ab" style="background:var(--a)" target="_top" href="' + link_('reply', id) + '">Reply</a> <span class="sub" style="font-size:12px">(Reply opens the full editor with fonts, attachments and send later)</span></div>'
      + '<div class="rb"><label class="l">Your response <span class="hint">(sent as an email with their message quoted below it)</span></label>'
      + '<input class="tx rfn" maxlength="60" value="' + esc_(OWNER_NAME) + '" title="Sender name" style="margin-bottom:8px" placeholder="Sender name">'
      + '<input class="tx rs" value="Re: your message on my website" style="margin-bottom:8px"><textarea class="tx rt" style="min-height:110px">Hello ' + esc_(r.n) + ',\n\n\n\nBest regards,\nAnandu Prabhakaran</textarea>'
      + '<div style="margin:8px 0;font-size:14px"><label style="display:flex;gap:8px;align-items:center;margin:0 0 6px"><input type="checkbox" class="rbk"> Ask them to book an appointment on my website (adds a Book an appointment button)</label>'
      + '<label style="display:flex;gap:8px;align-items:center;margin:0 0 6px"><input type="checkbox" class="rct"> Add a link to my website contact form (adds a Send me a message button)</label>'
      + '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="rmt"> Schedule a meeting with them now (blocks the time on the website calendar)</label></div>'
      + '<div class="mtb" style="display:none;margin:0 0 10px"><div style="display:flex;flex-wrap:wrap;gap:12px;margin:0 0 10px"><label class="l" style="flex:1 1 140px">Date<input class="tx mtd" style="min-height:0" type="date" min="' + today + '"></label><label class="l" style="flex:1 1 110px">Start time (IST)<input class="tx mtt" style="min-height:0" type="time" step="300"></label><label class="l" style="flex:1 1 110px">Length in minutes<input class="tx mtn" style="min-height:0" type="number" min="1" max="1440" step="1" value="30"></label></div>'
      + '<label class="l">Meeting agenda <span class="hint">(optional)</span></label><textarea class="tx mta" style="min-height:60px"></textarea>'
      + (api ? '<label style="display:flex;gap:8px;align-items:center;margin:8px 0 0;font-size:14px"><input type="checkbox" class="mtm" checked> Include a Google Meet link</label>' : '') + '</div>'
      + '<button type="button" class="b blue auto snd">Send response</button><span class="sub rm" style="margin-left:10px"></span></div></div></div>';
  }).join('') || '<p class="sub">' + (arc ? 'Nothing is archived yet. Messages move here after ' + MSG_ARCHIVE_DAYS + ' days, or when you archive them.' : 'No messages yet.') + '</p>';
  var other = arc ? '<a class="ab" style="background:var(--a)" target="_top" href="' + msgUrl_() + '">Back to messages</a>'
    : '<a class="ab" style="background:var(--a)" target="_top" href="' + portalBase_() + '?action=msgarc&sig=' + sign_('admin', 'msgarc') + '">Archive (' + nArc + ')</a>';
  var chips = ['all', 'unread', 'read', 'responded', 'ignored'].map(function (k) { return '<button type="button" class="ab fl ' + (k === 'all' ? 'on' : 'nu') + '" data-f="' + k + '" style="cursor:pointer;font-size:14px;padding:7px 16px">' + (k === 'all' ? 'All' : STN[k]) + ' (<span class="cnt">0</span>)</button> '; }).join('');
  var css = '<style>.mg .stc{font-size:12px;font-weight:bold;padding:2px 9px;border-radius:99px;border:1.5px solid var(--muted2);color:var(--muted2)}.mg[data-st=unread]{border-left:5px solid var(--a)}.mg[data-st=unread] .stc{background:var(--a);color:#fff;border-color:var(--a)}.mg[data-st=unread] .n{font-weight:800}.mg[data-st=responded] .stc{color:var(--green);border-color:var(--green)}.mg[data-st=ignored]{opacity:.7}.mg[data-st=ignored] .stc{border-style:dashed}.mg .ac{margin:10px 0}.mg .rb{margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)}.mg.open .pv{display:none}.mg .ac .ab{margin:0 4px 6px 0}</style>';
  var js = '<script>(function(){var L=document.getElementById("l"),dm=document.getElementById("dm"),ARC=' + (arc ? 'true' : 'false') + ',NAMES={unread:"Unread",read:"Read",responded:"Responded",ignored:"Ignored"},cur="all";'
    + 'function say(t,bad){dm.className=bad?"msg bad":"msg";dm.textContent=t||"";}'
    + 'function recount(){var c={all:0,unread:0,read:0,responded:0,ignored:0},cs=L.querySelectorAll(".mg");for(var i=0;i<cs.length;i++){c.all++;c[cs[i].getAttribute("data-st")]++;}var f=document.querySelectorAll(".fl");for(var j=0;j<f.length;j++)f[j].querySelector(".cnt").textContent=c[f[j].getAttribute("data-f")];}'
    + 'function apply(){var v=document.getElementById("q").value.toLowerCase(),cs=L.querySelectorAll(".mg");for(var i=0;i<cs.length;i++){var ok=cs[i].getAttribute("data-s").indexOf(v)>=0&&(cur==="all"||cs[i].getAttribute("data-st")===cur);cs[i].style.display=ok?"":"none";}var f=document.querySelectorAll(".fl");for(var j=0;j<f.length;j++)var on=f[j].getAttribute("data-f")===cur;f[j].className="ab fl "+(on?"on":"nu");}'
    + 'function setSt(c,st){c.setAttribute("data-st",st);c.querySelector(".stc").textContent=NAMES[st];recount();apply();}'
    + 'function callSt(c,st){google.script.run.withSuccessHandler(function(){setSt(c,st);}).withFailureHandler(function(e){say((e&&e.message)||"Could not update.",true);}).msgSetStatus(c.getAttribute("data-id"),c.getAttribute("data-asg"),st);}'
    + 'document.getElementById("q").oninput=apply;'
    + 'document.addEventListener("click",function(e){var f=e.target.closest(".fl");if(f){cur=f.getAttribute("data-f");apply();return;}var c=e.target.closest(".mg");if(!c)return;'
    + 'if(e.target.closest("a"))return;'
    + 'if(e.target.closest(".tg")){var d=c.querySelector(".dt"),open=d.style.display==="none";d.style.display=open?"block":"none";c.classList.toggle("open",open);if(open&&c.getAttribute("data-st")==="unread")callSt(c,"read");return;}'
    + 'var a=e.target.closest("[data-a]");if(a){var k=a.getAttribute("data-a");if(k==="unread"||k==="read"||k==="ignored"){callSt(c,k);}else{google.script.run.withSuccessHandler(function(){c.parentNode.removeChild(c);recount();say(k==="arc"?"Moved to the Archive.":"Moved back to the inbox.");}).withFailureHandler(function(er){say((er&&er.message)||"Could not move it.",true);}).msgArchive(c.getAttribute("data-id"),c.getAttribute("data-asg"),k);}return;}'
    + 'var dl=e.target.closest(".md");if(dl){if(!dl.armed){dl.armed=true;dl.textContent="Click again to delete for good";return;}dl.disabled=true;google.script.run.withSuccessHandler(function(ok){if(ok){c.parentNode.removeChild(c);recount();}else{dl.disabled=false;dl.armed=false;dl.textContent="Delete";}}).withFailureHandler(function(){dl.disabled=false;dl.armed=false;dl.textContent="Delete";}).msgDelete(c.getAttribute("data-id"),c.getAttribute("data-dsg"));return;}'
    + 'var sb=e.target.closest(".snd");if(sb){var rm=c.querySelector(".rm"),on=c.querySelector(".rmt").checked,mt=on?{on:true,date:c.querySelector(".mtd").value,time:c.querySelector(".mtt").value,len:c.querySelector(".mtn").value,agenda:c.querySelector(".mta").value,meet:c.querySelector(".mtm")?c.querySelector(".mtm").checked:false}:null;'
    + 'sb.disabled=true;sb.textContent="Sending...";rm.textContent="";google.script.run.withSuccessHandler(function(r){sb.disabled=false;sb.textContent="Send response";rm.textContent=r;setSt(c,"responded");}).withFailureHandler(function(er){sb.disabled=false;sb.textContent="Send response";rm.textContent="Not sent: "+((er&&er.message)||"try again.");}).msgRespond(c.getAttribute("data-id"),c.getAttribute("data-rsg"),c.querySelector(".rs").value,c.querySelector(".rt").value,c.querySelector(".rbk").checked,c.querySelector(".rct").checked,mt,c.querySelector(".rfn").value);return;}});'
    + 'document.addEventListener("change",function(e){var m=e.target.closest(".rmt");if(m){var c=m.closest(".mg");c.querySelector(".mtb").style.display=m.checked?"block":"none";}});recount();apply();})();<\/script>';
  var inner = listStyle_() + css + '<p style="margin:0 0 12px">' + other + '</p><p style="margin:0 0 12px">' + chips + '</p><input id="q" class="tx" placeholder="Search name, email or message" style="margin:0 0 14px"><div id="l">' + items + '</div><div id="dm" class="msg"></div>' + js;
  var head = arc ? list.length + ' archived message' + (list.length === 1 ? '' : 's') + ', archived by you or older than ' + MSG_ARCHIVE_DAYS + ' days. They are removed automatically after ' + MSG_KEEP_DAYS + ' days.'
    : list.length + ' message' + (list.length === 1 ? '' : 's') + ' in the inbox, newest first. Click a message to open it, read it and respond right here. Older ones move to the Archive.';
  return out_(shell_(arc ? 'Messages archive' : 'Messages', head, inner, true), arc ? 'Messages archive' : 'Messages');
}
function msgSave_(id, fn) {
  var props = PropertiesService.getScriptProperties(), raw = props.getProperty('MSG_' + id); if (!raw) throw new Error('This message no longer exists.');
  var r = JSON.parse(raw); fn(r); props.setProperty('MSG_' + id, JSON.stringify(r)); return r;
}
function msgSetStatus(id, sig, st) {
  if (!id || !owner_() || sign_('msgact', id) !== sig) throw new Error('Not allowed.');
  if (['unread', 'read', 'responded', 'ignored'].indexOf(st) < 0) throw new Error('Unknown status.');
  msgSave_(id, function (r) { r.st = st; }); return true;
}
function msgArchive(id, sig, mode) {
  if (!id || !owner_() || sign_('msgact', id) !== sig) throw new Error('Not allowed.');
  msgSave_(id, function (r) { r.ar = mode === 'inbox' ? 2 : 1; }); return true;
}
/* answer a contact-form message right from the Messages page: same email as the reply editor, plus optional booking and contact links and a meeting */
function msgRespond(id, sig, subject, text, book, contact, mt, fn) {
  if (!id || !owner_() || sign_('reply', id) !== sig) throw new Error('Not allowed.');
  text = String(text || '').trim(); if (text.length < 2) throw new Error('Write a response first.');
  var html = '<p>' + esc_(text.slice(0, 20000)).replace(/\n/g, '<br>') + '</p>';
  var btn = function (intro, href, label) { return '<div style="margin:16px 0 0"><p>' + intro + '</p><p><a href="' + href + '" style="display:inline-block;background:#1f4e9c;color:#ffffff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:bold;font-family:Arial,sans-serif">' + label + '</a></p></div>'; };
  if (book) html += btn('To book an appointment with me, please choose a convenient time here:', SITE_URL + '#appt', 'Book an appointment');
  if (contact) html += btn('To send me a message, please use the contact form here:', SITE_URL + '#cform', 'Send me a message');
  sendReply(id, sig, String(subject || 'Re: your message').slice(0, 150), html, [], '', '', 'Reply from ' + OWNER_NAME, mt && mt.on ? mt : null, { fn: fn });
  msgSave_(id, function (r) { r.st = 'responded'; });
  return 'Sent.' + (mt && mt.on ? ' The meeting is in your calendar and the slot is blocked on the website.' : '');
}
/* delete one stored contact message (called from the Messages page) */
function msgDelete(id, sig) {
  if (!id || sign_('msgdel', id) !== sig || !owner_()) return false;
  PropertiesService.getScriptProperties().deleteProperty('MSG_' + id);
  return true;
}
/* ---------------- appointment management: agenda, change time, cancel, archive and history ---------------- */
var ARC_MAX = 200;
/* one request at a time, so a double click can never create two events or two Google Meet links */
function locked_(fn) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (x) { return statusHtml_('Please wait', 'Another change is still being saved. Try again in a moment.', 'info'); }
  try { return fn(); } finally { try { lock.releaseLock(); } catch (x) { } }
}
function owner_() { try { return String(Session.getActiveUser().getEmail() || '').toLowerCase() === OWNER_EMAIL; } catch (x) { return false; } }
function iso_(d) { return Utilities.formatDate(d, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"); }
function hasCalApi_() { try { return typeof Calendar !== 'undefined' && !!Calendar.Events; } catch (x) { return false; } }
function apiEvent_(ev) {
  if (!hasCalApi_()) return null;
  try { var r = Calendar.Events.list('primary', { iCalUID: ev.getId(), maxResults: 1 }); return r.items && r.items.length ? r.items[0] : null; } catch (x) { console.error('api lookup failed: ' + x); return null; }
}
function meetOf_(r) {
  if (!r) return '';
  if (r.hangoutLink) return r.hangoutLink;
  var eps = r.conferenceData && r.conferenceData.entryPoints;
  if (eps) for (var i = 0; i < eps.length; i++) if (eps[i].entryPointType === 'video' && eps[i].uri) return eps[i].uri;
  return '';
}
function purposeOf_(ev) { var m = /Purpose:\n([\s\S]*?)(?:\n\nMeeting agenda:|$)/.exec(String(ev.getDescription() || '')); return m ? m[1].trim() : ''; }
function descFor_(name, email, len, purpose, agenda, meet) {
  return 'Appointment with ' + name + '\n\nName: ' + name + '\nEmail: ' + email + '\nLength: ' + len + ' minutes' + (meet ? '\nGoogle Meet: ' + meet : '') + '\n\nPurpose:\n' + purpose + (agenda ? '\n\nMeeting agenda:\n' + agenda : '');
}
function noteBox_(note) {
  return note ? '<div style="margin:14px 0 0;padding:12px 14px;background:#f3f6fb;border-left:4px solid #1f4e9c;border-radius:4px;line-height:1.5"><b>Note from Anandu:</b><br>' + esc_(note).replace(/\n/g, '<br>') + '</div>' : '';
}
function arcKey_(id) { return 'ARC_' + sign_('arc', id).slice(0, 20); }
function arcSave_(ev, status, note) {
  var props = PropertiesService.getScriptProperties(), id = ev.getId();
  var rec = { i: id, n: ev.getTag('name') || ev.getTitle().replace(/^[^:]*:\s*/, ''), e: ev.getTag('email') || '', s: ev.getStartTime().getTime(), x: ev.getEndTime().getTime(),
    a: String(ev.getTag('agenda') || '').slice(0, 300), p: purposeOf_(ev).slice(0, 200), m: ev.getTag('meet') || '', st: status, t: Date.now(), nt: String(note || '').slice(0, 200) };
  props.setProperty(arcKey_(id), JSON.stringify(rec));
  var all = props.getProperties(), keys = Object.keys(all).filter(function (k) { return k.indexOf('ARC_') === 0; });
  if (keys.length > ARC_MAX) {
    keys.map(function (k) { var t = 0; try { t = JSON.parse(all[k]).t; } catch (x) { } return [k, t]; }).sort(function (a, b) { return a[1] - b[1]; }).slice(0, keys.length - ARC_MAX).forEach(function (r) { props.deleteProperty(r[0]); });
  }
}
function arcList_() {
  var all = PropertiesService.getScriptProperties().getProperties(), out = [];
  Object.keys(all).forEach(function (k) { if (k.indexOf('ARC_') === 0) { try { var r = JSON.parse(all[k]); r.k = k; out.push(r); } catch (x) { } } });
  return out.sort(function (a, b) { return b.t - a.t; });
}

/* ---- gentle reminder, about 20 minutes before an approved meeting ---- */
var REMIND_MIN = 20;
function ensureReminderTrigger_() {
  try {
    var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'sendReminders'; });
    if (!has) ScriptApp.newTrigger('sendReminders').timeBased().everyMinutes(5).create();
  } catch (x) { console.error('reminder trigger failed: ' + x); }
}
function setupReminders() { ensureReminderTrigger_(); }
function sendReminders() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (x) { return; }
  try {
    var now = Date.now(), cal = CalendarApp.getDefaultCalendar();
    cal.getEvents(new Date(now), new Date(now + (REMIND_MIN + 10) * 60000)).forEach(function (ev) {
      if (!/^Appointment:/.test(ev.getTitle()) || ev.getTag('rem') || ev.getTag('arch') === '1') return;
      var lead = ev.getStartTime().getTime() - now; if (lead <= 0 || lead > REMIND_MIN * 60000) return;
      var email = ev.getTag('email') || ''; ev.setTag('rem', '1');
      if (!email) return;
      var name = ev.getTag('name') || 'there', mins = Math.max(1, Math.round(lead / 60000)), at = Utilities.formatDate(ev.getStartTime(), TZ, 'HH:mm') + ' IST', agenda = ev.getTag('agenda') || '';
      var meet = ev.getTag('meet') || ((/Google Meet: (\S+)/.exec(String(ev.getDescription() || '')) || [])[1] || '');
      try {
        var rows = [['Starts', esc_(at) + ' (in about ' + mins + ' minutes)'], ['Length', Math.round((ev.getEndTime().getTime() - ev.getStartTime().getTime()) / 60000) + ' minutes']];
        if (agenda) rows.push(['Agenda', esc_(agenda).replace(/\n/g, '<br>')]);
        if (meet) rows.push(['Google Meet', '<a href="' + esc_(meet) + '">' + esc_(meet) + '</a>']);
        MailApp.sendEmail({ to: email, name: OWNER_NAME, subject: 'Reminder: our meeting starts at ' + at,
          body: 'Hello ' + name + ', a gentle reminder that our meeting starts at ' + at + ' (in about ' + mins + ' minutes).' + (agenda ? '\n\nAgenda:\n' + agenda : '') + (meet ? '\n\nGoogle Meet: ' + meet : '') + '\n\nSee you soon. ' + OWNER_NAME,
          htmlBody: mail_('A gentle reminder', 'Hello ' + esc_(name) + ', our meeting starts soon.', rows, meet ? [['Join Google Meet', meet, '#1e8e3e']] : [], 'See you soon. ' + OWNER_NAME) });
      } catch (x) { console.error('reminder mail failed: ' + x); try { ev.deleteTag('rem'); } catch (y) { } }
    });
    mailJobs_();
  } finally { try { lock.releaseLock(); } catch (x) { } }
}


/* ===================== Email tab: Sent, Drafts, Scheduled =====================
 * Sent records and the small draft/schedule records live in Script Properties (SENT_, DRAFT_, SCH_).
 * Draft and scheduled bodies (and scheduled attachments) are held in Gmail drafts, so they are not limited by the property size.
 * A 5-minute trigger (the same one as the meeting reminders) sends due scheduled emails and removes sent emails from Gmail Sent after the chosen days. */
var SENT_MAX = 60;
function mailUrl_() { return portalBase_() + '?action=mail&sig=' + sign_('admin', 'mail'); }
function plainOf_(h) { return String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim(); }
function mailId_() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function propRecs_(prefix) {
  var props = PropertiesService.getScriptProperties().getProperties(), out = [];
  Object.keys(props).forEach(function (k) { if (k.indexOf(prefix) === 0) { try { var r = JSON.parse(props[k]); r.id = k.slice(prefix.length); out.push(r); } catch (x) { } } });
  return out;
}
function recordSent_(rec) {
  var props = PropertiesService.getScriptProperties(), id = mailId_(), da = +rec.da || 0;
  if (da < 1 || da > 365 || /^(Newsletter|Yellow)/.test(rec.to)) da = 0;
  props.setProperty('SENT_' + id, JSON.stringify({ t: Date.now(), to: String(rec.to || '').slice(0, 200), cc: String(rec.cc || '').slice(0, 200), s: String(rec.s || '').slice(0, 150), h: String(rec.h || '').slice(0, 80), x: plainOf_(rec.body).slice(0, 1200), a: (rec.files || []).length, da: da, g: 0, fn: rec.fn && fromName_(rec.fn) !== OWNER_NAME ? fromName_(rec.fn) : '' }));
  var all = propRecs_('SENT_').sort(function (a, b) { return b.t - a.t; });
  all.slice(SENT_MAX).forEach(function (r) { props.deleteProperty('SENT_' + r.id); });
  if (da) ensureReminderTrigger_();
}
function deleteDraft_(id) {
  if (!id) return;
  var props = PropertiesService.getScriptProperties(), raw = props.getProperty('DRAFT_' + id);
  if (!raw) return;
  try { var r = JSON.parse(raw); if (r.gid) { try { GmailApp.getDraft(r.gid).deleteDraft(); } catch (x) { } } } catch (x) { }
  props.deleteProperty('DRAFT_' + id);
}
function finishSend_(rec) { if (!rec) return; try { recordSent_(rec); } catch (x) { console.error('sent record failed: ' + x); } try { deleteDraft_(rec.draft); } catch (x) { } }

/* ---- drafts (auto-saved from the editor) ---- */
/* ---- Gmail signature: read from Gmail's own settings (primary address), kept in script properties, editable in the email editor ---- */
function sigFetch_() {
  var list = null;
  try { if (typeof Gmail !== 'undefined' && Gmail.Users && Gmail.Users.Settings) list = Gmail.Users.Settings.SendAs.list('me').sendAs; } catch (x) { list = null; }
  if (!list) {
    var r = UrlFetchApp.fetch('https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw new Error('Gmail did not share the signature (' + r.getResponseCode() + '). You can paste it with Edit signature instead.');
    list = JSON.parse(r.getContentText()).sendAs || [];
  }
  var me = String(Session.getEffectiveUser().getEmail()).toLowerCase();
  var a = list.filter(function (x) { return x.isPrimary; })[0] || list.filter(function (x) { return String(x.sendAsEmail).toLowerCase() === me; })[0] || list[0];
  return sigClean_(a && a.signature || '');
}
function sigClean_(h) { return String(h || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/ on[a-z]+="[^"]*"/gi, '').replace(/javascript:/gi, '').slice(0, 8500); }
function sigGet_() {
  var pr = PropertiesService.getScriptProperties(), h = pr.getProperty('MAIL_SIG'), t = +(pr.getProperty('MAIL_SIG_T') || 0);
  if ((h === null || Date.now() - t > 86400000) && pr.getProperty('MAIL_SIG_OWN') !== '1') {   /* refresh from Gmail once a day unless you edited it here */
    try { var g = sigFetch_(); pr.setProperty('MAIL_SIG', g); pr.setProperty('MAIL_SIG_T', String(Date.now())); h = g; } catch (x) { console.error('signature fetch failed: ' + x); }
  }
  return h || '';
}
function edOk_(mode, rid, sig) {
  if (!owner_()) throw new Error('Not allowed.');
  if (mode === 'reply' ? sign_('reply', rid) !== sig : sign_('compose', 'new') !== sig) throw new Error('This link is not valid.');
}
function sigRefresh(mode, rid, sig) {
  edOk_(mode, rid, sig);
  var h = sigFetch_(), pr = PropertiesService.getScriptProperties();
  if (!h) throw new Error('Your Gmail has no signature set. Add one in Gmail settings, or use Edit signature.');
  pr.setProperty('MAIL_SIG', h); pr.setProperty('MAIL_SIG_T', String(Date.now())); pr.deleteProperty('MAIL_SIG_OWN');
  return h;
}
function sigSave(mode, rid, sig, html) {
  edOk_(mode, rid, sig);
  var h = sigClean_(html), pr = PropertiesService.getScriptProperties();
  pr.setProperty('MAIL_SIG', h); pr.setProperty('MAIL_SIG_T', String(Date.now())); pr.setProperty('MAIL_SIG_OWN', '1');
  return h;
}
function saveDraft(mode, rid, sig, draftId, to, cc, bcc, subject, header, body, aud, fn, pl) {
  if (!owner_()) throw new Error('Not allowed.');
  if (mode === 'reply' ? sign_('reply', rid) !== sig : sign_('compose', 'new') !== sig) throw new Error('This link is not valid.');
  body = String(body || '').slice(0, 200000); subject = String(subject || '').trim().slice(0, 150);
  var props = PropertiesService.getScriptProperties(), me = Session.getEffectiveUser().getEmail(), id = String(draftId || ''), old = null;
  if (id) { var raw = props.getProperty('DRAFT_' + id); if (raw) { try { old = JSON.parse(raw); } catch (x) { } } }
  var rcpt = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(to || '').trim()) ? String(to).trim() : me, gid = '';
  var opts = { htmlBody: body || '<p></p>' };
  if (old && old.gid) { try { GmailApp.getDraft(old.gid).update(rcpt, subject || '(no subject)', plainOf_(body) || ' ', opts); gid = old.gid; } catch (x) { gid = ''; } }
  if (!gid) { var d = GmailApp.createDraft(rcpt, subject || '(no subject)', plainOf_(body) || ' ', opts); gid = d.getId(); }
  if (!old) id = mailId_();
  props.setProperty('DRAFT_' + id, JSON.stringify({ t: Date.now(), gid: gid, to: String(to || '').slice(0, 200), cc: String(cc || '').slice(0, 200), bcc: String(bcc || '').slice(0, 200), s: subject, h: String(header || '').slice(0, 80), ri: mode === 'reply' ? rid : '', aud: aud === 'all' || aud === 'watch' ? aud : 'one', fn: fn ? fromName_(fn) : '', pl: pl ? 1 : 0 }));
  return id;
}
function draftPage_(p) {
  var id = p.id || '';
  if (!id || sign_('draft', id) !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var raw = PropertiesService.getScriptProperties().getProperty('DRAFT_' + id);
  if (!raw) return page_('Not found', 'This draft no longer exists.', 'info');
  var r = JSON.parse(raw), body = '';
  try { body = GmailApp.getDraft(r.gid).getMessage().getBody(); } catch (x) { body = ''; }
  var D = { id: id, fn: r.fn || '', to: r.to, cc: r.cc, bcc: r.bcc, s: r.s, h: r.h, aud: r.aud, pl: r.pl || 0, body: body };
  if (r.ri) {
    var m = PropertiesService.getScriptProperties().getProperty('MSG_' + r.ri);
    if (m) return editorPage_('reply', { id: r.ri, sig: sign_('reply', r.ri) }, JSON.parse(m), D);
  }
  return editorPage_('compose', { sig: sign_('compose', 'new') }, null, D);
}

/* ---- scheduled emails ---- */
function scheduleMail_(base, bodyHtml, files, mt, opt) {
  if (mt && mt.on) throw new Error('A meeting cannot be added to a scheduled email. Send it now, or remove the meeting.');
  var to = String(base.to || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error('Enter a valid email address.');
  if (!String(base.s || '').trim()) throw new Error('Add a subject.');
  addrs_(base.cc, 'Cc'); addrs_(base.bcc, 'Bcc');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(opt.at))) throw new Error('Choose a date and time to send.');
  var at = Date.parse(opt.at + ':00+05:30'); if (isNaN(at) || at < Date.now() + 60000) throw new Error('Choose a time in the future.');
  var blobs = (files || []).map(function (f) { return Utilities.newBlob(Utilities.base64Decode(f.data), String(f.type || 'application/octet-stream'), String(f.name || 'attachment').slice(0, 120)); });
  var o = { htmlBody: String(bodyHtml || '').slice(0, 200000) || '<p></p>' }; if (blobs.length) o.attachments = blobs;
  var d = GmailApp.createDraft(to, String(base.s).trim().slice(0, 150), plainOf_(bodyHtml) || ' ', o), props = PropertiesService.getScriptProperties(), id = mailId_();
  props.setProperty('SCH_' + id, JSON.stringify({ t: Date.now(), at: at, gid: d.getId(), to: to, cc: String(base.cc || '').slice(0, 200), bcc: String(base.bcc || '').slice(0, 200), s: String(base.s).trim().slice(0, 150), h: String(base.h || '').slice(0, 80), ri: base.ri || '', da: +opt.da > 0 ? Math.min(365, +opt.da) : 0, a: blobs.length, f: 0, fn: opt.fn ? fromName_(opt.fn) : '', pl: base.pl ? 1 : 0 }));
  deleteDraft_(opt.draft); ensureReminderTrigger_();
  return statusHtml_('Scheduled', 'Your email to ' + esc_(to) + ' will be sent on ' + esc_(Utilities.formatDate(new Date(at), TZ, 'EEEE d MMMM yyyy, HH:mm')) + ' IST (within about 5 minutes of that time). It is listed under Scheduled in <a href="' + mailUrl_() + '" target="_top">Email</a>, where you can send it now, move it back to drafts or delete it.', 'ok');
}
function sendScheduledOne_(id) {
  var props = PropertiesService.getScriptProperties(), raw = props.getProperty('SCH_' + id); if (!raw) return false;
  var r = JSON.parse(raw);
  try {
    var msg = GmailApp.getDraft(r.gid).getMessage(), files = msg.getAttachments().map(function (b) { return { name: b.getName(), type: b.getContentType(), data: Utilities.base64Encode(b.getBytes()) }; });
    var quoted = ''; if (r.ri) { try { quoted = JSON.parse(props.getProperty('MSG_' + r.ri) || '{}').m || ''; } catch (x) { } }
    var body = msg.getBody();
    deliver_(r.to, r.s, body, files, quoted, r.cc, r.bcc, '', r.h, r.fn, r.pl);
    recordSent_({ fn: r.fn, to: r.to, cc: r.cc, s: r.s, h: r.h, body: body, files: files, da: r.da });
    try { GmailApp.getDraft(r.gid).deleteDraft(); } catch (x) { }
    props.deleteProperty('SCH_' + id);
    return true;
  } catch (x) {
    console.error('scheduled send failed: ' + x);
    r.f = (r.f || 0) + 1; r.err = String(x).slice(0, 200); props.setProperty('SCH_' + id, JSON.stringify(r));
    if (r.f === 3) { try { MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), name: MSG_SENDER, subject: 'A scheduled email could not be sent', body: 'Your scheduled email to ' + r.to + ' ("' + r.s + '") could not be sent: ' + r.err + '\nOpen Email: ' + mailUrl_() }); } catch (y) { } }
    return false;
  }
}
function sendDue_() {
  var now = Date.now();
  propRecs_('SCH_').forEach(function (r) { if (r.at <= now && (r.f || 0) < 3) sendScheduledOne_(r.id); });
}
/* remove sent emails from the Gmail Sent folder once their chosen number of days has passed (only the one message, never a thread with replies) */
function sentCleanup_() {
  var now = Date.now(), props = PropertiesService.getScriptProperties(), me = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(), n = 0;
  propRecs_('SENT_').forEach(function (r) {
    if (!r.da || r.g || n >= 8 || r.t + r.da * 86400000 > now) return;
    n++;
    var found = 0, d1 = Utilities.formatDate(new Date(r.t - 86400000), TZ, 'yyyy/MM/dd'), d2 = Utilities.formatDate(new Date(r.t + 2 * 86400000), TZ, 'yyyy/MM/dd');
    try {
      GmailApp.search('in:sent to:' + String(r.to).split(/[,\s]+/)[0] + ' after:' + d1 + ' before:' + d2, 0, 20).forEach(function (th) {
        th.getMessages().forEach(function (m) {
          if (String(m.getFrom()).toLowerCase().indexOf(me) < 0) return;
          if (m.getSubject() !== r.s || Math.abs(m.getDate().getTime() - r.t) > 15 * 60000) return;
          m.moveToTrash(); found++;
        });
      });
      r.g = found ? 1 : 2;
    } catch (x) { console.error('sent cleanup failed: ' + x); r.g = (r.g || 0); return; }
    var id = r.id; delete r.id; props.setProperty('SENT_' + id, JSON.stringify(r));
  });
}
function mailJobs_() { try { sendDue_(); } catch (x) { console.error('due failed: ' + x); } try { sentCleanup_(); } catch (x) { console.error('cleanup failed: ' + x); } }

/* ---- hub page: Sent, Drafts, Scheduled ---- */
function mailHubHtml_(tab) {
  tab = tab === 'drafts' || tab === 'sched' ? tab : 'sent';
  var fmt = function (t) { return Utilities.formatDate(new Date(t), TZ, 'd MMM yyyy, HH:mm') + ' IST'; };
  var sent = propRecs_('SENT_').sort(function (a, b) { return b.t - a.t; }), drafts = propRecs_('DRAFT_').sort(function (a, b) { return b.t - a.t; }), sch = propRecs_('SCH_').sort(function (a, b) { return a.at - b.at; });
  var gm = function (r) { return 'https://mail.google.com/mail/u/0/#search/' + encodeURIComponent('in:sent to:' + String(r.to).split(/[,\s]+/)[0] + ' subject:"' + r.s + '"'); };
  var chip = function (t) { return '<span class="m">' + t + '</span>'; };
  var sentH = sent.map(function (r) {
    var note = r.da ? (r.g === 1 ? 'Removed from Gmail Sent' : r.g === 2 ? 'Was not found in Gmail Sent' : 'Leaves Gmail Sent on ' + Utilities.formatDate(new Date(r.t + r.da * 86400000), TZ, 'd MMM yyyy')) : '';
    return '<div class="li"><div class="h"><span class="n">' + esc_(r.s || '(no subject)') + '</span>' + chip('To ' + esc_(r.to) + (r.cc ? ', Cc ' + esc_(r.cc) : '')) + chip(fmt(r.t)) + (r.fn ? chip('From name: ' + esc_(r.fn)) : '') + (r.a ? chip(r.a + ' attachment' + (r.a > 1 ? 's' : '')) : '') + (note ? chip(esc_(note)) : '') + '</div>'
      + '<div class="b">' + esc_(r.x || '').replace(/\n/g, '<br>') + '</div>' + (r.g === 1 ? '' : '<a class="ab" style="background:var(--a)" target="_blank" href="' + gm(r) + '">Find in Gmail</a>') + '</div>';
  }).join('') || '<p class="sub">Nothing sent from here yet. The latest ' + SENT_MAX + ' are kept.</p>';
  var btn = function (cls, fn, id, label, extra) { return '<button type="button" class="ab ' + cls + '" style="' + (extra || '') + 'border:0;cursor:pointer" data-fn="' + fn + '" data-id="' + id + '">' + label + '</button> '; };
  var draftH = drafts.map(function (r) {
    return '<div class="li"><div class="h"><span class="n">' + esc_(r.s || '(no subject)') + '</span>' + chip((r.aud === 'all' ? 'To all subscribers' : r.aud === 'watch' ? 'To the yellow list' : 'To ' + esc_(r.to || 'nobody yet'))) + chip('Saved ' + fmt(r.t)) + '</div>'
      + '<a class="ab" style="background:var(--a)" target="_top" href="' + link_('draft', r.id) + '">Open and edit</a> ' + btn('dl', 'draftDelete', r.id, 'Delete', 'background:var(--red,#b94700);') + '</div>';
  }).join('') || '<p class="sub">No drafts. Anything you type in a new email is saved here automatically.</p>';
  var schH = sch.map(function (r) {
    return '<div class="li"><div class="h"><span class="n">' + esc_(r.s || '(no subject)') + '</span>' + chip('To ' + esc_(r.to)) + chip('Sends ' + fmt(r.at)) + (r.a ? chip(r.a + ' attachment' + (r.a > 1 ? 's' : '')) : '') + (r.f ? chip('Failed ' + r.f + ' time' + (r.f > 1 ? 's' : '') + ': ' + esc_(r.err || '')) : '') + '</div>'
      + btn('sn', 'schedSendNow', r.id, 'Send now', 'background:var(--a);') + btn('sb nu', 'schedToDraft', r.id, 'Move back to drafts', '') + btn('dl', 'schedDelete', r.id, 'Delete', 'background:var(--red,#b94700);') + '</div>';
  }).join('') || '<p class="sub">Nothing is scheduled. Tick &ldquo;Send later&rdquo; when you write an email.</p>';
  var tabB = function (k, label, n) { return '<button type="button" class="ab tb ' + (tab === k ? 'on' : 'nu') + '" data-t="' + k + '" style="cursor:pointer;font-size:14px;padding:7px 16px">' + label + ' (' + n + ')</button> '; };
  var inner = listStyle_() + '<p style="margin:0 0 14px"><a class="ab" style="background:var(--a)" target="_top" href="' + link_('compose', 'new') + '">Write a new email</a></p>'
    + '<p style="margin:0 0 14px">' + tabB('sent', 'Sent', sent.length) + tabB('drafts', 'Drafts', drafts.length) + tabB('sched', 'Scheduled', sch.length) + '</p>'
    + '<div id="p-sent"' + (tab === 'sent' ? '' : ' style="display:none"') + '>' + sentH + '</div><div id="p-drafts"' + (tab === 'drafts' ? '' : ' style="display:none"') + '>' + draftH + '</div><div id="p-sched"' + (tab === 'sched' ? '' : ' style="display:none"') + '>' + schH + '</div><div id="hm" class="msg"></div>'
    + '<script>'
    + 'document.addEventListener("click",function(e){var t=e.target.closest(".tb");if(t){var k=t.getAttribute("data-t");["sent","drafts","sched"].forEach(function(x){document.getElementById("p-"+x).style.display=x===k?"":"none";});var bs=document.querySelectorAll(".tb");for(var i=0;i<bs.length;i++)bs[i].className="ab tb "+(bs[i]===t?"on":"nu");return;}'
    + 'var b=e.target.closest("[data-fn]");if(!b)return;var fn=b.getAttribute("data-fn");if(b.classList.contains("dl")&&!b.armed){b.armed=true;b.textContent="Click again to delete";return;}'
    + 'var all=document.querySelectorAll("[data-fn]");for(var j=0;j<all.length;j++)all[j].disabled=true;b.textContent="Working...";'
    + 'google.script.run.withSuccessHandler(function(h){document.open();document.write(h);document.close();}).withFailureHandler(function(er){for(var j=0;j<all.length;j++)all[j].disabled=false;b.textContent="Try again";var m=document.getElementById("hm");m.className="msg bad";m.textContent=(er&&er.message)||"Something went wrong.";})[fn](b.getAttribute("data-id"),' + JSON.stringify(sign_('admin', 'mailact')) + ');});<\/script>';
  return shell_('Email', 'Emails you sent from here, drafts that were saved automatically, and emails scheduled to go out later.', inner, true);
}
function mailHubPage_(p) {
  if (sign_('admin', 'mail') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  return out_(mailHubHtml_(p.tab), 'Email');
}
function mailAct_(id, sig, fn, tab) {
  if (!owner_() || sign_('admin', 'mailact') !== sig) throw new Error('Not allowed.');
  var props = PropertiesService.getScriptProperties(), raw;
  if (fn === 'draftDelete') deleteDraft_(id);
  else if (fn === 'schedDelete') { raw = props.getProperty('SCH_' + id); if (raw) { try { GmailApp.getDraft(JSON.parse(raw).gid).deleteDraft(); } catch (x) { } props.deleteProperty('SCH_' + id); } }
  else if (fn === 'schedToDraft') { raw = props.getProperty('SCH_' + id); if (raw) { var r = JSON.parse(raw); props.setProperty('DRAFT_' + id, JSON.stringify({ t: Date.now(), gid: r.gid, to: r.to, cc: r.cc, bcc: r.bcc, s: r.s, h: r.h, ri: r.ri, aud: 'one', fn: r.fn || '' })); props.deleteProperty('SCH_' + id); } }
  else if (fn === 'schedSendNow') locked_(function () { return sendScheduledOne_(id); });
  return mailHubHtml_(tab);
}
function draftDelete(id, sig) { return mailAct_(id, sig, 'draftDelete', 'drafts'); }
function schedDelete(id, sig) { return mailAct_(id, sig, 'schedDelete', 'sched'); }
function schedToDraft(id, sig) { return mailAct_(id, sig, 'schedToDraft', 'drafts'); }
function schedSendNow(id, sig) { return mailAct_(id, sig, 'schedSendNow', 'sent'); }

/* approve: a page with a box for the meeting agenda, then approveWith() creates the invited event (with a Google Meet link when the Calendar service is on) */
function approvePage_(p, name, email, when, len) {
  var id = p.id;
  var inner = '<div class="chips"><span class="chip"><b>' + esc_(name) + '</b></span><span class="chip">' + esc_(when) + '</span>' + (email ? '<span class="chip">' + esc_(email) + '</span>' : '') + '<span class="chip">' + len + ' minutes</span></div>'
    + '<label class="l" for="ag">Meeting agenda <span class="hint">(optional, added to the calendar event, the invitation and the email. You can edit it later under Appointments.)</span></label>'
    + '<textarea id="ag" class="tx" placeholder="For example: Review the WRF-SFIRE set-up and plan the next steps."></textarea>'
    + '<div class="acts"><div class="act"><h3>Approve</h3><p>Confirms the slot, sends a Google Calendar invitation' + (hasCalApi_() ? ' with a Google Meet link' : '') + ' and a confirmation email.</p><button id="ap" class="b blue">Approve and send</button></div></div><div id="m" class="msg"></div>'
    + '<script>document.getElementById("ap").onclick=function(){var b=this;b.disabled=true;var t=b.textContent;b.textContent="Sending...";'
    + 'google.script.run.withSuccessHandler(function(h){document.open();document.write(h);document.close();}).withFailureHandler(function(){b.disabled=false;b.textContent=t;var m=document.getElementById("m");m.className="msg bad";m.textContent="Something went wrong. Please try again.";})'
    + '.approveWith(' + JSON.stringify(id) + ',' + JSON.stringify(p.sig) + ',document.getElementById("ag").value);};<\/script>';
  return out_(shell_('Approve this request', 'Add a meeting agenda if you like, then approve.', inner, true, 'appts'), 'Approve request');
}
function approveWith(id, sig, agenda) { return locked_(function () { return approveImpl_(id, sig, agenda); }); }
function approveImpl_(id, sig, agenda) {
  if (!id || sign_('approve', id) !== sig || !owner_()) return statusHtml_('Link not valid', 'This link is not valid.', 'bad');
  var cal = CalendarApp.getDefaultCalendar(), ev = cal.getEventById(id);
  if (!ev || !/^REQUEST/.test(ev.getTitle())) return statusHtml_('Already handled', 'This request was already approved or declined.', 'info');
  var name = ev.getTag('name') || 'the visitor', email = ev.getTag('email') || '', when = whenText_(ev.getStartTime(), ev.getEndTime());
  var len = Math.round((ev.getEndTime().getTime() - ev.getStartTime().getTime()) / 60000), purpose = purposeOf_(ev), meet = '', done = false;
  agenda = String(agenda || '').trim().slice(0, 2000);
  if (hasCalApi_()) {
    try {
      var res = Calendar.Events.insert({
        summary: 'Appointment: ' + name, description: descFor_(name, email, len, purpose, agenda, ''), colorId: '10',
        start: { dateTime: iso_(ev.getStartTime()), timeZone: TZ }, end: { dateTime: iso_(ev.getEndTime()), timeZone: TZ },
        attendees: email ? [{ email: email }] : [],
        extendedProperties: { private: { name: name, email: email, agenda: agenda } },
        conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }
      }, 'primary', { conferenceDataVersion: 1, sendUpdates: email ? 'all' : 'none' });
      done = true; meet = meetOf_(res);
      for (var k = 0; k < 3 && !meet; k++) { Utilities.sleep(900); try { meet = meetOf_(Calendar.Events.get('primary', res.id)); } catch (x) { } }
      if (meet) { try { Calendar.Events.patch({ description: descFor_(name, email, len, purpose, agenda, meet), extendedProperties: { private: { name: name, email: email, agenda: agenda, meet: meet } } }, 'primary', res.id, { sendUpdates: 'none' }); } catch (x) { } }
      try { ev.deleteEvent(); } catch (x) { console.error('pending delete failed: ' + x); }
    } catch (x) { console.error('api approve failed: ' + x); }
  }
  if (!done && email) {
    try {
      var ne = cal.createEvent('Appointment: ' + name, ev.getStartTime(), ev.getEndTime(), { description: descFor_(name, email, len, purpose, agenda, ''), guests: email, sendInvites: true });
      try { ne.setColor(CalendarApp.EventColor.GREEN); } catch (x) { }
      ne.setTag('name', name); ne.setTag('email', email); ne.setTag('agenda', agenda);
      ev.deleteEvent(); done = true;
    } catch (x) { console.error('invite failed: ' + x); }
  }
  if (!done) {
    ev.setTitle('Appointment: ' + name); ev.setDescription(descFor_(name, email, len, purpose, agenda, ''));
    try { ev.setColor(CalendarApp.EventColor.GREEN); } catch (x) { }
    try { ev.setTag('agenda', agenda); } catch (x) { }
    if (email) { try { ev.addGuest(email); } catch (x) { console.error('addGuest failed: ' + x); } }
  }
  ensureReminderTrigger_();
  if (email) {
    try {
      var rows = [['When', esc_(when)], ['Length', len + ' minutes']];
      if (agenda) rows.push(['Agenda', esc_(agenda).replace(/\n/g, '<br>')]);
      if (meet) rows.push(['Google Meet', '<a href="' + esc_(meet) + '">' + esc_(meet) + '</a>']);
      MailApp.sendEmail({ to: email, name: OWNER_NAME, subject: 'Appointment confirmed: ' + when,
        body: 'Hello ' + name + ', your appointment is confirmed: ' + when + ' (' + len + ' minutes).' + (agenda ? '\n\nAgenda:\n' + agenda : '') + (meet ? '\n\nGoogle Meet: ' + meet : '') + '\n\nA Google Calendar invitation has been sent to you.',
        htmlBody: mail_('Appointment confirmed', 'Hello ' + esc_(name) + ', your appointment is confirmed.', rows, meet ? [['Join Google Meet', meet, '#1e8e3e']] : [], 'A Google Calendar invitation has also been sent to this address. ' + OWNER_NAME) });
    } catch (x) { console.error('confirm mail failed: ' + x); }
  }
  return statusHtml_('Approved', 'The appointment with ' + esc_(name) + ' on ' + esc_(when) + ' is confirmed. ' + (email ? 'A Google Calendar invitation and a confirmation email were sent to ' + esc_(email) + '.' : 'No email address was stored for this request, so nothing was sent.')
    + (meet ? ' A Google Meet link was added.' : (hasCalApi_() ? '' : ' No Google Meet link was added because the Calendar service is not switched on in the script.')));
}

/* manage one confirmed appointment: change time, agenda, a note to the visitor, or cancel */
function apptEditPage_(p) {
  var id = p.id || '';
  if (!id || sign_('apedit', id) !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var ev = CalendarApp.getDefaultCalendar().getEventById(id);
  if (!ev || !/^Appointment:/.test(ev.getTitle())) return page_('Not found', 'This appointment is no longer on the calendar.', 'info');
  var name = ev.getTag('name') || ev.getTitle().replace(/^[^:]*:\s*/, ''), email = ev.getTag('email') || '', meet = ev.getTag('meet') || ((/Google Meet: (\S+)/.exec(String(ev.getDescription() || '')) || [])[1] || ''), agenda = ev.getTag('agenda') || ((/Meeting agenda:\n([\s\S]*)$/.exec(String(ev.getDescription() || '')) || [])[1] || '').trim();
  var s = ev.getStartTime(), len = Math.round((ev.getEndTime().getTime() - s.getTime()) / 60000);
  var inner = '<div class="chips"><span class="chip"><b>' + esc_(name) + '</b></span>' + (email ? '<span class="chip">' + esc_(email) + '</span>' : '<span class="chip">No email stored, nobody can be notified</span>') + '<span class="chip">Now: ' + esc_(whenText_(s, ev.getEndTime())) + '</span></div>'
    + (meet ? '<p class="sub" style="margin:0 0 8px">Google Meet: <a style="color:var(--a)" target="_blank" href="' + esc_(meet) + '">' + esc_(meet) + '</a></p>' + (hasCalApi_() ? '<div style="margin:0 0 14px;font-size:14px"><label style="display:flex;gap:8px;align-items:center;margin:0 0 6px"><input type="radio" name="mk" id="mk0" checked> Keep the same Google Meet link (also when the time changes)</label><label style="display:flex;gap:8px;align-items:center"><input type="radio" name="mk" id="mk1"> Generate a new Google Meet link and email it to them</label></div>' : '') : '')
    + '<div style="display:flex;flex-wrap:wrap;gap:12px;margin:0 0 14px"><label class="l" style="flex:1 1 150px">Date<input id="d" class="tx" style="min-height:0" type="date" value="' + Utilities.formatDate(s, TZ, 'yyyy-MM-dd') + '"></label>'
    + '<label class="l" style="flex:1 1 120px">Start time (IST)<input id="t" class="tx" style="min-height:0" type="time" step="300" value="' + Utilities.formatDate(s, TZ, 'HH:mm') + '"></label>'
    + '<label class="l" style="flex:1 1 120px">Length in minutes<input id="n" class="tx" style="min-height:0" type="number" min="1" max="1440" step="1" value="' + len + '"></label></div>'
    + '<label class="l" for="ag">Meeting agenda <span class="hint">(shown in the calendar event and in the email)</span></label>'
    + '<textarea id="ag" class="tx" style="min-height:90px" placeholder="What the meeting is about">' + esc_(agenda) + '</textarea>'
    + '<label class="l" for="nt" style="margin-top:14px">Note from Anandu <span class="hint">(sent to them in the email as &ldquo;Note from Anandu&rdquo;, for example the reason for the change)</span></label>'
    + '<textarea id="nt" class="tx" style="min-height:90px" placeholder="For example: I have a faculty meeting at that time, so I moved us to the afternoon."></textarea>'
    + (!meet && hasCalApi_() ? '<label style="display:flex;gap:8px;align-items:center;margin:14px 0 0;font-size:14px"><input type="checkbox" id="am"> Add a Google Meet link to this appointment</label>' : '')
    + (!hasCalApi_() ? '<p class="sub" style="margin:14px 0 0">Google Meet links need the Google Calendar service to be switched on in the script. Time changes and notes still work without it.</p>' : '')
    + '<div class="acts"><div class="act"><h3>Save and notify</h3><p>Updates the calendar event and emails them the new details with your note.</p><button id="sv" class="b blue">Save changes and email them</button></div>'
    + '<div class="act"><h3>Cancel appointment</h3><p>Removes it from your calendar and saves it in History. Their Google Calendar is updated too.</p>'
    + '<label style="display:flex;gap:8px;align-items:flex-start;margin:0 0 10px;font-size:14px"><input type="checkbox" id="an" checked style="margin-top:3px"> When I cancel and notify, ask them to choose a new time (adds a schedule button to the email)</label>'
    + '<button id="cx" class="b red" style="margin:0 6px 6px 0">Cancel and notify them</button><button id="co" class="b nu">Cancel only, no email from me</button></div></div><div id="m" class="msg"></div>'
    + '<script>var ID=' + JSON.stringify(id) + ',S1=' + JSON.stringify(p.sig) + ',S2=' + JSON.stringify(sign_('apcancel', id)) + ',q=function(i){return document.getElementById(i);};'
    + 'function run(btn,fn){var bs=document.querySelectorAll(".b");for(var i=0;i<bs.length;i++)bs[i].disabled=true;var t=btn.textContent;btn.textContent="Working...";var r=google.script.run.withSuccessHandler(function(h){document.open();document.write(h);document.close();}).withFailureHandler(function(){for(var i=0;i<bs.length;i++)bs[i].disabled=false;btn.textContent=t;q("m").className="msg bad";q("m").textContent="Something went wrong. Please try again.";});fn(r);}'
    + 'q("sv").onclick=function(){run(this,function(r){r.apptSave(ID,S1,q("d").value,q("t").value,q("n").value,q("ag").value,q("nt").value,q("mk1")?q("mk1").checked:(q("am")?q("am").checked:false));});};'
    + 'function arm(b,txt,notify){var a=false;b.onclick=function(){if(!a){a=true;this.textContent=txt;return;}run(this,function(r){r.apptCancel(ID,S2,q("nt").value,notify,q("an").checked);});};}'
    + 'arm(q("cx"),"Click again to cancel and email them",true);arm(q("co"),"Click again to cancel without an email",false);<\/script>';
  return out_(shell_('Manage appointment', 'Change the time, add or edit the agenda, send a note or cancel. They are emailed and their calendar is updated.', inner, true, 'appts'), 'Manage appointment');
}
function apptSave(id, sig, dateStr, timeStr, len, agenda, note, addMeet) { return locked_(function () { return apptSaveImpl_(id, sig, dateStr, timeStr, len, agenda, note, addMeet); }); }
function apptSaveImpl_(id, sig, dateStr, timeStr, len, agenda, note, addMeet) {
  if (!id || sign_('apedit', id) !== sig || !owner_()) return statusHtml_('Link not valid', 'This link is not valid.', 'bad');
  var cal = CalendarApp.getDefaultCalendar(), ev = cal.getEventById(id);
  if (!ev || !/^Appointment:/.test(ev.getTitle())) return statusHtml_('Not found', 'This appointment is no longer on the calendar.', 'info');
  var name = ev.getTag('name') || ev.getTitle().replace(/^[^:]*:\s*/, ''), email = ev.getTag('email') || '', oldS = ev.getStartTime(), oldE = ev.getEndTime();
  var oldLen = Math.round((oldE.getTime() - oldS.getTime()) / 60000); len = Math.round(+len); if (!(len >= 1 && len <= 1440)) len = oldLen;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr)) || !/^\d{2}:\d{2}$/.test(String(timeStr))) return statusHtml_('Check the time', 'Please choose a valid date and start time.', 'bad');
  var ns = new Date(Date.parse(dateStr + 'T' + timeStr + ':00+05:30')); if (isNaN(ns.getTime())) return statusHtml_('Check the time', 'Please choose a valid date and start time.', 'bad');
  var ne = new Date(ns.getTime() + len * 60000), timeChanged = ns.getTime() !== oldS.getTime() || ne.getTime() !== oldE.getTime();
  if (timeChanged) {
    if (ns.getTime() < Date.now()) return statusHtml_('That time has passed', 'Choose a time in the future.', 'bad');
    var clash = cal.getEvents(ns, ne).some(function (x) { return x.getId() !== ev.getId() && !(x.getMyStatus && x.getMyStatus() === CalendarApp.GuestStatus.NO); });
    if (clash) return statusHtml_('That time is taken', 'Another event on your calendar overlaps the new time. Choose a different time.', 'bad');
  }
  agenda = String(agenda || '').trim().slice(0, 2000); note = String(note || '').trim().slice(0, 1500);
  var api = apiEvent_(ev), agendaChanged = agenda !== String(ev.getTag('agenda') || ''), meet = ev.getTag('meet') || meetOf_(api) || '', wantMeet = !!addMeet && hasCalApi_() && !!api, replaceMeet = wantMeet && !!meet, oldMeet = meet;
  if (!timeChanged && !agendaChanged && !note && !wantMeet) return statusHtml_('Nothing to change', 'You did not change the time or the agenda, and wrote no note.', 'info');
  var done = false;
  if (api) {
    try {
      var patch = { description: descFor_(name, email, len, purposeOf_(ev), agenda, meet), extendedProperties: { private: { name: name, email: email, agenda: agenda, meet: meet } } };
      if (timeChanged) { patch.start = { dateTime: iso_(ns), timeZone: TZ }; patch.end = { dateTime: iso_(ne), timeZone: TZ }; }
      if (replaceMeet) { try { Calendar.Events.patch({ conferenceData: null }, 'primary', api.id, { conferenceDataVersion: 1, sendUpdates: 'none' }); } catch (x) { console.error('old meet removal failed: ' + x); } meet = ''; patch.description = descFor_(name, email, len, purposeOf_(ev), agenda, ''); patch.extendedProperties.private.meet = ''; }
      if (wantMeet) patch.conferenceData = { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
      var res = Calendar.Events.patch(patch, 'primary', api.id, { conferenceDataVersion: 1, sendUpdates: email ? 'all' : 'none' });
      if (wantMeet) {
        meet = meetOf_(res);
        for (var k = 0; k < 3 && !meet; k++) { Utilities.sleep(900); try { meet = meetOf_(Calendar.Events.get('primary', api.id)); } catch (x) { } }
        if (meet) { Calendar.Events.patch({ description: descFor_(name, email, len, purposeOf_(ev), agenda, meet), extendedProperties: { private: { name: name, email: email, agenda: agenda, meet: meet } } }, 'primary', api.id, { sendUpdates: 'none' }); }
      }
      done = true;
    } catch (x) { console.error('api save failed: ' + x); }
  }
  if (!done) { try { if (timeChanged) ev.setTime(ns, ne); ev.setDescription(descFor_(name, email, len, purposeOf_(ev), agenda, meet)); } catch (x) { return statusHtml_('Could not update', 'The calendar event could not be updated: ' + esc_(String(x)), 'bad'); } }
  try { ev.setTag('agenda', agenda); if (replaceMeet) ev.deleteTag('meet'); if (meet) ev.setTag('meet', meet); if (replaceMeet) ev.deleteTag('rem'); if (timeChanged) ev.deleteTag('rem'); } catch (x) { }
  ensureReminderTrigger_();
  var when = whenText_(ns, ne), oldWhen = whenText_(oldS, oldE);
  if (email) {
    try {
      var intro = 'Hello ' + esc_(name) + ', ' + (timeChanged ? 'your appointment has been moved to a new time.' : agendaChanged ? 'the agenda for your appointment has been updated.' : 'I have a note about your appointment.') + (replaceMeet && meet ? ' A new Google Meet link was created. Please use it instead of the earlier one.' : '') + noteBox_(note);
      var rows = [['When', esc_(when)]]; if (timeChanged) rows.push(['Was', esc_(oldWhen)]); rows.push(['Length', len + ' minutes']);
      if (agenda) rows.push(['Agenda', esc_(agenda).replace(/\n/g, '<br>')]); if (meet) rows.push(['Google Meet', '<a href="' + esc_(meet) + '">' + esc_(meet) + '</a>']);
      MailApp.sendEmail({ to: email, name: OWNER_NAME, subject: (timeChanged ? 'Appointment time changed: ' : 'Update about your appointment: ') + when,
        body: 'Hello ' + name + ', ' + (timeChanged ? 'your appointment has been moved to ' + when + ' (was ' + oldWhen + ').' : 'there is an update about your appointment on ' + when + '.') + (note ? '\n\nNote from Anandu:\n' + note : '') + (agenda ? '\n\nAgenda:\n' + agenda : '') + (meet ? '\n\nGoogle Meet: ' + meet : '') + '\n\nYour Google Calendar entry has been updated.',
        htmlBody: mail_(timeChanged ? 'Appointment time changed' : 'Update about your appointment', intro, rows, meet ? [['Join Google Meet', meet, '#1e8e3e']] : [], 'Your Google Calendar entry has been updated automatically. ' + OWNER_NAME) });
    } catch (x) { console.error('update mail failed: ' + x); }
  }
  return statusHtml_('Saved', 'The appointment with ' + esc_(name) + ' is now ' + esc_(when) + '. ' + (email ? 'An email with your ' + (note ? 'note and the ' : '') + 'details was sent to ' + esc_(email) + (api && done ? ', and their Google Calendar was updated.' : '.') : 'No email address is stored, so nobody was notified.')
    + (wantMeet ? (meet ? (replaceMeet ? ' A new Google Meet link replaced the old one.' : ' A Google Meet link was added.') : (replaceMeet ? ' The new Google Meet link could not be created, and the old one was removed. Try again.' : ' The Google Meet link could not be created.')) : '') + (done || !email ? '' : ' The calendar event was updated, but Google did not send its own update email because the Calendar service is off in the script.'));
}
function apptCancel(id, sig, note, notify, askNew) {
  if (!id || sign_('apcancel', id) !== sig || !owner_()) return statusHtml_('Link not valid', 'This link is not valid.', 'bad');
  var cal = CalendarApp.getDefaultCalendar(), ev = cal.getEventById(id);
  if (!ev || !/^Appointment:/.test(ev.getTitle())) return statusHtml_('Not found', 'This appointment is no longer on the calendar.', 'info');
  note = String(note || '').trim().slice(0, 1500);
  var name = ev.getTag('name') || ev.getTitle().replace(/^[^:]*:\s*/, ''), email = ev.getTag('email') || '', when = whenText_(ev.getStartTime(), ev.getEndTime());
  try { arcSave_(ev, 'Cancelled', note); } catch (x) { console.error('history save failed: ' + x); }
  var api = apiEvent_(ev), gone = false;
  if (api) { try { Calendar.Events.remove('primary', api.id, { sendUpdates: email ? 'all' : 'none' }); gone = true; } catch (x) { console.error('api remove failed: ' + x); } }
  if (!gone) { try { ev.deleteEvent(); } catch (x) { return statusHtml_('Could not cancel', 'The calendar event could not be removed: ' + esc_(String(x)), 'bad'); } }
  if (email && notify) {
    try {
      MailApp.sendEmail({ to: email, name: OWNER_NAME, subject: 'Appointment cancelled: ' + when,
        body: 'Hello ' + name + ', I am sorry, I have to cancel our appointment on ' + when + '.' + (note ? '\n\nNote from Anandu:\n' + note : '') + (askNew ? '\n\nPlease choose a new time at ' + SITE_URL : ''),
        htmlBody: mail_('Appointment cancelled', 'Hello ' + esc_(name) + ', I am sorry, I have to cancel our appointment on ' + esc_(when) + '.' + (askNew ? ' Please choose a new time that suits you.' : '') + noteBox_(note), [], askNew ? [['Choose a new time', SITE_URL, '#1f4e9c']] : [], OWNER_NAME) });
    } catch (x) { console.error('cancel mail failed: ' + x); }
  }
  return statusHtml_('Cancelled', 'The appointment with ' + esc_(name) + ' on ' + esc_(when) + ' was cancelled and removed from your calendar. ' + (email && notify ? 'An email' + (note ? ' with your note' : '') + (askNew ? ' asking them to choose a new time' : '') + ' was sent to ' + esc_(email) + '. ' : (email ? 'No email was sent from you, but Google updated their calendar. ' : '')) + 'It is saved in History.');
}
/* delete a meeting that has already happened, with an optional message to the visitor */
function apptDelPage_(p) {
  var id = p.id || '';
  if (!id || sign_('apdel', id) !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var ev = CalendarApp.getDefaultCalendar().getEventById(id);
  if (!ev || !/^Appointment:/.test(ev.getTitle())) return page_('Not found', 'This appointment is no longer on the calendar.', 'info');
  if (ev.getEndTime().getTime() > Date.now()) return page_('Not finished yet', 'Only appointments that have already happened can be deleted here. Use Change time, agenda or cancel for an upcoming one.', 'info');
  var name = ev.getTag('name') || ev.getTitle().replace(/^[^:]*:\s*/, ''), email = ev.getTag('email') || '';
  var inner = '<div class="chips"><span class="chip"><b>' + esc_(name) + '</b></span>' + (email ? '<span class="chip">' + esc_(email) + '</span>' : '<span class="chip">No email stored, no message can be sent</span>') + '<span class="chip">' + esc_(whenText_(ev.getStartTime(), ev.getEndTime())) + '</span></div>'
    + '<label class="l" for="nt">Message to them <span class="hint">(optional, emailed to them as &ldquo;Note from Anandu&rdquo;. Leave it empty to delete without sending anything.)</span></label>'
    + '<textarea id="nt" class="tx" placeholder="For example: Thank you for the meeting. I have shared the notes by email."></textarea>'
    + '<div class="acts"><div class="act"><h3>Delete permanently</h3><p>Removes it from your Google Calendar and from History. This cannot be undone. To keep a record, use Archive instead.</p><button id="dl" class="b red">Delete this appointment</button></div></div><div id="m" class="msg"></div>'
    + '<script>var armed=false,q=function(i){return document.getElementById(i);};q("dl").onclick=function(){var b=this;if(!armed){armed=true;b.textContent="Click again to delete permanently";return;}b.disabled=true;b.textContent="Deleting...";'
    + 'google.script.run.withSuccessHandler(function(h){document.open();document.write(h);document.close();}).withFailureHandler(function(){b.disabled=false;b.textContent="Delete this appointment";q("m").className="msg bad";q("m").textContent="Something went wrong. Please try again.";})'
    + '.apptDelete(' + JSON.stringify(id) + ',' + JSON.stringify(sign_('apdelgo', id)) + ',q("nt").value);};<\/script>';
  return out_(shell_('Delete appointment', 'Delete a meeting that has already happened, and send them a message if you wish.', inner, true, 'appts'), 'Delete appointment');
}
function apptDelete(id, sig, note) { return locked_(function () {
  if (!id || sign_('apdelgo', id) !== sig || !owner_()) return statusHtml_('Link not valid', 'This link is not valid.', 'bad');
  var cal = CalendarApp.getDefaultCalendar(), ev = cal.getEventById(id);
  if (!ev || !/^Appointment:/.test(ev.getTitle())) return statusHtml_('Not found', 'This appointment is no longer on the calendar.', 'info');
  if (ev.getEndTime().getTime() > Date.now()) return statusHtml_('Not finished yet', 'Only appointments that have already happened can be deleted here.', 'info');
  note = String(note || '').trim().slice(0, 1500);
  var name = ev.getTag('name') || ev.getTitle().replace(/^[^:]*:\s*/, ''), email = ev.getTag('email') || '', when = whenText_(ev.getStartTime(), ev.getEndTime());
  var api = apiEvent_(ev), gone = false;
  if (api) { try { Calendar.Events.remove('primary', api.id, { sendUpdates: 'none' }); gone = true; } catch (x) { console.error('api remove failed: ' + x); } }
  if (!gone) { try { ev.deleteEvent(); } catch (x) { return statusHtml_('Could not delete', 'The calendar event could not be removed: ' + esc_(String(x)), 'bad'); } }
  try { PropertiesService.getScriptProperties().deleteProperty(arcKey_(id)); } catch (x) { }
  var sent = false;
  if (note && email) {
    try {
      MailApp.sendEmail({ to: email, name: OWNER_NAME, subject: 'A message about our meeting on ' + when,
        body: 'Hello ' + name + ',\n\nNote from Anandu:\n' + note + '\n\n(About our meeting on ' + when + '.)\n\n' + OWNER_NAME,
        htmlBody: mail_('A message from Anandu', 'Hello ' + esc_(name) + ',' + noteBox_(note), [['Meeting', esc_(when)]], [], OWNER_NAME) });
      sent = true;
    } catch (x) { console.error('delete mail failed: ' + x); }
  }
  return statusHtml_('Deleted', 'The appointment with ' + esc_(name) + ' on ' + esc_(when) + ' was deleted from your calendar and from History. ' + (sent ? 'Your message was emailed to ' + esc_(email) + '.' : (note && !email ? 'No email address is stored, so your message could not be sent.' : (note ? 'Your message could not be sent.' : 'No message was sent.'))));
}); }
function apptArchive_(p) {
  var id = p.id || '';
  if (!id || sign_('arch', id) !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var ev = CalendarApp.getDefaultCalendar().getEventById(id);
  if (!ev) return page_('Not found', 'This appointment is no longer on the calendar.', 'info');
  arcSave_(ev, 'Archived', ''); try { ev.setTag('arch', '1'); } catch (x) { }
  return appointmentsPage_({ sig: sign_('admin', 'appts') });
}
function apptUnarchive_(p) {
  var key = p.id || '';
  if (key.indexOf('ARC_') !== 0 || sign_('unarch', key) !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var props = PropertiesService.getScriptProperties(), raw = props.getProperty(key);
  if (raw) { try { var r = JSON.parse(raw), ev = CalendarApp.getDefaultCalendar().getEventById(r.i); if (ev) ev.deleteTag('arch'); } catch (x) { } props.deleteProperty(key); }
  return apptHistoryPage_({ sig: sign_('admin', 'apthist') });
}
function apptHistoryPage_(p) {
  if (sign_('admin', 'apthist') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var list = arcList_();
  var items = list.map(function (r) {
    var st = r.st === 'Cancelled' ? '<span class="pl y">Cancelled</span>' : '<span class="pl x">Archived</span>';
    return '<div class="li" data-s="' + esc_((r.n + ' ' + r.e + ' ' + r.a + ' ' + r.p).toLowerCase()) + '"><div class="h"><span class="n">' + esc_(r.n) + '</span>' + (r.e ? '<a href="mailto:' + esc_(r.e) + '" style="color:var(--a);font-size:13px">' + esc_(r.e) + '</a>' : '') + st + '</div>'
      + '<div class="m">' + esc_(whenText_(new Date(r.s), new Date(r.x))) + ' &middot; saved ' + esc_(Utilities.formatDate(new Date(r.t), TZ, 'd MMM yyyy')) + '</div>'
      + (r.a ? '<div class="b"><b>Agenda:</b> ' + esc_(r.a) + '</div>' : '') + (r.nt ? '<div class="b"><b>Note from Anandu:</b> ' + esc_(r.nt) + '</div>' : '') + (r.p && !r.a ? '<div class="b">' + esc_(r.p) + '</div>' : '')
      + (r.st === 'Archived' ? '<a class="ab" style="background:var(--a)" target="_top" href="' + portalBase_() + '?action=unarch&id=' + encodeURIComponent(r.k) + '&sig=' + sign_('unarch', r.k) + '">Restore to Appointments</a>' : '')
      + (r.e ? '<a class="ab nu" target="_top" href="' + link_('compose', 'new') + '&to=' + encodeURIComponent(r.e) + '">Write to them</a>' : '') + '</div>';
  }).join('') || '<p class="sub">Nothing in History yet. Archived and cancelled appointments are saved here.</p>';
  var inner = listStyle_() + '<p style="margin:0 0 14px"><a class="ab" style="background:var(--a)" target="_top" href="' + apptUrl_() + '">&larr; Back to Appointments</a></p>'
    + '<input id="q" class="tx" style="min-height:0;margin:0 0 14px" placeholder="Search name, email or agenda"><div id="l">' + items + '</div>'
    + '<script>document.getElementById("q").oninput=function(){var v=this.value.toLowerCase(),r=document.querySelectorAll("#l .li");for(var i=0;i<r.length;i++)r[i].style.display=r[i].getAttribute("data-s").indexOf(v)<0?"none":"";};<\/script>';
  return out_(shell_('Appointments history', list.length + ' saved appointment' + (list.length === 1 ? '' : 's') + '. The latest ' + ARC_MAX + ' are kept.', inner, true), 'Appointments history');
}

function appointmentsPage_(p) {
  if (sign_('admin', 'appts') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var cal = CalendarApp.getDefaultCalendar(), now = new Date(), from = new Date(now.getTime() - 60 * 86400000), to = new Date(now.getTime() + (DAYS_AHEAD + 30) * 86400000);
  var evs = cal.getEvents(from, to).filter(function (e) { return /^(REQUEST|Appointment:)/.test(e.getTitle()) && e.getTag('arch') !== '1'; });
  var card = function (e) {
    var pend = /^REQUEST/.test(e.getTitle()), past = e.getEndTime().getTime() < now.getTime(), name = e.getTag('name') || e.getTitle().replace(/^[^:]*:\s*/, ''), email = e.getTag('email') || '', id = e.getId();
    var desc = purposeOf_(e) || String(e.getDescription() || '').replace(/^[\s\S]*Purpose:\s*/, '').slice(0, 1000), agenda = e.getTag('agenda') || '', meet = e.getTag('meet') || ((/Google Meet: (\S+)/.exec(String(e.getDescription() || '')) || [])[1] || '');
    return '<div class="li"><div class="h"><span class="n">' + esc_(name) + '</span>' + (email ? '<a href="mailto:' + esc_(email) + '" style="color:var(--a);font-size:13px">' + esc_(email) + '</a>' : '')
      + (pend ? '<span class="pl y">Waiting for your reply</span>' : (past ? '<span class="pl x">Past</span>' : '<span class="pl g">Confirmed</span>')) + '</div>'
      + '<div class="m">' + esc_(whenText_(e.getStartTime(), e.getEndTime())) + '</div>' + (desc ? '<div class="b">' + esc_(desc.slice(0, 1000)) + '</div>' : '<div class="b"></div>')
      + (agenda ? '<div class="b" style="margin-top:-4px"><b>Agenda:</b> ' + esc_(agenda) + '</div>' : '')
      + (meet ? '<div class="b" style="margin-top:-4px;word-break:break-all"><b>Google Meet:</b> <a style="color:var(--a)" target="_blank" href="' + esc_(meet) + '">' + esc_(meet) + '</a></div>' : '')
      + (pend && !past ? '<a class="ab" style="background:var(--green)" target="_top" href="' + link_('approve', id) + '">Approve</a><a class="ab" style="background:var(--red)" target="_top" href="' + link_('decline', id) + '">Decline</a>' : '')
      + (!pend && !past ? '<a class="ab" style="background:var(--a)" target="_top" href="' + portalBase_() + '?action=apedit&id=' + encodeURIComponent(id) + '&sig=' + sign_('apedit', id) + '">Change time, agenda or cancel</a>' : '')
      + (meet && !past ? '<a class="ab" style="background:var(--green)" target="_blank" href="' + esc_(meet) + '">Join Meet</a>' : '')
      + (!pend && past ? '<a class="ab" style="background:var(--red)" target="_top" href="' + portalBase_() + '?action=apdel&id=' + encodeURIComponent(id) + '&sig=' + sign_('apdel', id) + '">Delete</a>' : '')
      + (!pend ? '<a class="ab nu" target="_top" href="' + portalBase_() + '?action=arch&id=' + encodeURIComponent(id) + '&sig=' + sign_('arch', id) + '">Archive</a>' : '')
      + (email ? '<a class="ab" style="background:var(--a)" target="_top" href="' + link_('compose', 'new') + '&to=' + encodeURIComponent(email) + '">Write to them</a>' : '') + '<a class="ab nu" target="_blank" href="' + calLink_(e) + '">Open in Calendar</a></div>';
  };
  var pend = evs.filter(function (e) { return /^REQUEST/.test(e.getTitle()) && e.getEndTime() >= now; }), up = evs.filter(function (e) { return /^Appointment:/.test(e.getTitle()) && e.getEndTime() >= now; }),
    old = evs.filter(function (e) { return e.getEndTime() < now; }).reverse();
  var sec = function (t, a, em) { return '<h2 style="font-size:17px;margin:22px 0 8px">' + t + ' (' + a.length + ')</h2>' + (a.length ? a.map(card).join('') : '<p class="sub" style="margin:0">' + em + '</p>'); };
  var hist = arcList_().length;
  var inner = listStyle_() + '<p style="margin:0 0 4px"><a class="ab" style="background:var(--a)" target="_top" href="' + portalBase_() + '?action=apthist&sig=' + sign_('admin', 'apthist') + '">History (' + hist + ')</a></p>'
    + sec('Waiting for your reply', pend, 'No pending requests.') + sec('Upcoming appointments', up, 'No confirmed appointments ahead.') + sec('Past (last 60 days)', old, 'Nothing in the last 60 days.');
  return out_(shell_('Appointments', 'Requests from the booking calendar. Approve with an agenda, change a time, cancel or archive here. They are emailed and their calendar is updated. Archived appointments move to History.', inner, true), 'Appointments');
}

/* ---- new request (POST) ---- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var p = JSON.parse(e.postData.contents || '{}');
    if (p.website) return json_({ ok: true });
    if (p.kind === 'otp') return otpSend_(p);
    if (p.kind === 'verify') return otpVerify_(p);
    if (p.kind === 'message') return message_(p);
    if (p.kind === 'subscribe') return subscribe_(p);
    if (p.kind === 'access') return accessRequest_(p);
    if (p.kind === 'visit') return visit_(p);
    if (p.kind === 'leave') return leave_(p);
    var name = String(p.name || '').trim().slice(0, 80), email = String(p.email || '').trim().slice(0, 120), topic = String(p.topic || '').trim().slice(0, 1000);
    var len = +p.len, start = new Date(+p.start);
    if (!name || !topic || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json_({ ok: false, error: 'invalid' });
    if (blockedEmail_(email) || !tokenOk_(email, p.vtoken)) return json_({ ok: false, error: 'unverified' });
    if (LENGTHS.indexOf(len) < 0 || isNaN(start.getTime())) return json_({ ok: false, error: 'invalid' });
    var end = new Date(start.getTime() + len * 60000), now = new Date();
    if (now.getTime() >= Date.parse(ymd_(start) + 'T00:00:00+05:30') - (24 - BOOK_CLOSE_HOUR) * 3600000) return json_({ ok: false, error: 'too_soon' });
    var wd = +Utilities.formatDate(start, TZ, 'u');
    var sh = +Utilities.formatDate(start, TZ, 'H') + (+Utilities.formatDate(start, TZ, 'm')) / 60;
    var eh = +Utilities.formatDate(end, TZ, 'H') + (+Utilities.formatDate(end, TZ, 'm')) / 60;
    if (ymd_(start) !== ymd_(end)) eh = 24;
    var wkEnd = wd === 6 || EXTRA_DAYS.indexOf(ymd_(start)) >= 0;
    if ((wd === 7 && !wkEnd) || sh < (wkEnd ? SAT_START_H : START_H) || eh > (wkEnd ? SAT_END_H : END_H)) return json_({ ok: false, error: 'hours' });
    var cal = CalendarApp.getDefaultCalendar();
    var clash = cal.getEvents(start, end).some(function (ev) { return !(ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.NO); });
    var offDay = cal.getEventsForDay(start).some(function (ev) { return ev.isAllDayEvent(); });
    if (!offDay) { try { var h = CalendarApp.getCalendarById(HOLIDAY_CAL); if (h) offDay = h.getEventsForDay(start).length > 0; } catch (err) { } }
    if (clash || offDay || blockedSlot_(start, end)) return json_({ ok: false, error: 'taken' });
    var ev = cal.createEvent('REQUEST (pending): ' + name, start, end, {
      description: 'Appointment request from the website\n\nName: ' + name + '\nEmail: ' + email + '\nLength: ' + len + ' minutes\n\nPurpose:\n' + topic
    });
    ev.setTag('name', name); ev.setTag('email', email);
    try { ev.setColor(CalendarApp.EventColor.ORANGE); } catch (err) { }
    var when = whenText_(start, end), id = ev.getId();
    var topicHtml = esc_(topic).replace(/\n/g, '<br>');
    try {
      MailApp.sendEmail({ to: email, name: OWNER_NAME, subject: 'Appointment request received: ' + when,
        body: 'Hello ' + name + ', I have received your appointment request for ' + when + ' (' + len + ' minutes). It is not confirmed yet; I will reply by email.\n\nPurpose you gave:\n' + topic + '\n\nThe details shown here are the details you filled in on the website.',
        htmlBody: mail_('Appointment request received', 'Hello ' + esc_(name) + ', I have received your request. It is <b>not confirmed yet</b>; I will reply by email.',
          [['Name', esc_(name)], ['Email', esc_(email)], ['When', esc_(when)], ['Length', len + ' minutes'], ['Purpose', topicHtml]], [], 'The details shown above are the details you filled in on the website.<br><br>' + esc_(OWNER_NAME)) });
      if (OWNER_NOTIFY) MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), replyTo: email, name: 'no-reply-appointment-website',
        subject: 'Someone has applied for an appointment on ' + when,
        body: name + ' <' + email + '> requested ' + when + ' (' + len + ' minutes).\n\nPurpose:\n' + topic + '\n\nApprove: ' + link_('approve', id) + '\nDecline: ' + link_('decline', id) + '\nCalendar: ' + calLink_(ev),
        htmlBody: mail_('New appointment request', 'A visitor has asked for an appointment through your website.',
          [['Name', esc_(name)], ['Email', '<a href="mailto:' + esc_(email) + '">' + esc_(email) + '</a>'], ['Date', esc_(Utilities.formatDate(start, TZ, 'EEEE d MMMM yyyy'))],
           ['Time', esc_(Utilities.formatDate(start, TZ, 'HH:mm') + ' to ' + Utilities.formatDate(end, TZ, 'HH:mm') + ' IST')], ['Length', len + ' minutes'], ['Purpose', topicHtml]],
          [['Approve', link_('approve', id), '#1e8e3e'], ['Decline', link_('decline', id), '#c5221f'], ['Open in Google Calendar', calLink_(ev), '#1f4e9c']],
          'Approve confirms the slot, sends the visitor a Google Calendar invitation and a confirmation email. Decline opens a page where you can type a reason, which is included in the email to the visitor, and lets you choose to keep the slot blocked or free it. The request is on your calendar as REQUEST (pending).') });
    } catch (err) { console.error('mail failed: ' + err); }
    return json_({ ok: true });
  } catch (err) {
    console.error('post failed: ' + err);
    return json_({ ok: false, error: 'server' });
  } finally { try { lock.releaseLock(); } catch (x) { } }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---- CV: the LaTeX source lives in the Drive folder "Website CV"; the portal edits it, compiles it to PDF and downloads both ---- */
var CV_NAME_ = 'Anandu_Prabhakaran_CV';
var CV_GIT_ = 'https://raw.githubusercontent.com/anandupiiserk/anandupiiserk.github.io/main/tools/cv/Anandu_Prabhakaran_CV.tex';
/* short website addresses (anandu-prabhakaran.pages.dev/visitors and so on) arrive here as ?action=open&to=...
   gate_ has already confirmed the owner, so the signed link is made here on the server and never appears on the website */
var OPEN_ = { home: function () { return portalBase_() + '?action=go'; }, visitors: function () { return visUrl_(); }, messages: function () { return msgUrl_(); }, appointments: function () { return apptUrl_(); },
  subscribers: function () { return adminUrl_(); }, email: function () { return mailUrl_(); }, cv: function () { return cvUrl_(); } };
function openPage_(p) {
  var f = OPEN_[String(p.to || 'home')] || OPEN_.home, u = f(), q = {};
  u.split('?')[1].split('&').forEach(function (kv) { var i = kv.indexOf('='); q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); });
  return act_(q);
}
function cvUrl_() { return portalBase_() + '?action=cv&sig=' + sign_('admin', 'cv'); }
function cvOk_(sig) { if (sign_('admin', 'cv') !== sig) throw new Error('This link is not valid. Open CV again from the portal.'); }
function cvFolder_() {
  var pr = PropertiesService.getScriptProperties(), id = pr.getProperty('CV_FOLDER'), f = null;
  if (id) { try { f = DriveApp.getFolderById(id); if (f.isTrashed()) f = null; } catch (e) { f = null; } }
  if (!f) { var it = DriveApp.getFoldersByName('Website CV'); f = it.hasNext() ? it.next() : DriveApp.createFolder('Website CV'); pr.setProperty('CV_FOLDER', f.getId()); }
  return f;
}
function cvSub_(f, name) { var it = f.getFoldersByName(name); return it.hasNext() ? it.next() : f.createFolder(name); }
function cvFile_(f, name) { var it = f.getFilesByName(name); while (it.hasNext()) { var x = it.next(); if (!x.isTrashed()) return x; } return null; }
function cvGit_() {
  var r = UrlFetchApp.fetch(CV_GIT_ + '?t=' + Date.now(), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('Could not fetch the CV from GitHub (HTTP ' + r.getResponseCode() + ').');
  return r.getContentText('UTF-8');
}
function cvTex_(f) { var t = cvFile_(f, CV_NAME_ + '.tex'); if (!t) t = f.createFile(CV_NAME_ + '.tex', cvGit_(), 'text/plain'); return t; }
function cvWhen_(d) { return Utilities.formatDate(d, TZ, 'd MMM yyyy, h:mm a'); }
function cvInfo_(f) {
  var t = cvFile_(f, CV_NAME_ + '.tex'), p = cvFile_(f, CV_NAME_ + '.pdf');
  return { folder: f.getUrl(), tex: t ? t.getUrl() : '', texWhen: t ? cvWhen_(t.getLastUpdated()) : '', texDl: t ? 'https://drive.google.com/uc?export=download&id=' + t.getId() : '',
    pdf: p ? p.getUrl() : '', pdfId: p ? p.getId() : '', pdfWhen: p ? cvWhen_(p.getLastUpdated()) : '', pdfDl: p ? 'https://drive.google.com/uc?export=download&id=' + p.getId() : '' };
}
/* saves the source; the version it replaces goes to "Website CV/history" (the newest 30 are kept) */
function cvWrite_(tex) {
  var f = cvFolder_(), t = cvTex_(f), old = t.getBlob().getDataAsString('UTF-8');
  if (old !== tex) {
    var h = cvSub_(f, 'history');
    h.createFile(CV_NAME_ + ' ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HHmmss') + '.tex', old, 'text/plain');
    var all = [], it = h.getFiles(); while (it.hasNext()) all.push(it.next());
    all.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
    all.slice(30).forEach(function (x) { x.setTrashed(true); });
    t.setContent(tex);
  }
  return f;
}
function cvSave(sig, tex) { cvOk_(sig); var f = cvWrite_(String(tex || '')); return cvInfo_(f); }
function cvFromGit(sig) { cvOk_(sig); var tex = cvGit_(), f = cvWrite_(tex); var r = cvInfo_(f); r.text = tex; return r; }
function cvLatest(sig) { cvOk_(sig); var f = cvFolder_(), p = cvFile_(f, CV_NAME_ + '.pdf'); return p ? Utilities.base64Encode(p.getBlob().getBytes()) : ''; }
/* both files in one zip: the LaTeX source to edit and the last built PDF */
function cvZip(sig) {
  cvOk_(sig); var f = cvFolder_(), t = cvTex_(f), p = cvFile_(f, CV_NAME_ + '.pdf'), bl = [t.getBlob().setName(CV_NAME_ + '.tex')];
  if (p) bl.push(p.getBlob().setName(CV_NAME_ + '.pdf'));
  return Utilities.base64Encode(Utilities.zip(bl, CV_NAME_ + '.zip').getBytes());
}
/* run once from the editor (select authorizeCv, press Run) to grant Drive access; it also creates the Website CV folder */
function authorizeCv() { var f = cvFolder_(); cvTex_(f); Logger.log('CV folder ready: ' + f.getUrl()); }
function cvIsPdf_(b) { return b && b.length > 4 && b[0] === 37 && b[1] === 80 && b[2] === 68 && b[3] === 70; }
function cvTexlive_(tex) {
  var bd = '----cvform' + Date.now(), nl = '\r\n';
  var part = function (k, v) { return '--' + bd + nl + 'Content-Disposition: form-data; name="' + k + '"' + nl + nl + v + nl; };
  var body = part('filename[]', 'document.tex') + part('filecontents[]', tex) + part('engine', 'pdflatex') + part('return', 'pdf') + '--' + bd + '--' + nl;
  var r = UrlFetchApp.fetch('https://texlive.net/cgi-bin/latexcgi', { method: 'post', contentType: 'multipart/form-data; boundary=' + bd, payload: Utilities.newBlob(body).getBytes(), muteHttpExceptions: true, followRedirects: true });
  var b = r.getBlob().getBytes();
  return cvIsPdf_(b) ? { pdf: b } : { log: 'texlive.net (HTTP ' + r.getResponseCode() + '):\n' + r.getContentText() };
}
function cvYtotech_(tex) {
  var r = UrlFetchApp.fetch('https://latex.ytotech.com/builds/sync', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ compiler: 'pdflatex', resources: [{ main: true, content: tex }] }), muteHttpExceptions: true });
  var b = r.getBlob().getBytes();
  return cvIsPdf_(b) ? { pdf: b } : { log: 'latex.ytotech.com (HTTP ' + r.getResponseCode() + '):\n' + r.getContentText() };
}
/* saves, compiles with pdflatex on texlive.net (latex.ytotech.com if that fails), stores the PDF in Drive and returns it */
function cvCompile(sig, tex) {
  cvOk_(sig); tex = String(tex || '');
  var f = cvWrite_(tex), res = null, logs = [], via = '';
  [['texlive.net', cvTexlive_], ['latex.ytotech.com', cvYtotech_]].some(function (c) {
    try { res = c[1](tex); } catch (e) { res = { log: c[0] + ': ' + e.message }; }
    if (res.pdf) { via = c[0]; return true; }
    logs.push(res.log); return false;
  });
  if (!res || !res.pdf) { var lg = logs.join('\n\n'); return { ok: false, log: lg.length > 12000 ? '...\n' + lg.slice(-12000) : lg }; }
  var old = cvFile_(f, CV_NAME_ + '.pdf'); if (old) old.setTrashed(true);
  f.createFile(Utilities.newBlob(res.pdf, 'application/pdf', CV_NAME_ + '.pdf'));
  var r = cvInfo_(f); r.ok = true; r.via = via; r.b64 = Utilities.base64Encode(res.pdf); return r;
}
function cvPage_(p) {
  if (sign_('admin', 'cv') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var f, t, tex, info, err = '';
  try { f = cvFolder_(); t = cvTex_(f); tex = t.getBlob().getDataAsString('UTF-8'); info = cvInfo_(f); }
  catch (e) { return page_('CV not available', esc_(e.message), 'bad'); }
  var J = function (o) { return JSON.stringify(o).replace(/</g, '\\x3c'); };
  var css = '<style>.pw{max-width:1180px}.cvb{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}.cvb .b,.cvb a.b{display:inline-flex;align-items:center;width:auto;min-height:44px;padding:11px 18px;border-radius:999px;font-weight:bold;font-size:15px;text-decoration:none;background:var(--a);color:var(--on);border:1px solid var(--a)}.cvb .b.gh,.cvb a.b.gh{background:var(--surface);color:var(--text);border:1.5px solid var(--text)}.cvb .b.gh:hover{background:var(--soft)}'
    + '.acl{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 6px;font-size:15px;font-weight:bold;color:var(--text);cursor:pointer}.acl input{width:20px;height:20px;accent-color:var(--a);cursor:pointer}.cvi{font-size:14px;color:var(--muted);margin:0 0 12px;line-height:1.7}.cvi a{color:var(--a);font-weight:bold;text-decoration:underline}'
    + '#tx{width:100%;min-height:62vh;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);tab-size:2;resize:vertical;box-sizing:border-box}'
    + '#ms{min-height:22px;margin:10px 0;font-size:15px}#ms.bad{color:var(--red)}#lg{display:none;white-space:pre-wrap;max-height:320px;overflow:auto;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px}'
    + '.dd{position:relative;display:inline-block}.dm{position:absolute;z-index:5;top:calc(100% + 6px);left:0;min-width:250px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 14px 34px rgba(0,0,0,.18);padding:6px;display:flex;flex-direction:column}.dm[hidden]{display:none}.dm button{background:none;border:0;text-align:left;padding:10px 12px;border-radius:8px;color:var(--text);cursor:pointer;font:inherit}.dm button:hover,.dm button:focus{background:var(--line)}'
    + '#pv{display:none;width:100%;height:85vh;border:1px solid var(--line);border-radius:12px;margin-top:12px;background:#fff}</style>';
  var inner = css
    + '<p class="cvi" id="inf"></p>'
    + '<div class="cvb"><button class="b blue" id="bs" type="button">Save to Drive</button><button class="b" id="bc" type="button">Compile PDF</button>'
    + '<span class="dd"><button class="b gh" id="bd" type="button" aria-haspopup="true" aria-expanded="false">Download &#9662;</button><span class="dm" id="dm" hidden><button type="button" id="bt">LaTeX source (.tex), to edit</button><button type="button" id="bp">PDF</button><button type="button" id="bz">Both together (.zip)</button></span></span><button class="b gh" id="bv" type="button">Preview PDF</button>'
    + '<a class="b gh" id="fo" href="' + esc_(info.folder) + '" target="_blank" rel="noopener">&#128193; Open Drive folder</a><button class="b gh" id="bg" type="button">Reload from GitHub</button><label class="acl"><input type="checkbox" id="ac"> Auto-compile every 30 s</label></div><p class="cvi" style="margin:-4px 0 10px">Shortcuts: Ctrl+S saves, Ctrl+Enter compiles.</p>'
    + '<textarea id="tx" spellcheck="false" aria-label="CV LaTeX source"></textarea><div id="ms" role="status"></div><pre id="lg"></pre><p id="pvl" class="cvi" style="display:none;margin:12px 0 0"></p><iframe id="pv" title="CV preview"></iframe>'
    + '<script>(function(){var SIG=' + J(p.sig) + ',I=' + J(info) + ',tx=document.getElementById("tx"),ms=document.getElementById("ms"),lg=document.getElementById("lg"),pv=document.getElementById("pv"),pdf=null,saved;'
    + 'tx.value=' + J(tex) + ';saved=tx.value;'
    + 'function $(i){return document.getElementById(i)}function say(t,bad){ms.textContent=t;ms.className=bad?"bad":""}'
    + 'function a(u,t){return u?"<a href=\\""+u+"\\" target=\\"_blank\\" rel=\\"noopener\\">"+t+"</a>":""}'
    + 'function inf(){$("inf").innerHTML="Kept in your Google Drive, folder "+a(I.folder,"Website CV")+". Source: "+a(I.tex,"open")+" &middot; "+a(I.texDl,"download")+" (saved "+I.texWhen+")"+(I.pdf?". PDF: "+a(I.pdf,"open")+" &middot; "+a(I.pdfDl,"download")+" (built "+I.pdfWhen+")":". No PDF yet: press Compile PDF.")}inf();'
    + 'function dirty(){return tx.value!==saved}window.addEventListener("beforeunload",function(e){if(dirty()){e.preventDefault();e.returnValue=""}});'
    + 'tx.addEventListener("input",function(){if(dirty())say("Unsaved changes.")});'
    + 'tx.addEventListener("keydown",function(e){if(e.key==="Tab"){e.preventDefault();var s=tx.selectionStart;tx.setRangeText("  ",s,tx.selectionEnd,"end")}if((e.ctrlKey||e.metaKey)&&e.key==="s"){e.preventDefault();save()}if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();compile(false)}});'
    + 'var bs=document.querySelectorAll(".cvb .b,.dm button");function busy(on,b,t){for(var i=0;i<bs.length;i++)bs[i].disabled=on;if(b){if(on){b.dataset.t=b.textContent;b.textContent=t}else b.textContent=b.dataset.t}}'
    + 'function fail(b){return function(e){busy(false,b);say((e&&e.message)||"Something went wrong.",true)}}'
    + 'function b2u(b64){var s=atob(b64),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return URL.createObjectURL(new Blob([u],{type:"application/pdf"}))}'
    + 'function dl(url,name){var l=document.createElement("a");l.href=url;l.download=name;document.body.appendChild(l);l.click();l.remove()}'
    + 'function save(){var b=$("bs"),v=tx.value;busy(true,b,"Saving...");say("");google.script.run.withSuccessHandler(function(r){I=r;saved=v;inf();busy(false,b);say("Saved to Drive.")}).withFailureHandler(fail(b)).cvSave(SIG,v)}'
    + '$("bs").onclick=save;'
    + 'var compiling=false,lastC=null;'
    + 'function compile(auto){if(compiling)return;var b=$("bc"),v=tx.value;compiling=true;lastC=v;busy(true,b,"Compiling...");say(auto?"Auto-compiling the latest edits. You can keep typing.":"Compiling with pdflatex. This takes 10 to 30 seconds. You can keep typing.");lg.style.display="none";'
    + 'google.script.run.withSuccessHandler(function(r){compiling=false;busy(false,b);saved=v;if(!r.ok){lg.textContent=r.log;lg.style.display="block";say("LaTeX could not build the PDF. The log is below; the source was still saved.",true);return}'
    + 'I=r;inf();if(pdf)URL.revokeObjectURL(pdf);pdf=b2u(r.b64);show(auto);var tm=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});say((auto?"Auto-compiled":"PDF built")+" at "+tm+" ("+r.via+") and saved to Drive."+(tx.value!==v?" Newer edits will be in the next compile.":""))}).withFailureHandler(function(e){compiling=false;fail(b)(e)}).cvCompile(SIG,v)}'
    + '$("bc").onclick=function(){compile(false)};'
    + 'var ac=$("ac");try{ac.checked=localStorage.getItem("cvac")==="1"}catch(e){}ac.onchange=function(){try{localStorage.setItem("cvac",ac.checked?"1":"0")}catch(e){}say(ac.checked?"Auto-compile is on: the PDF is rebuilt every 30 seconds when there are new edits.":"Auto-compile is off. Press Compile PDF or Ctrl+Enter.")};'
    + 'setInterval(function(){if(ac.checked&&!compiling&&tx.value!==lastC)compile(true)},30000);lastC=tx.value;'
    + '$("bt").onclick=function(){dl(URL.createObjectURL(new Blob([tx.value],{type:"application/x-tex"})),"' + CV_NAME_ + '.tex")};'
    + 'function withPdf(fn,b){if(pdf)return fn();busy(true,b,"Loading...");google.script.run.withSuccessHandler(function(x){busy(false,b);if(!x){say("No PDF yet. Press Compile PDF first.",true);return}pdf=b2u(x);fn()}).withFailureHandler(fail(b)).cvLatest(SIG)}'
    + 'var dm=$("dm"),bd=$("bd");function shut(){dm.hidden=true;bd.setAttribute("aria-expanded","false")}bd.onclick=function(e){e.stopPropagation();dm.hidden=!dm.hidden;bd.setAttribute("aria-expanded",String(!dm.hidden))};document.addEventListener("click",shut);document.addEventListener("keydown",function(e){if(e.key==="Escape")shut()});'
    + '$("bz").onclick=function(){var b=$("bd");busy(true,b,"Zipping...");google.script.run.withSuccessHandler(function(x){busy(false,b);var s=atob(x),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);dl(URL.createObjectURL(new Blob([u],{type:"application/zip"})),"' + CV_NAME_ + '.zip");say(dirty()?"Downloaded the last saved version. Save first to include your newest edits.":"Downloaded.")}).withFailureHandler(fail(b)).cvZip(SIG)};'
    + '$("bp").onclick=function(){withPdf(function(){dl(pdf,"' + CV_NAME_ + '.pdf")},$("bd"))};'
    + 'function show(quiet){if(!I.pdfId){say("No PDF yet. Press Compile PDF first.",true);return}var u="https://drive.google.com/file/d/"+I.pdfId+"/view";$("pvl").innerHTML="Preview not showing? "+a(u,"Open the PDF in a new tab");$("pvl").style.display="block";pv.src="https://drive.google.com/file/d/"+I.pdfId+"/preview?t="+Date.now();var was=pv.style.display==="block";pv.style.display="block";if(!(quiet===true&&was))pv.scrollIntoView({behavior:"smooth"})}'
    + '$("bv").onclick=function(){show(false)};'
    + '$("bg").onclick=function(){var b=$("bg");if(!b.armed){b.armed=true;b.textContent="Click again: replace with the GitHub copy";setTimeout(function(){b.armed=false;b.textContent="Reload from GitHub"},5000);return}b.armed=false;'
    + 'busy(true,b,"Fetching...");google.script.run.withSuccessHandler(function(r){I=r;tx.value=r.text;saved=r.text;inf();busy(false,b);b.textContent="Reload from GitHub";say("Loaded the copy from GitHub. The previous version is in Drive, Website CV/history.")}).withFailureHandler(fail(b)).cvFromGit(SIG)};'
    + '})()<\/script>';
  return out_(shell_('CV', 'Edit the LaTeX source of your CV, save it to Google Drive, and build the PDF. Every save keeps the previous version in Website CV/history.', inner, true, 'cv'), 'CV');
}

/* Shown to anyone who is not the owner: a harmless gag login. The password is never read, stored or sent.
   Typing the owner address leads to the real Google sign-in (account chooser) and back to the page that was asked for. */
/* public entry for the footer "Admin login" link (served by the public deployment, no Google sign-in wall):
   the owner, when Google already knows it is him, gets a button straight into the portal; everyone else gets the custom sign-in */
function loginPage_() {
  var who = ''; try { who = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (x) { }
  if (who !== OWNER_EMAIL) return trapPage_({ action: 'go' });
  var go = portalBase_() + '?action=go';
  return out_('<!doctype html><html><head><meta charset="utf-8"><base target="_top"><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1722;font-family:Calibri,Carlito,"Segoe UI",system-ui,Arial,sans-serif}'
    + '.c{background:#fff;border-radius:18px;padding:30px 28px;text-align:center;max-width:360px}h1{margin:0 0 6px;font-size:22px;color:#0f1722}p{margin:0 0 18px;color:#5b6675}a{display:inline-block;background:#0072B2;color:#fff;text-decoration:none;font-weight:bold;border-radius:999px;padding:13px 26px}</style></head><body>'
    + '<div class="c"><h1>Welcome back, Anandu</h1><p>Signed in as ' + OWNER_EMAIL + '.</p><a href="' + go + '" target="_top">Open the admin portal</a></div></body></html>', 'Website admin');
}
/* loaded invisibly by the website's /admin page: tells that page only whether the visitor is signed in to Google as the owner (true or false, nothing else) */
function whoamiPage_() {
  var who = ''; try { who = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (x) { }
  var msg = JSON.stringify({ t: 'whoami', owner: who === OWNER_EMAIL });
  var js = '<script>(function(){var m=' + msg + ';["https://anandu-prabhakaran.pages.dev","https://anandupiiserk.github.io"].forEach(function(o){try{window.top.postMessage(m,o)}catch(e){}})})();<\/script>';
  return HtmlService.createHtmlOutput(js).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
var TRAP_IMG_ = 'https://anandu-prabhakaran.pages.dev/img/admin-trap.jpg';
function trapPage_(p) {
  var base = portalBase_(), qs = Object.keys(p).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]); }).join('&');
  var real = 'https://accounts.google.com/AccountChooser?Email=' + encodeURIComponent(OWNER_EMAIL) + '&continue=' + encodeURIComponent(base + '?' + qs);
  var css = '*{box-sizing:border-box}html,body{margin:0;height:100%}'
    + 'body{font-family:Calibri,Carlito,"Segoe UI",system-ui,Arial,sans-serif;background:#0f1722;color:#0f1722}'
    + '.scr{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:20px}.scr.on{display:flex}'
    + '#scr1{background:#f4f7fa}#site{position:fixed;inset:0;width:100%;height:100%;border:0;filter:blur(3px);transform:scale(1.02);pointer-events:none}#scr1:after{content:"";position:fixed;inset:0;background:rgba(10,20,32,.35)}'
    + '.card{position:relative;z-index:1;background:#fff;width:100%;max-width:360px;border-radius:18px;padding:30px 26px;box-shadow:0 24px 60px rgba(0,0,0,.55)}'
    + '.card h1{margin:0 0 4px;font-size:22px}.card .s{margin:0 0 18px;color:#5b6675;font-size:14px}'
    + 'label{display:block;font-size:13px;color:#5b6675;margin:12px 0 5px}'
    + 'input{width:100%;padding:12px 14px;border:1px solid #d0d7e2;border-radius:10px;font-size:16px;color:#0f1722;background:#fff}'
    + 'input.bad{border-color:#b94700;box-shadow:0 0 0 3px rgba(185,71,0,.15)}.er{min-height:18px;margin:6px 0 0;font-size:13px;color:#b94700}'
    + '.btn{margin-top:14px;width:100%;padding:13px;border:0;border-radius:999px;background:#0072B2;color:#fff;font-size:15px;font-weight:bold;cursor:pointer}.btn:hover{filter:brightness(1.07)}'
    + '#scr2{background:#000 url("' + TRAP_IMG_ + '") center/contain no-repeat}'
    + '#scr2:before{content:"";position:absolute;inset:0;background:rgba(0,0,0,.25)}'
    + '#scr3{background:radial-gradient(circle at 70% 30%,#1b2a4a,#0a1420)}'
    + '.msg{text-align:center;color:#fff;max-width:440px}.msg .e{font-size:68px;line-height:1}.msg h2{font-size:30px;margin:14px 0 8px;font-weight:800}.msg p{font-size:16px;color:#c6d0dc;margin:0}';
  var card = function (f, hint, pw, btn) {
    return '<form id="' + f + '" class="card" autocomplete="off" novalidate>'
      + '<h1>Website Admin</h1><p class="s">' + hint + '</p>'
      + '<label for="' + f + 'e">Email</label><input id="' + f + 'e" type="email" inputmode="email" autocomplete="off" placeholder="you@example.com">'
      + (pw ? '<label for="' + f + 'p">Password</label><input id="' + f + 'p" type="password" autocomplete="new-password" placeholder="Password">' : '')
      + '<p class="er" id="' + f + 'r" role="alert"></p><button class="btn" type="submit">' + btn + '</button></form>';
  };
  var html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base target="_top"><style>' + css + '</style></head><body>'
    + '<div class="scr on" id="scr1"><iframe id="site" src="' + SITE_URL_ + '" title="" aria-hidden="true" tabindex="-1"></iframe>' + card('f1', 'Sign in to open the admin pages.', true, 'Sign in') + '</div>'
    + '<div class="scr" id="scr2" role="img" aria-label="Clickbait, clickbait everywhere">' + card('f2', 'Enter your email to continue.', false, 'Continue') + '</div>'
    + '<div class="scr" id="scr3"><div class="msg"><div class="e">&#129318;</div><h2>Why do you wanna get floored?</h2><p>These pages are private. Nothing you typed was saved or sent anywhere.</p></div></div>'
    + '<script>(function(){var OWN=' + JSON.stringify(OWNER_EMAIL) + ',REAL=' + JSON.stringify(real) + ',RE=/^[^\\s@]+@[^\\s@]+\\.[a-z]{2,}$/i;function g(i){return document.getElementById(i)}'
    + 'function step(f,from,to){g(f).addEventListener("submit",function(e){e.preventDefault();var em=g(f+"e"),pw=g(f+"p"),r=g(f+"r"),v=em.value.trim();em.classList.remove("bad");if(pw)pw.classList.remove("bad");r.textContent="";'
    + 'if(!RE.test(v)){em.classList.add("bad");r.textContent="Enter a valid email address.";em.focus();return}'
    + 'if(pw&&!pw.value){pw.classList.add("bad");r.textContent="Enter your password.";pw.focus();return}'
    + 'if(pw)pw.value="";if(f==="f1"&&v.toLowerCase()===OWN){window.top.location.href=REAL;return}'
    + 'g(from).classList.remove("on");g(to).classList.add("on");var n=g(to).querySelector("input");if(n)n.focus()})}'
    + 'step("f1","scr1","scr2");step("f2","scr2","scr3")})();<\/script>'
    + '</body></html>';
  return out_(html, 'Website admin');
}
