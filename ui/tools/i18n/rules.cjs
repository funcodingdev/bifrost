"use strict";

// Single source of truth for "what counts as a user-facing string".
//
// Both the build-time Babel plugin (babel-plugin.cjs) and the standalone
// extractor (extract.mjs) consume this module through core.cjs, so the keys
// written into the catalog are byte-identical to the keys looked up at runtime.
// Any divergence between the two would silently produce untranslatable strings,
// which is the classic failure mode of auto-i18n setups.

// Subtrees whose text is code / markup / user content, never UI copy.
const SKIP_ELEMENTS = new Set([
	"CodeEditor",
	"CodeBlock",
	"EditorCacheConfig",
	"EditorTab",
	"MonacoEditor",
	"MonacoEditorLazy",
	"Markdown",
	"Streamdown",
	"SyntaxHighlighter",
	"pre",
	"code",
	"script",
	"style",
]);

// Attributes rendered to the user. Deliberately conservative: anything that can
// double as an identifier (name, id, key, value, type, href, to, className) is
// excluded, because mistranslating one of those breaks behaviour rather than
// just copy.
const ATTR_WHITELIST = new Set([
	"alt",
	"aria-description",
	"aria-label",
	"aria-placeholder",
	"cancelText",
	"confirmText",
	"description",
	"emptyMessage",
	"emptyText",
	"errorMessage",
	"heading",
	"helperText",
	"label",
	"loadingText",
	"placeholder",
	"subheading",
	"submitText",
	"successMessage",
	"title",
	"tooltip",
]);

// Copy held in object literals: config arrays, zod schemas, nav definitions.
// A large share of this codebase's UI text lives here rather than in JSX — the
// whole sidebar, page descriptions, the onboarding checklist, form validation.
//
// Same conservative principle as the attribute list: only keys that are
// display-only by convention. `name`, `id`, `type`, `value`, `route` and `key`
// are excluded because they carry identity, and a translated identifier breaks
// behaviour rather than just wording.
const OBJECT_KEY_WHITELIST = new Set([
	"actionLabel",
	"buttonText",
	"cancelLabel",
	"cancelText",
	"confirmText",
	"cta",
	"description",
	"emptyMessage",
	"emptyText",
	"errorMessage",
	"heading",
	"helperText",
	"label",
	"loadingText",
	// zod's validation messages are display-only. The one place a `message`
	// literal is compared rather than shown is a .test.ts fixture, which
	// SKIP_FILE_PATTERNS already excludes.
	"message",
	"placeholder",
	"subheading",
	"subtitle",
	"successMessage",
	"title",
	"tooltip",
]);

// `toast.success("Saved")` and friends. The first string argument is copy; a
// `description` property in the options object is too.
const TOAST_OBJECTS = new Set(["toast", "sonnerToast"]);
const TOAST_METHODS = new Set(["success", "error", "info", "warning", "warn", "loading", "message"]);
const TOAST_OPTION_KEYS = new Set(["description", "actionLabel", "cancelLabel"]);

// Files that must never be transformed: the runtime would self-import, generated
// files are rewritten by their generator on every build, and tests assert on the
// English source.
const SKIP_FILE_PATTERNS = [
	/[\\/]node_modules[\\/]/,
	/[\\/]ui[\\/]i18n[\\/]/,
	/[\\/]ui[\\/]tools[\\/]/,
	/[\\/]routeTree\.gen\.tsx?$/,
	/\.(test|spec)\.[jt]sx?$/,
	/\.d\.ts$/,
];

// Opt-out marker recognised anywhere in a file's leading comments.
const FILE_OPT_OUT = /@no-i18n\b/;
// Opt-out marker on a single node's leading comments.
const NODE_OPT_OUT = /i18n-ignore\b/;

// Cheap pre-filter for the Vite plugin: does this file plausibly contain copy at
// all? Derived from the whitelist above so the two cannot drift apart — and they
// must not, because a file the plugin skips but the extractor reads produces a
// catalog key that nothing ever looks up.
const OBJECT_COPY_HINT = new RegExp(`\\b(${[...OBJECT_KEY_WHITELIST].join("|")})\\s*:\\s*["'\`]`);

function shouldSkipFile(filename) {
	if (!filename) return true;
	const normalized = filename.split("\\").join("/");
	return SKIP_FILE_PATTERNS.some((re) => re.test(normalized));
}

function hasFileOptOut(code) {
	// Only inspect the head of the file so a stray mention deep in a comment
	// block does not disable the whole module.
	return FILE_OPT_OUT.test(code.slice(0, 500));
}

function hasNodeOptOut(node) {
	const comments = (node && node.leadingComments) || [];
	return comments.some((c) => NODE_OPT_OUT.test(c.value));
}

// Rejection reasons are reported by the extractor so the skip rules stay
// auditable instead of silently swallowing real copy.
// Copy that is also compared somewhere, so translating it changes behaviour
// rather than wording. Each entry needs a reason and a call site: this list is a
// last resort, not a dumping ground — tools/i18n/collision.test.mjs is what finds
// candidates for it.
const NEVER_TRANSLATE = new Map([
	[
		"An unexpected error occurred",
		// lib/store/apis/baseApi.ts returns this as an error message, and both
		// emptyState components branch on `error.includes("An unexpected error
		// occurred")`. Translate it and the branch is simply never taken.
		"matched with String.includes in logs/mcp-logs emptyState",
	],
]);

const REJECT = {
	TOO_SHORT: "too-short",
	NO_LETTERS: "no-letters",
	IDENTIFIER: "identifier-like",
	URL: "url-or-path",
	NUMERIC: "numeric",
	TEMPLATE: "template-placeholder",
	DENIED: "deny-listed",
};

const URL_LIKE = /^(https?:\/\/|\/\/|\.{0,2}\/|mailto:|tel:|data:)/i;
const NUMERIC_ONLY = /^[\d\s.,%+:\-/()]+$/;
// Lowercase tokens with no whitespace: `openai`, `api_key`, `gpt-4o`,
// `network_config.base_url`. These are provider/model/config identifiers that
// happen to sit in a text position.
const IDENTIFIER_LIKE = /^[a-z0-9_.:\-/]+$/;

/**
 * Decide whether a literal is user-facing copy.
 * Returns null when translatable, otherwise a REJECT reason.
 */
function rejectReason(raw) {
	const s = String(raw).trim();
	if (NEVER_TRANSLATE.has(s)) return REJECT.DENIED;
	if (s.length < 2) return REJECT.TOO_SHORT;
	if (!/[A-Za-z]/.test(s)) return REJECT.NO_LETTERS;
	if (URL_LIKE.test(s) || s.includes("://")) return REJECT.URL;
	if (NUMERIC_ONLY.test(s)) return REJECT.NUMERIC;
	// `{0}` is our own interpolation syntax; a source string containing it would
	// collide with the runtime's placeholder substitution.
	if (/\{\d+\}/.test(s)) return REJECT.TEMPLATE;
	if (!/\s/.test(s) && IDENTIFIER_LIKE.test(s)) return REJECT.IDENTIFIER;
	return null;
}

function isTranslatable(raw) {
	return rejectReason(raw) === null;
}

/**
 * The placeholder set of a string, sorted and deduplicated.
 *
 * A translation MUST carry exactly the same set as its source. This is the one
 * check that machine translation reliably fails: models drop `{0}`, renumber it,
 * or localise the digits. Used by both the translator and the CI catalog check.
 */
function placeholdersOf(text) {
	return [...new Set([...String(text).matchAll(/\{(\d+)\}/g)].map((m) => m[1]))].sort();
}

/**
 * Babel's cleanJSXElementLiteralChild, reimplemented so extraction and
 * transformation agree on exactly which characters JSX keeps. Reproducing this
 * (rather than trimming) is what makes `<span>Hello <b>x</b></span>` keep its
 * significant trailing space.
 */
function cleanJSXText(raw) {
	const lines = String(raw).split(/\r\n|\n|\r/);
	let lastNonEmptyLine = 0;
	for (let i = 0; i < lines.length; i++) {
		if (/[^ \t]/.test(lines[i])) lastNonEmptyLine = i;
	}
	let out = "";
	for (let i = 0; i < lines.length; i++) {
		const isFirst = i === 0;
		const isLast = i === lines.length - 1;
		let line = lines[i].replace(/\t/g, " ");
		if (!isFirst) line = line.replace(/^ +/, "");
		if (!isLast) line = line.replace(/ +$/, "");
		if (line) {
			if (i !== lastNonEmptyLine) line += " ";
			out += line;
		}
	}
	return out;
}

module.exports = {
	ATTR_WHITELIST,
	NEVER_TRANSLATE,
	OBJECT_COPY_HINT,
	OBJECT_KEY_WHITELIST,
	REJECT,
	SKIP_ELEMENTS,
	TOAST_METHODS,
	TOAST_OBJECTS,
	TOAST_OPTION_KEYS,
	cleanJSXText,
	hasFileOptOut,
	hasNodeOptOut,
	isTranslatable,
	placeholdersOf,
	rejectReason,
	shouldSkipFile,
};