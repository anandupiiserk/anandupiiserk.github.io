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
  if (action === 'reply') return replyPage_(p);
  if ((action !== 'approve' && action !== 'decline') || !id || sign_(action, id) !== p.sig) return page_('Link not valid', 'This link is not valid.');
  var cal = CalendarApp.getDefaultCalendar(), ev = cal.getEventById(id);
  if (!ev) return page_('Already handled', 'This request is no longer on the calendar. It was probably approved or declined already.');
  if (!/^REQUEST/.test(ev.getTitle())) return page_('Already handled', 'This request was already handled: ' + esc_(ev.getTitle()));
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
  // Decline: show a page with a box for the reason; the reason is sent to the visitor by declineWith()
  return HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:40px auto;padding:0 20px;color:#1c2430">'
    + '<h2 style="margin:0 0 6px">Decline this request</h2>'
    + '<p style="margin:0 0 16px;color:#5b6675;line-height:1.5">' + esc_(name) + ', ' + esc_(when) + '</p>'
    + '<label for="r" style="font-weight:bold">Reason (optional, sent to the visitor in the email)</label>'
    + '<textarea id="r" rows="6" style="width:100%;box-sizing:border-box;margin:8px 0 14px;padding:10px;font:inherit;border:1px solid #c9d0da;border-radius:6px" placeholder="For example: I am travelling that week. Please pick a slot after 9 November."></textarea>'
    + '<button id="b1" style="padding:11px 18px;border:0;border-radius:6px;background:#c5221f;color:#fff;font-weight:bold;font-size:14px;cursor:pointer;margin:0 8px 8px 0">Block slot and decline</button>'
    + '<button id="b0" style="padding:11px 18px;border:0;border-radius:6px;background:#1f4e9c;color:#fff;font-weight:bold;font-size:14px;cursor:pointer;margin:0 0 8px 0">Unblock slot and decline</button>'
    + '<p style="margin:6px 0 0;color:#5b6675;font-size:13px;line-height:1.5">Block keeps this time marked busy on the website (use it when you are not available). Unblock frees the time so someone else can book it. The visitor gets the same email either way.</p>'
    + '<p id="m" style="margin-top:16px;line-height:1.6"></p>'
    + '<script>function go(btn,blk){var bs=document.querySelectorAll("button");for(var i=0;i<bs.length;i++)bs[i].disabled=true;var t=btn.textContent;btn.textContent="Sending...";'
    + 'google.script.run.withSuccessHandler(function(h){document.body.innerHTML=h;}).withFailureHandler(function(){for(var i=0;i<bs.length;i++)bs[i].disabled=false;btn.textContent=t;document.getElementById("m").textContent="Something went wrong. Please try again.";})'
    + '.declineWith(' + JSON.stringify(id) + ',' + JSON.stringify(p.sig) + ',document.getElementById("r").value,blk);}'
    + 'document.getElementById("b1").onclick=function(){go(this,true);};document.getElementById("b0").onclick=function(){go(this,false);};'
    + '<\/script></div>').setTitle('Decline request');
}

// Called from the decline page. Verifies the signed link again, removes the request and emails the visitor with the reason.
function declineWith(id, sig, reason, block) {
  var wrap = function (title, msg) { return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#1c2430"><h2>' + esc_(title) + '</h2><p style="line-height:1.6">' + msg + '</p></div>'; };
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

/* ---- contact form message (POST with kind:'message') ---- */
function message_(p) {
  var name = String(p.name || '').trim().slice(0, 80), email = String(p.email || '').trim().slice(0, 120), msg = String(p.message || '').trim().slice(0, 3000);
  if (!name || !msg || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json_({ ok: false, error: 'invalid' });
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
        [['Name', esc_(name)], ['Email', '<a href="mailto:' + esc_(email) + '">' + esc_(email) + '</a>'], ['Message', html], ['Received', esc_(sent)]], [['Reply to this message', link_('reply', rid), '#1f4e9c']],
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
  if (!id || sign_('reply', id) !== p.sig) return page_('Link not valid', 'This link is not valid.');
  var raw = PropertiesService.getScriptProperties().getProperty('MSG_' + id);
  if (!raw) return page_('Not found', 'This message is no longer stored (messages are kept for 120 days).');
  var r = JSON.parse(raw);
  var btn = 'border:1px solid #c9d0da;background:#fff;border-radius:5px;padding:5px 9px;font-size:14px;cursor:pointer;margin:0 2px 4px 0;min-width:32px';
  var fonts = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Courier New', 'Tahoma'];
  var h = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#1c2430">'
    + '<h2 style="margin:0 0 4px">Reply to ' + esc_(r.n) + '</h2>'
    + '<div style="color:#5b6675;font-size:14px;margin-bottom:12px">' + esc_(r.e) + '. Sent from: Anandu Prabhakaran.</div>'
    + '<div style="background:#f3f6fb;border-left:4px solid #1f4e9c;border-radius:4px;padding:10px 14px;margin-bottom:16px;font-size:14px;line-height:1.5;max-height:140px;overflow:auto"><b>Their message</b><br>' + esc_(r.m).replace(/\n/g, '<br>') + '</div>'
    + '<label style="font-weight:bold;font-size:14px">Subject</label>'
    + '<input id="sub" value="' + esc_('Re: your message on my website') + '" style="width:100%;box-sizing:border-box;margin:6px 0 12px;padding:9px;font:inherit;border:1px solid #c9d0da;border-radius:6px">'
    + '<div id="tb" style="margin-bottom:4px">'
    + '<select id="ff" style="padding:6px;margin:0 4px 4px 0;border:1px solid #c9d0da;border-radius:5px"><option value="">Font</option>' + fonts.map(function (f) { return '<option>' + f + '</option>'; }).join('') + '</select>'
    + '<select id="fs" style="padding:6px;margin:0 4px 4px 0;border:1px solid #c9d0da;border-radius:5px"><option value="">Size</option><option value="2">Small</option><option value="3">Normal</option><option value="4">Large</option><option value="5">Larger</option><option value="6">Huge</option></select>'
    + '<button type="button" data-c="bold" style="' + btn + ';font-weight:bold">B</button>'
    + '<button type="button" data-c="italic" style="' + btn + ';font-style:italic">I</button>'
    + '<button type="button" data-c="underline" style="' + btn + ';text-decoration:underline">U</button>'
    + '<button type="button" data-c="strikeThrough" style="' + btn + ';text-decoration:line-through">S</button>'
    + '<input type="color" id="fc" value="#1c2430" title="Text colour" style="height:32px;width:36px;border:1px solid #c9d0da;border-radius:5px;padding:2px;margin:0 6px 4px 0;vertical-align:top">'
    + '<button type="button" data-c="justifyLeft" style="' + btn + '">Left</button>'
    + '<button type="button" data-c="justifyCenter" style="' + btn + '">Centre</button>'
    + '<button type="button" data-c="justifyRight" style="' + btn + '">Right</button>'
    + '<button type="button" data-c="justifyFull" style="' + btn + '">Justify</button>'
    + '<button type="button" data-c="insertUnorderedList" style="' + btn + '">Bullets</button>'
    + '<button type="button" data-c="insertOrderedList" style="' + btn + '">Numbers</button>'
    + '<button type="button" data-c="outdent" style="' + btn + '">Outdent</button>'
    + '<button type="button" data-c="indent" style="' + btn + '">Indent</button>'
    + '<button type="button" id="lk" style="' + btn + '">Link</button>'
    + '<button type="button" data-c="removeFormat" style="' + btn + '">Clear</button>'
    + '</div>'
    + '<div id="ed" contenteditable="true" style="min-height:240px;border:1px solid #c9d0da;border-radius:6px;padding:12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;outline:none">Hello ' + esc_(r.n) + ',<br><br><br>Best regards,<br>Anandu Prabhakaran</div>'
    + '<div style="margin:14px 0 6px"><label style="font-weight:bold;font-size:14px">Attachments</label> <span style="color:#5b6675;font-size:13px">(up to 15 MB in total)</span></div>'
    + '<input type="file" id="fl" multiple><div id="fn" style="font-size:13px;color:#5b6675;margin-top:6px"></div>'
    + '<div style="margin-top:18px"><button id="send" style="padding:12px 22px;border:0;border-radius:999px;background:#1f4e9c;color:#fff;font-weight:bold;font-size:15px;cursor:pointer">Send reply</button></div>'
    + '<p id="m" style="margin-top:14px;line-height:1.6"></p></div>';
  h += '<script>(function(){var ed=document.getElementById("ed"),m=document.getElementById("m");'
    + 'function ex(c,v){ed.focus();document.execCommand(c,false,v||null);}'
    + 'var bs=document.querySelectorAll("[data-c]");for(var i=0;i<bs.length;i++){bs[i].onmousedown=function(e){e.preventDefault();};bs[i].onclick=function(){ex(this.getAttribute("data-c"));};}'
    + 'document.getElementById("ff").onchange=function(){if(this.value)ex("fontName",this.value);};'
    + 'document.getElementById("fs").onchange=function(){if(this.value)ex("fontSize",this.value);};'
    + 'document.getElementById("fc").oninput=function(){ex("foreColor",this.value);};'
    + 'document.getElementById("lk").onclick=function(){var u=prompt("Link address (https://...)");if(u&&/^https?:\\/\\//i.test(u))ex("createLink",u);};'
    + 'var files=[],total=0;'
    + 'document.getElementById("fl").onchange=function(){files=[];total=0;var fn=document.getElementById("fn");fn.textContent="";var fs=this.files,n=fs.length,done=0;'
    + 'if(!n)return;for(var i=0;i<n;i++){(function(f){total+=f.size;var rd=new FileReader();rd.onload=function(){files.push({name:f.name,type:f.type||"application/octet-stream",data:String(rd.result).split(",")[1]});done++;fn.textContent=files.map(function(x){return x.name;}).join(", ");};rd.readAsDataURL(f);})(fs[i]);}'
    + 'if(total>15*1024*1024){m.style.color="#c5221f";m.textContent="Attachments are over 15 MB. Please remove some.";}};'
    + 'document.getElementById("send").onclick=function(){var b=this;if(total>15*1024*1024){m.style.color="#c5221f";m.textContent="Attachments are over 15 MB.";return;}'
    + 'b.disabled=true;b.textContent="Sending...";m.style.color="#1c2430";m.textContent="";'
    + 'google.script.run.withSuccessHandler(function(h){document.body.innerHTML=h;}).withFailureHandler(function(e){b.disabled=false;b.textContent="Send reply";m.style.color="#c5221f";m.textContent="Could not send: "+(e&&e.message?e.message:"please try again.");})'
    + '.sendReply(' + JSON.stringify(id) + ',' + JSON.stringify(p.sig) + ',document.getElementById("sub").value,ed.innerHTML,files);};'
    + '})();<\/script>';
  return HtmlService.createHtmlOutput(h).setTitle('Reply to ' + r.n);
}

// Called from the reply editor. Sends the formatted reply to the visitor as Anandu Prabhakaran, with attachments.
function sendReply(id, sig, subject, bodyHtml, files) {
  var wrap = function (title, msg) { return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#1c2430"><h2>' + esc_(title) + '</h2><p style="line-height:1.6">' + msg + '</p></div>'; };
  if (!id || sign_('reply', id) !== sig) return wrap('Link not valid', 'This link is not valid.');
  var raw = PropertiesService.getScriptProperties().getProperty('MSG_' + id);
  if (!raw) return wrap('Not found', 'This message is no longer stored.');
  var r = JSON.parse(raw), blobs = [], total = 0;
  (files || []).forEach(function (f) {
    var bytes = Utilities.base64Decode(f.data); total += bytes.length;
    blobs.push(Utilities.newBlob(bytes, String(f.type || 'application/octet-stream'), String(f.name || 'attachment').slice(0, 120)));
  });
  if (total > 15 * 1024 * 1024) throw new Error('Attachments are over 15 MB.');
  var clean = String(bodyHtml || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/ on[a-z]+="[^"]*"/gi, '').replace(/javascript:/gi, '');
  var plain = clean.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  var html = '<div style="background:#eef2f8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1c2430"><div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(31,78,156,.12)">'
    + '<div style="background:#1f4e9c;background-image:linear-gradient(135deg,#1f4e9c,#3b82c4);color:#ffffff;padding:22px 28px"><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85">Anandu Prabhakaran</div><div style="font-size:20px;font-weight:bold;margin-top:6px">' + esc_(String(subject || 'Reply').slice(0, 150)) + '</div></div>'
    + '<div style="padding:26px 28px;font-size:15px;line-height:1.6">' + clean + '</div>'
    + '<div style="margin:0 28px 24px;padding:12px 14px;background:#f7f9fc;border-left:4px solid #c9d0da;border-radius:4px;color:#5b6675;font-size:13px;line-height:1.5"><b>Your message</b><br>' + esc_(r.m).replace(/\n/g, '<br>') + '</div>'
    + '<div style="background:#f7f9fc;padding:14px 28px;text-align:center;color:#7a8594;font-size:12px;border-top:1px solid #e6ebf2">Created with <span style="color:#e0245e;font-size:14px">&#10084;</span> by Anandu Prabhakaran</div></div></div>';
  var opts = { to: r.e, name: OWNER_NAME, replyTo: Session.getEffectiveUser().getEmail(), subject: String(subject || 'Re: your message').slice(0, 150), body: plain + '\n\n---\nYour message:\n' + r.m, htmlBody: html };
  if (blobs.length) opts.attachments = blobs;
  MailApp.sendEmail(opts);
  return wrap('Reply sent', 'Your reply was sent to ' + esc_(r.n) + ' (' + esc_(r.e) + ')' + (blobs.length ? ' with ' + blobs.length + ' attachment' + (blobs.length > 1 ? 's' : '') : '') + '. You can close this tab.');
}

/* ---- new request (POST) ---- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var p = JSON.parse(e.postData.contents || '{}');
    if (p.website) return json_({ ok: true });
    if (p.kind === 'message') return message_(p);
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
          'Approve confirms the slot, sends the visitor a Google Calendar invitation and a confirmation email. Decline opens a page where you can type a reason, which is included in the email to the visitor, and lets you choose to keep the slot blocked or free it. The request is on your calendar as REQUEST (pending).') });
    } catch (err) { console.error('mail failed: ' + err); }
    return json_({ ok: true });
  } catch (err) {
    console.error('post failed: ' + err);
    return json_({ ok: false, error: 'server' });
  } finally { try { lock.releaseLock(); } catch (x) { } }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
