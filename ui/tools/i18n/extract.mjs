#!/usr/bin/env node
// Extract every translatable string from the UI source and refresh the catalogs.
//
// Run after each upstream rebase:
//   npm run i18n:extract        write catalogs + reports, print the diff
//   npm run i18n:diff           print the diff only (no writes)
//
// The walk is the same visitor the Babel plugin uses, with `transform: false`,
// so what lands in en.json is exactly what the bundle looks up at runtime.

import fs from "node:fs";
import path from "node:path";

import { CATALOG_DIR, UI_ROOT, localeCatalogFiles, readCatalog, scanUi, summarize } from "./scan.mjs";

const dryRun = process.argv.includes("--dry-run") || process.argv.includes("-n");

const result = scanUi();
const { keys, catalog, rejected } = result;

summarize(result);

// ---- diff against the committed catalog -------------------------------------
const enPath = path.join(CATALOG_DIR, "en.json");
const previous = Object.keys(readCatalog(enPath));
const previousSet = new Set(previous);
const currentSet = new Set(keys);
const added = keys.filter((k) => !previousSet.has(k));
const removed = previous.filter((k) => !currentSet.has(k));

if (previous.length) {
	console.log(`\nvs committed en.json:  +${added.length}  -${removed.length}`);
	for (const k of added.slice(0, 20)) console.log(`  + ${JSON.stringify(k)}`);
	if (added.length > 20) console.log(`  ... ${added.length - 20} more added`);
	for (const k of removed.slice(0, 10)) console.log(`  - ${JSON.stringify(k)}`);
	if (removed.length > 10) console.log(`  ... ${removed.length - 10} more removed`);
}

if (dryRun) {
	console.log("\n(dry run: nothing written)");
	process.exit(0);
}

// ---- write ------------------------------------------------------------------
fs.mkdirSync(CATALOG_DIR, { recursive: true });

const enCatalog = {};
for (const key of keys) enCatalog[key] = key;
writeJson(enPath, enCatalog);

// Occurrence data gives translators the context they need to tell, say, an API
// "Key" from a Virtual "Key". Capped so the file stays reviewable.
const extracted = {};
for (const key of keys) {
	const entry = catalog.get(key);
	extracted[key] = { kinds: [...entry.kinds].sort(), count: entry.sources.length, sources: entry.sources.slice(0, 5) };
}
writeJson(path.join(UI_ROOT, "i18n", "extracted.json"), extracted);

// Everything the rules refused, so the skip list stays auditable instead of
// being a silent source of missing translations.
const rejectedOut = {};
for (const text of [...rejected.keys()].sort()) {
	const entry = rejected.get(text);
	rejectedOut[text] = { reason: entry.reason, count: entry.sources.length, sources: entry.sources.slice(0, 3) };
}
writeJson(path.join(UI_ROOT, "i18n", "rejected.json"), rejectedOut);

// Keep every locale catalog aligned with the source set: drop keys upstream
// deleted, and leave new keys absent so they fall back to English.
for (const file of localeCatalogFiles()) {
	const abs = path.join(CATALOG_DIR, file);
	const existing = readCatalog(abs);
	const next = {};
	for (const key of keys) {
		const value = existing[key];
		if (typeof value === "string" && value !== "") next[key] = value;
	}
	writeJson(abs, next);
	const translated = Object.keys(next).length;
	const pct = keys.length ? ((translated / keys.length) * 100).toFixed(1) : "0.0";
	console.log(`\n${file}: ${translated}/${keys.length} translated (${pct}%)`);
}

console.log("\nwrote i18n/catalogs/en.json, i18n/extracted.json, i18n/rejected.json");

function writeJson(file, value) {
	fs.writeFileSync(file, `${JSON.stringify(value, null, "\t")}\n`, "utf8");
}