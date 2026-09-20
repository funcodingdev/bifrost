# Fork-owned files

This fork adds multi-language support to Bifrost while continuing to track
upstream (`maximhq/bifrost`). Upstream moves fast — roughly 21 commits a day,
touching about 78% of `ui/`'s 837 source files per quarter — so the fork is
built around one rule:

> **Never edit an upstream file to add i18n.** Translation is injected at build
> time. New copy from upstream renders in English until someone translates it.

Everything below is the complete list of what this fork changes. Keep it that
way: each file added here is a merge conflict you will resolve forever.

## Modified upstream files (2)

| File | Change | Upstream commits / 90d |
| --- | --- | --- |
| `ui/vite.config.mts` | imports `autoI18n()` and puts it first in `plugins` | 1 |
| `ui/package.json` | adds the `i18n:extract` / `i18n:diff` / `i18n:check` scripts | 7 |

Both are additive and low-churn. A rebase conflict here is a one-line re-apply.

## Added files (never conflict)

```
ui/tools/i18n/          extraction + transform tooling, tests
ui/i18n/runtime.ts      __t / __tx and locale selection
ui/i18n/catalogs/       en.json (generated) + one JSON per locale
ui/i18n/extracted.json  key -> where it appears, for translator context
ui/i18n/rejected.json   literals the rules skipped, for auditing
FORK_OWNED.md           this file
```

## How it works

`ui/tools/i18n/vite-plugin.mjs` runs a Babel pass over `app/`, `components/`,
`lib/` and `hooks/` before Vite's Oxc transform, rewriting user-facing copy:

```jsx
<Button>Save Changes</Button>          ->  <Button>{__t("Save Changes")}</Button>
<Input placeholder="Search models" />  ->  <Input placeholder={__t("Search models")} />
toast.success("Provider saved")        ->  toast.success(__t("Provider saved"))
<FormLabel>Base URL {req}</FormLabel>  ->  <FormLabel>{__tx("Base URL {0}", [req])}</FormLabel>
```

The catalog key **is** the English source string, so an untranslated key falls
back to upstream's own text instead of rendering a bare identifier.

Note: `react({ babel: ... })` is NOT a viable hook — `@vitejs/plugin-react` 6 on
Vite 8 is the Oxc implementation and silently ignores its `babel` option. Hence
the standalone plugin.

### Kill switch

`BIFROST_I18N=0` drops the plugin entirely. Verified: the resulting `ui/out`
tree is byte-for-byte identical to a build from unmodified upstream config
(548 files, matching SHA-256). Use it to prove a bug is not the fork's fault.

## Upstream sync runbook

```bash
git fetch upstream
git rebase upstream/dev          # conflicts only in the 2 files above

cd ui && npm ci
npm run i18n:diff                # what copy did upstream add/remove?
npm run i18n:extract             # refresh catalogs; new keys stay untranslated
# translate the new keys in ui/i18n/catalogs/<locale>.json
npm run i18n:check               # coverage per locale
npx vitest run tools/i18n        # transform + runtime invariants
npx vite build && npm run typecheck
```

CI should run `npm run i18n:check -- --strict`, which fails when `en.json` no
longer matches the source — i.e. someone rebased without re-extracting. That is
the one way this setup rots silently.

## Rules

- Do not translate: provider/model names, config keys, JSON field names, URLs,
  API paths, code samples, Monaco/editor content, or anything under
  `ui/app/workspace/logs/views/emptyState.tsx` that a user copy-pastes.
- Backend stays 100% English. `/v1/*` errors are parsed by OpenAI-compatible
  SDKs and logs are read by operators; translating either is a regression.
  Admin-API error copy is translated on the frontend instead — see the P3 plan.
- Escape hatches: `// @no-i18n` at the top of a file, `/* i18n-ignore */` on a
  node. Both are honoured by the extractor and the transform.
- `ui/i18n/rejected.json` lists what the rules skipped. Review it when a string
  stubbornly stays English.
