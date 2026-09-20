**简体中文** · [English](README.en.md)

> 这是 [Bifrost](https://github.com/maximhq/bifrost) 的中文本地化分支：控制台界面已汉化，网关功能与上游完全一致。本文是上游 README 的中文翻译，**只把安装方式换成了本分支的镜像**。

# Bifrost AI 网关

<a href="https://trendshift.io/repositories/14529?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-14529" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/repositories/14529" alt="maximhq%2Fbifrost | Trendshift" width="250" height="55"/></a>

[![Discord badge](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/exN5KAydbU)
[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/bifrost)](https://artifacthub.io/packages/search?repo=bifrost)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-maximhq%2Fbifrost-181717?logo=github)](https://github.com/maximhq/bifrost)

## 构建永不宕机的 AI 应用，最快的方式

Bifrost 是一个高性能 AI 网关，通过单一的 OpenAI 兼容 API 统一接入 23+ 家提供方（OpenAI、Anthropic、AWS Bedrock、Google Vertex 等）。零配置、秒级部署，自带自动故障转移、负载均衡、语义缓存和企业级能力。

## 快速开始

![Get started](./docs/media/getting-started.png)

**一分钟之内，从零搭起一个可用于生产的 AI 网关。**

**第 1 步：** 启动 Bifrost 网关

```bash
# 中文版镜像
docker run -p 8080:8080 ghcr.io/funcodingdev/bifrost-i18n:latest
```

> 镜像支持 `linux/amd64` 和 `linux/arm64`（Apple Silicon 可直接运行）。
> 镜像 tag 形如 `v2.2.1-zh.1`：`v2.2.1` 是上游版本，`-zh.N` 是本分支在该版本上的汉化修订号。
> 想用上游原版（英文），把镜像换成 `maximhq/bifrost`，或执行 `npx -y @maximhq/bifrost`。

**第 2 步：** 通过 Web 界面配置

```bash
# 打开内置的 Web 控制台
open http://localhost:8080
```

控制台会跟随浏览器语言，中文浏览器打开即是中文。也可以点右上角的 <kbd>文A</kbd> 图标手动切换，选择会被记住。

**第 3 步：** 发出第一个 API 请求

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello, Bifrost!"}]
  }'
```

**就这样！** 你的 AI 网关已经跑起来了，还附带一个可视化配置、实时监控和数据分析的 Web 界面。

**完整安装指南：**

- [网关部署](https://docs.getbifrost.ai/quickstart/gateway/setting-up) —— HTTP API 部署
- [Go SDK 接入](https://docs.getbifrost.ai/quickstart/go-sdk/setting-up) —— 直接集成

---

## 企业级部署

Bifrost 支持企业级私有化部署，面向大规模运行生产 AI 系统的团队。
除私有网络、定制安全控制和治理能力之外，企业版还解锁了自适应负载均衡、集群、护栏、MCP 网关等为企业级规模与可靠性设计的高级特性。

<img src=".github/assets/features.png" alt="Book a Demo" width="100%" style="margin-top:5px;"/>

<div align="center" style="display: flex; flex-direction: column;">
  <a href="https://calendly.com/maximai/bifrost-demo">
    <img src=".github/assets/book-demo-button.png" alt="Book a Demo" width="170" style="margin-top:5px;"/>
  </a>
  <div>
  <a href="https://www.getmaxim.ai/bifrost/enterprise" target="_blank" rel="noopener noreferrer">了解企业版能力</a>
  </div>
</div>

---

## 核心特性

### 基础设施

- **[统一接口](https://docs.getbifrost.ai/providers/supported-providers/overview)** —— 所有提供方共用一套 OpenAI 兼容 API
- **[多提供方支持](https://docs.getbifrost.ai/quickstart/gateway/provider-configuration)** —— OpenAI、Anthropic、AWS Bedrock、Google Vertex、Azure、Cerebras、Cohere、Mistral、Ollama、Groq 等
- **[自动兜底](https://docs.getbifrost.ai/features/retries-and-fallbacks)** —— 在提供方和模型之间无缝切换，零停机
- **[负载均衡](https://docs.getbifrost.ai/features/retries-and-fallbacks)** —— 在多个 API 密钥和提供方之间智能分配请求

### 进阶能力

- **[模型上下文协议（MCP）](https://docs.getbifrost.ai/mcp/overview)** —— 让模型使用外部工具（文件系统、网页搜索、数据库）
- **[语义缓存](https://docs.getbifrost.ai/features/semantic-caching)** —— 基于语义相似度的智能响应缓存，降低成本和延迟
- **[多模态支持](https://docs.getbifrost.ai/quickstart/gateway/streaming)** —— 文本、图像、音频和流式输出，统一在同一套接口之下
- **[自定义插件](https://docs.getbifrost.ai/enterprise/custom-plugins)** —— 可扩展的中间件架构，用于分析、监控和自定义逻辑
- **[治理](https://docs.getbifrost.ai/features/governance/virtual-keys)** —— 用量追踪、速率限制和细粒度访问控制

### 企业与安全

- **[预算管理](https://docs.getbifrost.ai/features/governance/budget-and-limits)** —— 基于虚拟密钥、团队和客户的分层成本控制
- **[用户开通（OIDC）](https://docs.getbifrost.ai/enterprise/user-provisioning)** —— OAuth 2.0 / OIDC 登录，后台同步目录中的团队、角色和业务单元
- **[可观测性](https://docs.getbifrost.ai/features/observability/default)** —— 原生 Prometheus 指标、分布式追踪和完整日志
- **[密钥管理](https://docs.getbifrost.ai/deployment-guides/config-json#environment-variable-references)** —— 通过环境变量和部署密钥安全管理 API 密钥

### 开发体验

- **[零配置启动](https://docs.getbifrost.ai/quickstart/gateway/setting-up)** —— 无需预先配置，启动后动态添加提供方
- **[无缝替换](https://docs.getbifrost.ai/features/drop-in-replacement)** —— 改一行代码即可替换 OpenAI / Anthropic / GenAI API
- **[SDK 集成](https://docs.getbifrost.ai/integrations/what-is-an-integration)** —— 原生支持主流 AI SDK，无需改动代码
- **[配置方式灵活](https://docs.getbifrost.ai/quickstart/gateway/provider-configuration)** —— 支持 Web 界面、API 驱动和文件三种配置方式

---

## 仓库结构

Bifrost 采用模块化架构以获得最大灵活性：

```text
bifrost/
├── npx/                 # 便捷安装用的 NPX 脚本
├── core/                # 核心功能与公共组件
│   ├── providers/       # 各提供方的具体实现（OpenAI、Anthropic 等）
│   ├── schemas/         # 贯穿 Bifrost 的接口与结构体定义
│   └── bifrost.go       # Bifrost 主实现
├── framework/           # 数据持久化相关的框架组件
│   ├── configstore/     # 配置存储后端
│   ├── logstore/        # 请求日志存储后端
│   └── vectorstore/     # 向量存储
├── transports/          # HTTP 网关及其他接口层
│   └── bifrost-http/    # HTTP 传输层实现
├── ui/                  # HTTP 网关的 Web 界面
├── plugins/             # 可扩展的插件系统
│   ├── governance/      # 预算管理与访问控制
│   ├── jsonparser/      # JSON 解析与处理工具
│   ├── logging/         # 请求日志与分析
│   ├── maxim/           # Maxim 可观测性集成
│   ├── mocker/          # 测试与开发用的 mock 响应
│   ├── semanticcache/   # 智能响应缓存
│   └── telemetry/       # 监控与可观测性
├── docs/                # 文档与指南
└── tests/               # 完整的测试套件
```

---

## 三种接入方式

按需选择部署方式：

### 1. 网关（HTTP API）

**适合：** 跨语言集成、微服务、生产部署

```bash
# Docker —— 生产可用（中文版）
docker run -p 8080:8080 -v $(pwd)/data:/app/data ghcr.io/funcodingdev/bifrost-i18n:latest
```

**特点：** Web 界面、实时监控、多提供方管理、零配置启动

**了解更多：** [网关部署指南](https://docs.getbifrost.ai/quickstart/gateway/setting-up)

### 2. Go SDK

**适合：** 直接用 Go 集成，追求最高性能和控制力

```bash
go get github.com/maximhq/bifrost/core
```

> Go SDK 不涉及界面，直接取自上游，没有单独的汉化版本。

**特点：** 原生 Go API、嵌入式部署、自定义中间件集成

**了解更多：** [Go SDK 指南](https://docs.getbifrost.ai/quickstart/go-sdk/setting-up)

### 3. 无缝替换

**适合：** 迁移现有应用，且不想改代码

```diff
# OpenAI SDK
- base_url = "https://api.openai.com"
+ base_url = "http://localhost:8080/openai"

# Anthropic SDK
- base_url = "https://api.anthropic.com"
+ base_url = "http://localhost:8080/anthropic"

# Google GenAI SDK
- api_endpoint = "https://generativelanguage.googleapis.com"
+ api_endpoint = "http://localhost:8080/genai"
```

**了解更多：** [集成指南](https://docs.getbifrost.ai/integrations/what-is-an-integration)

---

## 性能

Bifrost 对 AI 请求几乎不增加任何开销。在持续 5,000 RPS 的压测中，网关每个请求只增加了 **11 µs** 的开销。

| 指标 | t3.medium | t3.xlarge | 提升 |
|--------|-----------|-----------|-------------|
| 额外延迟（Bifrost 开销） | 59 µs | **11 µs** | **-81%** |
| 5k RPS 下的成功率 | 100% | 100% | 无失败请求 |
| 平均排队等待时间 | 47 µs | **1.67 µs** | **-96%** |
| 平均请求延迟（含提供方耗时） | 2.12 s | **1.61 s** | **-24%** |

**关键性能表现：**

- **成功率满分** —— 即使在 5k RPS 下也保持 100% 请求成功率
- **开销极小** —— 每个请求增加的延迟不到 15 µs
- **队列高效** —— 平均等待时间在亚微秒级
- **密钥选取快** —— 按权重挑选 API 密钥约 10 ns

**完整压测数据：** [性能分析](https://docs.getbifrost.ai/benchmarking/getting-started)

---

## 文档

**完整文档：** [https://docs.getbifrost.ai](https://docs.getbifrost.ai)（英文）

### 快速开始

- [网关部署](https://docs.getbifrost.ai/quickstart/gateway/setting-up) —— 30 秒完成 HTTP API 部署
- [Go SDK 接入](https://docs.getbifrost.ai/quickstart/go-sdk/setting-up) —— 直接用 Go 集成
- [提供方配置](https://docs.getbifrost.ai/quickstart/gateway/provider-configuration) —— 多提供方配置

### 功能

- [多提供方支持](https://docs.getbifrost.ai/providers/supported-providers/overview) —— 一套 API 接入所有提供方
- [MCP 集成](https://docs.getbifrost.ai/mcp/overview) —— 调用外部工具
- [语义缓存](https://docs.getbifrost.ai/features/semantic-caching) —— 智能响应缓存
- [兜底与负载均衡](https://docs.getbifrost.ai/features/retries-and-fallbacks) —— 可靠性能力
- [预算管理](https://docs.getbifrost.ai/features/governance/budget-and-limits) —— 成本控制与治理

### 集成

- [OpenAI SDK](https://docs.getbifrost.ai/integrations/openai-sdk/overview) —— 无缝替换 OpenAI
- [Anthropic SDK](https://docs.getbifrost.ai/integrations/anthropic-sdk/overview) —— 无缝替换 Anthropic
- [AWS Bedrock SDK](https://docs.getbifrost.ai/integrations/bedrock-sdk/overview) —— AWS Bedrock 集成
- [Google GenAI SDK](https://docs.getbifrost.ai/integrations/genai-sdk/overview) —— 无缝替换 GenAI
- [LiteLLM SDK](https://docs.getbifrost.ai/integrations/litellm-sdk) —— LiteLLM 集成
- [LangChain SDK](https://docs.getbifrost.ai/integrations/langchain-sdk) —— LangChain 集成

### 企业版

- [自定义插件](https://docs.getbifrost.ai/enterprise/custom-plugins) —— 扩展功能
- [集群](https://docs.getbifrost.ai/enterprise/clustering) —— 多节点部署
- [密钥管理](https://docs.getbifrost.ai/deployment-guides/config-json#environment-variable-references) —— 安全管理密钥
- [生产部署](https://docs.getbifrost.ai/deployment-guides/k8s) —— 扩容与监控

---

## 需要帮助？

**[加入 Discord](https://discord.gg/exN5KAydbU)** 获取社区支持与讨论。

可以获得：

- 快速安装协助与故障排查
- 最佳实践与配置建议
- 社区讨论与支持
- 集成过程中的实时答疑

> Bifrost 本身的问题请到[上游仓库](https://github.com/maximhq/bifrost/issues)反馈；**翻译问题、错译、术语建议**请提到[本仓库](https://github.com/funcodingdev/bifrost-i18n/issues)。

---

## 参与贡献

我们欢迎各种形式的贡献！详见[贡献指南](https://docs.getbifrost.ai/contributing/setting-up-repo)：

- 搭建开发环境
- 代码规范与最佳实践
- 如何提交 Pull Request
- 本地构建与测试

开发环境要求与构建说明见[开发环境搭建指南](https://docs.getbifrost.ai/contributing/setting-up-repo#development-environment-setup)。

**改进翻译：** 译文在 [`ui/i18n/catalogs/zh-CN.json`](ui/i18n/catalogs/zh-CN.json)，key 就是英文原文；术语统一见 [`ui/i18n/glossary.json`](ui/i18n/glossary.json)。改完跑 `cd ui && npm run i18n:check -- --strict` 自查。本分支改动过的上游文件清单见 [FORK_OWNED.md](FORK_OWNED.md)。

---

## License

本项目采用 Apache 2.0 许可证 —— 详见 [LICENSE](LICENSE)。

由 [Maxim](https://github.com/maximhq) 用 ❤️ 打造。
