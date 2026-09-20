// Fork override for `@/components/themeToggle`. See FORK_OWNED.md.
//
// The language switcher has to appear in the topbar, and the topbar is upstream's
// highest-churn UI file — 14 commits in 90 days. Editing it would put a conflict
// on the critical path of nearly every sync, for one line of JSX.
//
// Instead vite.config.mts aliases the specifier `@/components/themeToggle` to this
// file, so `components/topbar.tsx` keeps its original import and renders the pair.
// The import below is relative on purpose: alias matching works on the specifier,
// so a relative path reaches the real module instead of looping back here.
//
// Everything upstream exports must be re-exported. If upstream adds an export,
// the vite build fails loudly on the first sync that pulls it in, and
// tools/i18n/override.test.mjs catches it before that.

import { ThemeToggle as UpstreamThemeToggle } from "../../components/themeToggle";
import { LocaleToggle } from "../components/localeToggle";

export { ThemeToggleItems } from "../../components/themeToggle";

export function ThemeToggle() {
	// A fragment, not a wrapper element: the topbar is `flex … gap-2`, so two
	// siblings inherit the spacing that a wrapper div would swallow.
	return (
		<>
			<LocaleToggle />
			<UpstreamThemeToggle />
		</>
	);
}