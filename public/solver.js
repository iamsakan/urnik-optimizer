// solver.js
// Finds the best combination of lab slots (one per subject + type)
// so that nothing overlaps, then ranks them by the user's preferences.
// Works in the browser (index.html) and in Node (test.js).

const DAY_NAMES = ["Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek"];

// Two blocks overlap if they are on the same day and their hours intersect.
function overlaps(a, b) {
  return a.day === b.day && a.start < b.end && b.start < a.end;
}

// Group lab slots into "choices": one choice per subject + type (e.g. "63735 LV").
// The student has to pick exactly one option from each choice.
function buildChoices(labs) {
  const map = {};
  for (const lab of labs) {
    const key = lab.subject + " " + lab.type;
    if (!map[key]) {
      map[key] = { key: key, subject: lab.subject, name: lab.name, type: lab.type, options: [] };
    }
    map[key].options.push(lab);
  }
  // fewest options first = faster search
  return Object.values(map).sort((a, b) => a.options.length - b.options.length);
}

// Lectures that overlap each other. Nothing can fix these, we only report them.
function findLectureClashes(lectures) {
  const clashes = [];
  for (let i = 0; i < lectures.length; i++) {
    for (let j = i + 1; j < lectures.length; j++) {
      if (overlaps(lectures[i], lectures[j])) clashes.push([lectures[i], lectures[j]]);
    }
  }
  return clashes;
}

// Measure a full week. Higher score = better.
function scoreSchedule(blocks, prefs) {
  let gaps = 0;      // empty hours between classes on the same day
  let freeDays = 0;  // days with nothing at all
  let early = 0;     // hours before prefs.earliest
  let late = 0;      // hours from prefs.latest on

  for (let day = 0; day < 5; day++) {
    const hours = new Set();
    for (const b of blocks) {
      if (b.day !== day) continue;
      for (let h = b.start; h < b.end; h++) hours.add(h);
    }
    if (hours.size === 0) {
      freeDays++;
      continue;
    }
    const first = Math.min(...hours);
    const last = Math.max(...hours) + 1;
    gaps += (last - first) - hours.size;
    for (const h of hours) {
      if (h < prefs.earliest) early++;
      if (h >= prefs.latest) late++;
    }
  }

  const score =
    prefs.freeDayWeight * freeDays -
    prefs.gapWeight * gaps -
    prefs.earlyWeight * early -
    prefs.lateWeight * late;

  return { score, gaps, freeDays, early, late };
}

// Main function.
// locks: { "63735 LV": optionIndex } to force a specific slot.
function solve(data, prefs, locks) {
  locks = locks || {};
  const choices = buildChoices(data.labs);
  // If lectures are optional for the student, labs may sit on top of them.
  const blocking = prefs.labsCanOverlapLectures ? [] : data.lectures;

  const results = [];
  const chosen = [];

  function search(i) {
    if (i === choices.length) {
      const week = data.lectures.concat(chosen);
      results.push(Object.assign({ labs: chosen.slice() }, scoreSchedule(week, prefs)));
      return;
    }
    const choice = choices[i];
    const options = locks[choice.key] !== undefined
      ? [choice.options[locks[choice.key]]]
      : choice.options;

    for (const option of options) {
      const clash =
        blocking.some((b) => overlaps(b, option)) ||
        chosen.some((b) => overlaps(b, option));
      if (!clash) {
        chosen.push(option);
        search(i + 1);
        chosen.pop();
      }
    }
  }

  search(0);
  results.sort((a, b) => b.score - a.score);

  const currentLabs = data.labs.filter((l) => l.current);
  return {
    choices: choices,
    count: results.length,
    top: results.slice(0, prefs.topN || 5),
    lectureClashes: findLectureClashes(data.lectures),
    current: Object.assign({ labs: currentLabs }, scoreSchedule(data.lectures.concat(currentLabs), prefs)),
  };
}

const DEFAULT_PREFS = {
  earliest: 8,       // hours before this count as "early"
  latest: 17,        // hours from this on count as "late"
  freeDayWeight: 30,
  gapWeight: 10,
  earlyWeight: 5,
  lateWeight: 5,
  labsCanOverlapLectures: false,
  topN: 5,
};

if (typeof module !== "undefined") {
  module.exports = { solve, overlaps, scoreSchedule, buildChoices, DEFAULT_PREFS, DAY_NAMES };
}
