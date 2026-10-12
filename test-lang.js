// test-lang.js - run with: node test-lang.js
// Checks that every text exists in both languages, with the same {placeholders}.

const assert = require("assert");
const { TEXT } = require("./public/lang.js");

const placeholders = (text) => (String(text).match(/\{\w+\}/g) || []).sort().join(",");

for (const [a, b] of [["sl", "en"], ["en", "sl"]]) {
  for (const key of Object.keys(TEXT[a])) {
    assert.ok(key in TEXT[b], `"${key}" is missing in ${b}`);
    assert.strictEqual(placeholders(TEXT[a][key]), placeholders(TEXT[b][key]), `"${key}" placeholders differ`);
  }
}
assert.strictEqual(TEXT.en.days.length, 5);
console.log(`ok   ${Object.keys(TEXT.sl).length} texts, all in Slovenian and English with matching placeholders`);
