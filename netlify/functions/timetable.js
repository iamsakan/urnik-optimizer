// netlify/functions/timetable.js
//
// Called by the page as:  /.netlify/functions/timetable?student=63240310
// Downloads the student's timetable and every subject page from
// urnik.fri.uni-lj.si, and returns the same JSON format as timetable.json.
//
// The browser can't read the FRI site directly (other sites block that),
// so this small server function does the downloading instead.

const cheerio = require("cheerio");

const SITE = "https://urnik.fri.uni-lj.si";
const DAYS = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4 };
const HEADERS = { "User-Agent": "urnik-optimizer (student project)" };

// ---------- cache ----------
// Kept in memory while Netlify keeps the function "warm".
// Subject pages rarely change, so we don't download them again for a few hours.
const cache = {};
const SUBJECT_TTL = 3 * 60 * 60 * 1000; // 3 hours
const SEMESTER_TTL = 24 * 60 * 60 * 1000; // 1 day

async function download(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error("FRI_DOWN");
  return { html: await response.text(), finalUrl: response.url };
}

async function downloadCached(url, ttl) {
  const hit = cache[url];
  if (hit && Date.now() - hit.time < ttl) return hit.value;
  const value = await download(url);
  cache[url] = { time: Date.now(), value: value };
  return value;
}

// The front page redirects to the current semester, e.g. /timetable/fri-2026_2027-zimski
async function currentSemester() {
  const { html, finalUrl } = await downloadCached(SITE + "/", SEMESTER_TTL);
  const match = finalUrl.match(/\/timetable\/([\w-]+)/) || html.match(/\/timetable\/([\w-]+)/);
  if (!match) throw new Error("NO_SEMESTER");
  return match[1];
}

// ---------- parsing (same logic as tools/fetch_urnik.py) ----------
function parseBlocks(html) {
  const $ = cheerio.load(html);
  const blocks = [];

  $("div.grid-entry").each((_, element) => {
    const entry = $(element);
    const day = DAYS[entry.attr("data-day")];
    if (day === undefined) return;

    const start = parseInt(entry.attr("data-start"), 10); // "08:00" -> 8
    const duration = parseInt(entry.attr("data-duration"), 10);

    const subjectLink = entry.find("a.link-subject").first();
    const match = (subjectLink.attr("href") || "").match(/subject=([^&]+)/);
    if (!match) return; // blocks without a subject code are skipped
    const code = match[1];

    const type = entry.find(".entry-type").first().text().replace("|", "").trim();

    // Full name, e.g. "Spletno programiranje(63255)_LV" -> "Spletno programiranje"
    let name = subjectLink.text().trim();
    const hoverLines = entry.find(".entry-hover").first().text().split("\n");
    for (const line of hoverLines) {
      if (line.includes("(" + code + ")")) {
        name = line.split("(")[0].trim();
        break;
      }
    }

    blocks.push({
      subject: code,
      name: name,
      type: type,
      day: day,
      start: start,
      end: start + duration,
      room: entry.find("a.link-classroom").first().text().trim(),
      teachers: entry.find("a.link-teacher").map((_, a) => $(a).text().trim()).get(),
      groups: entry.find("a.link-group").map((_, a) => $(a).text().trim()).get(),
    });
  });

  return blocks;
}

// Program code like "3_BVS-RI" from group names like "3_BVS-RI_VPSA(63735)_LV_01"
function detectProgram(blocks) {
  const counts = {};
  for (const block of blocks) {
    for (const group of block.groups) {
      const match = group.match(/^(\d_[A-Z]+-[A-Z]+)/);
      if (match) counts[match[1]] = (counts[match[1]] || 0) + 1;
    }
  }
  let best = null;
  for (const program in counts) {
    if (best === null || counts[program] > counts[best]) best = program;
  }
  return best;
}

function sameSlot(a, b) {
  return a.subject === b.subject && a.type === b.type && a.day === b.day &&
    a.start === b.start && a.end === b.end;
}

// ---------- main ----------
async function buildTimetable(student, semester) {
  const base = `${SITE}/timetable/${semester}/allocations`;

  // 1. The student's own page: always fresh, never cached (and never logged)
  const studentPage = await download(`${base}?student=${student}`);
  const studentBlocks = parseBlocks(studentPage.html);
  if (studentBlocks.length === 0) throw new Error("NOT_FOUND");

  const program = detectProgram(studentBlocks);
  const lectures = studentBlocks.filter((b) => b.type === "P");
  const currentLabs = studentBlocks.filter((b) => b.type !== "P");

  const subjects = {};
  for (const block of studentBlocks) subjects[block.subject] = block.name;

  // 2. All subject pages at once (cached, so popular subjects are downloaded rarely)
  const codes = Object.keys(subjects);
  const pages = await Promise.all(
    codes.map((code) => downloadCached(`${base}?subject=${encodeURIComponent(code)}`, SUBJECT_TTL))
  );

  const labs = [];
  pages.forEach((page) => {
    const subjectLabs = parseBlocks(page.html).filter((b) => b.type !== "P");

    // keep only labs for this program; electives without program groups keep all
    let mine = subjectLabs.filter((b) => program && b.groups.some((g) => g.startsWith(program)));
    if (mine.length === 0) mine = subjectLabs;

    for (const lab of mine) {
      if (labs.some((other) => sameSlot(lab, other))) continue;
      lab.current = currentLabs.some((c) => sameSlot(lab, c));
      labs.push(lab);
    }
  });

  return {
    student: student,
    semester: semester,
    program: program,
    fetched_at: new Date().toISOString().slice(0, 16),
    subjects: subjects,
    lectures: lectures,
    labs: labs,
  };
}

function reply(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200 ? "private, max-age=600" : "no-store",
    },
    body: JSON.stringify(body),
  };
}

// Debug: shows what the FRI site actually sent back to this server.
// Open /.netlify/functions/timetable?student=63240310&debug=1
async function debugInfo(student, semesterParam) {
  const info = {};
  try {
    const front = await download(SITE + "/");
    info.frontPageFinalUrl = front.finalUrl;
    const semester = /^[\w-]+$/.test(semesterParam || "") ? semesterParam : await currentSemester();
    info.semester = semester;

    const url = `${SITE}/timetable/${semester}/allocations?student=${student}`;

    // without following redirects: is the site sending us somewhere else?
    const raw = await fetch(url, { headers: HEADERS, redirect: "manual" });
    info.firstResponse = {
      status: raw.status,
      location: raw.headers.get("location"),
      setsCookie: raw.headers.has("set-cookie"),
    };

    // normal request: what page do we end up with?
    const page = await download(url);
    const $ = cheerio.load(page.html);
    info.page = {
      finalUrl: page.finalUrl,
      length: page.html.length,
      title: $("title").text().trim(),
      heading: $(".title").first().text().trim(),
      gridEntries: $("div.grid-entry").length,
      parsedBlocks: parseBlocks(page.html).length,
      start: page.html.slice(0, 600),
    };
  } catch (err) {
    info.error = String(err);
  }
  return info;
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const student = (params.student || "").trim();

  if (!/^\d{8}$/.test(student)) {
    return reply(400, { error: "Vpisna številka mora imeti 8 števk." });
  }

  if (params.debug === "1") {
    return reply(200, await debugInfo(student, params.semester));
  }

  try {
    const semester = /^[\w-]+$/.test(params.semester || "") ? params.semester : await currentSemester();
    return reply(200, await buildTimetable(student, semester));
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return reply(404, { error: "Za to vpisno številko ni urnika. Preveri številko." });
    }
    return reply(502, { error: "Strani urnik.fri.uni-lj.si trenutno ni mogoče naložiti. Poskusi kasneje." });
  }
};

// exported for tests
exports.parseBlocks = parseBlocks;
exports.detectProgram = detectProgram;
