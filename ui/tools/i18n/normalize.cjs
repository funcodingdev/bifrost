"use strict";

// Typographic clean-up applied to a translation before it is accepted.
//
// These are the conventions a model gets right most of the time and wrong the
// rest of the time, at random. Asking it more firmly in the prompt does not fix
// that — it is a sampling problem, not a comprehension one. Doing it in code
// makes the result the same on every run and on every model.
//
// The bar for a rule here is that it must be mechanically decidable from the
// text. Anything needing judgement about meaning belongs in the prompt or the
// glossary, not here.

const CJK = /[一-鿿]/;

/**
 * Chinese typography sets parentheses full-width, and it is the surrounding
 * text that decides, not what sits inside them: 云元数据地址（169.254.x.x）is
 * correct even though the content is ASCII.
 *
 * The catalog was split 196 full-width to 21 half-width — the same convention
 * applied inconsistently, which is exactly what this is for.
 *
 * A '(' directly after an identifier character is left alone: that shape is a
 * function call or an env reference inside otherwise Chinese copy, and widening
 * it would corrupt something the reader is meant to type.
 */
function fullWidthParens(text) {
	if (!CJK.test(text)) return text;
	let out = "";
	const depth = [];
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === "(") {
			const prev = text[i - 1];
			const isCall = prev !== undefined && /[A-Za-z0-9_$.]/.test(prev);
			depth.push(isCall);
			out += isCall ? "(" : "（";
			continue;
		}
		if (ch === ")") {
			// Close in the same form the matching open used, so a call's parens
			// stay a pair even when Chinese copy surrounds them.
			const isCall = depth.pop();
			out += isCall === false ? "）" : ")";
			continue;
		}
		out += ch;
	}
	return out;
}

const RULES = {
	"zh-CN": [fullWidthParens],
};

/**
 * Normalise one translation. Unknown locales pass through untouched: a rule that
 * is right for Chinese is not automatically right for anything else.
 *
 * @param {string} translated
 * @param {string} locale
 */
function normalizeTranslation(translated, locale) {
	const rules = RULES[locale];
	if (!rules) return translated;
	return rules.reduce((text, rule) => rule(text), translated);
}

module.exports = { fullWidthParens, normalizeTranslation };