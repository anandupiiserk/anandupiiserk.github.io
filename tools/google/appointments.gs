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
  if (action === 'unsub') return nlUnsubPage_(p);
  if (action === 'admin') return adminPage_(p);
  if (action === 'acc_ok' || action === 'acc_no') return accessDecide_(p);
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
function otpSend_(p) {
  var email = normEmail_(p.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return json_({ ok: false, error: 'invalid' });
  if (blockedEmail_(email)) return json_({ ok: false, error: 'blocked' });
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
      body: 'Your OTP is ' + code + '\n\nThis is system generated mail and do not respond here.\nThe OTP is valid for ' + (OTP_TTL_SEC / 60) + ' minutes.\n\nCreated with love by Anandu Prabhakaran',
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
        + '<label class="l">Send to</label><div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:12px;font-size:14px"><label><input type="radio" name="aud" id="aud-one" checked> One person</label><label><input type="radio" name="aud" id="aud-all"> All newsletter subscribers (<b>' + nlActive_().length + '</b>)</label><label><input type="radio" name="aud" id="aud-watch"> Yellow list (<b>' + nlWatch_().length + '</b>)</label><a href="' + adminUrl_() + '" target="_top" style="color:#1f4e9c;text-decoration:none">View subscribers</a></div>'
        + '<div id="tow"><label class="l" for="to">To</label><input id="to" class="tx" list="subl" value="' + esc_(p.to || '') + '" placeholder="name@example.com, or type a name to search your subscribers" autocomplete="off" style="margin-bottom:14px"><datalist id="subl">' + nlActive_().map(function (r) { return '<option value="' + esc_(r.e) + '">' + esc_(r.n || '') + '</option>'; }).join('') + '</datalist></div>' + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px" class="cc2"><div><label class="l" for="cc">Cc <span class="hint">(optional, separate with commas)</span></label><input id="cc" class="tx" placeholder="cc@example.com" autocomplete="off"></div><div><label class="l" for="bcc">Bcc <span class="hint">(hidden recipients)</span></label><input id="bcc" class="tx" placeholder="bcc@example.com" autocomplete="off"></div></div>'
        + '<label class="l" for="sub">Subject</label><input id="sub" class="tx" placeholder="Subject" style="margin-bottom:16px">')
    + '<label class="l" for="hd">Email header <span class="hint">(the title bar at the top of the email)</span></label><input id="hd" class="tx" maxlength="80" value="Email from ' + OWNER_NAME + '" style="margin-bottom:16px">'
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
    + '<label class="l" style="margin-top:18px">Attachments <span class="hint">(up to 15 MB in total)</span></label>'
    + '<div id="lkm" style="display:none;position:fixed;inset:0;background:rgba(15,25,45,.45);z-index:50;align-items:center;justify-content:center;padding:16px"><div style="background:#fff;border-radius:14px;padding:22px;max-width:420px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.25)"><h3 style="margin:0 0 14px;font-size:17px">Add a hyperlink</h3><label class="l" for="lkt">Text to show</label><input id="lkt" class="tx" placeholder="For example: my website" style="margin-bottom:12px"><label class="l" for="lku">Web address</label><input id="lku" class="tx" placeholder="https://example.com" style="margin-bottom:16px"><div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" id="lkx" class="b auto" style="background:#eef2f8;color:#1c2430;padding:10px 18px">Cancel</button><button type="button" id="lko" class="b blue auto" style="padding:10px 18px">Insert link</button></div></div></div>'
    + '<div id="dz" class="dz"><b>Click to add files</b> or drop them here</div><input type="file" id="fl" multiple style="display:none"><div id="fls" class="fl"></div>'
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
    + 'document.getElementById("send").onclick=function(){var b=this;if(tot()>MAX){return;}b.disabled=true;b.textContent="Sending...";m.className="msg";m.textContent="";'
    + 'var out=files.map(function(f){return {name:f.name,type:f.type,data:f.data};});'
    + 'google.script.run.withSuccessHandler(function(h){document.body.innerHTML=h;}).withFailureHandler(function(e){b.disabled=false;b.textContent="Send";m.className="msg bad";m.textContent="Could not send: "+(e&&e.message?e.message:"please try again.");})'
    + (reply ? '.sendReply(' + JSON.stringify(id) + ',' + JSON.stringify(p.sig) + ',document.getElementById("sub").value,ed.innerHTML,out,document.getElementById("cc").value,document.getElementById("bcc").value,document.getElementById("hd").value);};'
      : '.sendNew(' + JSON.stringify(p.sig) + ',(ao.checked?"__subscribers__":aw.checked?"__watch__":document.getElementById("to").value),document.getElementById("sub").value,ed.innerHTML,out,document.getElementById("cc").value,document.getElementById("bcc").value,document.getElementById("hd").value);};')
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
function deliver_(to, subject, bodyHtml, files, quoted, cc, bcc, unsubUrl, header) {
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
  var html = '<div style="background:#eef2f8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1c2430"><div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(31,78,156,.12)">'
    + '<div style="background:#1f4e9c;background-image:linear-gradient(135deg,#1f4e9c,#3b82c4);color:#ffffff;padding:20px 28px;font-size:18px;font-weight:bold">' + esc_(header) + '</div>'
    + '<div style="padding:26px 28px;font-size:15px;line-height:1.6">' + clean + '</div>'
    + (quoted ? '<div style="margin:0 28px 24px;padding:12px 14px;background:#f7f9fc;border-left:4px solid #c9d0da;border-radius:4px;color:#5b6675;font-size:13px;line-height:1.5"><b>Your message</b><br>' + esc_(quoted).replace(/\n/g, '<br>') + '</div>' : '')
    + (unsubUrl ? '<div style="padding:0 28px 18px;color:#7a8594;font-size:12px;line-height:1.5">You are receiving this email because you subscribed to news and information from Anandu Prabhakaran on his website. <a href="' + unsubUrl + '" style="color:#1f4e9c">Unsubscribe</a></div>' : '')
    + '<div style="background:#f7f9fc;padding:14px 28px;text-align:center;color:#7a8594;font-size:12px;border-top:1px solid #e6ebf2">Created with <span style="color:#e0245e;font-size:14px">&#10084;</span> by Anandu Prabhakaran</div></div></div>';
  var opts = { to: to, name: OWNER_NAME, replyTo: Session.getEffectiveUser().getEmail(), subject: subject, body: plain + (quoted ? '\n\n---\nYour message:\n' + quoted : '') + (unsubUrl ? '\n\n---\nYou are receiving this because you subscribed on the website. Unsubscribe: ' + unsubUrl : ''), htmlBody: html };
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
function sendReply(id, sig, subject, bodyHtml, files, cc, bcc, header) {
  if (!id || sign_('reply', id) !== sig) return statusHtml_('Link not valid', 'This link is not valid.', 'bad');
  var raw = PropertiesService.getScriptProperties().getProperty('MSG_' + id);
  if (!raw) return statusHtml_('Not found', 'This message is no longer stored.', 'info');
  var r = JSON.parse(raw);
  return sentHtml_(r.n, r.e, deliver_(r.e, subject || 'Re: your message', bodyHtml, files, r.m, cc, bcc, '', header));
}

// Called from the new-email editor (fresh conversation).
function sendNew(sig, to, subject, bodyHtml, files, cc, bcc, header) {
  if (sign_('compose', 'new') !== sig) return statusHtml_('Link not valid', 'This link is not valid.', 'bad');
  to = String(to || '').trim();
  if (to === '__subscribers__') return sendNews_(subject, bodyHtml, files, header);
  if (to === '__watch__') return sendNews_(subject, bodyHtml, files, header, true);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error('Enter a valid email address.');
  if (!String(subject || '').trim()) throw new Error('Add a subject.');
  return sentHtml_('', to, deliver_(to, subject, bodyHtml, files, '', cc, bcc, '', header));
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
      body: 'You are now subscribed to news and information from Anandu Prabhakaran.\n\nUnsubscribe at any time: ' + un + '\n\nCreated with love by Anandu Prabhakaran',
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
    + '<script>document.getElementById("u").onclick=function(){var b=this;b.disabled=true;b.textContent="Working...";google.script.run.withSuccessHandler(function(h){document.body.innerHTML=h;}).withFailureHandler(function(){b.disabled=false;b.textContent="Unsubscribe";var m=document.getElementById("m");m.className="msg bad";m.textContent="Something went wrong. Please try again.";}).nlUnsub(' + JSON.stringify(id) + ',' + JSON.stringify(p.sig) + ');};<\/script>';
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
function sendNews_(subject, bodyHtml, files, header, yellow) {
  if (!String(subject || '').trim()) throw new Error('Add a subject.');
  var subs = yellow ? nlWatch_() : nlActive_();
  if (!subs.length) throw new Error(yellow ? 'Nobody is on the yellow list.' : 'There are no confirmed subscribers yet.');
  var left = MailApp.getRemainingDailyQuota();
  if (subs.length > left) throw new Error('Gmail allows ' + left + ' more recipients today, and there are ' + subs.length + ' subscribers. Try again tomorrow.');
  var ok = 0, bad = 0;
  subs.forEach(function (r) { try { deliver_(r.e, subject, bodyHtml, files, '', '', '', nlUnsubUrl_(r.id), header); ok++; } catch (err) { bad++; } });
  if (ok && !yellow) PropertiesService.getScriptProperties().setProperty('LASTNEWS', String(Date.now()));
  return statusHtml_(yellow ? 'Sent to the yellow list' : 'Sent to subscribers', 'Your email went to ' + ok + (yellow ? ' yellow-listed person' : ' subscriber') + (ok === 1 ? '' : 's') + (bad ? ' (' + bad + ' failed)' : '') + '. You can close this tab, or <a href="' + link_('compose', 'new') + '" target="_top">write another email</a>.', 'ok');
}

/* ---- restricted addresses: request approval by email (no OTP), approve or decline, subscribers platform ---- */
function adminUrl_() { return ScriptApp.getService().getUrl() + '?action=admin&sig=' + sign_('admin', 'subs'); }
function accessRequest_(p) {
  var email = normEmail_(p.email), name = String(p.name || '').trim().slice(0, 80), purpose = { Message: 1, Appointment: 1, Newsletter: 1 }[p.purpose] ? p.purpose : 'Website';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120 || !name) return json_({ ok: false, error: 'invalid' });
  if (!blockedEmail_(email)) return json_({ ok: true, status: 'allowed' });
  var props = PropertiesService.getScriptProperties(), id = subId_(email), cur = props.getProperty('ACC_' + id);
  if (cur) { var r0 = JSON.parse(cur); if (r0.s === 'pending') return json_({ ok: true, status: 'pending' }); if (r0.s === 'declined' && Date.now() - r0.t < 7 * 86400000) return json_({ ok: false, error: 'declined' }); }
  var dk = 'ACCDAY_' + ymd_(new Date()), dn = +(props.getProperty(dk) || 0);
  if (dn >= 15) return json_({ ok: false, error: 'busy' });
  props.setProperty(dk, String(dn + 1));
  props.setProperty('ACC_' + id, JSON.stringify({ e: email, n: name, p: purpose, s: 'pending', t: Date.now() }));
  try {
    MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), name: MSG_SENDER, subject: 'Approval request: ' + email,
      body: name + ' (' + email + ') asks to use the website (' + purpose + '). Approve: ' + link_('acc_ok', id) + '\nDecline: ' + link_('acc_no', id),
      htmlBody: mail_('Approval request', 'Someone whose address is on the restricted list asks to use the website. No OTP was needed to send this request. If you approve, they still have to verify the address with an OTP before anything is sent.', [['Name', esc_(name)], ['Email', esc_(email)], ['For', esc_(purpose)]],
        [['Approve', link_('acc_ok', id), '#1e8e4e'], ['Decline', link_('acc_no', id), '#c5221f'], ['Subscribers and requests', adminUrl_(), '#1f4e9c']], 'Approving allows only this exact address.') });
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
      body: ok ? 'Hello ' + r.n + ', your request is approved. Go back to the website and verify your email with the one-time code to continue: ' + SITE_URL : 'Hello ' + r.n + ', your request for this email address was not approved. You are welcome to use a different email address.',
      htmlBody: ok ? mail_('Request approved', 'Hello ' + esc_(r.n) + ', your request is approved. Go back to the website and verify your email address with the one-time code to continue.', [], [['Open the website', SITE_URL, '#1f4e9c']], 'Only this email address was approved.')
                   : mail_('About your request', 'Hello ' + esc_(r.n) + ', your request to use this email address on the website was not approved. You are welcome to use a different email address.', [], [], '') });
  } catch (x) { }
  return page_(ok ? 'Approved' : 'Declined', (ok ? esc_(r.e) + ' can now be verified by OTP on the website. They were notified by email.' : esc_(r.e) + ' was declined. They were not notified.'), ok ? 'ok' : 'info');
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
      body: 'Hey, the Admin has noticed and approved your pending OTP verification. You are now subscribed to news and information from Anandu Prabhakaran.\n\nUnsubscribe at any time: ' + un + '\n\nCreated with love by Anandu Prabhakaran',
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
      body: 'Hey' + (name ? ' ' + name : '') + ', you have been added to the newsletter subscribers by ' + OWNER_NAME + ' and you may be notified of further updates later. If there has been any issue, you may please unsubscribe using this link: ' + un + '\n\nThanks\n\nCreated with love by Anandu Prabhakaran',
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
  var th = 'text-align:left;padding:9px 10px;font-size:12px;color:#5b6675;border-bottom:2px solid #e1e8f3;white-space:nowrap', td = 'padding:10px;border-bottom:1px solid #eef2f8;font-size:14px;vertical-align:middle';
  var pill = function (cls, to, id, label, col) { return '<button class="' + cls + '" data-to="' + to + '" data-id="' + esc_(id) + '" style="border:1px solid ' + col[0] + ';background:#fff;color:' + col[1] + ';border-radius:999px;padding:5px 11px;font:inherit;font-size:12px;cursor:pointer;margin:2px 0 2px 5px;white-space:nowrap;line-height:1.2;height:auto;min-height:0;min-width:0;display:inline-block">' + label + '</button>'; };
  var RED = ['#e3b3b1', '#c5221f'], YEL = ['#e6cf7a', '#8a6a00'], GRN = ['#bfe0cc', '#1e8e4e'], BLU = ['#c3d3ea', '#1f4e9c'];
  var write = function (r) { return '<a href="' + link_('compose', 'new') + '&to=' + encodeURIComponent(r.e) + '" target="_top" style="color:#1f4e9c;font-size:12px;font-weight:bold;text-decoration:none">Write</a>'; };
  var edit = function (r) { return pill('x-ed', '', r.id, 'Edit', BLU); };
  var tbl = function (id, head, rows, empty) { return '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr>' + head.map(function (h) { return '<th style="' + th + '">' + h + '</th>'; }).join('') + '</tr></thead><tbody id="' + id + '">' + (rows || '<tr><td colspan="' + head.length + '" style="' + td + ';color:#7a8594;text-align:center">' + empty + '</td></tr>') + '</tbody></table></div>'; };
  var row = function (r, i, when, acts) { return '<tr data-s="' + esc_((r.n + ' ' + r.e).toLowerCase()) + '" data-id="' + esc_(r.id) + '"><td style="' + td + ';color:#7a8594">' + (i + 1) + '</td><td class="cn" style="' + td + '">' + esc_(r.n || '') + '</td><td class="ce" style="' + td + '">' + esc_(r.e) + '</td><td style="' + td + ';color:#5b6675;white-space:nowrap">' + when + '</td><td class="ca" style="' + td + ';text-align:right">' + acts + '</td></tr>'; };
  var H = ['#', 'Name', 'Email', 'Subscribed', ''];
  var rows = subs.map(function (r, i) { return row(r, i, fmt(r.t0 || r.t), write(r) + edit(r) + pill('x-st', 'unsub', r.id, 'Unsubscribe', RED) + pill('x-st', 'watch', r.id, 'Yellow list', YEL) + pill('x-st', 'ban', r.id, 'Ban', RED)); }).join('');
  var wrows = watch.map(function (r, i) { return row(r, i, r.w ? fmt(r.w) : '', write(r) + edit(r) + pill('x-st', 'active', r.id, 'Back to normal', GRN) + pill('x-st', 'ban', r.id, 'Ban', RED)); }).join('');
  var brows = bans.map(function (r, i) { return row(r, i, r.b ? fmt(r.b) : '', write(r) + edit(r) + pill('x-st', 'unban', r.id, 'Unban', GRN) + pill('x-del', '', r.id, 'Delete data', RED)); }).join('');
  var BY = { self: 'Unsubscribed by themselves', admin: 'Removed by ' + OWNER_NAME.split(' ')[0], unban: 'Unbanned by ' + OWNER_NAME.split(' ')[0] };
  var urows = unsubs.map(function (r, i) { return row(r, i, (r.u ? fmt(r.u) : '') + '<br><span style="display:inline-block;margin-top:3px;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:bold;background:' + (r.by === 'self' ? '#eef2f8;color:#5b6675' : '#fdecea;color:#c5221f') + '">' + (BY[r.by] || 'Unsubscribed') + '</span>', write(r) + edit(r) + pill('x-st', 'ban', r.id, 'Ban', RED) + pill('x-del', '', r.id, 'Delete data', RED)); }).join('');
  var prow = pends.map(function (r) { return '<tr data-s="' + esc_(r.e.toLowerCase()) + '"><td style="' + td + '">' + esc_(r.e) + '</td><td style="' + td + ';color:#5b6675;white-space:nowrap">' + fmt(r.t) + '</td><td style="' + td + ';text-align:right;white-space:nowrap"><button class="x-ap" data-id="' + esc_(r.id) + '" style="border:1px solid #bfe0cc;background:#fff;color:#1e8e4e;border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;font-weight:bold;cursor:pointer;margin-right:8px">Approve</button><button class="x-dp" data-id="' + esc_(r.id) + '" style="border:1px solid #e3b3b1;background:#fff;color:#c5221f;border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer">Dismiss</button></td></tr>'; }).join('');
  var rq = reqs.map(function (r) {
    var st = r.s === 'pending' ? '<a href="' + link_('acc_ok', r.id) + '" target="_top" style="color:#1e8e4e;font-weight:bold;text-decoration:none">Approve</a> &nbsp; <a href="' + link_('acc_no', r.id) + '" target="_top" style="color:#c5221f;font-weight:bold;text-decoration:none">Decline</a>' : '<span style="color:#5b6675">' + esc_(r.s) + '</span>';
    return '<tr><td style="' + td + '">' + esc_(r.n) + '</td><td style="' + td + '">' + esc_(r.e) + '</td><td style="' + td + '">' + esc_(r.p) + '</td><td style="' + td + ';white-space:nowrap">' + fmt(r.t) + '</td><td style="' + td + '">' + st + '</td></tr>';
  }).join('');
  var data = JSON.stringify(all.filter(function (r) { return r.s !== 'pending'; }).map(function (r) { return [r.n || '', r.e, fmt(r.t0 || r.t), { active: 'Subscribed', watch: 'Yellow list', ban: 'Banned', unsub: 'Unsubscribed' }[r.s] || r.s]; })).replace(/</g, '\\u003c');
  var h2 = function (t, d) { return '<h2 style="font-size:17px;margin:30px 0 8px">' + t + '</h2>' + (d ? '<p class="sub" style="margin:0 0 10px">' + d + '</p>' : ''); };
  var pendN = reqs.filter(function (r) { return r.s === 'pending'; }).length;
  var inner = '<div class="chips"><span class="chip"><b>' + subs.length + '</b> subscriber' + (subs.length === 1 ? '' : 's') + '</span><span class="chip"><b>' + watch.length + '</b> yellow-listed</span><span class="chip"><b>' + bans.length + '</b> banned</span><span class="chip"><b>' + unsubs.length + '</b> unsubscribed</span><span class="chip"><b>' + pends.length + '</b> pending OTP</span><span class="chip"><b>' + pendN + '</b> pending request' + (pendN === 1 ? '' : 's') + '</span></div>'
    + '<details style="margin:0 0 14px;border:1.5px solid #d3dbe8;border-radius:12px;padding:12px 14px;background:#f8fafd"><summary style="cursor:pointer;font-weight:bold;color:#1f4e9c">Add a subscriber</summary><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;align-items:center"><input id="an" class="tx" placeholder="Name" maxlength="80" style="flex:1;min-width:160px;width:auto"><input id="ae" class="tx" type="email" placeholder="Email address" style="flex:1.4;min-width:200px;width:auto"><button id="ab" class="b blue auto" style="padding:11px 20px">Add subscriber</button></div><p class="hint" style="margin:8px 0 0">They receive an email saying you added them, with an Unsubscribe button.</p></details>'
    + '<div style="display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px"><input id="q" class="tx" placeholder="Search name or email in every list" style="flex:1;min-width:200px;width:auto"><button id="cp" class="b blue auto" style="padding:11px 20px">Copy subscriber emails</button><button id="dl" class="b blue auto" style="padding:11px 20px">Download CSV</button><a class="b blue auto" style="text-decoration:none;padding:11px 20px" target="_top" href="' + link_('compose', 'new') + '">Write to subscribers</a></div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px;align-items:center"><button id="rm15" class="b blue auto" style="padding:9px 18px;font-size:13px">Turn on reminders</button><button id="rmt" class="b blue auto" style="padding:9px 18px;font-size:13px;background:#5b6675">Send a test reminder now</button><span class="hint">A reminder email comes to you on the 15th of every month, and around 12:00 on days when someone is waiting for OTP approval.</span></div>'
    + tbl('tb', H, rows, 'No subscribers yet.')
    + h2('Yellow list', 'People you are keeping an eye on. They stay out of the newsletter. You can write to them separately (choose "Yellow-listed" in the editor), bring them back to normal, or ban them.') + tbl('wb', ['#', 'Name', 'Email', 'Yellow-listed', ''], wrows, 'Nobody is on the yellow list.')
    + h2('Banned', 'Banned people cannot subscribe again. They see "Unfortunately, you cannot subscribe here." Unban lets them subscribe again if they choose to.') + tbl('bb', ['#', 'Name', 'Email', 'Banned', ''], brows, 'Nobody is banned.')
    + h2('Pending OTP verification', 'People who asked for a subscription code but did not enter it. Approve to subscribe them without the OTP (they get a confirmation email with an unsubscribe link), or dismiss. You get one reminder email a day around 12:00 while someone is waiting.')
    + tbl('pb', ['Email', 'Asked', ''], prow, 'Nobody is waiting.')
    + h2('Unsubscribed', 'People who unsubscribed. Their name and email are kept here (one record per address, so there are no duplicates) and they do not receive newsletters. You can still write to one of them individually.') + tbl('ub', ['#', 'Name', 'Email', 'Unsubscribed (and who did it)', ''], urows, 'Nobody has unsubscribed.')
    + h2('Approval requests', 'People whose address is on the restricted list (director, dean, HOD and similar) can ask here without an OTP. Approving allows that exact address to continue with an OTP. A decline is silent: they are not emailed.')
    + '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr><th style="' + th + '">Name</th><th style="' + th + '">Email</th><th style="' + th + '">For</th><th style="' + th + '">Asked</th><th style="' + th + '">Status</th></tr></thead><tbody>' + (rq || '<tr><td colspan="5" style="' + td + ';color:#7a8594;text-align:center">No requests.</td></tr>') + '</tbody></table></div><div id="m" class="msg"></div>'
    + '<script>(function(){var D=' + data + ',SIG=' + JSON.stringify(p.sig) + ',ADM=' + JSON.stringify(adminUrl_()) + ',m=document.getElementById("m"),G=google.script.run;'
    + 'function bad(t){m.className="msg bad";m.textContent=t||"That did not work. Try again.";}function reload(){window.open(ADM,"_top");}'
    + 'document.getElementById("q").oninput=function(){var v=this.value.toLowerCase();var r=document.querySelectorAll("tr[data-s]");for(var i=0;i<r.length;i++)r[i].style.display=r[i].getAttribute("data-s").indexOf(v)<0?"none":"";};'
    + 'document.getElementById("cp").onclick=function(){var t=D.filter(function(x){return x[3]==="Subscribed";}).map(function(x){return x[1];}).join(", "),b=this;var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");b.textContent="Copied";}catch(e){b.textContent="Copy failed";}document.body.removeChild(ta);setTimeout(function(){b.textContent="Copy subscriber emails";},1600);};'
    + 'document.getElementById("dl").onclick=function(){var q=function(s){return "\\""+String(s).replace(/"/g,"\\"\\"")+"\\"";};var c="Name,Email,Subscribed on,Status\\n"+D.map(function(x){return x.map(q).join(",");}).join("\\n");var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([c],{type:"text/csv"}));a.download="subscribers.csv";document.body.appendChild(a);a.click();document.body.removeChild(a);};'
    + 'function act(id,fn,ok){document.getElementById(id).onclick=function(){var b=this,t=b.textContent;b.disabled=true;G.withSuccessHandler(function(){b.disabled=false;b.textContent=ok;setTimeout(function(){b.textContent=t;},2200);}).withFailureHandler(function(){b.disabled=false;bad();})[fn](SIG);};}act("rm15","enableReminder","Reminders are on");act("rmt","testReminder","Test sent");'
    + 'document.getElementById("ab").onclick=function(){var b=this,n=document.getElementById("an"),e=document.getElementById("ae");if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(e.value.trim())){bad("Enter a valid email address.");return;}b.disabled=true;G.withSuccessHandler(function(r){b.disabled=false;if(r&&r.ok){m.className="msg";m.textContent="Added"+(r.mailed?" and emailed.":", but the email could not be sent.");n.value="";e.value="";setTimeout(reload,1200);}else bad(r&&r.error==="exists"?"That email is already subscribed.":r&&r.error==="banned"?"That person is banned. Unban them first.":"Enter a valid email address.");}).withFailureHandler(function(){b.disabled=false;bad();}).addSub(SIG,n.value,e.value);};'
    + 'document.getElementById("pb").onclick=function(e){var b=e.target.closest(".x-ap,.x-dp");if(!b)return;var ap=b.className==="x-ap";if(ap&&!confirm("Subscribe this person without the OTP and email them?"))return;b.disabled=true;G.withSuccessHandler(function(){reload();}).withFailureHandler(function(){b.disabled=false;bad();})[ap?"approvePend":"dismissPend"](SIG,b.getAttribute("data-id"));};'
    + 'var TXT={unsub:"Unsubscribe this person? Their details stay in the Unsubscribed list.",watch:"Move this person to the Yellow list? They will stop receiving the newsletter.",ban:"Ban this person? They will not be able to subscribe again until you unban them.",active:"Bring this person back to normal subscribers?",unban:"Unban this person? They can subscribe again if they choose to."};'
    + 'document.body.addEventListener("click",function(e){'
    + 'var b=e.target.closest(".x-st");if(b){var to=b.getAttribute("data-to");if(!confirm(TXT[to]))return;b.disabled=true;G.withSuccessHandler(reload).withFailureHandler(function(){b.disabled=false;bad();}).setSub(SIG,b.getAttribute("data-id"),to);return;}'
    + 'b=e.target.closest(".x-del");if(b){if(!confirm("Delete this person\'s saved name and email permanently?"))return;b.disabled=true;G.withSuccessHandler(reload).withFailureHandler(function(){b.disabled=false;bad();}).deleteSub(SIG,b.getAttribute("data-id"));return;}'
    + 'b=e.target.closest(".x-ed");if(b){var tr=b.closest("tr"),cn=tr.querySelector(".cn"),ce=tr.querySelector(".ce"),ca=tr.querySelector(".ca"),old=[cn.textContent,ce.textContent,ca.innerHTML];cn.innerHTML="<input class=\\"tx\\" style=\\"min-width:120px\\">";ce.innerHTML="<input class=\\"tx\\" type=\\"email\\" style=\\"min-width:180px\\">";cn.firstChild.value=old[0];ce.firstChild.value=old[1];ca.innerHTML="<button class=\\"x-sv\\" style=\\"border:1px solid #bfe0cc;background:#fff;color:#1e8e4e;border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;font-weight:bold;cursor:pointer\\">Save</button><button class=\\"x-cx\\" style=\\"border:1px solid #d3dbe8;background:#fff;color:#5b6675;border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer;margin-left:6px\\">Cancel</button>";tr._old=old;return;}'
    + 'b=e.target.closest(".x-cx");if(b){var t2=b.closest("tr");t2.querySelector(".cn").textContent=t2._old[0];t2.querySelector(".ce").textContent=t2._old[1];t2.querySelector(".ca").innerHTML=t2._old[2];return;}'
    + 'b=e.target.closest(".x-sv");if(b){var t3=b.closest("tr"),nm=t3.querySelector(".cn input").value,em=t3.querySelector(".ce input").value;if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(em.trim())){bad("Enter a valid email address.");return;}b.disabled=true;G.withSuccessHandler(function(r){if(r&&r.ok)reload();else{b.disabled=false;bad(r&&r.error==="exists"?"Another subscriber already uses that email.":"Enter a valid email address.");}}).withFailureHandler(function(){b.disabled=false;bad();}).editSub(SIG,t3.getAttribute("data-id"),nm,em);}'
    + '});'
    + '})();<\/script>';
  return out_(shell_('Subscribers', 'Everyone who verified their email and subscribed to news and information, plus the yellow, banned and unsubscribed lists. Newest first.', inner), 'Subscribers');
}
// Called from the subscribers page.
function setSub(sig, id, to) {   /* status changes from the subscribers page; the record is always kept */
  if (sign_('admin', 'subs') !== sig || !id) throw new Error('Not allowed');
  var props = PropertiesService.getScriptProperties(), cu = subGet_(id), now = Date.now();
  if (!cu) throw new Error('Not found');
  var ok = { unsub: ['active', 'watch'], watch: ['active'], ban: ['active', 'watch', 'unsub'], active: ['watch'], unban: ['ban'] };
  if (!ok[to] || ok[to].indexOf(cu.s) < 0) throw new Error('Not allowed');
  if (to === 'unsub') { cu.s = 'unsub'; cu.u = now; cu.by = 'admin'; }
  else if (to === 'watch') { cu.s = 'watch'; cu.w = now; }
  else if (to === 'ban') { cu.s = 'ban'; cu.b = now; }
  else if (to === 'active') { cu.s = 'active'; delete cu.w; }
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
}
// Called from the subscribers page.
function enableReminder(sig) { if (sign_('admin', 'subs') !== sig) throw new Error('Not allowed'); setupMonthlyReminder(); return true; }
function testReminder(sig) { if (sign_('admin', 'subs') !== sig) throw new Error('Not allowed'); reminderMail_(); return true; }

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
