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
  var h = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c2430">'
    + '<div style="background:#1f4e9c;color:#ffffff;padding:16px 20px;border-radius:8px 8px 0 0;font-size:18px;font-weight:bold">' + esc_(heading) + '</div>'
    + '<div style="border:1px solid #d9dee6;border-top:0;padding:20px;border-radius:0 0 8px 8px">';
  if (intro) h += '<p style="margin:0 0 16px;line-height:1.5">' + intro + '</p>';
  h += '<table style="border-collapse:collapse;width:100%">';
  rows.forEach(function (r) {
    h += '<tr><td style="padding:8px 10px;border-bottom:1px solid #eef0f4;color:#5b6675;width:110px;vertical-align:top">' + esc_(r[0]) + '</td>'
      + '<td style="padding:8px 10px;border-bottom:1px solid #eef0f4;vertical-align:top">' + r[1] + '</td></tr>';
  });
  h += '</table>';
  if (buttons && buttons.length) {
    h += '<div style="margin-top:22px">';
    buttons.forEach(function (b) {
      h += '<a href="' + b[1] + '" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:6px;background:' + b[2] + ';color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px">' + esc_(b[0]) + '</a>';
    });
    h += '</div>';
  }
  if (footer) h += '<p style="margin:18px 0 0;color:#7a8594;font-size:12px;line-height:1.5">' + footer + '</p>';
  return h + '</div></div>';
}
function page_(title, msg) {
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#1c2430"><h2>' + esc_(title) + '</h2><p style="line-height:1.6">' + msg + '</p></div>').setTitle(title);
}

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
  if ((action !== 'approve' && action !== 'decline') || !id || sign_(action, id) !== p.sig) return page_('Link not valid', 'This link is not valid.');
  var cal = CalendarApp.getDefaultCalendar(), ev = cal.getEventById(id);
  if (!ev) return page_('Already handled', 'This request is no longer on the calendar. It was probably approved or declined already.');
  if (!/^REQUEST/.test(ev.getTitle())) return page_('Already handled', 'This request was already handled: ' + esc_(ev.getTitle()));
  var name = ev.getTag('name') || 'the visitor', email = ev.getTag('email') || '', when = whenText_(ev.getStartTime(), ev.getEndTime());
  var len = Math.round((ev.getEndTime().getTime() - ev.getStartTime().getTime()) / 60000);
  if (action === 'approve') {
    ev.setTitle('Appointment: ' + name);
    try { ev.setColor(CalendarApp.EventColor.GREEN); } catch (x) { }
    if (email) {
      try { ev.addGuest(email); } catch (x) { console.error('invite failed: ' + x); }
      try {
        MailApp.sendEmail({ to: email, name: OWNER_NAME, subject: 'Appointment confirmed: ' + when,
          body: 'Hello ' + name + ', your appointment is confirmed: ' + when + ' (' + len + ' minutes). A Google Calendar invitation has been sent to you.',
          htmlBody: mail_('Appointment confirmed', 'Hello ' + esc_(name) + ', your appointment is confirmed.', [['When', esc_(when)], ['Length', len + ' minutes']], [], 'A Google Calendar invitation has also been sent to this address. ' + OWNER_NAME) });
      } catch (x) { console.error('confirm mail failed: ' + x); }
    }
    return page_('Approved', 'The appointment with ' + esc_(name) + ' on ' + esc_(when) + ' is confirmed. ' + (email ? 'A Google Calendar invitation and a confirmation email were sent to ' + esc_(email) + '.' : 'No email address was stored for this request, so nothing was sent.'));
  }
  // Decline: show a page with a box for the reason; the reason is sent to the visitor by declineWith()
  return HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:40px auto;padding:0 20px;color:#1c2430">'
    + '<h2 style="margin:0 0 6px">Decline this request</h2>'
    + '<p style="margin:0 0 16px;color:#5b6675;line-height:1.5">' + esc_(name) + ', ' + esc_(when) + '</p>'
    + '<label for="r" style="font-weight:bold">Reason (optional, sent to the visitor in the email)</label>'
    + '<textarea id="r" rows="6" style="width:100%;box-sizing:border-box;margin:8px 0 14px;padding:10px;font:inherit;border:1px solid #c9d0da;border-radius:6px" placeholder="For example: I am travelling that week. Please pick a slot after 9 November."></textarea>'
    + '<button id="b" style="padding:11px 18px;border:0;border-radius:6px;background:#c5221f;color:#fff;font-weight:bold;font-size:14px;cursor:pointer">Send decline</button>'
    + '<p id="m" style="margin-top:16px;line-height:1.6"></p>'
    + '<script>document.getElementById("b").onclick=function(){var b=this;b.disabled=true;b.textContent="Sending...";'
    + 'google.script.run.withSuccessHandler(function(h){document.body.innerHTML=h;}).withFailureHandler(function(){b.disabled=false;b.textContent="Send decline";document.getElementById("m").textContent="Something went wrong. Please try again.";})'
    + '.declineWith(' + JSON.stringify(id) + ',' + JSON.stringify(p.sig) + ',document.getElementById("r").value);};<\/script></div>').setTitle('Decline request');
}

// Called from the decline page. Verifies the signed link again, removes the request and emails the visitor with the reason.
function declineWith(id, sig, reason) {
  var wrap = function (title, msg) { return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#1c2430"><h2>' + esc_(title) + '</h2><p style="line-height:1.6">' + msg + '</p></div>'; };
  if (!id || sign_('decline', id) !== sig) return wrap('Link not valid', 'This link is not valid.');
  var ev = CalendarApp.getDefaultCalendar().getEventById(id);
  if (!ev || !/^REQUEST/.test(ev.getTitle())) return wrap('Already handled', 'This request was already approved or declined.');
  var name = ev.getTag('name') || 'the visitor', email = ev.getTag('email') || '', when = whenText_(ev.getStartTime(), ev.getEndTime());
  reason = String(reason || '').trim().slice(0, 1000);
  ev.deleteEvent();
  if (email) {
    var reasonHtml = reason ? '<div style="margin:14px 0 0;padding:12px 14px;background:#f3f6fb;border-left:4px solid #1f4e9c;border-radius:4px;line-height:1.5"><b>Reason:</b><br>' + esc_(reason).replace(/\n/g, '<br>') + '</div>' : '';
    try {
      MailApp.sendEmail({ to: email, name: OWNER_NAME, subject: 'About your appointment request: ' + when,
        body: 'Hello ' + name + ', I am sorry, I cannot meet at ' + when + '.' + (reason ? '\n\nReason: ' + reason : '') + '\n\nYou are welcome to choose another time at ' + SITE_URL,
        htmlBody: mail_('About your appointment request', 'Hello ' + esc_(name) + ', I am sorry, I cannot meet at the time you requested (' + esc_(when) + ').' + reasonHtml,
          [], [['Choose another time', SITE_URL, '#1f4e9c']], OWNER_NAME) });
    } catch (x) { console.error('decline mail failed: ' + x); }
  }
  return wrap('Declined', 'The request from ' + esc_(name) + ' for ' + esc_(when) + ' was removed from the calendar.' + (email ? ' An email' + (reason ? ' with your reason' : '') + ' was sent to ' + esc_(email) + '.' : ''));
}

/* ---- new request (POST) ---- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var p = JSON.parse(e.postData.contents || '{}');
    if (p.website) return json_({ ok: true });
    var name = String(p.name || '').trim().slice(0, 80), email = String(p.email || '').trim().slice(0, 120), topic = String(p.topic || '').trim().slice(0, 1000);
    var len = +p.len, start = new Date(+p.start);
    if (!name || !topic || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json_({ ok: false, error: 'invalid' });
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
          'Approve confirms the slot, sends the visitor a Google Calendar invitation and a confirmation email. Decline opens a page where you can type a reason, which is included in the email to the visitor, then removes the request. The request is on your calendar as REQUEST (pending).') });
    } catch (err) { console.error('mail failed: ' + err); }
    return json_({ ok: true });
  } catch (err) {
    console.error('post failed: ' + err);
    return json_({ ok: false, error: 'server' });
  } finally { try { lock.releaseLock(); } catch (x) { } }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
