# Bifrost 中文版

**简体中文** · [English](README.en.md)

[Bifrost](https://github.com/maximhq/bifrost) 的中文本地化分支 —— 管理控制台界面汉化，网关行为与上游完全一致。

[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-maximhq%2Fbifrost-181717?logo=github)](https://github.com/maximhq/bifrost)

---

## Bifrost 是什么

高性能 AI 网关：用一套 OpenAI 兼容 API 统一接入 23+ 家模型提供方（OpenAI、Anthropic、AWS Bedrock、Google Vertex 等），零配置启动，自带故障转移、负载均衡、语义缓存和企业级能力。

完整的产品文档请看[上游仓库](https://github.com/maximhq/bifrost)。**本仓库只负责汉化，不提供功能支持。**

## 快速开始

```bash
docker run -p 8080:8080 ghcr.io/funcodingdev/bifrost-i18n:latest
```

打开 <http://localhost:8080> 即是控制台。

镜像 tag 形如 `v2.2.1-zh.1`：`v2.2.1` 是上游版本，`-zh.N` 是本仓库在该版本上的汉化修订号。

## 切换语言

控制台默认英文。切到中文：

```js
localStorage.setItem("bifrost.locale", "zh-CN");
location.reload();
```

> 界面内的语言切换器还在做（见[路线图](#路线图)）。在那之前用上面的方式切换。

**没有译文的文案会原样显示上游英文**，不会出现缺字、空白或裸露的 `{0}`。所以上游刚发布、还没来得及翻译的新功能，界面依然完整可用。

## 与上游的关系

- **零功能改动。** `ui/app`、`ui/components`、`ui/lib`、`ui/hooks` 下的源码一个字都没改，Go 代码也没动。
- **跟随上游 release。** 上游每打一个 `transports/vX.Y.Z` tag，这里自动同步、翻译新增文案、发布 `transports/vX.Y.Z-zh.N`。
- **上游的质量门禁照常生效。** 上游发版前会跑 34 个 job（provider harness、集成测试、迁移、压测等）。本仓库不重跑那些，只验证汉化层本身。

改动过的上游文件只有 4 个，全部列在 [FORK_OWNED.md](FORK_OWNED.md)。

## 汉化是怎么做的

不改源码。构建时用 Babel 在 AST 上把界面文案包起来：

```jsx
<Button>Save Changes</Button>          →  <Button>{__t("Save Changes")}</Button>
<Input placeholder="Search models" />  →  <Input placeholder={__t("Search models")} />
toast.success("Provider saved")        →  toast.success(__t("Provider saved"))
<FormLabel>Base URL {req}</FormLabel>  →  <FormLabel>{__tx("Base URL {0}", [req])}</FormLabel>
```

**词条的 key 就是英文原文**，所以查不到译文时自然回退成上游自己的文案。

这么设计是为了能长期跟上游合并：上游每季度会改动 `ui/` 下约 78% 的文件，传统的 `t("key")` 改写会在每次同步时产生数百个冲突，一两轮之后就没人愿意同步了。

技术细节见 [ui/tools/i18n/README.md](ui/tools/i18n/README.md)。

设 `BIFROST_I18N=0` 可完全关闭汉化，构建产物与上游逐字节一致。

## 自动同步

```
每 6h 轮询上游 tag  ──  无新版本则退出
        │ 发现新 release
        ▼
合并该 tag  →  提取新增文案  →  OpenRouter 增量翻译
        │
        ▼
四道门禁：词条完整性 · 变换不变量 · UI 构建 · 只动词条文件
        │ 全绿才继续
        ▼
推送分支  →  打 tag  →  构建镜像  →  发 Release
```

任何一步失败都不会改动分支，而是开 issue。

翻译是增量的：词条 key 即英文原文，"哪些是新的"由集合差算出，首轮约 2900 条，之后每个版本通常只有几十条。

## 参与翻译

译文在 [`ui/i18n/catalogs/zh-CN.json`](ui/i18n/catalogs/zh-CN.json)，key 是英文原文：

```json
{
	"Save Changes": "保存更改",
	"Deleted {0} keys": "已删除 {0} 个密钥"
}
```

两条硬规则：

1. **占位符必须原样保留。** `{0}`、`{1}` 的集合要和原文完全一致，否则 CI 拒绝合入 —— 这是机器翻译最容易出错的地方。
2. **术语统一走** [`ui/i18n/glossary.json`](ui/i18n/glossary.json)。

改完自查：

```bash
cd ui && npm ci && npm run i18n:check -- --strict
```

机器译文欢迎直接修正，人工译文不会被自动覆盖。

## 路线图

- [x] 构建期汉化基础设施（上游源码零改动）
- [x] OpenRouter 增量翻译 + 跟随上游 release 自动发版
- [ ] 界面内语言切换器
- [ ] 管理 API 错误文案汉化
- [ ] 更多语言

## 致谢

感谢 [maximhq/bifrost](https://github.com/maximhq/bifrost) 团队。本仓库只做本地化，所有功能、文档和支持都归上游。

- Bifrost 本身的问题 → [上游 issue](https://github.com/maximhq/bifrost/issues)
- 翻译问题、错译、术语建议 → [本仓库 issue](https://github.com/funcodingdev/bifrost-i18n/issues)

## License

Apache 2.0，与上游一致。见 [LICENSE](LICENSE)。
