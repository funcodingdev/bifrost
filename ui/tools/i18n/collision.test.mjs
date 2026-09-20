// Finds copy that the transform wraps and some other code compares.
//
//   npx vitest run tools/i18n
//
// A translated string that is also matched with ===, includes() or a switch
// stops matching once the UI is in another language, and the failure is silent:
// a branch simply stops being taken. English builds look fine, so nothing else
// in the pipeline would catch it.
//
// The check is a string-level heuristic, so a hit is a question rather than a
// verdict — two unrelated pieces of code can use the same word. Confirmed-benign
// pairs are listed in BENIGN with the reason; anything genuinely unsafe goes in
// NEVER_TRANSLATE in rules.cjs instead, which stops it being wrapped at all.
//
// The point of the test is upstream: when a new release adds copy that collides
// with existing logic, this fails during the sync rather than shipping.

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { UI_ROOT, scanUi } from "./scan.mjs";

const require = createRequire(import.meta.url);
const { shouldSkipFile } = require("./rules.cjs");

// Reviewed and safe: the compared string and the translated string are different
// values that merely read the same.
const BENIGN = new Map([
	["Other", 'compared as `app.name === "Other"`; the wrapped copy is a label elsewhere and `name` is not a translated key'],
	["None", '`label: "None"` carries a sibling `value: "none"`; the comparison is on an unrelated `entityInfo.type`'],
	["Files", 'the comparison is `dataTransfer.types.includes("Files")`, a DOM constant, not this UI label'],
	["Unknown", '`app.name === "Unknown"` reads a value built under the `name` key, which is never translated'],
]);

const COMPARISON = /(===|!==|==\s|includes\(|startsWith\(|endsWith\(|case)\s*["'`]/;

function sourceFiles() {
	const out = [];
	for (const dir of ["app", "components", "lib", "hooks"]) {
		const abs = path.join(UI_ROOT, dir);
		if (!fs.existsSync(abs)) continue;
		for (const entry of fs.readdirSync(abs, { recursive: true, withFileTypes: true })) {
			if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) continue;
			const file = path.join(entry.parentPath ?? entry.path, entry.name);
			// Test fixtures compare strings constantly and are never transformed.
			if (shouldSkipFile(file)) continue;
			out.push(file);
		}
	}
	return out;
}

describe("translated copy versus string comparisons", () => {
	it("does not wrap anything another file matches on", () => {
		const { keys } = scanUi();

		// Collect every literal the source compares against in one pass. Building
		// a regex per catalog key instead means 3,500 scans of the whole tree,
		// which took 26s and tripped the default timeout.
		const compared = new Set();
		for (const file of sourceFiles()) {
			const code = fs.readFileSync(file, "utf8");
			for (const m of code.matchAll(/(?:===|!==|includes\(|startsWith\(|endsWith\(|case)\s*["'`]([^"'`\n]{4,})["'`]/g)) {
				compared.add(m[1]);
			}
		}

		const collisions = keys.filter((key) => compared.has(key) && !BENIGN.has(key));

		expect(
			collisions,
			`These strings are translated and also compared literally. Either add them to NEVER_TRANSLATE in rules.cjs, ` +
				`or — if the two uses are unrelated values that merely read alike — record them in BENIGN here with the reason.`,
		).toEqual([]);
	}, 60_000); // scanUi parses ~790 files; the default 5s is not enough.

	it("keeps the comparison pattern itself meaningful", () => {
		// Guards the regex above: if it ever stops matching real comparisons the
		// test would pass vacuously and protect nothing.
		expect(COMPARISON.test('if (x === "Something")')).toBe(true);
		expect(COMPARISON.test('error.includes("Something")')).toBe(true);
		expect(COMPARISON.test("const label = t(x)")).toBe(false);
	});
});