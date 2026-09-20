"use strict";

// The shared AST walk used by BOTH the build-time plugin and the extractor.
//
// `transform: true`  -> rewrites the AST, wrapping copy in `__t(...)`
// `transform: false` -> records what it finds and touches nothing
//
// Running one visitor in two modes is the whole point: the catalog key the
// extractor writes is produced by the same code path that produces the key the
// bundle looks up.

const {
	ATTR_WHITELIST,
	OBJECT_KEY_WHITELIST,
	SKIP_ELEMENTS,
	TOAST_METHODS,
	TOAST_OBJECTS,
	TOAST_OPTION_KEYS,
	cleanJSXText,
	hasNodeOptOut,
	isTranslatable,
	rejectReason,
} = require("./rules.cjs");

// A sentence with more interpolations than this is almost certainly a layout
// container rather than copy; wrapping it produces an unusable catalog key.
const MAX_TEMPLATE_ARGS = 6;

function elementBaseName(nameNode) {
	if (!nameNode) return "";
	switch (nameNode.type) {
		case "JSXIdentifier":
			return nameNode.name;
		case "JSXMemberExpression":
			return elementBaseName(nameNode.property);
		case "JSXNamespacedName":
			return nameNode.name ? nameNode.name.name : "";
		default:
			return "";
	}
}

/**
 * @param {object} opts
 * @param {import("@babel/types")} opts.t
 * @param {boolean} opts.transform
 * @param {object} opts.ctx  mutable per-file state: { filename, helperName, used, records, rejects }
 */
function createI18nVisitor({ t, transform, ctx }) {
	const processedElements = new WeakSet();
	// Text nodes folded into a template key, so the JSXText visitor does not
	// record them a second time as standalone fragments during extraction.
	const consumedTextNodes = new WeakSet();
	// Literals already claimed by a more specific rule (a toast's options bag),
	// so the generic object-property rule does not record them twice.
	const claimedLiterals = new WeakSet();

	const lineOf = (node) => (node && node.loc ? node.loc.start.line : 0);

	function record(key, kind, node) {
		ctx.records.push({ key, kind, file: ctx.filename, line: lineOf(node) });
	}

	function reject(text, kind, node) {
		const reason = rejectReason(text);
		if (!reason) return;
		ctx.rejects.push({ text: String(text).trim(), kind, reason, file: ctx.filename, line: lineOf(node) });
	}

	// __t("key")  — always returns a string (attributes, toasts, plain JSX text)
	// __tx("key {0}", [expr]) — JSX-only; returns a Fragment when an argument is
	// a React node, so `<p>Status {cond && <Badge/>}</p>` does not stringify to
	// "[object Object]".
	function callHelper(key, argExprs) {
		ctx.used = true;
		if (argExprs && argExprs.length) {
			ctx.usedNode = true;
			return t.callExpression(t.identifier(ctx.nodeHelperName), [t.stringLiteral(key), t.arrayExpression(argExprs)]);
		}
		ctx.usedText = true;
		return t.callExpression(t.identifier(ctx.helperName), [t.stringLiteral(key)]);
	}

	/**
	 * Replacement for a plain JSXText node.
	 *
	 * Must collapse to exactly ONE child that is still a string: several
	 * components in this codebase branch on `typeof children === "string"`
	 * (components/ui/truncatedLabel.tsx, app/.../formPrimitives.tsx). Emitting
	 * `{" "}` siblings here would turn those children into an array and silently
	 * change behaviour even in English.
	 *
	 * JSX drops whitespace adjacent to a newline but keeps a plain inline space,
	 * so significant spacing is re-attached by concatenation.
	 */
	function textReplacement(clean, key) {
		let expr = callHelper(key, null);
		if (clean.startsWith(" ")) expr = t.binaryExpression("+", t.stringLiteral(" "), expr);
		if (clean.endsWith(" ") && clean.trim() !== "") expr = t.binaryExpression("+", expr, t.stringLiteral(" "));
		return t.jsxExpressionContainer(expr);
	}

	/**
	 * Replacement for a whole element's children in the template case. Here the
	 * children were already an array (text + expression), so `{" "}` siblings are
	 * safe — and necessary, because `__tx` may return a Fragment that cannot be
	 * string-concatenated.
	 */
	function templateReplacement(full, key, argExprs) {
		const nodes = [];
		if (full.startsWith(" ")) nodes.push(t.jsxExpressionContainer(t.stringLiteral(" ")));
		nodes.push(t.jsxExpressionContainer(callHelper(key, argExprs)));
		if (full.endsWith(" ")) nodes.push(t.jsxExpressionContainer(t.stringLiteral(" ")));
		return nodes;
	}

	/**
	 * `<FormLabel>Base URL {required ? "(Required)" : "(Optional)"}</FormLabel>`
	 * becomes one key `"Base URL {0}"` instead of the fragment `"Base URL"`,
	 * so a translator can move the placeholder where the target language wants it.
	 *
	 * Only applies when the children are purely text + expressions. A nested
	 * element means the copy is rich text, which falls back to per-node wrapping.
	 */
	function tryTemplate(path) {
		const children = path.node.children || [];
		const exprs = [];
		let full = "";
		let sawText = false;
		let sawPlaceholder = false;

		for (const child of children) {
			if (child.type === "JSXText") {
				const clean = cleanJSXText(child.value);
				if (clean.trim()) sawText = true;
				full += clean;
				continue;
			}
			if (child.type !== "JSXExpressionContainer") return false; // nested element / spread
			const expr = child.expression;
			if (expr.type === "JSXEmptyExpression") return false; // `{/* comment */}`
			// `{" "}` and `{"(Required)"}` are literals, not interpolations.
			if (expr.type === "StringLiteral") {
				full += expr.value;
				if (expr.value.trim()) sawText = true;
				continue;
			}
			if (exprs.length >= MAX_TEMPLATE_ARGS) return false;
			full += `{${exprs.length}}`;
			exprs.push(expr);
			sawPlaceholder = true;
		}

		if (!sawText || !sawPlaceholder) return false;

		const core = full.trim();
		// Validate the prose, not the assembled template: `{0}` is our own
		// placeholder syntax, which the literal rules reject on purpose.
		const prose = core.replace(/\{\d+\}/g, " ").trim();
		if (!isTranslatable(prose)) {
			reject(prose, "jsx-template", path.node);
			return false;
		}

		record(core, "jsx-template", path.node);
		for (const child of children) {
			if (child.type === "JSXText") consumedTextNodes.add(child);
		}
		if (!transform) return true;

		const replacement = templateReplacement(full, core, exprs);
		const childPaths = path.get("children");
		for (let i = childPaths.length - 1; i >= 1; i--) childPaths[i].remove();
		childPaths[0].replaceWithMultiple(replacement);
		return true;
	}

	function isToastCall(callee) {
		if (callee.type === "Identifier") return TOAST_OBJECTS.has(callee.name);
		if (callee.type !== "MemberExpression" || callee.computed) return false;
		const { object, property } = callee;
		return (
			object.type === "Identifier" && TOAST_OBJECTS.has(object.name) && property.type === "Identifier" && TOAST_METHODS.has(property.name)
		);
	}

	return {
		JSXElement: {
			enter(path) {
				if (SKIP_ELEMENTS.has(elementBaseName(path.node.openingElement.name)) || hasNodeOptOut(path.node)) {
					path.skip();
					return;
				}
				if (processedElements.has(path.node)) return;
				processedElements.add(path.node);
				tryTemplate(path);
			},
		},

		JSXFragment: {
			enter(path) {
				if (processedElements.has(path.node)) return;
				processedElements.add(path.node);
				tryTemplate(path);
			},
		},

		JSXText(path) {
			if (consumedTextNodes.has(path.node)) return;
			const clean = cleanJSXText(path.node.value);
			const core = clean.trim();
			if (!core) return;
			if (!isTranslatable(core)) {
				reject(core, "jsx-text", path.node);
				return;
			}
			record(core, "jsx-text", path.node);
			if (!transform) return;
			path.replaceWith(textReplacement(clean, core));
		},

		JSXAttribute(path) {
			const nameNode = path.node.name;
			const name = nameNode.type === "JSXIdentifier" ? nameNode.name : "";
			if (!ATTR_WHITELIST.has(name) || hasNodeOptOut(path.node)) return;

			const value = path.node.value;
			let literal = null;
			let isContainer = false;
			if (value && value.type === "StringLiteral") {
				literal = value;
			} else if (value && value.type === "JSXExpressionContainer" && value.expression.type === "StringLiteral") {
				literal = value.expression;
				isContainer = true;
			}
			if (!literal) return; // dynamic value: left in English, reported by the extractor

			const core = literal.value.trim();
			if (!isTranslatable(core)) {
				reject(core, "jsx-attribute", literal);
				return;
			}
			record(core, `jsx-attribute:${name}`, literal);
			if (!transform) return;

			const call = callHelper(core, null);
			if (isContainer) {
				path.get("value.expression").replaceWith(call);
			} else {
				path.get("value").replaceWith(t.jsxExpressionContainer(call));
			}
		},

		/**
		 * Copy declared as object properties: config arrays, zod schemas, the nav
		 * definition, the onboarding checklist. A large share of this codebase's
		 * user-facing text lives here rather than in JSX, and none of it is
		 * reachable from the JSX rules above.
		 */
		ObjectProperty(path) {
			if (hasNodeOptOut(path.node) || path.node.computed) return;

			const keyNode = path.node.key;
			const key = keyNode.type === "Identifier" ? keyNode.name : keyNode.type === "StringLiteral" ? keyNode.value : "";
			if (!OBJECT_KEY_WHITELIST.has(key)) return;

			const value = path.node.value;
			// Only literals. A computed or templated value is either dynamic or
			// already translated somewhere upstream of here.
			if (value.type !== "StringLiteral" || claimedLiterals.has(value)) return;

			const core = value.value.trim();
			if (!isTranslatable(core)) {
				reject(core, `object:${key}`, value);
				return;
			}
			record(core, `object:${key}`, value);
			claimedLiterals.add(value);
			if (!transform) return;
			path.get("value").replaceWith(callHelper(core, null));
		},

		CallExpression(path) {
			if (!isToastCall(path.node.callee) || hasNodeOptOut(path.node)) return;
			const args = path.node.arguments;
			if (!args.length) return;

			if (args[0].type === "StringLiteral") {
				const core = args[0].value.trim();
				if (isTranslatable(core)) {
					record(core, "toast", args[0]);
					if (transform) path.get("arguments.0").replaceWith(callHelper(core, null));
				} else {
					reject(core, "toast", args[0]);
				}
			}

			// sonner's options bag: `toast.error("Failed", { description: "..." })`
			const options = args[1];
			if (!options || options.type !== "ObjectExpression") return;
			options.properties.forEach((prop, index) => {
				if (prop.type !== "ObjectProperty" || prop.computed) return;
				const key = prop.key.type === "Identifier" ? prop.key.name : prop.key.type === "StringLiteral" ? prop.key.value : "";
				if (!TOAST_OPTION_KEYS.has(key) || prop.value.type !== "StringLiteral") return;
				const core = prop.value.value.trim();
				if (!isTranslatable(core)) {
					reject(core, `toast:${key}`, prop.value);
					return;
				}
				record(core, `toast:${key}`, prop.value);
				claimedLiterals.add(prop.value);
				if (transform) path.get(`arguments.1.properties.${index}.value`).replaceWith(callHelper(core, null));
			});
		},
	};
}

module.exports = { createI18nVisitor, elementBaseName };