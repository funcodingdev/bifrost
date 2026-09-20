// Walks the UI source and returns every translatable string it finds.
//
// Shared by extract.mjs (writes catalogs) and check.mjs (verifies them in CI),
// so a stale catalog can never be explained away by the two tools disagreeing
// about what a string is.

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

let parser, traverse, types;
try {
	parser = require("@babel/parser");
	traverse = require("@babel/traverse").default;
	types = require("@babel/types");
} catch (err) {
	console.error("Missing Babel packages (they ship with @vitejs/plugin-react). Run `npm ci` in ui/ first.");
	console.error(String(err && err.message));
	process.exit(1);
}

const { createI18nVisitor } = require("./core.cjs");
const { hasFileOptOut, shouldSkipFile } = require("./rules.cjs");

export const UI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CATALOG_DIR = path.join(UI_ROOT, "i18n", "catalogs");

const SCAN_DIRS = ["app", "components", "lib", "hooks"];
const SOURCE_EXT = new Set([".ts", ".tsx"]);

function listSourceFiles() {
	const out = [];
	for (const dir of SCAN_DIRS) {
		const abs = path.join(UI_ROOT, dir);
		if (!fs.existsSync(abs)) continue;
		for (const entry of fs.readdirSync(abs, { recursive: true, withFileTypes: true })) {
			if (!entry.isFile() || !SOURCE_EXT.has(path.extname(entry.name))) continue;
			out.push(path.join(entry.parentPath ?? entry.path, entry.name));
		}
	}
	return out.sort();
}

export function relative(file) {
	return path.relative(UI_ROOT, file).split(path.sep).join("/");
}

export function scanUi() {
	const catalog = new Map(); // key -> { kinds:Set, sources:string[] }
	const rejected = new Map(); // literal -> { reason, sources:string[] }
	const failures = [];
	let scanned = 0;

	for (const file of listSourceFiles()) {
		if (shouldSkipFile(file)) continue;
		const code = fs.readFileSync(file, "utf8");
		if (hasFileOptOut(code)) continue;

		let ast;
		try {
			ast = parser.parse(code, {
				sourceType: "module",
				sourceFilename: file,
				plugins: ["typescript", "jsx", "decorators-legacy", "explicitResourceManagement"],
			});
		} catch (err) {
			failures.push({ file: relative(file), message: String(err && err.message) });
			continue;
		}

		scanned++;
		const ctx = { filename: file, helperName: "__t", nodeHelperName: "__tx", used: false, records: [], rejects: [] };
		traverse(ast, createI18nVisitor({ t: types, transform: false, ctx }));

		for (const r of ctx.records) {
			let entry = catalog.get(r.key);
			if (!entry) catalog.set(r.key, (entry = { kinds: new Set(), sources: [] }));
			entry.kinds.add(r.kind);
			entry.sources.push(`${relative(r.file)}:${r.line}`);
		}
		for (const r of ctx.rejects) {
			let entry = rejected.get(r.text);
			if (!entry) rejected.set(r.text, (entry = { reason: r.reason, sources: [] }));
			entry.sources.push(`${relative(r.file)}:${r.line}`);
		}
	}

	return { catalog, rejected, failures, scanned, keys: [...catalog.keys()].sort() };
}

export function readCatalog(file) {
	return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

export function localeCatalogFiles() {
	if (!fs.existsSync(CATALOG_DIR)) return [];
	return fs
		.readdirSync(CATALOG_DIR)
		.filter((f) => f.endsWith(".json") && f !== "en.json")
		.sort();
}

export function summarize(result) {
	const byKind = new Map();
	for (const [, entry] of result.catalog) {
		for (const kind of entry.kinds) {
			const group = kind.split(":")[0];
			byKind.set(group, (byKind.get(group) ?? 0) + 1);
		}
	}
	console.log(`scanned   ${result.scanned} files`);
	console.log(`strings   ${result.keys.length} unique`);
	for (const [kind, count] of [...byKind].sort((a, b) => b[1] - a[1])) {
		console.log(`  ${kind.padEnd(16)} ${count}`);
	}
	console.log(`skipped   ${result.rejected.size} unique literals`);
	if (result.failures.length) {
		console.log(`\nparse failures (${result.failures.length}):`);
		for (const f of result.failures.slice(0, 10)) console.log(`  ${f.file}: ${f.message}`);
	}
}