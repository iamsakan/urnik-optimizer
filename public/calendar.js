// calendar.js
// Turns a week of classes into an .ics file (Google Calendar, Outlook, Apple Calendar).
// Every class becomes one weekly repeating event between two dates,
// skipping Slovenian public holidays.

// Fallback lecture periods. Normally the server reads the dates automatically from
// https://www.fri.uni-lj.si/sl/studijski-koledar, so this table is only used if that fails.
// The key is the semester name used by urnik.fri.uni-lj.si.
const SEMESTERS = {
  "fri-2026_2027-zimski": { from: "2026-10-01", to: "2027-01-15" },
};

// Slovenian public holidays with a fixed date (month-day)
const FIXED_HOLIDAYS = [
  "01-01", "01-02", "02-08", "04-27", "05-01", "05-02",
  "06-25", "08-15", "10-31", "11-01", "12-25", "12-26",
];

// ---------- date helpers (dates are "YYYY-MM-DD" strings) ----------
function toDate(text) {
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, m - 1, d, 12); // noon, so daylight saving never shifts the day
}

function toText(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// Monday = 0 ... Sunday = 6 (same numbering as the timetable data)
function weekday(date) {
  return (date.getDay() + 6) % 7;
}

// Easter Monday is also a holiday, but its date moves (standard Gregorian Easter formula)
function easterMonday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toText(addDays(new Date(year, month - 1, day, 12), 1));
}

function isHoliday(date) {
  const text = toText(date);
  return FIXED_HOLIDAYS.includes(text.slice(5)) || text === easterMonday(date.getFullYear());
}

// ---------- .ics text helpers ----------
function escapeText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// The .ics format wants lines of at most 75 bytes; longer ones continue on the next line after a space
function fold(line) {
  const encoder = new TextEncoder();
  let out = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length; // č, š, ž take 2 bytes
    if (bytes + size > 74) {
      out += "\r\n ";
      bytes = 1;
    }
    out += ch;
    bytes += size;
  }
  return out;
}

function compact(dateText) {
  return dateText.replace(/-/g, ""); // "2026-10-01" -> "20261001"
}

function hour(h) {
  return String(h).padStart(2, "0") + "0000"; // 9 -> "090000"
}

const TIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Ljubljana",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

// events: [{ uid, summary, description, location, day, start, end }]
// from, to: "YYYY-MM-DD"
function buildIcs(events, from, to) {
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Urnik Optimizer//SL",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Urnik FRI",
    ...TIMEZONE,
  ];

  const first = toDate(from);
  const last = toDate(to);

  for (const event of events) {
    // first occurrence: the first matching weekday on or after "from"
    const firstDay = addDays(first, (event.day - weekday(first) + 7) % 7);
    if (firstDay > last) continue; // class never happens in this period

    // holidays that fall on this class's weekday
    const skipped = [];
    for (let d = firstDay; d <= last; d = addDays(d, 7)) {
      if (isHoliday(d)) skipped.push(compact(toText(d)) + "T" + hour(event.start));
    }

    const day = compact(toText(firstDay));
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + event.uid,
      "DTSTAMP:" + now,
      "SUMMARY:" + escapeText(event.summary),
      "DESCRIPTION:" + escapeText(event.description),
      "LOCATION:" + escapeText(event.location),
      `DTSTART;TZID=Europe/Ljubljana:${day}T${hour(event.start)}`,
      `DTEND;TZID=Europe/Ljubljana:${day}T${hour(event.end)}`,
      `RRULE:FREQ=WEEKLY;UNTIL=${compact(to)}T225959Z`
    );
    if (skipped.length) lines.push("EXDATE;TZID=Europe/Ljubljana:" + skipped.join(","));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

if (typeof module !== "undefined") {
  module.exports = { buildIcs, SEMESTERS, easterMonday, isHoliday, toDate };
}
