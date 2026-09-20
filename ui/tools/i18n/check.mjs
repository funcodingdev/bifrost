#!/usr/bin/env node
// Verify the committed catalogs still match the source, and report coverage.
//
//   npm run i18n:check            report only, always exits 0
//   npm run i18n:check -- --strict  exit 1 when en.json is stale
//
// The strict form is what CI runs after an upstream rebase: it fails when
// someone pulled new copy without re-running the extractor, which is the one
// way this setup silently rots.

import { createRequire } from "node:module";
import path from "node:path";

import { CATALOG_DIR, localeCatalogFiles, readCatalog, scanUi } from "./scan.mjs";

const require = createRequire(import.meta.url);
const { placeholdersOf } = require("./rules.cjs");

const strict = process.argv.includes("--strict");
// Machine-readable one-liner for CI release notes.
const asJson = process.argv.includes("--json");

const { keys } = scanUi();
const committed = Object.keys(readCatalog(path.join(CATALOG_DIR, "en.json")));

const committedSet = new Set(committed);
const currentSet = new Set(keys);
const added = keys.filter((k) => !committedSet.has(k));
const removed = committed.filter((k) => !currentSet.has(k));
const stale = added.length > 0 || removed.length > 0;

if (asJson) {
	const locales = {};
	for (const file of localeCatalogFiles()) {
		const entries = readCatalog(path.join(CATALOG_DIR, file));
		const locale = file.replace(/\.json$/, "");
		const translated = keys.filter((k) => typeof entries[k] === "string" && entries[k] !== "").length;
		const broken = Object.entries(entries).filter(
			([key, value]) =>
				typeof value === "string" && currentSet.has(key) && placeholdersOf(key).join(",") !== placeholdersOf(value).join(","),
		).length;
		locales[locale] = { translated, broken, coverage: keys.length ? Number(((translated / keys.length) * 100).toFixed(1)) : 0 };
	}
	console.log(JSON.stringify({ strings: keys.length, stale, added: added.length, removed: removed.length, locales }));
	process.exit(strict && (stale || Object.values(locales).some((l) => l.broken)) ? 1 : 0);
}

console.log(`source strings   ${keys.length}`);
console.log(`en.json          ${committed.length}`);

if (stale) {
	console.log(`\nen.json is STALE:  +${added.length} new  -${removed.length} gone`);
	for (const k of added.slice(0, 10)) console.log(`  + ${JSON.stringify(k)}`);
	for (const k of removed.slice(0, 10)) console.log(`  - ${JSON.stringify(k)}`);
	console.log("\nrun: npm run i18n:extract");
} else {
	console.log("en.json is up to date");
}

console.log("");
let corrupt = 0;
for (const file of localeCatalogFiles()) {
	const entries = readCatalog(path.join(CATALOG_DIR, file));
	const translated = keys.filter((k) => typeof entries[k] === "string" && entries[k] !== "").length;
	const pct = keys.length ? ((translated / keys.length) * 100).toFixed(1) : "0.0";
	const orphans = Object.keys(entries).filter((k) => !currentSet.has(k)).length;

	// A translation whose placeholder set drifted from its source renders a
	// literal "{0}" — or silently swallows a value — at runtime. Machine
	// translation is the usual culprit, so this is a hard failure under --strict
	// regardless of who wrote the catalog.
	const broken = [];
	for (const [key, value] of Object.entries(entries)) {
		if (typeof value !== "string" || !currentSet.has(key)) continue;
		const want = placeholdersOf(key).join(",");
		const got = placeholdersOf(value).join(",");
		if (want !== got) broken.push({ key, value, want, got });
	}
	corrupt += broken.length;

	console.log(
		`${file.padEnd(14)} ${String(translated).padStart(5)}/${keys.length}  ${pct.padStart(5)}%${orphans ? `  (${orphans} orphaned)` : ""}${broken.length ? `  ${broken.length} BROKEN` : ""}`,
	);
	for (const b of broken.slice(0, 10)) {
		console.log(`    placeholders ${b.want || "none"} -> ${b.got || "none"}: ${JSON.stringify(b.key)} => ${JSON.stringify(b.value)}`);
	}
	if (broken.length > 10) console.log(`    ... ${broken.length - 10} more`);
}

if (corrupt) console.log(`\n${corrupt} translation(s) have mismatched placeholders`);

process.exit(strict && (stale || corrupt) ? 1 : 0);