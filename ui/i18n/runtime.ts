// Translation runtime for the Bifrost UI fork.
//
// Every call site of `__t` is generated at build time by
// tools/i18n/babel-plugin.cjs — nothing in app/ or components/ imports this
// module by hand. The key IS the English source string, so a key that is
// missing from a catalog degrades to the upstream English text instead of
// rendering a bare identifier. That property is what lets the fork track a
// fast-moving upstream: new copy simply shows up untranslated.

import { Fragment, createElement, type ReactNode } from "react";

import zhCN from "./catalogs/zh-CN.json";

export const LOCALE_STORAGE_KEY = "bifrost.locale";

export const SOURCE_LOCALE = "en";

export const SUPPORTED_LOCALES = [
	{ code: "en", label: "English" },
	{ code: "zh-CN", label: "简体中文" },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"];

type Catalog = Record<string, string>;

// Catalogs are bundled statically and resolved before React mounts, so the
// first paint is already translated. The source locale needs no catalog.
const CATALOGS: Record<string, Catalog> = {
	"zh-CN": zhCN as Catalog,
};

function isSupported(code: string): code is LocaleCode {
	return SUPPORTED_LOCALES.some((l) => l.code === code);
}

function readStoredLocale(): LocaleCode {
	// An explicit choice always wins and is never second-guessed.
	try {
		const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
		if (stored && isSupported(stored)) return stored;
	} catch {
		// Private mode / blocked storage — fall through to detection.
	}

	// No choice made yet: follow the browser. Someone running the localised
	// build in a Chinese browser should not have to discover a menu to see
	// Chinese, and an English browser still gets upstream's own wording.
	try {
		const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
		for (const tag of tags) {
			if (!tag) continue;
			const exact = SUPPORTED_LOCALES.find((l) => l.code.toLowerCase() === tag.toLowerCase());
			if (exact) return exact.code;
			// zh-TW / zh-HK land on zh-CN until a closer catalog exists — imperfect
			// Chinese beats English for a reader who asked for Chinese.
			const primary = tag.split("-")[0].toLowerCase();
			const byPrimary = SUPPORTED_LOCALES.find((l) => l.code.split("-")[0].toLowerCase() === primary);
			if (byPrimary) return byPrimary.code;
		}
	} catch {
		// No navigator (SSR, tests) — fall through.
	}

	return SOURCE_LOCALE;
}

let currentLocale: LocaleCode = readStoredLocale();
let catalog: Catalog = CATALOGS[currentLocale] ?? {};

export function getLocale(): LocaleCode {
	return currentLocale;
}

/**
 * Switching locale reloads the page.
 *
 * This is deliberate. A reload means `__t` can stay a plain synchronous
 * function with no React context, so the Babel plugin never has to reason about
 * hooks, component boundaries or re-render scope — which in turn means it never
 * has to touch an upstream component.
 */
export function setLocale(code: LocaleCode): void {
	if (!isSupported(code)) return;

	// Persist even when the code matches what detection already chose: picking a
	// language is how you pin it, and without this the UI would flip the next
	// time the browser's language changed.
	let persisted = false;
	try {
		localStorage.setItem(LOCALE_STORAGE_KEY, code);
		persisted = true;
	} catch {
		// Blocked storage — switch for this page only.
	}

	if (code === currentLocale) return;
	if (!persisted) {
		currentLocale = code;
		catalog = CATALOGS[code] ?? {};
		return;
	}
	location.reload();
}

// Dev-only aid for the translation workflow: `window.__bifrostMissingI18n()`
// lists the strings this session rendered without a translation.
const missing = new Set<string>();

/**
 * Translate a source string.
 *
 * @param source The English text exactly as it appears upstream.
 * @param args   Values for `{0}`, `{1}`, ... placeholders, in order.
 */
export function __t(source: string, args?: unknown[]): string {
	const out = translate(source);
	return args && args.length ? interpolate(out, args) : out;
}

function translate(source: string): string {
	if (currentLocale === SOURCE_LOCALE) return source;
	const translated = catalog[source];
	if (translated === undefined) {
		if (import.meta.env.DEV) missing.add(source);
		return source;
	}
	return translated;
}

/**
 * JSX-only variant of `__t`, emitted for interpolated copy such as
 * `<p>Deleted {n} keys</p>`.
 *
 * When every argument is a primitive this returns a plain string, so children
 * that used to be a string stay a string. When an argument is a React node —
 * `<p>Status {ok && <Badge />}</p>` — the parts are returned inside a Fragment
 * rather than run through `String()`, which would render "[object Object]".
 */
export function __tx(source: string, args: unknown[]): ReactNode {
	const template = translate(source);
	if (args.every(isStringifiable)) return interpolate(template, args);

	const parts: ReactNode[] = [];
	let cursor = 0;
	const pattern = /\{(\d+)\}/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(template)) !== null) {
		if (match.index > cursor) parts.push(template.slice(cursor, match.index));
		const value = args[Number(match[1])];
		parts.push(value === undefined ? match[0] : (value as ReactNode));
		cursor = match.index + match[0].length;
	}
	if (cursor < template.length) parts.push(template.slice(cursor));
	// Spreading as positional children (rather than passing an array) keeps React
	// from demanding keys for the element parts.
	return createElement(Fragment, null, ...parts);
}

function isStringifiable(value: unknown): boolean {
	return value === null || value === undefined || ["string", "number", "bigint", "boolean"].includes(typeof value);
}

function interpolate(template: string, args: unknown[]): string {
	return template.replace(/\{(\d+)\}/g, (match, index) => {
		const value = args[Number(index)];
		return value === undefined || value === null ? match : String(value);
	});
}

if (import.meta.env.DEV && typeof window !== "undefined") {
	(window as unknown as Record<string, unknown>).__bifrostMissingI18n = () => [...missing].sort();
}