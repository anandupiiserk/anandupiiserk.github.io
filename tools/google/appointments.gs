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
var START_H = 10, END_H = 18;
var LENGTHS = [30, 60];
var MIN_LEAD_HOURS = 24;
var HOLIDAY_CAL = 'en.indian#holiday@group.v.calendar.google.com';
var MSG_SENDER = 'No-Reply-Website-Admin-Anandu';
var OWNER_NAME = 'Anandu Prabhakaran';
var SITE_URL = 'https://anandupiiserk.github.io/contact';

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
function link_(action, id) { return ScriptApp.getService().getUrl() + '?action=' + action + '&id=' + encodeURIComponent(id) + '&sig=' + sign_(action, id); }
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
    + 'Created with <span style="color:#e0245e;font-size:14px">&#10084;</span> by Anandu Prabhakaran</div>'
    + '</div></div>';
  return h;
}
/* ---- admin portal pages (decline, reply, results) ---- */
var PORTAL_CSS = 'body{margin:0;background:#eef2f8}*{box-sizing:border-box}'
  + '.pt{background:#1f4e9c;background-image:linear-gradient(135deg,#183f80,#3b82c4);color:#fff;padding:18px 20px 70px;font-family:Arial,Helvetica,sans-serif}'
  + '.pt .in{max-width:800px;margin:0 auto;display:flex;align-items:center;gap:12px}.pt .lg{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:15px}'
  + '.pt .t1{font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85}.pt .t2{font-size:16px;font-weight:bold;margin-top:2px}'
  + '.pw{max-width:800px;margin:-48px auto 40px;padding:0 14px;font-family:Arial,Helvetica,sans-serif;color:#1c2430}'
  + '.cd{background:#fff;border-radius:16px;box-shadow:0 6px 24px rgba(31,78,156,.15);padding:28px}'
  + '.cd h1{font-size:23px;margin:0 0 4px}.sub{color:#5b6675;font-size:14px;margin:0 0 20px;line-height:1.5}'
  + '.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}.chip{background:#f1f5fb;border:1px solid #e1e8f3;border-radius:999px;padding:6px 12px;font-size:13px;color:#33415c}.chip b{color:#1c2430}'
  + '.q{background:#f7f9fc;border-left:4px solid #1f4e9c;border-radius:10px;padding:12px 16px;margin:0 0 20px;font-size:14px;line-height:1.6;max-height:160px;overflow:auto;white-space:normal}.q small{display:block;color:#5b6675;margin-bottom:4px;font-weight:bold;text-transform:uppercase;letter-spacing:.08em;font-size:11px}'
  + 'label.l{display:block;font-weight:bold;font-size:13px;margin:0 0 6px;color:#33415c}.hint{color:#7a8594;font-size:12px;font-weight:normal}'
  + 'input.tx,textarea.tx{width:100%;padding:12px 14px;font:inherit;font-size:15px;border:1.5px solid #d3dbe8;border-radius:10px;background:#fff;color:#1c2430;outline:none;transition:border-color .2s,box-shadow .2s}'
  + 'input.tx:focus,textarea.tx:focus,.ed:focus{border-color:#3b82c4;box-shadow:0 0 0 3px rgba(59,130,196,.18)}textarea.tx{resize:vertical;min-height:130px;line-height:1.5}'
  + '.acts{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px}@media(max-width:620px){.acts,.cc2{grid-template-columns:1fr !important}}'
  + '.act{border:1.5px solid #e1e8f3;border-radius:14px;padding:16px;background:#fbfcfe}.act h3{margin:0 0 4px;font-size:15px}.act p{margin:0 0 12px;color:#5b6675;font-size:13px;line-height:1.5}'
  + '.b{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px 18px;border:0;border-radius:999px;font:inherit;font-weight:bold;font-size:14px;color:#fff;cursor:pointer;position:relative;overflow:hidden;transition:transform .15s,opacity .2s,filter .2s}'
  + '.b:hover{filter:brightness(1.08)}.b:active{transform:scale(.98)}.b:disabled{opacity:.6;cursor:progress}.b.red{background:#c5221f}.b.blue{background:#1f4e9c}.b.auto{width:auto;padding:13px 30px}'
  + '.tb{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:#f1f5fb;border:1.5px solid #d3dbe8;border-bottom:0;border-radius:10px 10px 0 0;padding:8px}'
  + '.tg{display:flex;gap:3px;padding-right:8px;margin-right:2px;border-right:1px solid #d3dbe8}.tg:last-child{border:0}'
  + '.tb button{border:1px solid transparent;background:transparent;border-radius:6px;min-width:32px;height:32px;padding:0 8px;font-size:14px;cursor:pointer;color:#33415c}.tb button:hover{background:#fff;border-color:#d3dbe8}'
  + '.tb select{height:32px;border:1px solid #d3dbe8;border-radius:6px;background:#fff;padding:0 6px;font:inherit;font-size:13px;color:#33415c}.tb input[type=color]{width:34px;height:32px;border:1px solid #d3dbe8;border-radius:6px;padding:2px;background:#fff;cursor:pointer}'
  + '.ed{min-height:260px;border:1.5px solid #d3dbe8;border-radius:0 0 10px 10px;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;outline:none;background:#fff}'
  + '.dz{border:2px dashed #c3cfe2;border-radius:12px;padding:18px;text-align:center;color:#5b6675;font-size:14px;cursor:pointer;background:#fbfcfe;transition:.2s}.dz.on{border-color:#3b82c4;background:#eef5fd}.dz b{color:#1f4e9c}'
  + '.fl{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.fc{display:flex;align-items:center;gap:8px;background:#f1f5fb;border:1px solid #e1e8f3;border-radius:999px;padding:6px 8px 6px 12px;font-size:13px}.fc i{font-style:normal;color:#7a8594}.fc button{border:0;background:#dbe4f2;border-radius:50%;width:20px;height:20px;cursor:pointer;line-height:1;color:#33415c}'
  + '.msg{margin-top:14px;font-size:14px;line-height:1.5;min-height:20px}.msg.bad{color:#c5221f}'
  + '.st{text-align:center;padding:14px 4px}.ic{width:68px;height:68px;border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:34px;color:#fff;background:#2e9d57}.ic.info{background:#3b82c4}.ic.bad{background:#c5221f}'
  + '.ft{text-align:center;color:#7a8594;font-size:12px;margin-top:18px}.ft span{color:#e0245e;font-size:14px}';
function shell_(title, sub, inner) {
  return '<style>' + PORTAL_CSS + '</style><div class="pt"><div class="in"><div class="lg">AP</div><div><div class="t1">Website admin</div><div class="t2">Anandu Prabhakaran</div></div></div></div>'
    + '<div class="pw"><div class="cd">' + (title ? '<h1>' + title + '</h1>' : '') + (sub ? '<p class="sub">' + sub + '</p>' : '') + inner + '</div>'
    + '<div class="ft">Created with <span>&#10084;</span> by Anandu Prabhakaran</div></div>';
}
function statusHtml_(title, msg, kind) {
  var sym = kind === 'bad' ? '!' : (kind === 'info' ? 'i' : '&#10003;');
  return shell_('', '', '<div class="st"><div class="ic ' + (kind || 'ok') + '">' + sym + '</div><h1 style="margin:0 0 8px;font-size:22px">' + esc_(title) + '</h1><p class="sub" style="margin:0">' + msg + '</p></div>');
}
function out_(html, title) { return HtmlService.createHtmlOutput(html).setTitle(title || 'Website admin').addMetaTag('viewport', 'width=device-width, initial-scale=1'); }
function page_(title, msg, kind) { return out_(statusHtml_(title, msg, kind), title); }

/* ---- availability (GET) and approve / decline links ---- */
function doGet(e) {
  if (e && e.parameter && e.parameter.action) return act_(e.parameter);
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
  return json_({ busy: busy, daysOff: Object.keys(daysOff), now: now.getTime() });
}

function act_(p) {
  var action = p.action, id = p.id || '';
  if (action === 'reply') return replyPage_(p);
  if (action === 'compose') return composePage_(p);
  if ((action !== 'approve' && action !== 'decline') || !id || sign_(action, id) !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var cal = CalendarApp.getDefaultCalendar(), ev = cal.getEventById(id);
  if (!ev) return page_('Already handled', 'This request is no longer on the calendar. It was probably approved or declined already.', 'info');
  if (!/^REQUEST/.test(ev.getTitle())) return page_('Already handled', 'This request was already handled: ' + esc_(ev.getTitle()), 'info');
  var name = ev.getTag('name') || 'the visitor', email = ev.getTag('email') || '', when = whenText_(ev.getStartTime(), ev.getEndTime());
  var len = Math.round((ev.getEndTime().getTime() - ev.getStartTime().getTime()) / 60000);
  if (action === 'approve') {
    var done = false;
    if (email) {
      // addGuest() on an existing event adds the guest without emailing them, so create a fresh
      // event with the guest and sendInvites on (this sends Google's invitation email), then drop the pending one.
      try {
        var ne = cal.createEvent('Appointment: ' + name, ev.getStartTime(), ev.getEndTime(),
          { description: ev.getDescription(), guests: email, sendInvites: true });
        try { ne.setColor(CalendarApp.EventColor.GREEN); } catch (x) { }
        ne.setTag('name', name); ne.setTag('email', email);
        ev.deleteEvent();
        done = true;
      } catch (x) { console.error('invite failed: ' + x); }
    }
    if (!done) {
      ev.setTitle('Appointment: ' + name);
      try { ev.setColor(CalendarApp.EventColor.GREEN); } catch (x) { }
      if (email) { try { ev.addGuest(email); } catch (x) { console.error('addGuest failed: ' + x); } }
    }
    if (email) {
      try {
        MailApp.sendEmail({ to: email, name: OWNER_NAME, subject: 'Appointment confirmed: ' + when,
          body: 'Hello ' + name + ', your appointment is confirmed: ' + when + ' (' + len + ' minutes). A Google Calendar invitation has been sent to you.',
          htmlBody: mail_('Appointment confirmed', 'Hello ' + esc_(name) + ', your appointment is confirmed.', [['When', esc_(when)], ['Length', len + ' minutes']], [], 'A Google Calendar invitation has also been sent to this address. ' + OWNER_NAME) });
      } catch (x) { console.error('confirm mail failed: ' + x); }
    }
    return page_('Approved', 'The appointment with ' + esc_(name) + ' on ' + esc_(when) + ' is confirmed. ' + (email ? 'A Google Calendar invitation and a confirmation email were sent to ' + esc_(email) + '.' : 'No email address was stored for this request, so nothing was sent.'));
  }
  // Decline: portal page with a box for the reason and two actions; declineWith() does the work
  var inner = '<div class="chips"><span class="chip"><b>' + esc_(name) + '</b></span><span class="chip">' + esc_(when) + '</span>' + (email ? '<span class="chip">' + esc_(email) + '</span>' : '') + '</div>'
    + '<label class="l" for="r">Reason <span class="hint">(optional, included in the email to the visitor)</span></label>'
    + '<textarea id="r" class="tx" placeholder="For example: I am travelling that week. Please pick a slot after 9 November."></textarea>'
    + '<div class="acts">'
    + '<div class="act"><h3>Block this slot</h3><p>Decline and keep the time marked busy on the website. Use this when you are not available.</p><button id="b1" class="b red">Block slot and decline</button></div>'
    + '<div class="act"><h3>Free this slot</h3><p>Decline and open the time again so someone else can book it.</p><button id="b0" class="b blue">Unblock slot and decline</button></div>'
    + '</div><div id="m" class="msg"></div>'
    + '<script>function go(btn,blk){var bs=document.querySelectorAll(".b");for(var i=0;i<bs.length;i++)bs[i].disabled=true;var t=btn.textContent;btn.textContent="Sending...";'
    + 'google.script.run.withSuccessHandler(function(h){document.body.innerHTML=h;}).withFailureHandler(function(){for(var i=0;i<bs.length;i++)bs[i].disabled=false;btn.textContent=t;var m=document.getElementById("m");m.className="msg bad";m.textContent="Something went wrong. Please try again.";})'
    + '.declineWith(' + JSON.stringify(id) + ',' + JSON.stringify(p.sig) + ',document.getElementById("r").value,blk);}'
    + 'document.getElementById("b1").onclick=function(){go(this,true);};document.getElementById("b0").onclick=function(){go(this,false);};<\/script>';
  return out_(shell_('Decline this request', 'The visitor gets a polite email. Choose what happens to the time slot.', inner), 'Decline request');
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
var BLOCK_WORDS = ['director', 'registrar', 'chairman', 'chairperson', 'chancellor', 'associatedean', 'assistantdean', 'deputydean', 'assocdean'];
var BLOCK_TOKENS = ['dean'];
function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
function blockedEmail_(email) {
  var whole = normEmail_(email), flat = whole.replace(/[^a-z0-9]/g, ''), toks = whole.split(/[^a-z0-9]+/);
  for (var i = 0; i < BLOCK_WORDS.length; i++) if (flat.indexOf(BLOCK_WORDS[i]) >= 0) return true;
  for (var j = 0; j < toks.length; j++) if (BLOCK_TOKENS.indexOf(toks[j]) >= 0) return true;
  return false;
}
function otpSend_(p) {
  var email = normEmail_(p.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return json_({ ok: false, error: 'invalid' });
  if (blockedEmail_(email)) return json_({ ok: false, error: 'blocked' });
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
      body: 'Your OTP is ' + code + '\n\nThis is system generated mail and do not respond here.\nThe OTP is valid for ' + (OTP_TTL_SEC / 60) + ' minutes.\n\nCreated with love by Anandu Prabhakaran',
      htmlBody: mail_('Email verification', 'Your OTP is <span style="display:inline-block;margin-left:4px;padding:6px 14px;background:#eef5fd;border:1px solid #cfe0f5;border-radius:8px;font-size:26px;letter-spacing:.28em;font-weight:bold;color:#1f4e9c">' + code + '</span>', [], [],
        'This is system generated mail and do not respond here. The OTP is valid for ' + (OTP_TTL_SEC / 60) + ' minutes. If you did not ask for it, ignore this email.') });
  } catch (x) { console.error('otp mail failed: ' + x); return json_({ ok: false, error: 'mail' }); }
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
    var all = props.getProperties(), cut = Date.now() - 120 * 86400000;
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
  if (!raw) return page_('Not found', 'This message is no longer stored (messages are kept for 120 days).', 'info');
  return editorPage_('reply', p, JSON.parse(raw));
}
function composePage_(p) {
  if (sign_('compose', 'new') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  return editorPage_('compose', p, null);
}
function editorPage_(mode, p, r) {
  var id = p.id || '', reply = mode === 'reply';
  var fonts = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Courier New', 'Tahoma'];
  var tbtn = function (c, label, st, tip) { return '<button type="button" data-c="' + c + '" title="' + tip + '" style="' + (st || '') + '">' + label + '</button>'; };
  var inner = (reply
      ? '<div class="chips"><span class="chip"><b>' + esc_(r.n) + '</b></span><span class="chip">' + esc_(r.e) + '</span><span class="chip">Sending as Anandu Prabhakaran</span></div>'
        + '<div class="q"><small>Their message</small>' + esc_(r.m).replace(/\n/g, '<br>') + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px" class="cc2"><div><label class="l" for="cc">Cc <span class="hint">(optional, separate with commas)</span></label><input id="cc" class="tx" placeholder="cc@example.com" autocomplete="off"></div><div><label class="l" for="bcc">Bcc <span class="hint">(hidden recipients)</span></label><input id="bcc" class="tx" placeholder="bcc@example.com" autocomplete="off"></div></div>' + '<label class="l" for="sub">Subject</label><input id="sub" class="tx" value="Re: your message on my website" style="margin-bottom:16px">'
      : '<div class="chips"><span class="chip">Sending as <b>Anandu Prabhakaran</b></span><span class="chip">New conversation</span></div>'
        + '<label class="l" for="to">To</label><input id="to" class="tx" placeholder="name@example.com" autocomplete="off" style="margin-bottom:14px">' + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px" class="cc2"><div><label class="l" for="cc">Cc <span class="hint">(optional, separate with commas)</span></label><input id="cc" class="tx" placeholder="cc@example.com" autocomplete="off"></div><div><label class="l" for="bcc">Bcc <span class="hint">(hidden recipients)</span></label><input id="bcc" class="tx" placeholder="bcc@example.com" autocomplete="off"></div></div>'
        + '<label class="l" for="sub">Subject</label><input id="sub" class="tx" placeholder="Subject" style="margin-bottom:16px">')
    + '<label class="l">' + (reply ? 'Your reply' : 'Message') + '</label>'
    + '<div class="tb">'
    + '<div class="tg"><select id="ff"><option value="">Font</option>' + fonts.map(function (f) { return '<option>' + f + '</option>'; }).join('') + '</select>'
    + '<select id="fs"><option value="">Size</option><option value="2">Small</option><option value="3">Normal</option><option value="4">Large</option><option value="5">Larger</option><option value="6">Huge</option></select></div>'
    + '<div class="tg">' + tbtn('bold', 'B', 'font-weight:bold', 'Bold') + tbtn('italic', 'I', 'font-style:italic', 'Italic') + tbtn('underline', 'U', 'text-decoration:underline', 'Underline') + tbtn('strikeThrough', 'S', 'text-decoration:line-through', 'Strikethrough')
    + '<input type="color" id="fc" value="#1c2430" title="Text colour"></div>'
    + '<div class="tg">' + tbtn('justifyLeft', '&#8676;', '', 'Align left') + tbtn('justifyCenter', '&#8596;', '', 'Centre') + tbtn('justifyRight', '&#8677;', '', 'Align right') + tbtn('justifyFull', '&#9776;', '', 'Justify') + '</div>'
    + '<div class="tg">' + tbtn('insertUnorderedList', '&#8226; List', '', 'Bullet list') + tbtn('insertOrderedList', '1. List', '', 'Numbered list') + tbtn('outdent', '&#8656;', '', 'Outdent') + tbtn('indent', '&#8658;', '', 'Indent') + '</div>'
    + '<div class="tg"><button type="button" id="lk" title="Insert link">Link</button>' + tbtn('removeFormat', 'Clear', '', 'Clear formatting') + '</div>'
    + '</div>'
    + '<div id="ed" class="ed" contenteditable="true">' + (reply ? 'Hello ' + esc_(r.n) + ',<br><br><br>Best regards,<br>Anandu Prabhakaran' : '') + '</div>'
    + '<label class="l" style="margin-top:18px">Attachments <span class="hint">(up to 15 MB in total)</span></label>'
    + '<div id="dz" class="dz"><b>Click to add files</b> or drop them here</div><input type="file" id="fl" multiple style="display:none"><div id="fls" class="fl"></div>'
    + '<div style="margin-top:22px"><button id="send" class="b blue auto">' + (reply ? 'Send reply' : 'Send email') + '</button></div><div id="m" class="msg"></div>'
    + '<script>(function(){var ed=document.getElementById("ed"),m=document.getElementById("m"),files=[],MAX=15*1024*1024;'
    + 'function ex(c,v){ed.focus();document.execCommand(c,false,v||null);}'
    + 'var bs=document.querySelectorAll("[data-c]");for(var i=0;i<bs.length;i++){bs[i].onmousedown=function(e){e.preventDefault();};bs[i].onclick=function(){ex(this.getAttribute("data-c"));};}'
    + 'document.getElementById("ff").onchange=function(){if(this.value)ex("fontName",this.value);};'
    + 'document.getElementById("fs").onchange=function(){if(this.value)ex("fontSize",this.value);};'
    + 'document.getElementById("fc").oninput=function(){ex("foreColor",this.value);};'
    + 'document.getElementById("lk").onclick=function(){var u=prompt("Link address (https://...)");if(u&&/^https?:\\/\\//i.test(u))ex("createLink",u);};'
    + 'function size(n){return n>1048576?(n/1048576).toFixed(1)+" MB":Math.max(1,Math.round(n/1024))+" KB";}'
    + 'function tot(){var t=0;for(var i=0;i<files.length;i++)t+=files[i].size;return t;}'
    + 'function paint(){var l=document.getElementById("fls");l.innerHTML="";files.forEach(function(f,i){var c=document.createElement("span");c.className="fc";c.innerHTML="<span></span><i></i><button type=button title=Remove>&times;</button>";c.firstChild.textContent=f.name;c.children[1].textContent=size(f.size);c.lastChild.onclick=function(){files.splice(i,1);paint();};l.appendChild(c);});'
    + 'if(tot()>MAX){m.className="msg bad";m.textContent="Attachments total "+size(tot())+", over the 15 MB limit. Remove some.";}else{m.className="msg";m.textContent="";}}'
    + 'function add(list){for(var i=0;i<list.length;i++){(function(f){var rd=new FileReader();rd.onload=function(){files.push({name:f.name,type:f.type||"application/octet-stream",size:f.size,data:String(rd.result).split(",")[1]});paint();};rd.readAsDataURL(f);})(list[i]);}}'
    + 'var dz=document.getElementById("dz"),fl=document.getElementById("fl");dz.onclick=function(){fl.click();};fl.onchange=function(){add(this.files);this.value="";};'
    + 'dz.ondragover=function(e){e.preventDefault();dz.className="dz on";};dz.ondragleave=function(){dz.className="dz";};dz.ondrop=function(e){e.preventDefault();dz.className="dz";add(e.dataTransfer.files);};'
    + 'document.getElementById("send").onclick=function(){var b=this;if(tot()>MAX){return;}b.disabled=true;b.textContent="Sending...";m.className="msg";m.textContent="";'
    + 'var out=files.map(function(f){return {name:f.name,type:f.type,data:f.data};});'
    + 'google.script.run.withSuccessHandler(function(h){document.body.innerHTML=h;}).withFailureHandler(function(e){b.disabled=false;b.textContent="Send";m.className="msg bad";m.textContent="Could not send: "+(e&&e.message?e.message:"please try again.");})'
    + (reply ? '.sendReply(' + JSON.stringify(id) + ',' + JSON.stringify(p.sig) + ',document.getElementById("sub").value,ed.innerHTML,out,document.getElementById("cc").value,document.getElementById("bcc").value);};'
      : '.sendNew(' + JSON.stringify(p.sig) + ',document.getElementById("to").value,document.getElementById("sub").value,ed.innerHTML,out,document.getElementById("cc").value,document.getElementById("bcc").value);};')
    + '})();<\/script>';
  return reply
    ? out_(shell_('Reply to ' + esc_(r.n), 'Your reply is sent as a formatted email from Anandu Prabhakaran, with their message quoted underneath.', inner), 'Reply to ' + r.n)
    : out_(shell_('New email', 'Start a fresh conversation. It is sent as a formatted email from Anandu Prabhakaran, and replies come to your Gmail.', inner), 'New email');
}

// Shared by reply and new-email: builds the styled HTML email and sends it as Anandu Prabhakaran.
function addrs_(v, label) {
  var list = String(v || '').split(/[,;\s]+/).filter(function (x) { return x; });
  list.forEach(function (x) { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)) throw new Error(label + ': "' + x + '" is not a valid email address.'); });
  if (list.length > 20) throw new Error(label + ': too many addresses (max 20).');
  return list.join(',');
}
function deliver_(to, subject, bodyHtml, files, quoted, cc, bcc) {
  cc = addrs_(cc, 'Cc'); bcc = addrs_(bcc, 'Bcc');
  var blobs = [], total = 0;
  (files || []).forEach(function (f) {
    var bytes = Utilities.base64Decode(f.data); total += bytes.length;
    blobs.push(Utilities.newBlob(bytes, String(f.type || 'application/octet-stream'), String(f.name || 'attachment').slice(0, 120)));
  });
  if (total > 15 * 1024 * 1024) throw new Error('Attachments are over 15 MB.');
  var clean = String(bodyHtml || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/ on[a-z]+="[^"]*"/gi, '').replace(/javascript:/gi, '');
  var plain = clean.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  subject = String(subject || '').trim().slice(0, 150);
  var html = '<div style="background:#eef2f8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1c2430"><div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(31,78,156,.12)">'
    + '<div style="background:#1f4e9c;background-image:linear-gradient(135deg,#1f4e9c,#3b82c4);color:#ffffff;padding:20px 28px;font-size:18px;font-weight:bold">Email From Anandu Prabhakaran</div>'
    + '<div style="padding:26px 28px;font-size:15px;line-height:1.6">' + clean + '</div>'
    + (quoted ? '<div style="margin:0 28px 24px;padding:12px 14px;background:#f7f9fc;border-left:4px solid #c9d0da;border-radius:4px;color:#5b6675;font-size:13px;line-height:1.5"><b>Your message</b><br>' + esc_(quoted).replace(/\n/g, '<br>') + '</div>' : '')
    + '<div style="background:#f7f9fc;padding:14px 28px;text-align:center;color:#7a8594;font-size:12px;border-top:1px solid #e6ebf2">Created with <span style="color:#e0245e;font-size:14px">&#10084;</span> by Anandu Prabhakaran</div></div></div>';
  var opts = { to: to, name: OWNER_NAME, replyTo: Session.getEffectiveUser().getEmail(), subject: subject, body: plain + (quoted ? '\n\n---\nYour message:\n' + quoted : ''), htmlBody: html };
  if (blobs.length) opts.attachments = blobs;
  if (cc) opts.cc = cc;
  if (bcc) opts.bcc = bcc;
  MailApp.sendEmail(opts);
  return blobs.length;
}
function sentHtml_(n, to, nb) {
  return statusHtml_('Email sent', 'Your email was sent to ' + esc_(n ? n + ' (' + to + ')' : to) + (nb ? ' with ' + nb + ' attachment' + (nb > 1 ? 's' : '') : '') + '. You can close this tab, or <a href="' + link_('compose', 'new') + '" target="_top">write another email</a>.', 'ok');
}

// Called from the reply editor.
function sendReply(id, sig, subject, bodyHtml, files, cc, bcc) {
  if (!id || sign_('reply', id) !== sig) return statusHtml_('Link not valid', 'This link is not valid.', 'bad');
  var raw = PropertiesService.getScriptProperties().getProperty('MSG_' + id);
  if (!raw) return statusHtml_('Not found', 'This message is no longer stored.', 'info');
  var r = JSON.parse(raw);
  return sentHtml_(r.n, r.e, deliver_(r.e, subject || 'Re: your message', bodyHtml, files, r.m, cc, bcc));
}

// Called from the new-email editor (fresh conversation).
function sendNew(sig, to, subject, bodyHtml, files, cc, bcc) {
  if (sign_('compose', 'new') !== sig) return statusHtml_('Link not valid', 'This link is not valid.', 'bad');
  to = String(to || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error('Enter a valid email address.');
  if (!String(subject || '').trim()) throw new Error('Add a subject.');
  return sentHtml_('', to, deliver_(to, subject, bodyHtml, files, '', cc, bcc));
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
    var name = String(p.name || '').trim().slice(0, 80), email = String(p.email || '').trim().slice(0, 120), topic = String(p.topic || '').trim().slice(0, 1000);
    var len = +p.len, start = new Date(+p.start);
    if (!name || !topic || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json_({ ok: false, error: 'invalid' });
    if (blockedEmail_(email) || !tokenOk_(email, p.vtoken)) return json_({ ok: false, error: 'unverified' });
    if (LENGTHS.indexOf(len) < 0 || isNaN(start.getTime())) return json_({ ok: false, error: 'invalid' });
    var end = new Date(start.getTime() + len * 60000), now = new Date();
    if (start.getTime() < now.getTime() + MIN_LEAD_HOURS * 3600000) return json_({ ok: false, error: 'too_soon' });
    var wd = +Utilities.formatDate(start, TZ, 'u');
    var sh = +Utilities.formatDate(start, TZ, 'H') + (+Utilities.formatDate(start, TZ, 'm')) / 60;
    var eh = +Utilities.formatDate(end, TZ, 'H') + (+Utilities.formatDate(end, TZ, 'm')) / 60;
    if (ymd_(start) !== ymd_(end)) eh = 24;
    if (wd > 5 || sh < START_H || eh > END_H) return json_({ ok: false, error: 'hours' });
    var cal = CalendarApp.getDefaultCalendar();
    var clash = cal.getEvents(start, end).some(function (ev) { return !(ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.NO); });
    var offDay = cal.getEventsForDay(start).some(function (ev) { return ev.isAllDayEvent(); });
    if (!offDay) { try { var h = CalendarApp.getCalendarById(HOLIDAY_CAL); if (h) offDay = h.getEventsForDay(start).length > 0; } catch (err) { } }
    if (clash || offDay) return json_({ ok: false, error: 'taken' });
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
