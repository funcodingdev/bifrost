// Canaries for the themeToggle module override, which is how the locale
// switcher reaches the topbar without editing upstream's topbar.tsx.
//
// The override is invisible to `tsc` — TypeScript resolves the alias to the
// original module — so nothing else would notice if upstream moved ThemeToggle
// or grew a new export. These assertions fail loudly during a sync instead of
// the switcher quietly vanishing from the UI.
//
//   npx vitest run tools/i18n

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const UI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => fs.readFileSync(path.join(UI_ROOT, p), "utf8");

const UPSTREAM = "components/themeToggle.tsx";
const OVERRIDE = "i18n/overrides/themeToggle.tsx";

describe("themeToggle override", () => {
	it("re-exports every export upstream declares", () => {
		const upstreamExports = [...read(UPSTREAM).matchAll(/^export\s+(?:function|const|class)\s+(\w+)/gm)].map((m) => m[1]);
		expect(upstreamExports.length).toBeGreaterThan(0);

		const override = read(OVERRIDE);
		for (const name of upstreamExports) {
			expect(override, `override is missing upstream export "${name}"`).toContain(name);
		}
	});

	it("reaches the original through a relative path, not the alias", () => {
		const override = read(OVERRIDE);
		expect(override).toContain('from "../../components/themeToggle"');
		// Importing the aliased specifier here would resolve back to this file.
		expect(override).not.toContain('from "@/components/themeToggle"');
	});

	it("renders the locale switcher alongside upstream's toggle", () => {
		const override = read(OVERRIDE);
		expect(override).toContain("<LocaleToggle />");
		expect(override).toContain("<UpstreamThemeToggle />");
	});
});

describe("mount point", () => {
	// If upstream stops importing ThemeToggle through the aliased specifier, the
	// override still builds — it just never renders. This is the assertion that
	// notices.
	it("topbar still imports ThemeToggle from the aliased specifier", () => {
		const topbar = read("components/topbar.tsx");
		expect(topbar).toMatch(/import\s*\{[^}]*\bThemeToggle\b[^}]*\}\s*from\s*"@\/components\/themeToggle"/);
		expect(topbar).toContain("<ThemeToggle />");
	});

	it("vite.config.mts aliases the specifier before the generic @ prefix", () => {
		const config = read("vite.config.mts");
		const specific = config.indexOf('"@/components/themeToggle"');
		const generic = config.indexOf('"@": path.resolve(__dirname)');
		expect(specific).toBeGreaterThan(-1);
		expect(generic).toBeGreaterThan(-1);
		// Alias keys match by prefix and the first hit wins, so "@" placed first
		// would swallow the override entirely.
		expect(specific).toBeLessThan(generic);
	});
});