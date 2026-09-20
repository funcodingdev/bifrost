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
const { normalizeTranslation } = require("./normalize.cjs");

const DEFAULT_MODEL = "anthropic/claude-opus-5";
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const BATCH_SIZE = 40;
const MAX_ATTEMPTS = 3;
// Six in flight keeps a full 73-batch pass under ten minutes without tripping
// provider rate limits. Override with I18N_CONCURRENCY when a model is slower
// or stricter.
const CONCURRENCY = Math.max(1, Number(process.env.I18N_CONCURRENCY) || 6);
// A single reply should take seconds. Anything past this is a stuck connection,
// and without a bound one of those pins the worker pool until the CI job times
// out — every other worker having long since drained the queue.
const REQUEST_TIMEOUT_MS = Math.max(30_000, Number(process.env.I18N_REQUEST_TIMEOUT_MS) || 120_000);

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
// Written by the extractor: where each string appears and in what position.
// Optional — without it the model still gets the string, just no context.
const extracted = readCatalog(path.join(UI_ROOT, "i18n", "extracted.json"));

// The extractor's internal kinds say where a string sits in the AST. A model
// needs to know what it *is* on screen: a button reads differently from a
// tooltip, and a form error differently from a nav item.
const ROLE_BY_KIND = {
	"jsx-text": "body text",
	"jsx-template": "sentence with placeholders",
	"jsx-attribute:placeholder": "input placeholder",
	"jsx-attribute:title": "tooltip",
	"jsx-attribute:alt": "image alt text",
	"jsx-attribute:aria-label": "screen-reader label",
	"jsx-attribute:label": "form field label",
	"jsx-attribute:description": "help text under a field",
	toast: "toast notification",
	"toast:description": "toast detail line",
	"object:title": "heading or navigation item",
	"object:label": "label, often a dropdown option",
	"object:description": "description under a heading",
	"object:message": "form validation error",
	"object:placeholder": "input placeholder",
	"object:tooltip": "tooltip",
	"object:buttonText": "button",
};

const UNINFORMATIVE_AREAS = new Set([
	"ui",
	"views",
	"components",
	"fragments",
	"sheets",
	"dialogs",
	"forms",
	"lib",
	"utils",
	"types",
	"hooks",
	"store",
]);

/**
 * "app/workspace/virtual-keys/views/sheet.tsx:217" -> "virtual-keys"
 *
 * The feature area is the part worth spending tokens on: it is what
 * disambiguates a bare "Key" between API keys and virtual keys. The file and
 * line would only add noise the model cannot act on.
 */
function areaOf(sources) {
	for (const source of sources ?? []) {
		const match = /^app\/workspace\/([^/]+)\//.exec(source) ?? /^(?:app|components|lib|hooks)\/([^/]+)\//.exec(source);
		// Structural directories say nothing about meaning; keep looking for a
		// feature name, and send no hint rather than a misleading one.
		if (match && !UNINFORMATIVE_AREAS.has(match[1])) return match[1];
	}
	return null;
}

/** The payload entry for one string: the text, plus whatever context is known. */
function describe(key) {
	const meta = extracted[key];
	if (!meta) return { t: key };

	const role = (meta.kinds ?? []).map((kind) => ROLE_BY_KIND[kind]).find(Boolean);
	const area = areaOf(meta.sources);
	const entry = { t: key };
	if (role) entry.as = role;
	if (area) entry.in = area;
	return entry;
}

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

Input is a JSON object keyed by id. Each value carries the string to translate and, when known, context:
  "t"  — the text to translate. This is the ONLY field you translate.
  "as" — what it is on screen (a button, a tooltip, a form validation error, a nav item). Let it set the register and the length you aim for.
  "in" — the feature area of the console it belongs to. Use it to disambiguate: "Key" under virtual-keys is a virtual key, under providers it is an API key.
Context fields are hints, never content. Never translate them and never echo them back.

Reply with ONLY a JSON object mapping every input id to its translated string — a plain string per id, not an object. No prose, no markdown fence, no extra keys, no missing keys.`;

/**
 * One completion request, start to finish, under a single timeout.
 *
 * Returns the parsed envelope. Throws with `retryable` set when the caller
 * should back off and try again; anything without that flag (a transport error,
 * a timeout, a malformed envelope) is retryable by default.
 */
async function requestCompletion(payload, size) {
	const response = await fetch(`${baseUrl}/chat/completions`, {
		method: "POST",
		// Node's fetch waits forever on a server that accepts the connection and
		// then says nothing. Inside the worker pool one such request pins the whole
		// step until the CI job timeout, long after the other workers have drained
		// the queue — indistinguishable, from the outside, from work still running.
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
			// Without an explicit budget the provider applies its own default, and a
			// 40-string batch can run past it: the reply comes back cut in half with
			// finish_reason "length". Scaled to the batch rather than fixed, so a
			// one-key retry does not ask for a budget it cannot use.
			max_tokens: Math.min(16000, Math.max(2000, size * 250)),
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				// Compact, not pretty-printed: each entry is an object now, and the
				// indentation was costing more tokens than the context it wrapped.
				{ role: "user", content: JSON.stringify(payload) },
			],
		}),
	});

	const raw = await response.text();

	if (!response.ok) {
		const err = new Error(`HTTP ${response.status}: ${raw.slice(0, 200)}`);
		// A 4xx that is not 429 is our own payload's fault; repeating it repeats it.
		err.retryable = response.status === 429 || response.status >= 500;
		throw err;
	}

	return JSON.parse(raw);
}

function describeRequestError(err) {
	// Node has reported this both as a named TimeoutError and as a plain abort,
	// so match on either rather than trusting the name.
	if (err.name === "TimeoutError" || /aborted due to timeout/i.test(err.message ?? "")) {
		return `no reply in ${REQUEST_TIMEOUT_MS / 1000}s`;
	}
	return err.message;
}

async function translateBatch(keys, attempt = 1) {
	const payload = Object.fromEntries(keys.map((key, i) => [String(i), describe(key)]));

	let data;
	try {
		data = await requestCompletion(payload, keys.length);
	} catch (err) {
		// Timeout, transport failure, a retryable status, or a reply that was not
		// JSON at all.
		//
		// This has to wrap the body read as well as the fetch: AbortSignal.timeout
		// cancels the whole exchange, so a stall after the response headers arrive
		// throws from response.text(). Guarding only the fetch call is what let six
		// timeouts skip retrying entirely and drop 240 strings on the first run.
		const what = describeRequestError(err);
		if (err.retryable !== false && attempt < MAX_ATTEMPTS) {
			const wait = 2 ** attempt * 1000;
			console.log(`  ${what}, retrying in ${wait / 1000}s`);
			await new Promise((r) => setTimeout(r, wait));
			return translateBatch(keys, attempt + 1);
		}
		throw new Error(`${what} after ${attempt} attempt(s)`);
	}

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
		// Normalise before validating: typography is decided in code, so the
		// model's wobble on it never reaches the catalog and never shows up as a
		// diff on a later run.
		const raw = parsed[String(i)];
		const value = typeof raw === "string" ? normalizeTranslation(raw, locale) : raw;
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