// Vite plugin that runs the auto-i18n Babel pass over UI source.
//
// Why a standalone plugin rather than `react({ babel: { plugins: [...] } })`:
// @vitejs/plugin-react 6 on Vite 8 is the Oxc implementation. Its `vite:react-babel`
// plugin no longer runs Babel at all — it only configures Vite's built-in Oxc JSX
// transform — so a `babel` option there is silently ignored and nothing gets wrapped.
//
// This plugin therefore does its own Babel pass with `enforce: "pre"`, emitting
// TSX again (no presets) so Vite's Oxc transform still handles JSX and TypeScript
// exactly as it does upstream.

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const babel = require("@babel/core");
const i18nBabelPlugin = require("./babel-plugin.cjs");
const { hasFileOptOut, shouldSkipFile } = require("./rules.cjs");

const SOURCE_RE = /\.[jt]sx?$/;
const TOAST_RE = /\btoast\s*[.(]/;
const PARSER_PLUGINS = ["typescript", "jsx", "decorators-legacy", "explicitResourceManagement"];

/**
 * @param {{ runtimeModule?: string }} [options]
 */
export function autoI18n(options = {}) {
	return {
		name: "bifrost-auto-i18n",
		enforce: "pre",

		transform(code, id) {
			const file = id.split("?")[0];
			if (!SOURCE_RE.test(file) || shouldSkipFile(file)) return null;
			if (hasFileOptOut(code)) return null;
			// JSX only lives in .tsx/.jsx; a .ts file is only interesting if it
			// raises a toast. Skipping the rest keeps the Babel pass off ~70% of
			// the module graph.
			if (!/\.[jt]sx$/.test(file) && !TOAST_RE.test(code)) return null;

			let result;
			try {
				result = babel.transformSync(code, {
					filename: file,
					parserOpts: { plugins: PARSER_PLUGINS },
					plugins: [[i18nBabelPlugin, options]],
					configFile: false,
					babelrc: false,
					sourceMaps: true,
					compact: false,
				});
			} catch (err) {
				// Never fail an upstream build over translation: report and pass the
				// module through untouched.
				this.warn(`auto-i18n skipped ${file}: ${err && err.message}`);
				return null;
			}

			if (!result || result.code == null) return null;
			return { code: result.code, map: result.map };
		},
	};
}

export default autoI18n;