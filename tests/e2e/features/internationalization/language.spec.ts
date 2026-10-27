import { test, expect } from "../../core/fixtures/base.fixture";

test.use({
  locale: "en-US",
  localePreference: null,
  skipAutoLogin: true,
  storageState: { cookies: [], origins: [] },
});

test.beforeEach(async ({ context }) => {
  await context.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        pathname.endsWith("/session/is-auth-enabled")
          ? { is_auth_enabled: true, has_valid_token: false }
          : {},
      ),
    });
  });
});

test("defaults to Chinese, offers only two languages, and persists an explicit selection", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByText("欢迎回来", { exact: true })).toBeVisible();
  await page.getByTestId("language-switcher").click();
  await expect(page.getByTestId(/^language-option-/)).toHaveCount(2);
  await page.getByTestId("language-option-en").click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await page.getByTestId("language-switcher").click();
  await page.getByTestId("language-option-zh-CN").click();
  await expect(page.getByRole("button", { name: "登录", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
});

test("translates setup instructions and validation while retaining configuration identifiers", async ({
  page,
}) => {
  await page.route("**/api/session/is-auth-enabled", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        is_auth_enabled: false,
        has_valid_token: false,
        setup_required: true,
        setup_token_configured: true,
      }),
    }),
  );
  await page.route("**/api/config", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "完成 Bifrost 初始化" })).toBeVisible();
  await page.getByTestId("setup-token-submit").click();
  await expect(page.getByTestId("setup-token-error")).toHaveText(
    "请输入为此 Bifrost 实例配置的初始化令牌",
  );
  await page.getByRole("button", { name: "在哪里获取初始化令牌？" }).click();
  const instructions = page.getByTestId("setup-token-instructions");
  await expect(instructions).toContainText("设置 BIFROST_SETUP_TOKEN 环境变量。");
  await expect(instructions).toContainText("在 config.json 顶层添加 setup_token。");
  await expect(instructions).toContainText("env.VAR");
  await expect(instructions).toContainText("vault.path");
});
test.describe("business page translations", () => {
  test.beforeEach(async ({ context }) => {
    await context.route("https://getbifrost.ai/**", (route) =>
      route.fulfill({ json: { name: "1.0.0" } }),
    );
    await context.routeWebSocket("ws://localhost:8080/**", () => {});
    await context.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = {
        data: [],
        items: [],
        agents: [],
        clients: [],
        keys: [],
        virtual_keys: [],
        teams: [],
        customers: [],
        rules: [],
        plugins: [],
        endpoints: [],
        sessions: [],
        jobs: [],
        entries: [],
        total_count: 0,
        count: 0,
      };
      if (path.endsWith("/version")) body = "1.0.0";
      else if (path.endsWith("/session/is-auth-enabled"))
        body = { is_auth_enabled: false, has_valid_token: true };
      else if (path === "/api/keys") body = [];
      else if (path === "/api/providers") body = { providers: [] };
      else if (path.endsWith("/config"))
        body = {
          is_db_connected: true,
          is_logs_connected: true,
          client_config: {
            enable_logging: true,
            mcp_gateway: {},
            skills_external_client_url: { value: "" },
          },
          providers: {},
          mcp_config: {},
          vector_store_config: { enabled: false },
          auth_config: { is_enabled: false },
          metadata: { onboarding_dismissed: true },
          plugins: [],
        };
      else if (path.endsWith("/config/metadata")) body = { onboarding_dismissed: true };
      else if (path.endsWith("/pricing-overrides"))
        body = { pricing_overrides: [], total_count: 0 };
      else if (path.endsWith("/virtual-keys")) body = { virtual_keys: [], total_count: 0 };
      else if (path.endsWith("/teams")) body = { teams: [] };
      else if (path.endsWith("/customers")) body = { customers: [] };
      else if (path.endsWith("/complexity-analyzer-config"))
        body = {
          classifier: "semantic",
          keywords: { simple_keywords: [], medium_keywords: [], complex_keywords: [] },
          semantic: {
            provider: "openai",
            embedding_model: "text-embedding-3-small",
            fallback: "decision",
          },
        };
      await route.fulfill({ json: body });
    });
  });

  test("updates pricing metadata when switching language without reloading", async ({ page }) => {
    await page.goto("/workspace/custom-pricing/overrides");
    await page.getByTestId("pricing-override-create-btn").click();
    await expect(page.getByTestId("pricing-field-activate-input_cost_per_token")).toContainText(
      "输入 / Token",
    );
    await page.getByTestId("pricing-override-cancel-btn").click();
    await page.getByTestId("language-switcher").click();
    await page.getByTestId("language-option-en").click();
    await page.getByTestId("pricing-override-create-btn").click();
    await expect(page.getByTestId("pricing-field-activate-input_cost_per_token")).toContainText(
      "Input / token",
    );
  });

  test("localizes code-mode labels and complete settings instructions", async ({ page }) => {
    await page.goto("/workspace/config/mcp-gateway");
    await expect(page.getByText("源码大小上限（字节）", { exact: true })).toBeVisible();
    await expect(page.getByText("单次执行可提交的源码大小上限。", { exact: true })).toBeVisible();
    await expect(page.getByText(/选择“网关及 LLM 请求”模式时/)).toBeVisible();
  });

  test("shows decision fallback as a distinct translated option", async ({ page }) => {
    await page.goto("/workspace/complexity-router");
    await page.getByTestId("complexity-router-embedding-config-button").click();
    const fallback = page.getByTestId("complexity-router-semantic-fallback-select");
    await expect(fallback).toContainText("决策模型");
    await fallback.click();
    await expect(page.getByRole("option", { name: "决策模型", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "无", exact: true })).toBeVisible();
  });

  test("keeps expiry preset identifiers stable and displays a Chinese date", async ({ page }) => {
    await page.goto("/workspace/virtual-keys");
    await page.getByTestId("create-vk-btn").click();
    const preset = page.getByTestId("vk-expiry-preset-30-min");
    await expect(preset).toHaveText("30 分钟");
    await preset.click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button")
        .filter({ hasText: /\d{4}年\d{1,2}月\d{1,2}日/ }),
    ).toBeVisible();
  });
});