# Auto-i18n tooling

Build-time translation for the Bifrost UI. No file under `app/`, `components/`,
`lib/` or `hooks/` is edited — see `../../../FORK_OWNED.md` for why.

## Layout

| File               | Role                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `rules.cjs`        | What counts as user-facing copy: attribute/element/call lists, the reject rules, JSX whitespace semantics |
| `core.cjs`         | The one AST visitor, run in `transform` or `extract` mode                                                 |
| `babel-plugin.cjs` | Babel plugin wrapper; injects the `__t` / `__tx` import                                                   |
| `vite-plugin.mjs`  | Vite plugin that runs the Babel pass before Oxc                                                           |
| `scan.mjs`         | Shared source walk for the CLI tools                                                                      |
| `extract.mjs`      | Writes `i18n/catalogs/en.json` and the reports                                                            |
| `check.mjs`        | CI check: catalog freshness + per-locale coverage                                                         |
| `*.test.mjs`       | Invariants — run with `npx vitest run tools/i18n`                                                         |

`core.cjs` running in both modes is load-bearing: the extractor and the bundle
must derive identical keys, or translations silently miss.

## Commands

```bash
npm run i18n:extract   # refresh catalogs + reports, print the diff
npm run i18n:diff      # diff only, writes nothing
npm run i18n:check     # coverage; add -- --strict to fail on a stale en.json
```

## What gets wrapped

- JSX text: `<Button>Save Changes</Button>`
- Whitelisted attributes only (`placeholder`, `title`, `label`, `description`,
  `alt`, `aria-label`, …). Identity-bearing attributes — `name`, `id`, `key`,
  `value`, `href`, `to`, `className` — are never touched.
- `toast.*("…")` plus `description` / `actionLabel` / `cancelLabel` in the
  options bag.
- Interpolated copy, folded into one key: `<p>Deleted {n} keys</p>` becomes
  `__tx("Deleted {0} keys", [n])` so a translator can reorder the placeholder.

Dynamic attribute values (`placeholder={cond ? a : b}`) are left alone; they
render in English and are listed in `i18n/rejected.json`.

## Two invariants worth knowing before you edit `core.cjs`

1. **A lone text child must stay a single string child.** Several components
   branch on `typeof children === "string"` (`components/ui/truncatedLabel.tsx`,
   `app/workspace/complexity-router/views/formPrimitives.tsx`,
   `app/workspace/skills-repo/components/shared.tsx`). Emitting `{" "}` siblings
   around a wrapped string would turn those children into an array and change
   behaviour even in English. Preserved whitespace is re-attached by string
   concatenation instead.

2. **Interpolated arguments may be React nodes.** `<p>Status {ok && <Badge/>}</p>`
   must not run through `String()`. `__tx` returns a Fragment whenever an
   argument is not a primitive, and a plain string otherwise.

Both are covered in `transform.test.mjs` / `runtime.test.mjs`.

## Adding a locale

1. `echo '{}' > ui/i18n/catalogs/<code>.json`
2. Add `{ code: "<code>", label: "…" }` to `SUPPORTED_LOCALES` and the
   `CATALOGS` map in `ui/i18n/runtime.ts`.
3. `npm run i18n:extract` aligns the new file with the source key set.

Catalogs are bundled statically and resolved before React mounts, so the first
paint is already translated. Locale switching reloads the page on purpose: it
keeps `__t` a plain synchronous function with no React context, which is what
lets the transform stay ignorant of components and hooks.