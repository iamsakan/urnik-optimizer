// test-function.js - run with: node test-function.js
// Fakes the FRI website (pages built in the same HTML structure as the real
// urnik.fri.uni-lj.si template) and checks the Netlify function's output.

const assert = require("assert");
const expected = require("./public/timetable.json");
const fn = require("./netlify/functions/timetable.js");

const DAY_CODES = ["MON", "TUE", "WED", "THU", "FRI"];
const SEMESTER = expected.semester;

// One block in the real template's markup
function entryHtml(b) {
  const pad = (h) => String(h).padStart(2, "0") + ":00";
  return `
<div class="grid-entry" style="grid-row: 2 / span ${b.end - b.start};" data-allocation-id="1"
     data-day="${DAY_CODES[b.day]}" data-start="${pad(b.start)}" data-duration="${b.end - b.start}">
  <div class="description">
    <div class="top-aligned">
      <div class="row">
        <a class="link-subject" href="${b.type === "P" ? "?subject=" + b.subject : "?activity=8313"}&student=1">SHORT_${b.type}</a>
        <span class="entry-type">| ${b.type}</span>
        <div class="entry-hover">
          sreda ${pad(b.start)} - ${pad(b.end)}<br/>
          ${b.room}
          <!-- (30 / 32) --> <br/>
          ${b.name}(${b.subject})_${b.type}<br/>
          ${b.teachers.map((t) => t + "<br/>").join("")}
          ${b.groups.map((g) => g + "<br/>").join("")}
        </div>
      </div>
      <div class="row"><a class="link-classroom" href="?classroom=1">${b.room}</a></div>
      ${b.teachers.map((t) => `<div class="row"><a class="link-teacher" href="?teacher=1">${t}</a></div>`).join("")}
    </div>
    <div class="bottom-aligned">
      ${b.groups.map((g) => `<div class="row"><a class="link-group" href="?group=1">${g}</a></div>`).join("")}
    </div>
  </div>
</div>`;
}

function page(blocks) {
  return `<html><body><div class="grid-outer"><div class="grid-day-column">${blocks.map(entryHtml).join("")}</div></div></body></html>`;
}

// A lab for a different program: the function must NOT include it
const otherProgramLab = {
  subject: "63732", name: "Tehnologija programske opreme", type: "LV", day: 0, start: 9, end: 11,
  room: "PR05", teachers: ["Damjan Fujs"], groups: ["2_BUN-ML_LV_01"],
};

// FRI study calendar page, written the way real pages are (entities, &nbsp;, table cells)
const studyCalendar = `<html><head><meta name="description" content="Organizirano pedagoško delo 1. 1. 2000"></head><body>
<h2>ŠTUDIJSKO LETO 2026/27</h2>
<h3>Zimski semester</h3>
<table>
  <tr><td>Organizirano pedago&scaron;ko delo</td><td>četrtek, 1.&nbsp;10.&nbsp;2026</td><td>petek, 15. 1. 2027</td></tr>
  <tr><td>Zimsko izpitno obdobje</td><td>torek, 19. 1. 2027</td><td>petek, 12. 2. 2027</td></tr>
</table>
<h3>Poletni semester</h3>
<table>
  <tr><td>Organizirano pedagoško delo</td><td>ponedeljek, 15. 2. 2027</td><td>sreda, 2. 6. 2027</td></tr>
  <tr><td>Spomladansko izpitno obdobje</td><td>petek, 4. 6. 2027</td><td>petek, 2. 7. 2027</td></tr>
</table></body></html>`;

let requests = [];
let serverDown = false;
let calendarDown = false;

global.fetch = async (url) => {
  requests.push(url);
  if (serverDown) return { ok: false, status: 503, url, text: async () => "" };

  let html = "<html><body></body></html>";
  let finalUrl = url;
  const u = new URL(url);

  if (u.hostname === "www.fri.uni-lj.si") {
    if (calendarDown) return { ok: false, status: 500, url, text: async () => "" };
    html = studyCalendar;
  } else if (u.pathname === "/") {
    finalUrl = `https://urnik.fri.uni-lj.si/timetable/${SEMESTER}`; // redirect to current semester
  } else if (u.searchParams.get("student") === expected.student) {
    const current = expected.labs.filter((l) => l.current).map(({ current, ...rest }) => rest);
    html = page(expected.lectures.concat(current));
  } else if (u.searchParams.get("subject")) {
    const code = u.searchParams.get("subject");
    const blocks = expected.lectures.concat(expected.labs.map(({ current, ...rest }) => rest), [otherProgramLab])
      .filter((b) => b.subject === code);
    html = page(blocks);
  }
  return { ok: true, status: 200, url: finalUrl, text: async () => html };
};

function key(b) {
  return [b.subject, b.type, b.day, b.start, b.end, b.room, b.name, b.current, b.groups.join(",")].join("|");
}

(async () => {
  // 1. Normal request
  let res = await fn.handler({ queryStringParameters: { student: expected.student } });
  assert.strictEqual(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.strictEqual(data.semester, SEMESTER, "semester auto-detected");
  assert.strictEqual(data.program, "3_BVS-RI", "program detected");
  assert.deepStrictEqual(data.lectures.map(key).sort(), expected.lectures.map(key).sort(), "lectures match");
  assert.deepStrictEqual(data.labs.map(key).sort(), expected.labs.map(key).sort(), "labs match (other program filtered out)");
  console.log(`ok   normal request: ${data.lectures.length} lectures, ${data.labs.length} labs, ${requests.length} downloads`);

  // Semester dates from the study calendar
  assert.deepStrictEqual(data.semester_dates, { from: "2026-10-01", to: "2027-01-15" });
  assert.deepStrictEqual(await fn.lectureDates("fri-2026_2027-poletni"), { from: "2027-02-15", to: "2027-06-02" });
  assert.strictEqual(await fn.lectureDates("fri-2030_2031-zimski"), null);
  console.log("ok   semester dates: winter 2026-10-01..2027-01-15, summer 2027-02-15..2027-06-02, unknown year -> null");

  // 2. Second request: subject pages come from the cache
  requests = [];
  await fn.handler({ queryStringParameters: { student: expected.student } });
  assert.strictEqual(requests.length, 1, "only the student page is downloaded again");
  console.log("ok   cache: second request downloads only the student page");

  // 3. Bad input
  res = await fn.handler({ queryStringParameters: { student: "123abc" } });
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(JSON.parse(res.body).code, "BAD_ID");
  console.log("ok   invalid ID ->", res.statusCode, JSON.parse(res.body).code);

  // 4. Unknown student
  res = await fn.handler({ queryStringParameters: { student: "99999999" } });
  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(JSON.parse(res.body).code, "NOT_FOUND");
  console.log("ok   unknown student ->", res.statusCode, JSON.parse(res.body).code);

  // 5. Study calendar page down: timetable still works, dates are just missing
  delete require.cache[require.resolve("./netlify/functions/timetable.js")];
  const freshFn = require("./netlify/functions/timetable.js"); // empty cache
  calendarDown = true;
  res = await freshFn.handler({ queryStringParameters: { student: expected.student } });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(JSON.parse(res.body).semester_dates, null);
  calendarDown = false;
  console.log("ok   study calendar down -> timetable still loads, semester_dates = null");

  // 6. FRI site down
  serverDown = true;
  res = await fn.handler({ queryStringParameters: { student: expected.student } });
  assert.strictEqual(res.statusCode, 502);
  assert.strictEqual(JSON.parse(res.body).code, "FRI_DOWN");
  console.log("ok   site down ->", res.statusCode, JSON.parse(res.body).code);
})().catch((err) => {
  console.error("FAIL", err.message);
  process.exitCode = 1;
});
