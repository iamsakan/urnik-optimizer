// lang.js
// All text on the page, in Slovenian and English.
// Use t("key") to get the text in the current language.
// Placeholders like {n} are filled in: t("any", { n: 3 }) -> "Katerikoli (3)"

const TEXT = {
  sl: {
    langName: "Jezik",
    tagline: "Najboljša kombinacija vaj za tvoj FRI urnik",
    studentId: "Vpisna številka",
    load: "Naloži urnik",

    prefsTitle: "Kaj ti je pomembno",
    notBefore: "Ne pred",
    notAfter: "Ne po",
    freeDays: "Prosti dnevi",
    noGaps: "Brez lukenj",
    withinHours: "Znotraj ur",
    overlapLectures: "Vaje lahko prekrivajo predavanja (če predavanja niso obvezna)",
    labsTitle: "Vaje",
    any: "Katerikoli ({n})",
    now: " (zdaj)",
    footer: "Podatki se naložijo z urnik.fri.uni-lj.si ob vsakem iskanju. Vpisnih številk ne shranjujemo. Skupine za vaje dodeli fakulteta, zato je to orodje za načrtovanje: pove ti, katere skupine zaprositi.",

    days: ["Pon", "Tor", "Sre", "Čet", "Pet"],
    meta: "Študent {student} · {program} · {semester} · podatki: {time}",

    clash: "Predavanji se prekrivata: {a} in {b}, {day} {from}–{to}",
    clashNote: "Tega ni mogoče rešiti z izbiro vaj. Izbrati boš moral, katero predavanje obiskuješ.",
    noScheduleTitle: "Ni urnika brez prekrivanj",
    noScheduleText: "S temi izbirami se vaje vedno prekrivajo. Sprosti kakšno zaklenjeno vajo ali dovoli, da vaje prekrivajo predavanja.",
    combinations: "Kombinacij brez prekrivanj: ",
    currentTab: "Trenutni urnik",

    statScore: "točke",
    statFreeDays: "prosti dnevi",
    statGaps: "luknje",
    statOutside: "izven ur",
    statLabs: "vaje",

    legendLecture: "predavanje (P)",
    legendLab: "vaje (LV, AV)",
    badgeNew: "nova",
    legendNew: "druga skupina kot zdaj",

    exportCurrent: "Izvozi trenutni urnik v koledar",
    exportOption: "Izvozi urnik #{n} v koledar",
    from: "Od",
    to: "Do",
    download: "Prenesi .ics",
    exportNote: "Vsak termin se ponavlja vsak teden v izbranem obdobju. Državni prazniki so izpuščeni, počitnice pa ne, zato po potrebi prilagodi datuma.",
    exportBadRange: "Izberi začetni in končni datum (začetek mora biti pred koncem).",

    changesTitle: "Kaj moraš urediti",
    keep: "Ostane",
    swap: "Zamenjaj",
    join: "Vpiši se",
    groups: "Skupine: ",

    example: "Poglej primer urnika",
    introTitle: "Vpiši vpisno številko",
    introText: "Orodje prenese tvoj urnik, poišče vse kombinacije vaj brez prekrivanj in jih razvrsti po tvojih željah: prosti dnevi, brez lukenj, ne prezgodaj in ne prepozno.",
    loadingTitle: "Nalagam urnik …",
    loadingText: "Prenašam tvoj urnik in vse termine vaj s strani urnik.fri.uni-lj.si.",
    loadFailedTitle: "Urnika ni bilo mogoče naložiti",
    checkIdTitle: "Preveri vpisno številko",
    checkIdText: "Vpisna številka ima 8 števk, na primer 63240310.",

    // error codes sent by the server
    err_BAD_ID: "Vpisna številka mora imeti 8 števk.",
    err_NOT_FOUND: "Za to vpisno številko ni urnika. Preveri številko.",
    err_FRI_DOWN: "Strani urnik.fri.uni-lj.si trenutno ni mogoče naložiti. Poskusi kasneje.",
    err_OTHER: "Napaka pri nalaganju. Poskusi znova.",
  },

  en: {
    langName: "Language",
    tagline: "The best combination of lab groups for your FRI timetable",
    studentId: "Student ID",
    load: "Load timetable",

    prefsTitle: "What matters to you",
    notBefore: "Not before",
    notAfter: "Not after",
    freeDays: "Free days",
    noGaps: "No gaps",
    withinHours: "Within hours",
    overlapLectures: "Labs may overlap lectures (if lectures are optional)",
    labsTitle: "Labs",
    any: "Any ({n})",
    now: " (now)",
    footer: "Data is loaded from urnik.fri.uni-lj.si on every search. Student IDs are not stored. Lab groups are assigned by the faculty, so this is a planning tool: it tells you which groups to ask for.",

    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    meta: "Student {student} · {program} · {semester} · data: {time}",

    clash: "Lectures overlap: {a} and {b}, {day} {from}–{to}",
    clashNote: "Choosing labs can't fix this. You'll have to pick which lecture to attend.",
    noScheduleTitle: "No timetable without overlaps",
    noScheduleText: "With these choices the labs always overlap. Unlock a lab group or allow labs to overlap lectures.",
    combinations: "Combinations without overlaps: ",
    currentTab: "Current timetable",

    statScore: "score",
    statFreeDays: "free days",
    statGaps: "gaps",
    statOutside: "outside hours",
    statLabs: "labs",

    legendLecture: "lecture (P)",
    legendLab: "lab (LV, AV)",
    badgeNew: "new",
    legendNew: "different group than now",

    exportCurrent: "Export current timetable to calendar",
    exportOption: "Export option #{n} to calendar",
    from: "From",
    to: "To",
    download: "Download .ics",
    exportNote: "Each class repeats weekly in the chosen period. Public holidays are skipped, school breaks are not, so adjust the dates if needed.",
    exportBadRange: "Choose a start and end date (the start must be before the end).",

    changesTitle: "What to arrange",
    keep: "Keep",
    swap: "Swap",
    join: "Join",
    groups: "Groups: ",

    example: "See an example timetable",
    introTitle: "Enter your student ID",
    introText: "The tool downloads your timetable, finds every combination of lab groups without overlaps and ranks them by what you care about: free days, no gaps, not too early and not too late.",
    loadingTitle: "Loading timetable …",
    loadingText: "Downloading your timetable and all lab slots from urnik.fri.uni-lj.si.",
    loadFailedTitle: "Couldn't load the timetable",
    checkIdTitle: "Check the student ID",
    checkIdText: "A student ID has 8 digits, for example 63240310.",

    err_BAD_ID: "A student ID has 8 digits.",
    err_NOT_FOUND: "There's no timetable for this student ID. Check the number.",
    err_FRI_DOWN: "urnik.fri.uni-lj.si can't be reached right now. Try again later.",
    err_OTHER: "Something went wrong while loading. Try again.",
  },
};

// Language: ?lang=en in the link, otherwise the last choice, otherwise Slovenian
let lang = "sl";
(function pickLanguage() {
  if (typeof location === "undefined") return; // running in Node (tests)
  const fromLink = new URLSearchParams(location.search).get("lang");
  let saved = null;
  try { saved = localStorage.getItem("lang"); } catch (e) { /* storage blocked, that's fine */ }
  if (TEXT[fromLink]) lang = fromLink;
  else if (TEXT[saved]) lang = saved;
})();

function t(key, values) {
  let text = TEXT[lang][key];
  if (text === undefined) text = TEXT.sl[key]; // missing translation: show Slovenian
  if (values) {
    for (const name in values) text = text.replace("{" + name + "}", values[name]);
  }
  return text;
}

// Fill every element with a data-t="key" attribute
function applyStaticText() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach((node) => {
    node.textContent = t(node.dataset.t);
  });
  document.querySelectorAll(".lang button").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.lang === lang);
  });
}

if (typeof module !== "undefined") {
  module.exports = { TEXT };
}
