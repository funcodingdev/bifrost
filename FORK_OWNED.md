# Fork-owned files

This fork adds multi-language support to Bifrost while continuing to track
upstream (`maximhq/bifrost`). Upstream moves fast — roughly 21 commits a day,
touching about 78% of `ui/`'s 837 source files per quarter — so the fork is
built around one rule:

> **Never edit an upstream file to add i18n.** Translation is injected at build
> time. New copy from upstream renders in English until someone translates it.

Everything below is the complete list of what this fork changes. Keep it that
way: each file added here is a merge conflict you will resolve forever.

## Modified upstream files (4)

| File | Change | Upstream commits / 90d |
| --- | --- | --- |
| `ui/vite.config.mts` | imports `autoI18n()` and puts it first in `plugins` | 1 |
| `ui/package.json` | adds the `i18n:extract` / `i18n:diff` / `i18n:check` scripts | 7 |
| `.gitattributes` | one line: `README.md merge=ours` | 0 (2 in all history) |
| `README.md` | replaced with this fork's own README (Chinese) | 4 |

The first three are additive and low-churn; a conflict is a one-line re-apply.

`README.md` is the exception: it is fully replaced, so an upstream edit would
conflict every time — about four times a year, each one halting an unattended
sync before it can publish a release. `merge=ours` in `.gitattributes` resolves
it in our favour automatically. That means upstream README changes are silently
discarded, which is intended: this fork's README describes the fork, and links
to upstream for the product itself. `README.en.md` is a new file and never
conflicts.

## Added files (never conflict)

```
ui/tools/i18n/          extraction + transform tooling, translator, tests
ui/i18n/runtime.ts      __t / __tx and locale selection
ui/i18n/catalogs/       en.json (generated) + one JSON per locale
ui/i18n/glossary.json   terminology the translator must use verbatim
ui/i18n/extracted.json  key -> where it appears, for translator context
ui/i18n/rejected.json   literals the rules skipped, for auditing
.fork/last-upstream-tag the upstream release this fork is synced to
.github/workflows/fork-sync-upstream.yml
.github/workflows/fork-release.yml
FORK_OWNED.md           this file
```

Fork workflow files are prefixed `fork-` so they can never collide with a file
upstream adds.

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

## Branches

| Branch | Role |
| --- | --- |
| `main` | mirrors `upstream/main` — upstream's **release** branch, where `transports/vX.Y.Z` tags are cut |
| `i18n` | the fork trunk. Every fork commit lives here, based on `main` |
| `dev` | leftover mirror of upstream's integration branch; not used by the automation |

Track `main`, not `dev`: `dev` is upstream's integration branch and never
corresponds to a release.

## Automation

`fork-sync-upstream.yml` polls upstream every 6 hours for a new
`transports/vX.Y.Z` tag (prereleases excluded). On a new one it merges **that
tag** — not a branch, so the fork pins to exactly the released tree — then
re-extracts, machine-translates the new copy via OpenRouter, and runs the gates:

1. `i18n:check --strict` — catalog matches source, placeholders intact
2. `vitest run tools/i18n` — transform and runtime invariants
3. `vite build` + `tsc --noEmit`
4. the bot's own edits touch nothing outside `ui/i18n/` and `.fork/`

Only if all four pass does it push `i18n`, tag `transports/vX.Y.Z-zh.N`, and
call `fork-release.yml` to build and publish
`ghcr.io/<owner>/bifrost:vX.Y.Z-zh.N`. Any failure leaves the branch untouched
and opens one issue per upstream tag.

`-zh.N` rather than `+zh`: Docker tags cannot contain `+`, so the suffix has to
be a semver prerelease. `N` lets the same upstream version be re-released after
a translation fix.

The release workflow is invoked through `workflow_call`, not by its own tag
trigger, because a tag pushed with `GITHUB_TOKEN` does not start another
workflow. The `push: tags` trigger is there for tags you create by hand.

### Required repo setup

- Secret `OPENROUTER_API_KEY`. Only `schedule` and `workflow_dispatch` runs use
  it — never give it to a `pull_request` trigger, or a fork PR can exfiltrate it.
- Optional vars `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL` (point the latter at a
  Bifrost instance to dogfood the gateway).
- Settings → Actions → Workflow permissions: **Read and write**.
- **Disable the inherited upstream workflows.** All 20 of them come along with
  the merge. `release-pipeline.yml` fires on push to `main` and will try to push
  images to upstream's Docker Hub account; others run on schedules. In a fork
  they fail loudly and burn Actions minutes. Turn them off in Settings → Actions
  before pushing `main`.
- If `i18n` is a protected branch, allow the Actions bot to push to it, or the
  sync will fail at the last step.

Note: upstream's own `workflow-lint.yml` currently fails on `release-pipeline.yml`
and `run-core-tests.yml` (missing `ai.google.dev`, `learn.microsoft.com` in their
egress allowlists). That is pre-existing upstream breakage, not something the
fork introduced, but it will show up on any PR you open that touches
`.github/workflows/`.

## Manual sync runbook

Only needed when the automation opens a conflict issue.

```bash
git fetch upstream --tags
git checkout i18n
git merge transports/vX.Y.Z      # conflicts only in the files listed above

cd ui && npm ci
npm run i18n:diff                # what copy did upstream add/remove?
npm run i18n:extract             # refresh catalogs; new keys stay untranslated
node tools/i18n/translate.mjs --locale zh-CN
npm run i18n:check -- --strict   # catalog freshness + placeholder integrity
npx vitest run tools/i18n
npx vite build && npm run typecheck
```

`i18n:check --strict` failing means someone merged without re-extracting, or a
translation's placeholders drifted. That is the one way this setup rots
silently, which is why it is a gate rather than a report.

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
