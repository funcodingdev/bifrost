// Pins the runtime guarantees the whole approach rests on:
//   - a key missing from the catalog falls back to the English source
//   - the source locale is a pure pass-through
//   - interpolation never stringifies a React node
//
//   npx vitest run tools/i18n
//
// The runtime reads localStorage at module scope, so each case stubs the global
// and re-imports with a fresh module registry.

import { afterEach, describe, expect, it, vi } from "vitest";

const CATALOG = {
	"Save Changes": "保存更改",
	"Deleted {0} keys": "已删除 {0} 个密钥",
	"Status {0}": "状态 {0}",
};

async function loadRuntime(locale) {
	vi.resetModules();
	vi.doMock("../../i18n/catalogs/zh-CN.json", () => ({ default: CATALOG }));
	vi.stubGlobal("localStorage", {
		getItem: () => locale,
		setItem: () => {},
	});
	return import("../../i18n/runtime.ts");
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.doUnmock("../../i18n/catalogs/zh-CN.json");
});

describe("source locale", () => {
	it("passes copy through untouched", async () => {
		const { __t, getLocale } = await loadRuntime("en");
		expect(getLocale()).toBe("en");
		expect(__t("Save Changes")).toBe("Save Changes");
	});

	it("still interpolates placeholders", async () => {
		const { __t } = await loadRuntime("en");
		expect(__t("Deleted {0} keys", [3])).toBe("Deleted 3 keys");
	});
});

describe("translated locale", () => {
	it("returns the catalog entry", async () => {
		const { __t, getLocale } = await loadRuntime("zh-CN");
		expect(getLocale()).toBe("zh-CN");
		expect(__t("Save Changes")).toBe("保存更改");
	});

	it("interpolates into the translation", async () => {
		const { __t } = await loadRuntime("zh-CN");
		expect(__t("Deleted {0} keys", [3])).toBe("已删除 3 个密钥");
	});

	// The property that makes this fork survivable: upstream copy that nobody has
	// translated yet renders in English rather than breaking the screen.
	it("falls back to English for an unknown key", async () => {
		const { __t } = await loadRuntime("zh-CN");
		expect(__t("A brand new upstream string")).toBe("A brand new upstream string");
	});

	it("ignores an unsupported stored locale", async () => {
		const { __t, getLocale } = await loadRuntime("klingon");
		expect(getLocale()).toBe("en");
		expect(__t("Save Changes")).toBe("Save Changes");
	});
});

describe("__tx", () => {
	it("returns a plain string when every argument is primitive", async () => {
		const { __tx } = await loadRuntime("zh-CN");
		expect(__tx("Status {0}", ["ok"])).toBe("状态 ok");
	});

	it("keeps a React node as a node instead of String()-ing it", async () => {
		const { __tx } = await loadRuntime("zh-CN");
		const node = { $$typeof: Symbol.for("react.element"), type: "span", props: {}, key: null };
		const result = __tx("Status {0}", [node]);
		expect(typeof result).toBe("object");
		expect(JSON.stringify(result)).not.toContain("[object Object]");
		expect(result.props.children).toContain(node);
	});
});