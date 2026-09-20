# Bifrost 中文版

**简体中文** · [English](README.en.md)

[Bifrost](https://github.com/maximhq/bifrost) 的中文本地化分支 —— 管理控制台界面汉化，网关功能与上游完全一致。

[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-maximhq%2Fbifrost-181717?logo=github)](https://github.com/maximhq/bifrost)

## 快速开始

```bash
docker run -p 8080:8080 ghcr.io/funcodingdev/bifrost-i18n:latest
```

打开 <http://localhost:8080> 即是控制台。

镜像 tag 形如 `v2.2.1-zh.1`：`v2.2.1` 是上游版本，`-zh.N` 是本仓库在该版本上的汉化修订号。

## 切换语言

控制台默认英文，切到中文：

```js
localStorage.setItem("bifrost.locale", "zh-CN");
location.reload();
```

> 界面内的语言切换器还在开发中，在那之前请用上面的方式切换。

没有译文的文案会原样显示上游英文，不会出现缺字或空白 —— 上游刚发布、还没来得及翻译的新功能，界面依然完整可用。

## 关于这个分支

- **不改功能。** 只做界面汉化，网关行为、API、配置与上游逐一对应。
- **跟随上游发版。** 上游每发一个版本，这里自动同步并发布对应的汉化版。
- 改动过的上游文件清单见 [FORK_OWNED.md](FORK_OWNED.md)。

发现错译或想改进措辞，欢迎直接改 [`ui/i18n/catalogs/zh-CN.json`](ui/i18n/catalogs/zh-CN.json) 提 PR，key 就是英文原文。术语统一见 [`ui/i18n/glossary.json`](ui/i18n/glossary.json)。

Bifrost 本身的问题请到[上游仓库](https://github.com/maximhq/bifrost/issues)反馈，翻译问题请提到本仓库。

---

> 以下为上游原版 README，内容随上游自动同步。
