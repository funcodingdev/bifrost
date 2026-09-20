# Bifrost, localised

[简体中文](README.md) · **English**

A localisation fork of [Bifrost](https://github.com/maximhq/bifrost) — the admin console is translated; gateway behaviour is identical to upstream.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-maximhq%2Fbifrost-181717?logo=github)](https://github.com/maximhq/bifrost)

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

> An in-console language switcher is still being built; use the above until then.

Untranslated copy renders as upstream's own English, never a blank — a feature upstream shipped an hour ago is fully usable before anyone has translated it.

## About this fork

- **No functional changes.** Translation only; gateway behaviour, APIs and configuration match upstream exactly.
- **Follows upstream releases.** Each upstream release is synced automatically and published with its localised counterpart.
- The list of modified upstream files is in [FORK_OWNED.md](FORK_OWNED.md).

Spotted a bad translation or want to improve the wording? Edit [`ui/i18n/catalogs/zh-CN.json`](ui/i18n/catalogs/zh-CN.json) and open a PR — the key is the English source string. Terminology lives in [`ui/i18n/glossary.json`](ui/i18n/glossary.json).

Please report issues with Bifrost itself [upstream](https://github.com/maximhq/bifrost/issues); translation issues belong here.

---

> Below is upstream's own README, kept in sync automatically.
