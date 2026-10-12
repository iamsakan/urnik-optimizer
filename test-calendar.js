// test-calendar.js - run with: node test-calendar.js
// Builds an .ics for the best schedule in timetable.json and checks the result.

const assert = require("assert");
const fs = require("fs");
const { solve, DEFAULT_PREFS } = require("./public/solver.js");
const { buildIcs, SEMESTERS, easterMonday, isHoliday, toDate } = require("./public/calendar.js");

const data = JSON.parse(fs.readFileSync("public/timetable.json", "utf-8"));
const semester = SEMESTERS[data.semester];
const best = solve(data, DEFAULT_PREFS).top[0];
const blocks = data.lectures.concat(best.labs);

const events = blocks.map((b, i) => ({
  uid: `test-${i}@urnik-optimizer`,
  summary: `${b.subject} ${b.type}`,
  description: `${b.name} (${b.type})\n${b.teachers.join(", ")}`,
  location: b.room + ", FRI",
  day: b.day,
  start: b.start,
  end: b.end,
}));

const ics = buildIcs(events, semester.from, semester.to);
fs.writeFileSync("test-output.ics", ics);

// holidays
assert.strictEqual(easterMonday(2027), "2027-03-29");
assert.strictEqual(isHoliday(toDate("2026-12-25")), true);
assert.strictEqual(isHoliday(toDate("2026-12-24")), false);
console.log("ok   holidays: Easter Monday 2027 = 2027-03-29, Christmas yes, Christmas Eve no");

// one event per class
assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, blocks.length);
console.log(`ok   ${blocks.length} weekly events`);

// lines use CRLF and none is longer than 75 bytes
const lines = ics.split("\r\n");
assert.ok(lines.every((l) => Buffer.byteLength(l) <= 75), "no line over 75 bytes");
assert.ok(!/[^\r]\n/.test(ics), "only CRLF line endings");
console.log("ok   format: CRLF, lines <= 75 bytes");

// Friday classes skip Christmas (Fri 25 Dec 2026) and New Year (Fri 1 Jan 2027)
const friday = ics.split("BEGIN:VEVENT").find((e) => /DTSTART;TZID=Europe\/Ljubljana:20261002/.test(e));
assert.ok(friday, "a Friday class starts on Fri 2 Oct 2026");
assert.ok(/EXDATE;TZID=Europe\/Ljubljana:20261225T\d{6},20270101T\d{6}/.test(friday));
console.log("ok   Friday classes skip 25 Dec and 1 Jan");
console.log("     wrote test-output.ics");

if (!process.env.KEEP_ICS) fs.unlinkSync("test-output.ics");
