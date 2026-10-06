// test.js - run with: node test.js
// Solves timetable.json and checks that no result has overlapping blocks.

const fs = require("fs");
const { solve, overlaps, DEFAULT_PREFS, DAY_NAMES } = require("./public/solver.js");

const data = JSON.parse(fs.readFileSync("public/timetable.json", "utf-8"));

function describe(block) {
  return `${block.subject} ${block.type} ${DAY_NAMES[block.day]} ${block.start}-${block.end} ${block.room}`;
}

function checkNoOverlaps(result, allowLectures) {
  const labs = result.labs;
  for (let i = 0; i < labs.length; i++) {
    for (let j = i + 1; j < labs.length; j++) {
      if (overlaps(labs[i], labs[j])) return false;
    }
    if (!allowLectures && data.lectures.some((l) => overlaps(l, labs[i]))) return false;
  }
  return true;
}

for (const allow of [false, true]) {
  const prefs = Object.assign({}, DEFAULT_PREFS, { labsCanOverlapLectures: allow });
  const out = solve(data, prefs);

  console.log(`\n=== labs may overlap lectures: ${allow} ===`);
  console.log("Lab choices:", out.choices.map((c) => `${c.key} (${c.options.length} options)`).join(", "));
  console.log("Valid combinations:", out.count);
  console.log("Lecture clashes:", out.lectureClashes.map((p) => p.map(describe).join(" <-> ")));
  console.log(`Current schedule: score ${out.current.score}, gaps ${out.current.gaps}h, free days ${out.current.freeDays}, labs ${out.current.labs.length}`);

  out.top.forEach((r, i) => {
    const ok = checkNoOverlaps(r, allow);
    console.log(`#${i + 1} score ${r.score} | gaps ${r.gaps}h | free days ${r.freeDays} | late ${r.late}h | no overlaps: ${ok}`);
    r.labs.forEach((l) => console.log("    " + describe(l)));
    if (!ok) process.exitCode = 1;
  });
}
