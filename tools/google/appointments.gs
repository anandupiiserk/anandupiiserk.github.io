/**
 * Appointment backend for anandupiiserk.github.io (Google Apps Script web app).
 * Runs as the account that deploys it and uses that account's primary Google Calendar.
 *
 * GET  -> {busy:[[startMs,endMs],...], daysOff:["YYYY-MM-DD",...]}   (times only, never titles or details)
 * POST -> creates a "REQUEST" event on the calendar after re-checking the rules and any clash.
 *
 * Add an all-day event to the calendar (any title, for example "Away") to block a day for bookings.
 * Timed events block only their own time.
 */
var TZ = 'Asia/Kolkata';
var OWNER_NOTIFY = true;            // email the calendar owner for every request
var DAYS_AHEAD = 75;                // how far ahead GET reports busy time
var START_H = 10, END_H = 18;       // booking hours (IST)
var LENGTHS = [30, 60];
var MIN_LEAD_HOURS = 24;
// Optional: also treat Google's public Indian holidays calendar as days off (blocks public holidays automatically).
var HOLIDAY_CAL = 'en.indian#holiday@group.v.calendar.google.com';

function calendars_() {
  var list = [CalendarApp.getDefaultCalendar()];
  return list;
}

function pad_(n) { return (n < 10 ? '0' : '') + n; }
function ymd_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }

function doGet(e) {
  var now = new Date(), end = new Date(now.getTime() + DAYS_AHEAD * 86400000);
  var busy = [], daysOff = {};
  calendars_().forEach(function (cal) {
    cal.getEvents(now, end).forEach(function (ev) {
      if (ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.NO) return;       // declined
      if (ev.isAllDayEvent()) {
        // all-day events block every day they cover (end date is exclusive)
        var s = ev.getAllDayStartDate(), t = ev.getAllDayEndDate();
        for (var d = new Date(s); d < t; d = new Date(d.getTime() + 86400000)) daysOff[Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd')] = 1;
      } else busy.push([ev.getStartTime().getTime(), ev.getEndTime().getTime()]);
    });
  });
  try {
    var h = CalendarApp.getCalendarById(HOLIDAY_CAL);
    if (h) h.getEvents(now, end).forEach(function (ev) {
      var s = ev.getAllDayStartDate(), t = ev.getAllDayEndDate();
      for (var d = new Date(s); d < t; d = new Date(d.getTime() + 86400000)) daysOff[Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd')] = 1;
    });
  } catch (err) { /* holiday calendar not available: ignore */ }
  return json_({ busy: busy, daysOff: Object.keys(daysOff), now: now.getTime() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var p = JSON.parse(e.postData.contents || '{}');
    if (p.website) return json_({ ok: true });                                              // honeypot
    var name = String(p.name || '').trim().slice(0, 80), email = String(p.email || '').trim().slice(0, 120), topic = String(p.topic || '').trim().slice(0, 1000);
    var len = +p.len, start = new Date(+p.start);
    if (!name || !topic || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json_({ ok: false, error: 'invalid' });
    if (LENGTHS.indexOf(len) < 0 || isNaN(start.getTime())) return json_({ ok: false, error: 'invalid' });
    var end = new Date(start.getTime() + len * 60000), now = new Date();
    if (start.getTime() < now.getTime() + MIN_LEAD_HOURS * 3600000) return json_({ ok: false, error: 'too_soon' });
    var wd = +Utilities.formatDate(start, TZ, 'u');                                          // 1 = Monday ... 7 = Sunday
    var sh = +Utilities.formatDate(start, TZ, 'H') + (+Utilities.formatDate(start, TZ, 'm')) / 60;
    var eh = +Utilities.formatDate(end, TZ, 'H') + (+Utilities.formatDate(end, TZ, 'm')) / 60;
    if (ymd_(start) !== ymd_(end)) eh = 24;
    if (wd > 5 || sh < START_H || eh > END_H) return json_({ ok: false, error: 'hours' });
    // clash and day-off check
    var cal = CalendarApp.getDefaultCalendar();
    var clash = cal.getEvents(start, end).some(function (ev) { return !(ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.NO); });
    var offDay = cal.getEventsForDay(start).some(function (ev) { return ev.isAllDayEvent(); });
    if (!offDay) { try { var h = CalendarApp.getCalendarById(HOLIDAY_CAL); if (h) offDay = h.getEventsForDay(start).length > 0; } catch (err) {} }
    if (clash || offDay) return json_({ ok: false, error: 'taken' });
    var ev = cal.createEvent('REQUEST (pending): ' + name, start, end, {
      description: 'Appointment request from the website\n\nName: ' + name + '\nEmail: ' + email + '\nLength: ' + len + ' minutes\n\nTopic:\n' + topic + '\n\nTo accept, rename the event and email the visitor. To decline, delete it.'
    });
    try { ev.setColor(CalendarApp.EventColor.ORANGE); } catch (err) {}
    var when = Utilities.formatDate(start, TZ, 'EEEE d MMMM yyyy, HH:mm') + ' to ' + Utilities.formatDate(end, TZ, 'HH:mm') + ' IST';
    try {
      MailApp.sendEmail({ to: email, subject: 'Appointment request received: ' + when, name: 'Anandu Prabhakaran',
        body: 'Hello ' + name + ',\n\nI have received your appointment request for ' + when + ' (' + len + ' minutes). It is not confirmed yet; I will reply by email.\n\nTopic you gave:\n' + topic + '\n\nAnandu Prabhakaran' });
      if (OWNER_NOTIFY) MailApp.sendEmail({ to: Session.getEffectiveUser().getEmail(), replyTo: email, subject: 'Appointment request: ' + name + ', ' + when,
        body: name + ' <' + email + '> requested ' + when + ' (' + len + ' minutes).\n\nTopic:\n' + topic + '\n\nThe request is on your calendar as REQUEST (pending).' });
    } catch (err) { /* mail failure must not lose the booking */ }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
