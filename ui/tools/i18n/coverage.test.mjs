// Guards the one invariant the whole design rests on: every file the extractor
// takes copy from is also a file the Vite plugin transforms.
//
//   npx vitest run tools/i18n
//
// When the two disagree, nothing fails. The catalog gains keys, someone (or some
// model) translates them, the coverage figure says 100%, and the screen stays
// English — because the bundle never had a lookup for those keys in the first
// place. That is exactly what happened when the plugin's pre-filter still
// assumed all copy lived in JSX: the sidebar, the onboarding checklist and every
// zod validation message were extracted and never transformed.
//
// The extractor is the source of truth here. It reads every .ts/.tsx under the
// scanned directories; the plugin adds a cheap content pre-filter on top to keep
// Babel off files that cannot contain copy. This test proves the pre-filter only
// ever removes files with nothing to say.

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { UI_ROOT, relative, scanUi } from "./scan.mjs";

const require = createRequire(import.meta.url);
const { OBJECT_COPY_HINT, shouldSkipFile } = require("./rules.cjs");

// Mirrors the gate in vite-plugin.mjs. Kept as one expression so a change there
// that is not reflected here shows up as a failure rather than a silent gap.
const TOAST_RE = /\btoast\s*[.(]/;
function pluginWouldTransform(file, code) {
	if (shouldSkipFile(file)) return false;
	if (/\.[jt]sx$/.test(file)) return true;
	return TOAST_RE.test(code) || OBJECT_COPY_HINT.test(code);
}

describe("extractor and transform agree", () => {
	it("transforms every file the catalog draws copy from", () => {
		const { catalog } = scanUi();

		const contributing = new Set();
		for (const [, entry] of catalog) {
			for (const source of entry.sources) contributing.add(source.replace(/:\d+$/, ""));
		}
		expect(contributing.size).toBeGreaterThan(50);

		const missed = [...contributing].filter((rel) => {
			const abs = path.join(UI_ROOT, rel);
			if (!fs.existsSync(abs)) return false;
			return !pluginWouldTransform(abs, fs.readFileSync(abs, "utf8"));
		});

		expect(
			missed.sort(),
			"These files contribute catalog keys but the Vite plugin's pre-filter skips them, so their copy " +
				"would be translated in the catalog and still render in English. Widen the filter in vite-plugin.mjs.",
		).toEqual([]);
	}, 60_000);

	it("still filters out files that hold no copy", () => {
		// The filter has to earn its place: if it accepted everything, the check
		// above would pass while Babel parsed the entire module graph.
		const code = "export type Thing = { title: string };\nexport const ids = ['a', 'b'];\n";
		expect(pluginWouldTransform(path.join(UI_ROOT, "lib/types/thing.ts"), code)).toBe(false);
	});

	it("recognises copy in a plain .ts config file", () => {
		const code = 'export const steps = [{ id: "cors", title: "Restrict CORS origins" }];';
		expect(pluginWouldTransform(path.join(UI_ROOT, "hooks/useThing.ts"), code)).toBe(true);
	});

	it("never transforms a file the skip list excludes", () => {
		for (const rel of ["i18n/runtime.ts", "tools/i18n/rules.cjs", "app/routeTree.gen.ts", "lib/utils/thing.test.ts"]) {
			expect(pluginWouldTransform(path.join(UI_ROOT, rel), 'const x = { title: "Copy" };'), rel).toBe(false);
		}
	});

	it("reports where the catalog comes from", () => {
		const { catalog, keys } = scanUi();
		const byKind = new Map();
		for (const [, entry] of catalog) {
			for (const kind of entry.kinds) {
				const group = kind.split(":")[0];
				byKind.set(group, (byKind.get(group) ?? 0) + 1);
			}
		}
		// Not an assertion about exact numbers — upstream changes those constantly.
		// A kind dropping to zero, though, means a rule silently stopped matching.
		for (const kind of ["jsx-text", "jsx-attribute", "object", "toast"]) {
			expect(byKind.get(kind) ?? 0, `no keys of kind "${kind}" — did that rule stop matching?`).toBeGreaterThan(0);
		}
		expect(keys.length).toBeGreaterThan(2000);
	});
});