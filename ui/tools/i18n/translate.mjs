#!/usr/bin/env node
// Machine-translate the untranslated keys of a locale catalog via OpenRouter.
//
//   node tools/i18n/translate.mjs --locale zh-CN
//   node tools/i18n/translate.mjs --locale zh-CN --retranslate --limit 50
//   node tools/i18n/translate.mjs --locale zh-CN --dry-run
//
// Env:
//   OPENROUTER_API_KEY   required
//   OPENROUTER_MODEL     default below; any OpenRouter slug works
//   OPENROUTER_BASE_URL  default https://openrouter.ai/api/v1 — point this at
//                        your own Bifrost instance to dogfood the gateway
//
// Only keys with no translation are sent, so the first run costs ~30k tokens
// and every later upstream sync costs a few hundred. A translation that fails
// validation is simply not written: the key keeps falling back to English,
// which is a cosmetic miss rather than a broken build.

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { CATALOG_DIR, UI_ROOT, readCatalog } from "./scan.mjs";

const require = createRequire(import.meta.url);
const { placeholdersOf } = require("./rules.cjs");

const DEFAULT_MODEL = "anthropic/claude-opus-5";
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const BATCH_SIZE = 40;
const MAX_ATTEMPTS = 3;
// Six in flight keeps a full 73-batch pass under ten minutes without tripping
// provider rate limits. Override with I18N_CONCURRENCY when a model is slower
// or stricter.
const CONCURRENCY = Math.max(1, Number(process.env.I18N_CONCURRENCY) || 6);

function arg(name, fallback = null) {
	const index = process.argv.indexOf(`--${name}`);
	return index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--") ? process.argv[index + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const locale = arg("locale", "zh-CN");
const retranslate = flag("retranslate");
const dryRun = flag("dry-run");
const limit = Number(arg("limit", "0")) || Infinity;

const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
const baseUrl = (process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

const catalogPath = path.join(CATALOG_DIR, `${locale}.json`);
if (!fs.existsSync(catalogPath)) {
	console.error(`No catalog at ${path.relative(UI_ROOT, catalogPath)}. Create it with '{}' and add the locale to i18n/runtime.ts.`);
	process.exit(1);
}

const source = readCatalog(path.join(CATALOG_DIR, "en.json"));
const target = readCatalog(catalogPath);
const glossaryAll = readCatalog(path.join(UI_ROOT, "i18n", "glossary.json"));
const glossary = glossaryAll[locale] ?? {};

const pending = Object.keys(source)
	.filter((key) => retranslate || typeof target[key] !== "string" || target[key] === "")
	.slice(0, limit === Infinity ? undefined : limit);

console.log(`locale     ${locale}`);
console.log(`catalog    ${Object.keys(target).length}/${Object.keys(source).length} translated`);
console.log(`pending    ${pending.length}`);

if (!pending.length) {
	console.log("nothing to translate");
	process.exit(0);
}
if (dryRun) {
	for (const key of pending.slice(0, 20)) console.log(`  ${JSON.stringify(key)}`);
	if (pending.length > 20) console.log(`  ... ${pending.length - 20} more`);
	process.exit(0);
}
if (!apiKey) {
	console.error("OPENROUTER_API_KEY is not set");
	process.exit(1);
}

console.log(`model      ${model}`);
console.log(`endpoint   ${baseUrl}`);
console.log(`batches    ${Math.ceil(pending.length / BATCH_SIZE)} × ${BATCH_SIZE}, ${CONCURRENCY} in flight\n`);

const SYSTEM_PROMPT = `You translate UI strings for Bifrost, a self-hosted LLM gateway's admin console, from English into ${locale}.

Rules, in order of importance:
1. Preserve every placeholder ({0}, {1}, ...) EXACTLY as written. Same set, same digits, ASCII braces. Never translate, renumber, reorder the digits, or drop one. You may move a placeholder to wherever the target language needs it.
2. Preserve leading and trailing spaces exactly as they appear in the source.
3. Use the glossary verbatim for the terms it lists.
4. Never translate: provider names, model names, HTTP methods, config keys, JSON field names, URLs, API paths, code, CLI flags, environment variables, or anything that looks like an identifier (lower_snake_case, kebab-case, dotted.paths).
5. This is dense admin UI: buttons, labels, table headers, tooltips, toasts. Keep translations short — a label that grows 50% will break the layout. Match the source's register and punctuation style; do not add trailing periods the source does not have.
6. Keep the source's capitalisation intent: a Title Case button stays a button label, not a sentence.

Glossary (English -> required rendering):
${Object.entries(glossary)
	.map(([en, zh]) => `  ${en} -> ${zh}`)
	.join("\n")}

Reply with ONLY a JSON object mapping every input id to its translated string. No prose, no markdown fence, no extra keys, no missing keys.`;

async function translateBatch(keys, attempt = 1) {
	const payload = Object.fromEntries(keys.map((key, i) => [String(i), key]));

	const response = await fetch(`${baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
			"HTTP-Referer": "https://github.com/funcodingdev/bifrost-i18n",
			"X-Title": "bifrost-fork-i18n",
		},
		body: JSON.stringify({
			model,
			temperature: 0,
			response_format: { type: "json_object" },
			// Without an explicit budget the provider applies its own default, and
			// a 40-string batch can run past it: the reply comes back cut in half
			// with finish_reason "length". Scaled to the batch rather than fixed,
			// so a one-key retry does not ask for a budget it cannot use.
			max_tokens: Math.min(16000, Math.max(2000, keys.length * 250)),
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{ role: "user", content: JSON.stringify(payload, null, 1) },
			],
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		// 429 / 5xx are worth another go; a 400 is our own payload's fault.
		if (attempt < MAX_ATTEMPTS && (response.status === 429 || response.status >= 500)) {
			const wait = 2 ** attempt * 1000;
			console.log(`  HTTP ${response.status}, retrying in ${wait / 1000}s`);
			await new Promise((r) => setTimeout(r, wait));
			return translateBatch(keys, attempt + 1);
		}
		throw new Error(`OpenRouter HTTP ${response.status}: ${body.slice(0, 300)}`);
	}

	const data = await response.json();
	const choice = data?.choices?.[0];
	const content = choice?.message?.content;
	const finish = choice?.finish_reason ?? choice?.native_finish_reason ?? "unknown";

	// A reply cut off at the token ceiling is a size problem, not a model problem:
	// retrying the same batch truncates again at the same place. Halving it is the
	// only thing that actually helps, and it keeps the strings that would
	// otherwise be dropped wholesale.
	if (finish === "length" || typeof content !== "string" || !content.trim()) {
		if (keys.length > 1) return translateSplit(keys, finish);
		if (attempt < MAX_ATTEMPTS) return translateBatch(keys, attempt + 1);
		throw new Error(`truncated or empty reply (finish_reason=${finish}, provider=${data?.provider ?? "?"})`);
	}

	let parsed;
	try {
		// Some models still wrap JSON in a fence despite response_format.
		parsed = JSON.parse(content.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ""));
	} catch {
		// Truncated JSON is indistinguishable from malformed JSON here, so try
		// splitting before burning retries on the same oversized request.
		if (keys.length > 1) return translateSplit(keys, "unparseable");
		if (attempt < MAX_ATTEMPTS) return translateBatch(keys, attempt + 1);
		throw new Error(`model did not return JSON (finish_reason=${finish}): ${content.slice(0, 200)}`);
	}

	const accepted = {};
	const failed = [];
	keys.forEach((key, i) => {
		const value = parsed[String(i)];
		const problem = validate(key, value);
		if (problem) failed.push({ key, value, problem });
		else accepted[key] = value;
	});
	return { accepted, failed };
}

/**
 * Translate a batch in two halves after an oversized reply.
 *
 * Each half is isolated: one that still fails costs only its own keys, which
 * then fall back to English and are retried by the next sync.
 */
async function translateSplit(keys, reason) {
	const mid = Math.ceil(keys.length / 2);
	console.log(`  reply ${reason} for ${keys.length} keys — splitting into ${mid} + ${keys.length - mid}`);

	const halves = await Promise.all(
		[keys.slice(0, mid), keys.slice(mid)].map(async (half) => {
			try {
				return await translateBatch(half);
			} catch (err) {
				return { accepted: {}, failed: half.map((key) => ({ key, problem: `split failed: ${err.message}` })) };
			}
		}),
	);

	return {
		accepted: Object.assign({}, ...halves.map((h) => h.accepted)),
		failed: halves.flatMap((h) => h.failed),
	};
}

function validate(sourceText, translated) {
	if (typeof translated !== "string") return "missing";
	if (!translated.trim()) return "empty";
	const want = placeholdersOf(sourceText).join(",");
	const got = placeholdersOf(translated).join(",");
	if (want !== got) return `placeholders ${want || "none"} -> ${got || "none"}`;
	if (translated.startsWith(" ") !== sourceText.startsWith(" ")) return "leading space";
	if (translated.endsWith(" ") !== sourceText.endsWith(" ")) return "trailing space";
	// A 4x blow-up is not a translation, it is the model explaining itself.
	if (translated.length > Math.max(60, sourceText.length * 4)) return "implausibly long";
	return null;
}

const batches = [];
for (let i = 0; i < pending.length; i += BATCH_SIZE) batches.push(pending.slice(i, i + BATCH_SIZE));

let translated = 0;
let finished = 0;
const rejected = [];

/**
 * Persist what has been translated so far.
 *
 * Called after every batch, not once at the end. A first full pass is ~73
 * requests; run sequentially that took 44 minutes and a CI job timeout killed it
 * at batch 67, discarding all of it. Because the script only ever translates
 * keys the catalog is missing, a flushed catalog turns a killed run into
 * progress: the next run picks up exactly where this one stopped.
 */
function flush() {
	const sorted = {};
	for (const key of Object.keys(source)) {
		if (typeof target[key] === "string" && target[key] !== "") sorted[key] = target[key];
	}
	fs.writeFileSync(catalogPath, `${JSON.stringify(sorted, null, "\t")}\n`, "utf8");
	return sorted;
}

async function runBatch(batch, index) {
	let result;
	try {
		result = await translateBatch(batch);
	} catch (err) {
		console.log(`batch ${index + 1}/${batches.length} FAILED: ${err.message}`);
		rejected.push(...batch.map((key) => ({ key, problem: "request failed" })));
		return;
	}

	Object.assign(target, result.accepted);
	translated += Object.keys(result.accepted).length;

	// Retry rejects one at a time: a single bad item should not cost the batch.
	let recovered = 0;
	for (const item of result.failed) {
		try {
			const retry = await translateBatch([item.key]);
			if (retry.accepted[item.key]) {
				target[item.key] = retry.accepted[item.key];
				recovered++;
				translated++;
				continue;
			}
		} catch {
			// fall through to rejection
		}
		rejected.push({ key: item.key, problem: item.problem });
	}

	flush();
	finished++;
	console.log(
		`batch ${String(index + 1).padStart(3)}/${batches.length} (${batch.length}) ok ${Object.keys(result.accepted).length}` +
			`${result.failed.length ? `, recovered ${recovered}, dropped ${result.failed.length - recovered}` : ""}` +
			`  [${finished}/${batches.length} done]`,
	);
}

// A worker pool rather than a loop: these are network round trips, and running
// them one at a time is what pushed the first full pass past three quarters of
// an hour. Bounded so a large catalog cannot hammer the provider.
let cursor = 0;
const workers = Array.from({ length: Math.min(CONCURRENCY, batches.length) }, async () => {
	while (cursor < batches.length) {
		const index = cursor++;
		await runBatch(batches[index], index);
	}
});
await Promise.all(workers);

const sorted = flush();

const total = Object.keys(source).length;
const done = Object.keys(sorted).length;
console.log(`\ntranslated ${translated} new`);
console.log(`coverage   ${done}/${total} (${((done / total) * 100).toFixed(1)}%)`);

if (rejected.length) {
	console.log(`\ndropped ${rejected.length} (left in English):`);
	for (const r of rejected.slice(0, 15)) console.log(`  ${r.problem.padEnd(28)} ${JSON.stringify(r.key)}`);
	if (rejected.length > 15) console.log(`  ... ${rejected.length - 15} more`);
}

// Dropped strings are a quality signal, not a build failure: they render in
// English. Only a total wipeout means something is actually broken.
if (translated === 0) {
	console.error("\nno strings were translated — check the model slug and API key");
	process.exit(1);
}