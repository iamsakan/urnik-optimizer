"""
fetch_urnik.py

Downloads a student's FRI timetable and ALL lab slots (LV/AV) for their
subjects, then saves everything to timetable.json and timetable.js.

Usage:
    pip install requests beautifulsoup4
    python fetch_urnik.py 63240310
    python fetch_urnik.py 63240310 --semester fri-2026_2027-zimski
    python fetch_urnik.py 63240310 --program 3_BVS-RI   (only if auto-detect is wrong)
"""

import argparse
import json
import re
import time
from collections import Counter
from datetime import datetime

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://urnik.fri.uni-lj.si/timetable/{semester}/allocations"
DAYS = {"MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4}
HEADERS = {"User-Agent": "urnik-optimizer (student project)"}


def download(semester, params):
    """Download one timetable page. A fresh request every time (no cookies),
    so the site can't 'remember' the previous filter."""
    url = BASE_URL.format(semester=semester)
    response = requests.get(url, params=params, headers=HEADERS, timeout=20)
    response.raise_for_status()
    time.sleep(1)  # be polite to the faculty server
    return response.text


def parse_blocks(html):
    """Turn a timetable page into a list of blocks (dicts).
    Each block on the page is a <div class="grid-entry"> with data-day,
    data-start and data-duration attributes."""
    soup = BeautifulSoup(html, "html.parser")
    blocks = []

    for entry in soup.select("div.grid-entry"):
        day = DAYS.get(entry.get("data-day"))
        if day is None:
            continue

        start = int(entry["data-start"].split(":")[0])
        duration = int(entry["data-duration"])

        # Subject code comes from the link: href="?subject=63735..."
        subject_link = entry.select_one("a.link-subject")
        match = re.search(r"subject=([^&]+)", subject_link.get("href", ""))
        if not match:
            print("  skipping a block without a subject code:", subject_link.get_text(strip=True))
            continue
        code = match.group(1)

        # Type is in <span class="entry-type">| LV</span>
        kind = entry.select_one(".entry-type").get_text(strip=True).replace("|", "").strip()

        # Full name, e.g. "Spletno programiranje(63255)_LV" -> "Spletno programiranje"
        name = subject_link.get_text(strip=True)
        hover = entry.select_one(".entry-hover")
        if hover:
            for line in hover.get_text("\n", strip=True).split("\n"):
                if "(" + code + ")" in line:
                    name = line.split("(")[0].strip()
                    break

        room = entry.select_one("a.link-classroom")
        blocks.append({
            "subject": code,
            "name": name,
            "type": kind,
            "day": day,
            "start": start,
            "end": start + duration,
            "room": room.get_text(strip=True) if room else "",
            "teachers": [a.get_text(strip=True) for a in entry.select("a.link-teacher")],
            "groups": [a.get_text(strip=True) for a in entry.select("a.link-group")],
        })

    return blocks


def detect_program(blocks):
    """Find the student's program code, e.g. '3_BVS-RI', from group names
    like '3_BVS-RI_VPSA(63735)_LV_01'. The most common one wins."""
    counts = Counter()
    for block in blocks:
        for group in block["groups"]:
            match = re.match(r"^(\d_[A-Z]+-[A-Z]+)", group)
            if match:
                counts[match.group(1)] += 1
    if not counts:
        return None
    return counts.most_common(1)[0][0]


def same_slot(a, b):
    return (a["subject"] == b["subject"] and a["type"] == b["type"]
            and a["day"] == b["day"] and a["start"] == b["start"] and a["end"] == b["end"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("student", help="student number, e.g. 63240310")
    parser.add_argument("--semester", default="fri-2026_2027-zimski")
    parser.add_argument("--program", help="override program code, e.g. 3_BVS-RI")
    args = parser.parse_args()

    # 1. The student's own timetable: lectures + labs they currently have
    print("Downloading timetable for student", args.student)
    student_blocks = parse_blocks(download(args.semester, {"student": args.student}))
    if not student_blocks:
        print("No blocks found. Check the student number and semester.")
        return

    program = args.program or detect_program(student_blocks)
    print("Program:", program)

    lectures = [b for b in student_blocks if b["type"] == "P"]
    current_labs = [b for b in student_blocks if b["type"] != "P"]

    subjects = {}
    for block in student_blocks:
        subjects[block["subject"]] = block["name"]

    # 2. Every subject page: collect all lab slots meant for this program
    labs = []
    for code, name in subjects.items():
        print("Downloading subject", code, name)
        subject_blocks = parse_blocks(download(args.semester, {"subject": code}))
        subject_labs = [b for b in subject_blocks if b["type"] != "P"]

        # keep only labs for our program (other programs have their own slots)
        mine = [b for b in subject_labs
                if program and any(g.startswith(program) for g in b["groups"])]
        if not mine:
            mine = subject_labs  # e.g. electives without program groups

        for lab in mine:
            if any(same_slot(lab, other) for other in labs):
                continue  # duplicate
            lab["current"] = any(same_slot(lab, c) for c in current_labs)
            labs.append(lab)

    data = {
        "student": args.student,
        "semester": args.semester,
        "program": program,
        "fetched_at": datetime.now().isoformat(timespec="minutes"),
        "subjects": subjects,
        "lectures": lectures,
        "labs": labs,
    }

    with open("timetable.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    # same data as a script, so index.html also works when opened directly from disk
    with open("timetable.js", "w", encoding="utf-8") as f:
        f.write("window.TIMETABLE = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")

    print(f"Saved {len(lectures)} lectures and {len(labs)} lab slots to timetable.json / timetable.js")


if __name__ == "__main__":
    main()
