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
/* Online booking blocks that are kept here, not on the calendar. BLOCK_DAYS: whole days (YYYY-MM-DD). BLOCK_FROM: a day blocked from that hour (IST, 24-hour clock) to the end of the day. */
var BLOCK_DAYS = ['2026-12-17'];
var BLOCK_FROM = { '2026-11-18': 15 };
function blockedSlot_(start, end) {
  var d = ymd_(start); if (BLOCK_DAYS.indexOf(d) >= 0) return true;
  if (BLOCK_FROM[d] !== undefined) { var eh = +Utilities.formatDate(end, TZ, 'H') + (+Utilities.formatDate(end, TZ, 'm')) / 60; if (ymd_(end) !== d || eh > BLOCK_FROM[d]) return true; }
  return false;
}
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
/* The portal pages (Subscribers, Visitors, Messages, Appointments, compose, reply, approve and decline) are served by a second deployment of this script
   that runs as the signed-in visitor and is open only to OWNER_EMAIL. Its address is kept in the script property PORTAL_URL. The public site keeps using the first deployment. */
var OWNER_EMAIL = 'anandupiiserk@gmail.com';
var OWNER_ACTIONS_ = { reply: 1, compose: 1, admin: 1, visitors: 1, messages: 1, appts: 1, acc_ok: 1, acc_no: 1, approve: 1, decline: 1 };
function portalBase_() { return PropertiesService.getScriptProperties().getProperty('PORTAL_URL') || ScriptApp.getService().getUrl(); }
function gate_(p) {
  var base = PropertiesService.getScriptProperties().getProperty('PORTAL_URL');
  if (!base || !OWNER_ACTIONS_[p.action]) return null;
  var who = ''; try { who = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (x) { }
  if (who === OWNER_EMAIL) return null;
  if (!who) {
    var qs = Object.keys(p).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]); }).join('&');
    return page_('Sign in to continue', 'The admin pages open only after you sign in with <b>' + OWNER_EMAIL + '</b>.<p style="margin:16px 0 0"><a href="' + base + '?' + qs + '" target="_top" style="display:inline-block;background:#1b4f9c;color:#fff;text-decoration:none;font-weight:bold;border-radius:8px;padding:12px 22px">Continue with Google</a></p>', 'info');
  }
  return page_('Access restricted', 'This page is private. Sign in with <b>' + OWNER_EMAIL + '</b> to open it.', 'bad');
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
var PORTAL_CSS = 'body{margin:0;background:#f4f7fa;font-family:Calibri,Carlito,"Segoe UI",system-ui,Arial,sans-serif}*{box-sizing:border-box}'
  + '.pt{background:#fff;border-bottom:1px solid #d9e0e9;color:#0f1722;padding:16px 20px 64px;font-family:Calibri,Carlito,"Segoe UI",system-ui,Arial,sans-serif}'
  + '.pt .in{max-width:800px;margin:0 auto;display:flex;align-items:center;gap:12px}.pt .lg{width:38px;height:38px;border:1.5px solid #0f1722;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px;letter-spacing:.04em}'
  + '.pt .t1{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#435062}.pt .t2{font-size:18px;margin-top:2px}'
  + '.pw{max-width:800px;margin:-44px auto 40px;padding:0 14px;font-family:Calibri,Carlito,"Segoe UI",system-ui,Arial,sans-serif;color:#0f1722}'
  + '.cd{background:#fff;border:1px solid #d9e0e9;border-radius:12px;box-shadow:0 24px 60px rgba(15,30,55,.08);padding:28px}'
  + '.cd h1{font-size:30px;font-weight:400;letter-spacing:-.015em;margin:0 0 6px}.sub{color:#435062;font-size:15px;margin:0 0 20px;line-height:1.55}'
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
function navBar_() {
  var a = function (t, u) { return '<a href="' + u + '" target="_top" style="color:#0f1722;font-weight:600;font-size:13px;text-decoration:none;border:1px solid #d9e0e9;border-radius:8px;padding:7px 14px;background:#f4f7fa">' + t + '</a>'; };
  return '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px">' + a('Subscribers', adminUrl_()) + a('Write an email', link_('compose', 'new')) + a('Messages', msgUrl_()) + a('Appointments', apptUrl_()) + a('Visitors', visUrl_()) + '</div>';
}
function shell_(title, sub, inner, nav) {
  if (nav) inner = navBar_() + inner;
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
  if (action === 'unsub') return nlUnsubPage_(p);
  if (action === 'admin') return adminPage_(p);
  if (action === 'visitors') return visitorsPage_(p);
  if (action === 'messages') return messagesPage_(p);
  if (action === 'appts') return appointmentsPage_(p);
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
    + '<div style="background:#f7f9fc;padding:14px 28px;text-align:center;color:#7a8594;font-size:12px;border-top:1px solid #e6ebf2">This email is sent from a custom domain developed and maintained by Anandu Prabhakaran.</div></div></div>';
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
function adminUrl_() { return portalBase_() + '?action=admin&sig=' + sign_('admin', 'subs'); }
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
  var th = 'text-align:left;padding:9px 10px;font-size:12px;color:#5b6675;border-bottom:2px solid #e1e8f3;white-space:nowrap', td = 'padding:10px;border-bottom:1px solid #eef2f8;font-size:14px;vertical-align:middle';
  var pill = function (cls, to, id, label, col, warn) { return '<button class="' + cls + '"' + (warn ? ' data-self="1"' : '') + ' data-to="' + to + '" data-id="' + esc_(id) + '" style="border:1px solid ' + col[0] + ';background:#fff;color:' + col[1] + ';border-radius:999px;padding:5px 11px;font:inherit;font-size:12px;cursor:pointer;margin:2px 0 2px 5px;white-space:nowrap;line-height:1.2;height:auto;min-height:0;min-width:0;display:inline-block">' + label + '</button>'; };
  var RED = ['#e3b3b1', '#c5221f'], YEL = ['#e6cf7a', '#8a6a00'], GRN = ['#bfe0cc', '#1e8e4e'], BLU = ['#c3d3ea', '#1f4e9c'];
  var write = function (r) { return '<a href="' + link_('compose', 'new') + '&to=' + encodeURIComponent(r.e) + '" target="_top" style="color:#1f4e9c;font-size:12px;font-weight:bold;text-decoration:none">Write</a>'; };
  var edit = function (r) { return pill('x-ed', '', r.id, 'Edit', BLU); };
  var tbl = function (id, head, rows, empty) { return '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr>' + head.map(function (h) { return '<th style="' + th + '">' + h + '</th>'; }).join('') + '</tr></thead><tbody id="' + id + '">' + (rows || '<tr><td colspan="' + head.length + '" style="' + td + ';color:#7a8594;text-align:center">' + empty + '</td></tr>') + '</tbody></table></div>'; };
  var row = function (r, i, when, acts) { return '<tr data-s="' + esc_((r.n + ' ' + r.e).toLowerCase()) + '" data-id="' + esc_(r.id) + '"><td style="' + td + ';color:#7a8594">' + (i + 1) + '</td><td class="cn" style="' + td + '">' + esc_(r.n || '') + '</td><td class="ce" style="' + td + '">' + esc_(r.e) + '</td><td style="' + td + ';color:#5b6675;white-space:nowrap">' + when + '</td><td class="ca" style="' + td + ';text-align:right">' + acts + '</td></tr>'; };
  var H = ['#', 'Name', 'Email', 'Subscribed', ''];
  var rows = subs.map(function (r, i) { return row(r, i, fmt(r.t0 || r.t), write(r) + edit(r) + pill('x-st', 'unsub', r.id, 'Unsubscribe', RED) + pill('x-st', 'watch', r.id, 'Yellow list', YEL) + pill('x-st', 'ban', r.id, 'Ban', RED)); }).join('');
  var wrows = watch.map(function (r, i) { return row(r, i, r.w ? fmt(r.w) : '', write(r) + edit(r) + pill('x-st', 'active', r.id, 'Back to normal', GRN) + pill('x-st', 'ban', r.id, 'Ban', RED)); }).join('');
  var brows = bans.map(function (r, i) { return row(r, i, r.b ? fmt(r.b) : '', write(r) + edit(r) + pill('x-st', 'unban', r.id, 'Unban', GRN) + pill('x-st', 'active', r.id, 'Move to subscribers', GRN) + pill('x-del', '', r.id, 'Delete data', RED)); }).join('');
  var BY = { self: 'Unsubscribed by themselves', admin: 'Removed by ' + OWNER_NAME.split(' ')[0], unban: 'Unbanned by ' + OWNER_NAME.split(' ')[0] };
  var urows = unsubs.map(function (r, i) { return row(r, i, (r.u ? fmt(r.u) : '') + '<br><span style="display:inline-block;margin-top:3px;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:bold;background:' + (r.by === 'self' ? '#eef2f8;color:#5b6675' : '#fdecea;color:#c5221f') + '">' + (BY[r.by] || 'Unsubscribed') + '</span>', write(r) + edit(r) + pill('x-st', 'active', r.id, 'Move to subscribers', GRN, r.by === 'self') + pill('x-st', 'ban', r.id, 'Ban', RED) + pill('x-del', '', r.id, 'Delete data', RED)); }).join('');
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
    + 'var TXT={unsub:"Unsubscribe this person? Their details stay in the Unsubscribed list.",watch:"Move this person to the Yellow list? They will stop receiving the newsletter.",ban:"Ban this person? They will not be able to subscribe again until you unban them.",active:"Move this person to the normal subscribers list? They will receive the newsletter again.",unban:"Unban this person? They can subscribe again if they choose to."};'
    + 'document.body.addEventListener("click",function(e){'
    + 'var b=e.target.closest(".x-st");if(b){var to=b.getAttribute("data-to");if(!confirm(to==="active"&&b.getAttribute("data-self")?"This person unsubscribed themselves. Move them back to subscribers anyway? They will receive the newsletter again.":TXT[to]))return;b.disabled=true;G.withSuccessHandler(reload).withFailureHandler(function(){b.disabled=false;bad();}).setSub(SIG,b.getAttribute("data-id"),to);return;}'
    + 'b=e.target.closest(".x-del");if(b){if(!confirm("Delete this person\'s saved name and email permanently?"))return;b.disabled=true;G.withSuccessHandler(reload).withFailureHandler(function(){b.disabled=false;bad();}).deleteSub(SIG,b.getAttribute("data-id"));return;}'
    + 'b=e.target.closest(".x-ed");if(b){var tr=b.closest("tr"),cn=tr.querySelector(".cn"),ce=tr.querySelector(".ce"),ca=tr.querySelector(".ca"),old=[cn.textContent,ce.textContent,ca.innerHTML];cn.innerHTML="<input class=\\"tx\\" style=\\"min-width:120px\\">";ce.innerHTML="<input class=\\"tx\\" type=\\"email\\" style=\\"min-width:180px\\">";cn.firstChild.value=old[0];ce.firstChild.value=old[1];ca.innerHTML="<button class=\\"x-sv\\" style=\\"border:1px solid #bfe0cc;background:#fff;color:#1e8e4e;border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;font-weight:bold;cursor:pointer\\">Save</button><button class=\\"x-cx\\" style=\\"border:1px solid #d3dbe8;background:#fff;color:#5b6675;border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer;margin-left:6px\\">Cancel</button>";tr._old=old;return;}'
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
   logged but never emailed. Once a day (21:00 IST) you get ONE summary email if anyone from another country visited: it lists
   those countries and tabs, the number of Indian visits since the last email, and every country's visitor total. A daily trigger
   also moves these emails to the Trash after 30 days. The Visitors portal shows minutes, hours, days, weeks, months, years and
   any custom range. (Gmail and Sheets permission is asked once when you press "Turn on reminders".) */
var VISIT_MAIL = true, VISIT_MAIL_DAYS = 30, HOME_CC = 'IN', SUMMARY_HOUR = 21;
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
  if (sh0.getRange(1, 11).getValue() === '') sh0.getRange(1, 8, 1, 4).setValues([['Seconds on the tab (rows where Event = x)', 'Event (blank = tab opened, x = tab left or closed)', 'Session id (random, no personal data)', 'Idle seconds (tab left open, no activity)']]);
  return sh0;
}
/* rows with from <= time < to, oldest first. Rows are appended in time order, so read from the bottom. */
function visRows_(from, to) {
  var sh = visSheet_(), last = sh.getLastRow(), out = [];
  if (last < 2) return out;
  var end = last;
  while (end >= 2) {
    var start = Math.max(2, end - 4999), v = sh.getRange(start, 1, end - start + 1, 11).getValues(), stop = false;
    for (var j = v.length - 1; j >= 0; j--) { var t = +v[j][0]; if (t < from) { stop = true; break; } if (t < to) out.push({ t: t, cc: String(v[j][1]), n: String(v[j][2]), tab: String(v[j][3]), f: +v[j][4] === 1, l: String(v[j][5]), s: +v[j][7] || 0, x: String(v[j][8]) === 'x', sid: String(v[j][9] || ''), i: +v[j][10] || 0 }); }
    if (stop) break; end = start - 1;
  }
  return out.reverse();
}
function leave_(p) {
  var cc = String(p.cc || '').toUpperCase(), secs = Math.round(+p.secs);
  if (!/^[A-Z]{2}$/.test(cc) || !(secs >= 1)) return json_({ ok: false });
  secs = Math.min(secs, 21600); var idl = Math.max(0, Math.min(Math.round(+p.idle) || 0, secs)); var sid = /^[a-f0-9]{12}$/.test(String(p.sid || '')) ? String(p.sid) : '';
  var nm = String(p.name || '').trim(); if (!/^[A-Za-z .,'()\-]{2,45}$/.test(nm)) nm = cc;
  var tab = TABS_[String(p.page || '').toLowerCase()] || 'Home', now = Date.now();
  visSheet_().appendRow([now, cc, nm, tab, 0, '', Utilities.formatDate(new Date(now), TZ, 'yyyy-MM-dd HH:mm:ss'), secs, 'x', sid, idl || '']);
  return json_({ ok: true });
}
function visit_(p) {
  var cc = String(p.cc || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return json_({ ok: false });
  var nm = String(p.name || '').trim();
  if (!/^[A-Za-z .,'()\-]{2,45}$/.test(nm)) nm = cc;
  var tab = TABS_[String(p.page || '').toLowerCase()] || 'Home', lang = LANG_[String(p.lang || '').toLowerCase()] || 'English', first = p.first === true, now = Date.now(), sid = /^[a-f0-9]{12}$/.test(String(p.sid || '')) ? String(p.sid) : '';
  visSheet_().appendRow([now, cc, nm, tab, first ? 1 : 0, lang, Utilities.formatDate(new Date(now), TZ, 'yyyy-MM-dd HH:mm:ss'), '', '', sid, '']);
  return json_({ ok: true });
}
function visitSummary_(force) {
  var sp = PropertiesService.getScriptProperties(), last = +(sp.getProperty('VISLASTMAIL') || 0), now = Date.now(), rows = visRows_(last, now + 1);
  var inN = 0, others = {}, order = [];
  rows.forEach(function (r) {
    if (r.x) return;
    if (r.cc === HOME_CC) { if (r.f) inN++; return; }
    var o = others[r.cc] || (others[r.cc] = { n: r.n, v: 0, tabs: {} }); if (!others[r.cc].seen) { others[r.cc].seen = 1; order.push(r.cc); }
    if (r.f) o.v++; o.tabs[r.tab] = (o.tabs[r.tab] || 0) + 1;
  });
  var quiet = !order.length;
  if (quiet) {
    /* monthly reminder: no visitor from outside India since the last email (or since set-up) for 30 days */
    var st = +(sp.getProperty('VISSTART') || 0); if (!st) { sp.setProperty('VISSTART', String(now)); st = now; }
    if (!force && now - (last || st) < VISIT_MAIL_DAYS * 86400000) return false;
  }
  var all = visRows_(0, now + 1), tot = {};
  all.forEach(function (r) { if (r.f) { var o = tot[r.cc] || (tot[r.cc] = { n: r.n, v: 0 }); o.v++; } });
  var tl = Object.keys(tot).sort(function (a, b) { return tot[b].v - tot[a].v; }), total = tl.reduce(function (a, c) { return a + tot[c].v; }, 0);
  var since = last ? Utilities.formatDate(new Date(last), TZ, 'd MMM, HH:mm') : 'the beginning';
  var rowsH = [['Period', esc_('Since ' + since + ' IST')], ['Indian visits since the last email', String(inN)]], plain = quiet ? 'Monthly reminder: no visitors from other countries since ' + since + ' IST.\n' : 'Visitors from other countries since ' + since + ' IST:\n';
  if (quiet) rowsH.splice(1, 0, ['Other countries', 'No visitors in this period']);
  order.forEach(function (c) { var o = others[c], tabs = Object.keys(o.tabs).map(function (k) { return k + ' ' + o.tabs[k]; }).join(', ');
    rowsH.push([esc_(o.n), o.v + (o.v === 1 ? ' visitor' : ' visitors') + ' (tabs: ' + esc_(tabs) + ')']); plain += ' - ' + o.n + ': ' + o.v + ' (tabs: ' + tabs + ')\n'; });
  plain += '\nIndian visits since the last email: ' + inN + '\n\nVisitors so far, all time:\n';
  tl.forEach(function (c) { rowsH.push(['All time: ' + esc_(tot[c].n), String(tot[c].v)]); plain += ' - ' + tot[c].n + ': ' + tot[c].v + '\n'; });
  rowsH.push(['All countries together', String(total)]); plain += 'Total: ' + total + '\n\nPortals:\nVisitors: ' + visUrl_() + '\nSubscribers: ' + adminUrl_() + '\nWrite an email: ' + link_('compose', 'new') + '\nThis email is moved to the Trash after ' + VISIT_MAIL_DAYS + ' days.';
  MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), name: MSG_SENDER, subject: quiet ? '[Site visit] Monthly reminder: no visitors from other countries' : '[Site visit] Daily summary: ' + order.length + ' other countr' + (order.length === 1 ? 'y' : 'ies') + ' visited', body: plain,
    htmlBody: mail_('Your website visitors', quiet ? 'No visitor from outside India since the last email. Here is the Indian count and the all-time totals.' : 'Visitors from ' + order.length + ' other countr' + (order.length === 1 ? 'y' : 'ies') + ' since the last email, and how many visits came from India.', rowsH,
      [['Visitors portal', visUrl_(), '#1f4e9c'], ['Subscribers portal', adminUrl_(), '#1f4e9c'], ['Write an email', link_('compose', 'new'), '#1f4e9c'], ['Messages', msgUrl_(), '#1f4e9c'], ['Appointments', apptUrl_(), '#1f4e9c']],
      'Only the country and the tab are counted. No IP address or personal data is stored. Indian visits are counted but never trigger an email. This email is moved to the Trash after ' + VISIT_MAIL_DAYS + ' days.') });
  sp.setProperty('VISLASTMAIL', String(now));
  return true;
}
function dailyVisitSummary() { if (VISIT_MAIL) visitSummary_(false); }
function testVisitSummary() { visitSummary_(true); }
/* Moves only this script's own visit emails to the Trash after VISIT_MAIL_DAYS. A thread is touched only when ALL of these hold:
   it is in Sent, it is older than the limit, it holds a single message, the sender name is MSG_SENDER, the subject starts with "[Site visit] "
   and the body carries the script's own footer sentence. Every other email is left alone. */
var VISIT_MARK_ = 'This email is moved to the Trash after';
function cleanVisitMails() {
  GmailApp.search('in:sent from:me subject:"[Site visit]" older_than:' + VISIT_MAIL_DAYS + 'd', 0, 100).forEach(function (t) {
    var ms = t.getMessages();
    if (ms.length !== 1) return;
    var m = ms[0];
    if (m.getSubject().indexOf('[Site visit] ') !== 0) return;
    if (String(m.getFrom()).indexOf(MSG_SENDER) < 0) return;
    if (m.getPlainBody().indexOf(VISIT_MARK_) < 0) return;
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
    if (!s) { s = by[k] = { cc: r.cc, n: r.n, t0: r.t, t1: r.t, steps: [], f: false }; order.push(k); }
    if (r.t > s.t1) s.t1 = r.t;
    if (r.x) {
      for (var i = s.steps.length - 1; i >= 0; i--) if (s.steps[i].tab === r.tab) { s.steps[i].s += r.s; s.steps[i].i += r.i; return; }
      s.steps.push({ tab: r.tab, t: r.t - r.s * 1000, s: r.s, i: r.i }); if (r.t - r.s * 1000 < s.t0) s.t0 = r.t - r.s * 1000;
    } else { s.steps.push({ tab: r.tab, t: r.t, s: 0, i: 0 }); if (r.f) s.f = true; }
  });
  return order.map(function (k) { return by[k]; }).sort(function (a, b) { return b.t0 - a.t0; }).slice(0, 60).map(function (s) {
    var tot = 0; s.steps.sort(function (a, b) { return a.t - b.t; });
    return { cc: s.cc, n: s.n, w: Utilities.formatDate(new Date(s.t0), TZ, 'd MMM yyyy, HH:mm:ss'), f: s.f, steps: s.steps.map(function (st) { var a = Math.max(0, st.s - st.i); tot += a; return { tab: st.tab, w: Utilities.formatDate(new Date(st.t), TZ, 'HH:mm:ss'), s: a, i: st.i, g: st.tab === 'Gallery' }; }), total: tot };
  });
}
function visitData(sig, from, to, bucket) {
  if (sign_('admin', 'visitors') !== sig) throw new Error('Not allowed');
  from = +from; to = +to; if (!BKT_[bucket]) bucket = 'day';
  var spanMs = { minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6 }[bucket];
  if ((to - from) / spanMs > 1500) throw new Error('Too many rows for this unit. Choose a larger unit or a shorter range.');
  var rows = visRows_(from, to), map = {}, keys = [], tc = {}, tt = {}, cm = {}, ts = {}, vis = 0, ind = 0, views = 0;
  rows.forEach(function (r) {
    if (r.x) { ts[r.tab] = (ts[r.tab] || 0) + Math.max(0, r.s - r.i); return; }
    views++;
    var t = r.t; if (bucket === 'week') t = r.t - (+Utilities.formatDate(new Date(r.t), TZ, 'u') - 1) * 864e5;
    var key = Utilities.formatDate(new Date(t), TZ, BKT_[bucket][0]), b = map[key];
    if (!b) { b = map[key] = { k: key, label: (bucket === 'week' ? Utilities.formatDate(new Date(t), TZ, BKT_[bucket][1]) : Utilities.formatDate(new Date(r.t), TZ, BKT_[bucket][1])), v: 0, i: 0, o: 0, c: {}, t: {}, w: 0 }; keys.push(key); }
    b.w++; b.t[r.tab] = (b.t[r.tab] || 0) + 1; tt[r.tab] = (tt[r.tab] || 0) + 1;
    if (r.f) { b.v++; vis++; if (r.cc === HOME_CC) { b.i++; ind++; } else b.o++; cm[r.n] = r.cc; var c = b.c[r.n] = (b.c[r.n] || 0) + 1; tc[r.n] = (tc[r.n] || 0) + 1; }
  });
  /* fill empty periods with zeros so the line chart has no gaps (IST has no daylight saving) */
  var stepMs = { minute: 6e4, hour: 36e5, day: 864e5, week: 864e5, month: 2419200000, year: 2419200000 }[bucket], guard = 0;
  for (var ft = from; ft <= to && guard < 4000; ft += stepMs, guard++) {
    var fb = ft; if (bucket === 'week') fb = ft - (+Utilities.formatDate(new Date(ft), TZ, 'u') - 1) * 864e5;
    var fk = Utilities.formatDate(new Date(fb), TZ, BKT_[bucket][0]);
    if (!map[fk]) { map[fk] = { k: fk, label: Utilities.formatDate(new Date(fb), TZ, BKT_[bucket][1]), v: 0, i: 0, o: 0, c: {}, t: {}, w: 0 }; keys.push(fk); }
  }
  keys.sort();
  var log = rows.slice(-400).reverse().map(function (r) { return { w: Utilities.formatDate(new Date(r.t), TZ, 'd MMM yyyy, HH:mm:ss'), cc: r.cc, n: r.n, tab: r.tab, f: r.f, x: r.x, s: Math.max(0, r.s - r.i), i: r.i, g: r.tab === 'Gallery' }; });
  rows.forEach(function (r) { cm[r.n] = r.cc; });
  return { sessions: buildSessions_(rows), ts: ts, log: log, cm: cm, buckets: keys.map(function (k) { return map[k]; }), vis: vis, ind: ind, oth: vis - ind, views: views, countries: tc, tabs: tt };
}
var VIS_HTML_ = "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><base target=\"_top\"><style>\n*{box-sizing:border-box}\n:root{--ink:#0f1722;--mut:#435062;--line:#d9e0e9;--bg:#f4f7fa;--card:#fff;--blue:#1b4f9c;--blue2:#1b4f9c;--amber:#d98a1c;--green:#2a8c82}\nbody{margin:0;background:var(--bg);color:var(--ink);font-family:Calibri,Carlito,\"Segoe UI\",system-ui,-apple-system,Roboto,Arial,sans-serif;font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}\n.top{background:#fff;color:var(--ink);border-bottom:1px solid var(--line);padding:16px 20px 70px}\n.wrap{max-width:1180px;margin:0 auto}\n.brand{display:flex;align-items:center;gap:12px;flex-wrap:wrap}\n.lg{width:38px;height:38px;border:1.5px solid var(--ink);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px;letter-spacing:.04em}\n.t1{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}.t2{font-size:19px}\n.sp{flex:1}\n.nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}\n.nav a{color:var(--ink);text-decoration:none;font-weight:600;font-size:14px;border:1px solid var(--line);border-radius:8px;padding:7px 14px;background:var(--bg)}\n.nav a:hover{background:#e9eef4}.nav a.cur{background:var(--blue);color:#fff;border-color:var(--blue)}\nmain{max-width:1180px;margin:-46px auto 40px;padding:0 16px}\n.card{background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 24px 60px rgba(15,30,55,.07);padding:22px;margin:0 0 18px}\n.hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 4px}\nh1{font-size:34px;font-weight:400;margin:0;letter-spacing:-.015em}h2{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin:0 0 14px}\n.sub{color:var(--mut);margin:0 0 16px;max-width:860px}\n.btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:8px;font:inherit;font-weight:700;font-size:13px;cursor:pointer;padding:9px 18px;background:var(--blue);color:#fff;transition:filter .15s,transform .1s}\n.btn:hover{filter:brightness(1.1)}.btn:active{transform:scale(.97)}.btn:disabled{opacity:.6;cursor:progress}\n.btn.ghost{background:#fff;color:var(--blue);border:1.5px solid #c3d3ea}\n.spin{width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;display:none;animation:r .7s linear infinite}.busy .spin{display:inline-block}.busy .ico{display:none}\n@keyframes r{to{transform:rotate(360deg)}}\n.upd{color:var(--mut);font-size:12px}\n.pills{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}\n.pill{border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:8px;padding:7px 15px;font:inherit;font-weight:700;font-size:13px;cursor:pointer}\n.pill.on{background:var(--blue);border-color:var(--blue);color:#fff}\n.rg{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}\n.fld{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#33415c}\n.fld input,.fld select{border:1.5px solid #d3dbe8;border-radius:10px;padding:9px 10px;font:inherit;font-size:13px;font-weight:400;color:var(--ink);background:#fff}\n.chk{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--mut);margin-left:auto}\n.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:0 0 18px}\n.kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 24px 60px rgba(15,30,55,.07);padding:18px 20px;border-top:3px solid var(--blue2)}\n.kpi.a{border-top-color:var(--amber)}.kpi.g{border-top-color:var(--green)}.kpi.p{border-top-color:#6b5b95}\n.kpi .n{font-size:38px;font-weight:400;letter-spacing:-.02em;line-height:1.1}.kpi .l{color:var(--mut);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-top:4px}\n.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.grid2>.card,.card{min-width:0}\n.chart{display:flex;align-items:flex-end;gap:4px;height:180px;padding:6px 2px 0;overflow-x:auto;border-bottom:1px solid var(--line)}\n.col{flex:1 0 22px;max-width:60px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;position:relative}\n.col .s{width:100%;display:flex;flex-direction:column;justify-content:flex-end;border-radius:6px 6px 0 0;overflow:hidden;min-height:2px}\n.col .o{background:var(--blue2)}.col .i{background:var(--amber)}\n.col .v{font-size:11px;font-weight:700;color:var(--mut);margin-bottom:2px}\n.lab{display:flex;gap:4px;overflow:hidden;margin-top:6px}.lab span{flex:1 0 22px;max-width:60px;font-size:10px;color:var(--mut);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.legend{display:flex;gap:16px;margin-top:10px;font-size:12px;color:var(--mut)}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}\n.ctr{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f0f3f9}.ctr:last-child{border:0}\n.ctr .nm{flex:0 0 170px;font-weight:600;display:flex;align-items:center;gap:8px;min-width:0}.ctr .nm span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.bar{flex:1;height:9px;background:#eef2f8;border-radius:6px;overflow:hidden}.bar b{display:block;height:100%;background:var(--blue2);border-radius:6px}\n.ctr .c{flex:0 0 90px;text-align:right;color:var(--mut);font-variant-numeric:tabular-nums}.ctr .c b{color:var(--ink)}\n.flag{width:22px;height:16px;border-radius:3px;border:1px solid #d9e0ec;object-fit:cover;flex:0 0 auto;background:#f1f5fb}\n.tw{overflow:auto;max-height:520px;border:1px solid var(--line);border-radius:12px}\ntable{border-collapse:separate;border-spacing:0;width:100%}\nth{position:sticky;top:0;background:#f4f7fc;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#4a5668;padding:10px 14px;border-bottom:1px solid var(--line);white-space:nowrap;z-index:1}\ntd{padding:10px 14px;border-bottom:1px solid #f0f3f9;vertical-align:middle}tr:last-child td{border-bottom:0}tbody tr:hover td{background:#fafcff}\ntd.t{white-space:nowrap;font-variant-numeric:tabular-nums;color:#33415c}td.num{white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}th.num{text-align:right}\n.cty{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;font-weight:600}\n.tag{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}\n.tag.n{background:#e1f3e8;color:#1c7a45}.tag.v{background:#e6effa;color:#1b4f9c}.tag.x{background:#fff1d6;color:#8a6a00}.tag.i{background:#eceff3;color:#5a6676}\n.empty{color:#8a95a5;padding:18px;text-align:center}\n.err{background:#fdecea;color:#b3261e;border-radius:10px;padding:10px 14px;margin:0 0 14px;display:none}\n.ft{text-align:center;color:#7a8594;font-size:12px;margin:6px 0 0}.ft span{color:#e0245e}\n@media(max-width:900px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.grid2{grid-template-columns:minmax(0,1fr)}.ctr .nm{flex-basis:130px}.chk{margin-left:0}}\n@media(max-width:480px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kpi .n{font-size:24px}h1{font-size:22px}.card{padding:16px}}\n\n.lc{position:relative}.lc svg{width:100%;height:auto;display:block;overflow:visible}\n.lg2{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}.lgb{display:inline-flex;align-items:center;gap:7px;border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;font-weight:700;color:#33415c;cursor:pointer}.lgb i{width:10px;height:10px;border-radius:50%}.lgb.off{opacity:.45}.lgb.off i{background:#c8d0dc!important}\n.tip{position:absolute;pointer-events:none;background:#17202e;color:#fff;border-radius:10px;padding:8px 12px;font-size:12px;line-height:1.5;box-shadow:0 6px 20px rgba(0,0,0,.25);display:none;white-space:nowrap;z-index:5}.tip b{display:block;margin-bottom:2px}.tip i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}\n.dn{display:flex;align-items:center;gap:18px;margin:0 0 12px;flex-wrap:wrap}.dn svg{width:130px;height:130px;flex:0 0 auto}.dn .k{font-size:12px;color:var(--mut)}.dn .k div{display:flex;align-items:center;gap:6px;margin:2px 0}.dn .k i{width:9px;height:9px;border-radius:50%}\n\n.ses{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:0 0 12px;background:#fff}\n.ses .sh{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 10px}.ses .sh .tm{color:var(--mut);font-variant-numeric:tabular-nums}.ses .sh .tot{margin-left:auto;font-weight:700}\n.rp{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:8px;font:inherit;font-size:12px;font-weight:700;padding:5px 12px;cursor:pointer}.rp:hover{background:#e9eef4}\n.trk{display:flex;gap:3px;height:46px;border-radius:8px;overflow:hidden;background:#eef2f7}\n.sg{flex:1 1 0;min-width:34px;background:var(--c);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 10px;overflow:hidden;white-space:nowrap;transform-origin:left center;animation:grow .7s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i)*.45s);font-size:12px;line-height:1.25}\n.sg b{font-size:13px;overflow:hidden;text-overflow:ellipsis}.sg span{opacity:.9}\n@keyframes grow{from{opacity:0;transform:scaleX(0)}to{opacity:1;transform:none}}\n.stp{display:flex;flex-wrap:wrap;gap:4px 16px;margin:10px 0 0;font-size:12px;color:var(--mut)}.stp i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;vertical-align:0}\n.tlg{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0 0 12px;font-size:12px;color:var(--mut)}.tlg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}\n.tb2{height:8px;background:#eef2f8;border-radius:6px;overflow:hidden;min-width:90px}.tb2 b{display:block;height:100%;border-radius:6px;transform-origin:left;animation:grow 1s cubic-bezier(.22,1,.36,1) both}\n</style></head><body>\n<div class=\"top\"><div class=\"wrap\"><div class=\"brand\"><div class=\"lg\">AP</div><div><div class=\"t1\">Website admin</div><div class=\"t2\">Anandu Prabhakaran</div></div></div>__NAV__</div></div>\n<main>\n<div class=\"card\"><div class=\"hd\"><h1>Visitors</h1><span class=\"sp\"></span><span class=\"upd\" id=\"upd\"></span><button class=\"btn\" id=\"rf\" type=\"button\"><span class=\"spin\"></span><span class=\"ico\">&#8635;</span> Refresh</button></div>\n<p class=\"sub\">Where your visitors come from and what they read. Only the country, the tab, the time and the time spent on each tab are stored. Indian visits are counted here but never emailed. All times are IST. A visitor is the first page of a browser session; tab views count every page opened.</p>\n<div class=\"pills\" id=\"pre\"></div>\n<div class=\"rg\"><label class=\"fld\">From<input type=\"datetime-local\" id=\"f\"></label><label class=\"fld\">To<input type=\"datetime-local\" id=\"t\"></label>\n<label class=\"fld\">Group by<select id=\"u\"><option value=\"minute\">Minutes</option><option value=\"hour\">Hours</option><option value=\"day\" selected>Days</option><option value=\"week\">Weeks</option><option value=\"month\">Months</option><option value=\"year\">Years</option></select></label>\n<button class=\"btn\" id=\"go\" type=\"button\">Show custom range</button>\n<label class=\"chk\"><input type=\"checkbox\" id=\"auto\"> Auto-refresh every minute</label></div></div>\n<div class=\"err\" id=\"err\"></div>\n<div id=\"out\"><div class=\"card\"><p class=\"sub\" style=\"margin:0\">Loading&hellip;</p></div></div>\n<div class=\"ft\">Created with <span>&#10084;</span> by Anandu Prabhakaran</div>\n</main>\n<script>(function(){\nvar SIG=__SIG__,G=google.script.run,IST=19800000,CM={},cur=2,timer=null;\nvar PRE=[[\"Last hour\",3600000,\"minute\"],[\"Last 24 hours\",86400000,\"hour\"],[\"Last 7 days\",604800000,\"day\"],[\"Last 30 days\",2592000000,\"day\"],[\"Last 12 months\",31536000000,\"month\"],[\"All time\",0,\"year\"]];\nfunction $(i){return document.getElementById(i);}\nfunction esc(s){return String(s).replace(/[&<>\"]/g,function(c){return {\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\"}[c];});}\nfunction z(n){return(n<10?\"0\":\"\")+n;}\nfunction toIn(ms){var d=new Date(ms+IST);return d.getUTCFullYear()+\"-\"+z(d.getUTCMonth()+1)+\"-\"+z(d.getUTCDate())+\"T\"+z(d.getUTCHours())+\":\"+z(d.getUTCMinutes());}\nfunction fromIn(v){var m=/^(\\d+)-(\\d+)-(\\d+)T(\\d+):(\\d+)/.exec(v||\"\");return m?Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5])-IST:NaN;}\nfunction dur(s){s=Math.round(s);if(s<60)return s+\" s\";var m=Math.floor(s/60);if(m<60)return m+\" min \"+z(s%60)+\" s\";return Math.floor(m/60)+\" h \"+z(m%60)+\" min\";}\nfunction idl(x){return x.i?'<em class=\"idl\">'+(x.g?'Static':'Left open')+' '+dur(x.i)+'</em>':'';}\nfunction fl(cc){cc=String(cc||\"\").toLowerCase();return '<img class=\"flag\" src=\"https://flagcdn.com/w40/'+esc(cc)+'.png\" alt=\"'+esc(cc.toUpperCase())+'\" loading=\"lazy\">';}\nfunction now(){var d=new Date(Date.now()+IST);return z(d.getUTCHours())+\":\"+z(d.getUTCMinutes())+\":\"+z(d.getUTCSeconds());}\nfunction sortKeys(o){return Object.keys(o).sort(function(a,b){return o[b]-o[a];});}\nfunction err(t){var e=$(\"err\");e.style.display=t?\"block\":\"none\";e.textContent=t||\"\";}\nfunction busy(b){$(\"rf\").disabled=b;$(\"go\").disabled=b;$(\"rf\").className=\"btn\"+(b?\" busy\":\"\");$(\"out\").style.opacity=b?\".55\":\"1\";}\nvar TC={Home:\"#1b4f9c\",\"About me\":\"#d98a1c\",Research:\"#2a8c82\",Publications:\"#6b5b95\",Workshops:\"#b5473f\",Gallery:\"#3d8bb5\",Contact:\"#8c6d46\"};\nvar SER=[[\"Visitors\",\"v\",\"#1b4f9c\"],[\"India\",\"i\",\"#d98a1c\"],[\"Other countries\",\"o\",\"#2a8c82\"],[\"Tab views\",\"w\",\"#6b5b95\"]],ON={v:1,i:1,o:1,w:0},LAST=null;\nfunction nice(m){var st=1,ks=[1,2,5,10],p=1;while(true){var f=false;for(var q=0;q<4;q++){var c=ks[q]*p;if(c*4>=m){st=c;f=true;break;}}if(f)break;p*=10;}return st*4;}\nfunction lineChart(d){var B=d.buckets;if(!B.length)return '<div class=\"empty\">No visits in this range.</div>';\n var W=1000,H=300,L=46,R=18,T=14,Bm=38,n=B.length,pw=W-L-R,ph=H-T-Bm,mx=1;\n SER.forEach(function(s){if(ON[s[1]])B.forEach(function(b){if(b[s[1]]>mx)mx=b[s[1]];});});\n var top=nice(mx),X=function(k){return n===1?L+pw/2:L+k*pw/(n-1);},Y=function(v){return T+ph-v/top*ph;};\n var g='<defs><linearGradient id=\"ar\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#1b4f9c\" stop-opacity=\".28\"/><stop offset=\"1\" stop-color=\"#1b4f9c\" stop-opacity=\"0\"/></linearGradient></defs>';\n for(var t=0;t<=4;t++){var v=top*t/4,y=Y(v);g+='<line x1=\"'+L+'\" x2=\"'+(W-R)+'\" y1=\"'+y+'\" y2=\"'+y+'\" stroke=\"#e8edf5\" stroke-width=\"1\"/><text x=\"'+(L-8)+'\" y=\"'+(y+4)+'\" text-anchor=\"end\" font-size=\"12\" fill=\"#6b778a\">'+(Math.round(v*10)/10)+'</text>';}\n var step=Math.max(1,Math.ceil(n/8));\n B.forEach(function(b,k){if(k%step===0||k===n-1){if(k===n-1&&k%step&&n>2&&(n-1)%step<step/2)return;g+='<text x=\"'+X(k)+'\" y=\"'+(H-12)+'\" text-anchor=\"'+(k===0&&n>1?\"start\":k===n-1&&n>1?\"end\":\"middle\")+'\" font-size=\"12\" fill=\"#6b778a\">'+esc(b.label.replace(/^[A-Za-z]{3}, /,\"\"))+'</text>';}});\n g+='<line x1=\"'+L+'\" x2=\"'+(W-R)+'\" y1=\"'+(T+ph)+'\" y2=\"'+(T+ph)+'\" stroke=\"#c9d3e2\"/>';\n if(ON.v){var a=\"M\"+X(0)+\",\"+Y(0);B.forEach(function(b,k){a+=\" L\"+X(k)+\",\"+Y(b.v);});a+=\" L\"+X(n-1)+\",\"+Y(0)+\" Z\";g+='<path d=\"'+a+'\" fill=\"url(#ar)\"/>';}\n SER.forEach(function(s){if(!ON[s[1]])return;var p=\"\";B.forEach(function(b,k){p+=(k?\" L\":\"M\")+X(k)+\",\"+Y(b[s[1]]);});\n  g+='<path d=\"'+p+'\" fill=\"none\" stroke=\"'+s[2]+'\" stroke-width=\"'+(s[1]===\"v\"?3:2.2)+'\" stroke-linejoin=\"round\" stroke-linecap=\"round\"'+(s[1]===\"w\"?' stroke-dasharray=\"6 5\"':'')+'/>';\n  if(n<=45)B.forEach(function(b,k){g+='<circle cx=\"'+X(k)+'\" cy=\"'+Y(b[s[1]])+'\" r=\"'+(s[1]===\"v\"?3.6:3)+'\" fill=\"#fff\" stroke=\"'+s[2]+'\" stroke-width=\"2\"/>';});});\n g+='<line id=\"gd\" x1=\"0\" x2=\"0\" y1=\"'+T+'\" y2=\"'+(T+ph)+'\" stroke=\"#9fb0c9\" stroke-dasharray=\"4 4\" style=\"display:none\"/>';\n var bw=n===1?pw:pw/(n-1);B.forEach(function(b,k){g+='<rect data-k=\"'+k+'\" x=\"'+(X(k)-bw/2)+'\" y=\"'+T+'\" width=\"'+bw+'\" height=\"'+ph+'\" fill=\"transparent\"/>';});\n var lg='<div class=\"lg2\">'+SER.map(function(s){return '<button type=\"button\" class=\"lgb'+(ON[s[1]]?\"\":\" off\")+'\" data-s=\"'+s[1]+'\"><i style=\"background:'+s[2]+'\"></i>'+s[0]+'</button>';}).join(\"\")+'</div>';\n return lg+'<div class=\"lc\" id=\"lc\"><svg viewBox=\"0 0 '+W+' '+H+'\" role=\"img\" aria-label=\"Visitors over time\">'+g+'</svg><div class=\"tip\" id=\"tip\"></div></div>';}\nfunction wireChart(){var lc=$(\"lc\");if(!lc||!LAST)return;var svg=lc.querySelector(\"svg\"),tip=$(\"tip\"),gd=$(\"gd\"),B=LAST.buckets,W=1000,L=46,R=18,n=B.length;\n [].forEach.call(document.querySelectorAll(\".lgb\"),function(b){b.onclick=function(){ON[b.getAttribute(\"data-s\")]^=1;$(\"chartbox\").innerHTML=lineChart(LAST);wireChart();};});\n [].forEach.call(svg.querySelectorAll(\"rect[data-k]\"),function(r){r.onmousemove=function(e){var k=+r.getAttribute(\"data-k\"),b=B[k],x=n===1?L+(W-L-R)/2:L+k*(W-L-R)/(n-1),box=svg.getBoundingClientRect(),sx=box.width/W;\n  gd.setAttribute(\"x1\",x);gd.setAttribute(\"x2\",x);gd.style.display=\"\";\n  tip.innerHTML=\"<b>\"+esc(b.label)+\"</b>\"+SER.map(function(s){return '<div><i style=\"background:'+s[2]+'\"></i>'+s[0]+\": \"+b[s[1]]+\"</div>\";}).join(\"\");tip.style.display=\"block\";\n  var tx=x*sx+14;if(tx+tip.offsetWidth>box.width)tx=x*sx-tip.offsetWidth-14;tip.style.left=Math.max(0,tx)+\"px\";tip.style.top=\"10px\";};\n  r.onmouseleave=function(){tip.style.display=\"none\";gd.style.display=\"none\";};});}\nfunction donut(d){var k=sortKeys(d.countries);if(!k.length)return \"\";var tot=k.reduce(function(a,x){return a+d.countries[x];},0),C=[\"#1b4f9c\",\"#d98a1c\",\"#2a8c82\",\"#6b5b95\",\"#b5473f\",\"#3d8bb5\",\"#8c6d46\",\"#9a4f86\"],r=46,c=2*Math.PI*r,off=0,svg='<svg viewBox=\"0 0 120 120\" role=\"img\" aria-label=\"Share of visitors by country\"><g transform=\"rotate(-90 60 60)\"><circle cx=\"60\" cy=\"60\" r=\"'+r+'\" fill=\"none\" stroke=\"#eef2f8\" stroke-width=\"16\"/>',kk=\"\";\n k.forEach(function(x,i){var f=d.countries[x]/tot,col=C[Math.min(i,C.length-1)],len=f*c;if(i<C.length-1||k.length<=C.length){svg+='<circle cx=\"60\" cy=\"60\" r=\"'+r+'\" fill=\"none\" stroke=\"'+col+'\" stroke-width=\"16\" stroke-dasharray=\"'+len+' '+(c-len)+'\" stroke-dashoffset=\"'+(-off)+'\"/>';off+=len;}\n  if(i<5)kk+='<div><i style=\"background:'+col+'\"></i>'+esc(x)+\" \"+Math.round(f*100)+\"%</div>\";});\n if(k.length>C.length){var rest=0;k.slice(C.length-1).forEach(function(x){rest+=d.countries[x];});svg+='<circle cx=\"60\" cy=\"60\" r=\"'+r+'\" fill=\"none\" stroke=\"'+C[C.length-1]+'\" stroke-width=\"16\" stroke-dasharray=\"'+(rest/tot*c)+' '+c+'\" stroke-dashoffset=\"'+(-off)+'\"/>';}\n svg+='</g><text x=\"60\" y=\"58\" text-anchor=\"middle\" font-size=\"20\" font-weight=\"800\" fill=\"#17202e\">'+tot+'</text><text x=\"60\" y=\"74\" text-anchor=\"middle\" font-size=\"9\" fill=\"#6b778a\">VISITORS</text></svg>';\n return '<div class=\"dn\">'+svg+'<div class=\"k\">'+kk+'</div></div>';}\nfunction countries(d){var k=sortKeys(d.countries);if(!k.length)return '<div class=\"empty\">No visitors yet.</div>';var mx=d.countries[k[0]],tot=k.reduce(function(a,x){return a+d.countries[x];},0),h=\"\";\n k.forEach(function(x){var v=d.countries[x];h+='<div class=\"ctr\"><div class=\"nm\">'+fl(CM[x])+'<span>'+esc(x)+'</span></div><div class=\"bar\"><b style=\"width:'+Math.round(v/mx*100)+'%\"></b></div><div class=\"c\"><b>'+v+'</b> &middot; '+Math.round(v/tot*100)+'%</div></div>';});return h;}\nfunction tc(t){return TC[t]||\"#6b778a\";}\nfunction tabs(d){var k=sortKeys(d.tabs);if(!k.length)return '<div class=\"empty\">No tab views yet.</div>';var mx=1;k.forEach(function(x){mx=Math.max(mx,(d.ts&&d.ts[x])||0);});\n var h='<div class=\"tw\"><table><thead><tr><th>Tab</th><th class=\"num\">Views</th><th class=\"num\">Total time</th><th></th><th class=\"num\">Average per view</th></tr></thead><tbody>';\n k.forEach(function(x,i){var t=(d.ts&&d.ts[x])||0;h+='<tr><td><b><span style=\"display:inline-block;width:10px;height:10px;border-radius:3px;background:'+tc(x)+';margin-right:8px\"></span>'+esc(x)+'</b></td><td class=\"num\">'+d.tabs[x]+'</td><td class=\"num\">'+dur(t)+'</td><td style=\"width:34%\"><div class=\"tb2\"><b style=\"width:'+Math.round(t/mx*100)+'%;background:'+tc(x)+';animation-delay:'+(i*.12)+'s\"></b></div></td><td class=\"num\">'+(t?dur(t/d.tabs[x]):\"-\")+'</td></tr>';});return h+'</tbody></table></div>';}\nfunction sessions(d){var S=d.sessions||[];if(!S.length)return '<div class=\"empty\">No sessions in this range.</div>';\n var seen={},lg=\"\";S.forEach(function(s){s.steps.forEach(function(st){if(!seen[st.tab]){seen[st.tab]=1;lg+='<span><i style=\"background:'+tc(st.tab)+'\"></i>'+esc(st.tab)+'</span>';}});});\n var h='<div class=\"tlg\">'+lg+'</div>';\n S.forEach(function(s,i){var seg=\"\",stp=\"\";s.steps.forEach(function(st,j){var w=Math.max(st.s+st.i*.4,5);\n   seg+='<div class=\"sg\" style=\"--c:'+tc(st.tab)+';--i:'+j+';flex-grow:'+w+'\" title=\"'+esc(st.tab)+' &middot; opened '+esc(st.w)+' &middot; '+(st.s?dur(st.s):\"time not reported\")+(st.i?' &middot; '+(st.g?'static ':'left open ')+dur(st.i):'')+'\"><b>'+esc(st.tab)+'</b><span>'+(st.s?dur(st.s):(st.i?\"idle\":\"open\"))+(st.i?' + '+(st.g?'static':'left open'):'')+'</span></div>';\n   stp+='<span><i style=\"background:'+tc(st.tab)+'\"></i>'+esc(st.w)+' '+esc(st.tab)+(st.s?' &middot; '+dur(st.s):'')+(st.i?' &middot; '+(st.g?'static ':'left open ')+dur(st.i):'')+'</span>';});\n  h+='<div class=\"ses\" id=\"ses'+i+'\"><div class=\"sh\"><span class=\"cty\">'+fl(s.cc)+esc(s.n)+'</span><span class=\"tm\">'+esc(s.w)+' IST</span><span class=\"tag '+(s.f?\"n\":\"v\")+'\">'+(s.f?\"New visitor\":\"Continued\")+'</span><span class=\"tot\">'+(s.total?dur(s.total)+\" in total\":\"time not reported\")+' &middot; '+s.steps.length+(s.steps.length===1?\" tab\":\" tabs\")+'</span><button class=\"rp\" type=\"button\" data-r=\"'+i+'\">&#9654; Replay</button></div><div class=\"trk\">'+seg+'</div><div class=\"stp\">'+stp+'</div></div>';});\n return h;}\nfunction byPeriod(d){if(!d.buckets.length)return '<div class=\"empty\">No visits in this range.</div>';\n var h='<div class=\"tw\"><table><thead><tr><th>Period</th><th class=\"num\">Visitors</th><th class=\"num\">India</th><th class=\"num\">Other</th><th>Countries</th><th class=\"num\">Tab views</th></tr></thead><tbody>';\n d.buckets.slice().reverse().forEach(function(b){var c=sortKeys(b.c).map(function(x){return '<span class=\"cty\" style=\"margin-right:12px\">'+fl(CM[x])+esc(x)+' '+b.c[x]+'</span>';}).join(\"\")||\"-\";\n  h+='<tr><td class=\"t\">'+esc(b.label)+'</td><td class=\"num\"><b>'+b.v+'</b></td><td class=\"num\">'+b.i+'</td><td class=\"num\">'+b.o+'</td><td>'+c+'</td><td class=\"num\">'+b.w+'</td></tr>';});return h+'</tbody></table></div>';}\nfunction log(d){if(!d.log.length)return '<div class=\"empty\">No visits in this range.</div>';\n var h='<div class=\"tw\"><table><thead><tr><th>Time (IST)</th><th>Country</th><th>Tab</th><th>What happened</th></tr></thead><tbody>';\n d.log.forEach(function(r){var w=r.x?'<span class=\"tag x\">Left after '+dur(r.s)+'</span>'+(r.i?' <span class=\"tag i\">'+(r.g?'Static ':'Left open ')+dur(r.i)+'</span>':''):(r.f?'<span class=\"tag n\">Opened &middot; new visitor</span>':'<span class=\"tag v\">Opened &middot; tab view</span>');\n  h+='<tr><td class=\"t\">'+esc(r.w)+'</td><td><span class=\"cty\">'+fl(r.cc)+esc(r.n)+'</span></td><td>'+esc(r.tab)+'</td><td>'+w+'</td></tr>';});return h+'</tbody></table></div>';}\nfunction replay(el){if(!el)return;var l=el.querySelectorAll(\".sg\");[].forEach.call(l,function(x){x.style.animation=\"none\";});void el.offsetWidth;[].forEach.call(l,function(x){x.style.animation=\"\";});}\nfunction wireReplay(){[].forEach.call(document.querySelectorAll(\"[data-r]\"),function(b){b.onclick=function(){replay($(\"ses\"+b.getAttribute(\"data-r\")));};});var a=$(\"rpall\");if(a)a.onclick=function(){[].forEach.call(document.querySelectorAll(\".ses\"),replay);};}\nfunction draw(d){CM=d.cm||{};\n var h='<div class=\"kpis\"><div class=\"kpi\"><div class=\"n\">'+d.vis+'</div><div class=\"l\">Visitors</div></div><div class=\"kpi a\"><div class=\"n\">'+d.ind+'</div><div class=\"l\">From India</div></div><div class=\"kpi g\"><div class=\"n\">'+d.oth+'</div><div class=\"l\">Other countries</div></div><div class=\"kpi p\"><div class=\"n\">'+d.views+'</div><div class=\"l\">Tab views</div></div></div>';\n h+='<div class=\"card\"><h2>Visitors over time</h2><div id=\"chartbox\">'+lineChart(d)+'</div></div>';\n h+='<div class=\"grid2\"><div class=\"card\"><h2>Countries</h2>'+donut(d)+countries(d)+'</div><div class=\"card\"><h2>Tabs and time spent</h2>'+tabs(d)+'</div></div>';\n h+='<div class=\"card\"><h2>By period</h2>'+byPeriod(d)+'</div>';\n h+='<div class=\"card\"><div class=\"hd\"><h2 style=\"margin:0\">Sessions: what each visitor opened and for how long</h2><span class=\"sp\"></span><button class=\"rp\" type=\"button\" id=\"rpall\">&#9654; Replay all</button></div><p class=\"sub\" style=\"margin:8px 0 14px\">Each bar is one visitor session. Tabs are in the order they were opened and their width shows the time spent on them. Hover a block for details.</p>'+sessions(d)+'</div>';\n h+='<div class=\"card\"><h2>Each visit <span class=\"upd\" style=\"font-weight:400\">(latest '+d.log.length+', time is approximate)</span></h2>'+log(d)+'</div>';\n $(\"out\").innerHTML=h;LAST=d;wireChart();wireReplay();$(\"upd\").textContent=\"Updated \"+now()+\" IST\";}\nfunction load(a,b,u){err(\"\");busy(true);\n G.withSuccessHandler(function(d){busy(false);draw(d);}).withFailureHandler(function(e){busy(false);err((e&&e.message||\"That did not work.\").replace(/^Error: /,\"\"));}).visitData(SIG,a,b,u);}\nfunction custom(){var a=fromIn($(\"f\").value),b=fromIn($(\"t\").value);if(isNaN(a)||isNaN(b)||b<=a){err(\"Choose a valid From and To.\");return;}load(a,b,$(\"u\").value);}\nfunction setOn(i){cur=i;[].forEach.call(document.querySelectorAll(\"#pre .pill\"),function(p,j){p.className=\"pill\"+(j===i?\" on\":\"\");});}\nfunction preset(i){var p=PRE[i],n=Date.now();setOn(i);$(\"f\").value=toIn(p[1]?n-p[1]:Date.UTC(2024,0,1)-IST);$(\"t\").value=toIn(n+60000);$(\"u\").value=p[2];load(p[1]?n-p[1]:Date.UTC(2024,0,1)-IST,n+60000,p[2]);}\nfunction refresh(){if(cur>=0)preset(cur);else custom();}\nPRE.forEach(function(p,i){var b=document.createElement(\"button\");b.type=\"button\";b.className=\"pill\";b.textContent=p[0];b.onclick=function(){preset(i);};$(\"pre\").appendChild(b);});\n$(\"go\").onclick=function(){setOn(-1);custom();};\n$(\"rf\").onclick=refresh;\n$(\"auto\").onchange=function(){if(timer){clearInterval(timer);timer=null;}if(this.checked)timer=setInterval(function(){if(!document.hidden)refresh();},60000);};\npreset(2);\n})();</script></body></html>\n";
function visitorsPage_(p) {
  if (sign_('admin', 'visitors') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var nav = navBar_().replace(/<div style="[^"]*">/, '<div class="nav">').replace(/<a href="([^"]*)" target="_top" style="[^"]*">/g, '<a href="$1" target="_top">').replace('>Visitors</a>', ' class="cur">Visitors</a>');
  return out_(VIS_HTML_.replace('__NAV__', function () { return nav; }).replace('__SIG__', function () { return JSON.stringify(p.sig); }), 'Visitors');
}

/* ---- Messages and Appointments portals ---- */
function msgUrl_() { return portalBase_() + '?action=messages&sig=' + sign_('admin', 'messages'); }
function apptUrl_() { return portalBase_() + '?action=appts&sig=' + sign_('admin', 'appts'); }
function listStyle_() { return '<style>.li{border:1.5px solid #e1e8f3;border-radius:12px;padding:12px 14px;margin:0 0 10px;background:#fff}.li .h{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;margin:0 0 6px}.li .n{font-weight:bold}.li .m{color:#5b6675;font-size:12px}.li .b{white-space:pre-wrap;font-size:14px;margin:6px 0 10px}.pl{display:inline-block;font-size:12px;font-weight:bold;border-radius:12px;padding:2px 10px;margin-left:6px}.pl.y{background:#fff3d6;color:#8a6a00}.pl.g{background:#dff3e6;color:#1e8e4e}.pl.x{background:#eef2f8;color:#5b6675}.ab{display:inline-block;text-decoration:none;border-radius:20px;padding:6px 14px;font-weight:bold;font-size:13px;margin:0 6px 4px 0;color:#fff}</style>'; }
function messagesPage_(p) {
  if (sign_('admin', 'messages') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var props = PropertiesService.getScriptProperties().getProperties(), list = [];
  Object.keys(props).forEach(function (k) { if (k.indexOf('MSG_') === 0) { try { var r = JSON.parse(props[k]); r.id = k.slice(4); list.push(r); } catch (x) { } } });
  list.sort(function (a, b) { return b.t - a.t; });
  var items = list.map(function (r) {
    return '<div class="li" data-s="' + esc_((r.n + ' ' + r.e + ' ' + r.m).toLowerCase()) + '"><div class="h"><span class="n">' + esc_(r.n) + '</span><a href="mailto:' + esc_(r.e) + '" style="color:#1f4e9c;font-size:13px">' + esc_(r.e) + '</a><span class="m">' + Utilities.formatDate(new Date(r.t), TZ, 'd MMM yyyy, HH:mm') + ' IST</span></div>'
      + '<div class="b">' + esc_(r.m) + '</div><a class="ab" style="background:#1f4e9c" target="_top" href="' + link_('reply', r.id) + '">Reply</a></div>';
  }).join('') || '<p class="sub">No messages yet.</p>';
  var inner = listStyle_() + '<input id="q" class="tx" placeholder="Search name, email or message" style="margin:0 0 14px"><div id="l">' + items + '</div>'
    + '<script>document.getElementById("q").oninput=function(){var v=this.value.toLowerCase(),r=document.querySelectorAll("#l .li");for(var i=0;i<r.length;i++)r[i].style.display=r[i].getAttribute("data-s").indexOf(v)<0?"none":"";};<\/script>';
  return out_(shell_('Messages', list.length + ' message' + (list.length === 1 ? '' : 's') + ' from the contact form, newest first. They are kept for 120 days.', inner, true), 'Messages');
}
function appointmentsPage_(p) {
  if (sign_('admin', 'appts') !== p.sig) return page_('Link not valid', 'This link is not valid.', 'bad');
  var cal = CalendarApp.getDefaultCalendar(), now = new Date(), from = new Date(now.getTime() - 60 * 86400000), to = new Date(now.getTime() + (DAYS_AHEAD + 30) * 86400000);
  var evs = cal.getEvents(from, to).filter(function (e) { return /^(REQUEST|Appointment:)/.test(e.getTitle()); });
  var card = function (e) {
    var pend = /^REQUEST/.test(e.getTitle()), past = e.getEndTime().getTime() < now.getTime(), name = e.getTag('name') || e.getTitle().replace(/^[^:]*:\s*/, ''), email = e.getTag('email') || '', id = e.getId();
    var desc = String(e.getDescription() || '').replace(/^[\s\S]*Purpose:\s*/, '').slice(0, 1000);
    return '<div class="li"><div class="h"><span class="n">' + esc_(name) + '</span>' + (email ? '<a href="mailto:' + esc_(email) + '" style="color:#1f4e9c;font-size:13px">' + esc_(email) + '</a>' : '')
      + (pend ? '<span class="pl y">Waiting for your reply</span>' : (past ? '<span class="pl x">Past</span>' : '<span class="pl g">Confirmed</span>')) + '</div>'
      + '<div class="m">' + esc_(whenText_(e.getStartTime(), e.getEndTime())) + '</div>' + (desc ? '<div class="b">' + esc_(desc) + '</div>' : '<div class="b"></div>')
      + (pend && !past ? '<a class="ab" style="background:#1e8e3e" target="_top" href="' + link_('approve', id) + '">Approve</a><a class="ab" style="background:#c5221f" target="_top" href="' + link_('decline', id) + '">Decline</a>' : '')
      + (email ? '<a class="ab" style="background:#1f4e9c" target="_top" href="' + link_('compose', 'new') + '&to=' + encodeURIComponent(email) + '">Write to them</a>' : '') + '<a class="ab" style="background:#5b6675" target="_blank" href="' + calLink_(e) + '">Open in Calendar</a></div>';
  };
  var pend = evs.filter(function (e) { return /^REQUEST/.test(e.getTitle()) && e.getEndTime() >= now; }), up = evs.filter(function (e) { return /^Appointment:/.test(e.getTitle()) && e.getEndTime() >= now; }),
    old = evs.filter(function (e) { return e.getEndTime() < now; }).reverse();
  var sec = function (t, a, em) { return '<h2 style="font-size:17px;margin:22px 0 8px">' + t + ' (' + a.length + ')</h2>' + (a.length ? a.map(card).join('') : '<p class="sub" style="margin:0">' + em + '</p>'); };
  var inner = listStyle_() + sec('Waiting for your reply', pend, 'No pending requests.') + sec('Upcoming appointments', up, 'No confirmed appointments ahead.') + sec('Past (last 60 days)', old, 'Nothing in the last 60 days.');
  return out_(shell_('Appointments', 'Requests from the booking calendar. Approve or decline here, the same as from the email. Declined requests are removed from the calendar.', inner, true), 'Appointments');
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
