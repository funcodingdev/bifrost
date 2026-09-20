"use strict";

// Build-time auto-i18n for the Bifrost UI.
//
// This plugin is the reason the fork can keep rebasing onto upstream: no source
// file under app/ or components/ is ever edited to add i18n. The English copy
// stays exactly where upstream put it, and translation happens on the AST on the
// way into the bundle.
//
// Wiring lives in vite.config.mts. `BIFROST_I18N=0` disables it entirely, in
// which case the build output is identical to upstream's.

const { createI18nVisitor } = require("./core.cjs");
const { hasFileOptOut, shouldSkipFile } = require("./rules.cjs");

const DEFAULT_RUNTIME_MODULE = "@/i18n/runtime";

module.exports = function bifrostAutoI18n(babel, options = {}) {
	const t = babel.types;
	const runtimeModule = options.runtimeModule || DEFAULT_RUNTIME_MODULE;
	// Optional sink so a build can dump what it wrapped without a second parse.
	const onFile = typeof options.onFile === "function" ? options.onFile : null;

	return {
		name: "bifrost-auto-i18n",

		visitor: {
			Program: {
				enter(programPath, state) {
					const filename = state.filename || (state.file && state.file.opts && state.file.opts.filename) || "";
					if (shouldSkipFile(filename)) return;

					const code = (state.file && state.file.code) || "";
					if (hasFileOptOut(code)) return;

					const ctx = {
						filename,
						// Generated uids keep the helpers from colliding with anything
						// upstream happens to declare in this module.
						helperName: programPath.scope.generateUid("bfT"),
						nodeHelperName: programPath.scope.generateUid("bfTx"),
						used: false,
						usedText: false,
						usedNode: false,
						records: [],
						rejects: [],
					};
					state.__bifrostI18n = ctx;
					programPath.traverse(createI18nVisitor({ t, transform: true, ctx }));
				},

				exit(programPath, state) {
					const ctx = state.__bifrostI18n;
					if (!ctx) return;
					if (onFile) onFile(ctx);
					if (!ctx.used) return; // nothing wrapped: leave the module's imports alone

					const specifiers = [];
					if (ctx.usedText) specifiers.push(t.importSpecifier(t.identifier(ctx.helperName), t.identifier("__t")));
					if (ctx.usedNode) specifiers.push(t.importSpecifier(t.identifier(ctx.nodeHelperName), t.identifier("__tx")));
					programPath.unshiftContainer("body", t.importDeclaration(specifiers, t.stringLiteral(runtimeModule)));
				},
			},
		},
	};
};