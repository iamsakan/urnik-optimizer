# Urnik Optimizer

Finds the best combination of lab groups (vaje) for an FRI student so that nothing overlaps, and ranks the options by what the student cares about: free days, no gaps, no early mornings or late evenings.

The official timetable gives you one combination. This tool searches all of them.

## How it works

1. The student enters their ID. The page calls **`netlify/functions/timetable.js`**, a small server function that downloads the student's timetable from urnik.fri.uni-lj.si, finds their program (e.g. `3_BVS-RI`), downloads every subject page and collects all lab slots for that program. (A browser can't read the FRI site directly, so this step runs on the server.)
2. **`public/solver.js`** treats it as a constraint satisfaction problem. Lectures are fixed. Each subject + lab type (e.g. "TPO LV") is a choice with several options. Backtracking tries every combination and skips any option that overlaps something already chosen. Each valid week gets a score:

   ```
   score = 30 × free days − 10 × gap hours − 5 × hours outside the chosen time window
   ```
   (weights are adjustable in the page)
3. **`public/index.html`** shows the top 5 weeks next to the current one, lets you lock a lab group you already have, and lists exactly which groups to request.

Lecture clashes (two lectures at the same time) can't be fixed by choosing labs, so they're reported separately.

## Project structure

```
public/                 the website
  index.html            page
  solver.js             the algorithm (runs in the browser)
  timetable.json        example data for the "Poglej primer" button
netlify/functions/
  timetable.js          downloads + parses the FRI timetable
tools/fetch_urnik.py    same downloader in Python, for offline use
test.js                 solver test (no overlaps in any result)
test-function.js        function test against fake FRI pages
netlify.toml            tells Netlify where the site and function are
package.json            one dependency: cheerio (HTML parsing)
```

## Deploy

1. Push this folder to a GitHub repo.
2. On Netlify: **Add new site → Import from Git**, pick the repo. Settings are read from `netlify.toml`.
3. Done. Netlify installs `cheerio` during the build. Every push redeploys.

## Being a good guest

- Subject pages are cached for 3 hours, so many students using it doesn't mean many requests to the faculty server.
- Student IDs are not stored or logged.
- Lab groups have capacity limits and are assigned by the faculty, so this is a planning tool: it tells you which groups to ask for.

## Tests

```
npm install
npm test
```
