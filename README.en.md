# Bifrost, localised

[简体中文](README.md) · **English**

A localisation fork of [Bifrost](https://github.com/maximhq/bifrost) — the admin console is translated; gateway behaviour is identical to upstream.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-maximhq%2Fbifrost-181717?logo=github)](https://github.com/maximhq/bifrost)

---

## What Bifrost is

A high-performance AI gateway that unifies 23+ model providers (OpenAI, Anthropic, AWS Bedrock, Google Vertex and more) behind one OpenAI-compatible API, with zero-config startup, automatic failover, load balancing, semantic caching and enterprise features.

For product documentation see [the upstream repository](https://github.com/maximhq/bifrost). **This fork only handles translation and offers no product support.**

## Quick start

```bash
docker run -p 8080:8080 ghcr.io/funcodingdev/bifrost-i18n:latest
```

The console is at <http://localhost:8080>.

Image tags look like `v2.2.1-zh.1`: `v2.2.1` is the upstream version, `-zh.N` is this fork's localisation revision on top of it.

## Switching language

The console ships English. To switch:

```js
localStorage.setItem("bifrost.locale", "zh-CN");
location.reload();
```

> An in-console language switcher is still being built (see the [roadmap](#roadmap)). Use the above until then.

**Untranslated copy renders as upstream's own English** — never a blank, never a bare `{0}`. A feature upstream shipped an hour ago is fully usable before anyone has translated it.

## Relationship to upstream

- **No functional changes.** Not one file under `ui/app`, `ui/components`, `ui/lib` or `ui/hooks` is edited, and no Go code is touched.
- **Follows upstream releases.** Each upstream `transports/vX.Y.Z` tag is synced automatically, new copy is translated, and `transports/vX.Y.Z-zh.N` is published.
- **Upstream's quality gate still applies.** Upstream runs 34 jobs before cutting a release (provider harness, integration tests, migrations, load tests). This fork does not re-run those; it verifies the localisation layer only.

Exactly 4 upstream files are modified, all listed in [FORK_OWNED.md](FORK_OWNED.md).

## How the localisation works

No source edits. A Babel pass wraps user-facing copy on the AST at build time:

```jsx
<Button>Save Changes</Button>          →  <Button>{__t("Save Changes")}</Button>
<Input placeholder="Search models" />  →  <Input placeholder={__t("Search models")} />
toast.success("Provider saved")        →  toast.success(__t("Provider saved"))
<FormLabel>Base URL {req}</FormLabel>  →  <FormLabel>{__tx("Base URL {0}", [req])}</FormLabel>
```

**The catalog key IS the English source string**, so a missing translation falls back to upstream's own text.

This design exists to keep merging upstream viable: upstream touches roughly 78% of the files under `ui/` every quarter, and rewriting them into `t("key")` calls would mean hundreds of conflicts per sync — the kind of tax that makes a fork stop syncing after a round or two.

Details in [ui/tools/i18n/README.md](ui/tools/i18n/README.md).

Setting `BIFROST_I18N=0` disables the whole thing and reproduces upstream's build byte for byte.

## Automated sync

```
poll upstream tags every 6h  ──  exit if nothing new
        │ new release found
        ▼
merge that tag  →  extract new copy  →  incremental translation via OpenRouter
        │
        ▼
four gates: catalog integrity · transform invariants · UI build · bot touched only catalogs
        │ all green
        ▼
push branch  →  tag  →  build image  →  publish release
```

Any failure leaves the branch untouched and opens an issue instead.

Translation is incremental: because the key is the English source string, "what's new" is a set difference. The first pass is ~2,900 strings; later releases are usually a few dozen.

## Contributing translations

Translations live in [`ui/i18n/catalogs/zh-CN.json`](ui/i18n/catalogs/zh-CN.json), keyed by the English source:

```json
{
	"Save Changes": "保存更改",
	"Deleted {0} keys": "已删除 {0} 个密钥"
}
```

Two hard rules:

1. **Placeholders must survive verbatim.** The `{0}`/`{1}` set must match the source exactly or CI rejects the change — this is the one thing machine translation reliably breaks.
2. **Terminology comes from** [`ui/i18n/glossary.json`](ui/i18n/glossary.json).

Check your work:

```bash
cd ui && npm ci && npm run i18n:check -- --strict
```

Corrections to machine output are welcome; human translations are never overwritten automatically.

## Roadmap

- [x] Build-time localisation with zero upstream source edits
- [x] Incremental translation and release-following automation
- [ ] In-console language switcher
- [ ] Localised admin API error copy
- [ ] More locales

## Credits

Thanks to the [maximhq/bifrost](https://github.com/maximhq/bifrost) team. This repository does localisation only; all features, documentation and support belong upstream.

- Issues with Bifrost itself → [upstream issues](https://github.com/maximhq/bifrost/issues)
- Translation errors, wording, terminology → [this repository's issues](https://github.com/funcodingdev/bifrost-i18n/issues)

## License

Apache 2.0, same as upstream. See [LICENSE](LICENSE).
