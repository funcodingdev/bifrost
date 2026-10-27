import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("UI language preferences", () => {
	const stored = new Map<string, string>();
	const documentElement = { lang: "" };

	beforeEach(() => {
		vi.resetModules();
		vi.doMock("i18next", async () => {
			const actual = await vi.importActual<typeof import("i18next")>("i18next");
			return { ...actual, default: actual.createInstance() };
		});
		stored.clear();
		documentElement.lang = "";
		vi.stubGlobal("window", {
			localStorage: {
				getItem: (key: string) => stored.get(key) ?? null,
				setItem: (key: string, value: string) => stored.set(key, value),
				removeItem: (key: string) => stored.delete(key),
			},
		});
		vi.stubGlobal("navigator", { language: "en-US", languages: ["en-US"] });
		vi.stubGlobal("document", { documentElement });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.doUnmock("i18next");
	});

	it("defaults to Simplified Chinese even in an English browser", async () => {
		const { DEFAULT_LOCALE, getLocale, default: i18n } = await import("./index");
		expect(DEFAULT_LOCALE).toBe("zh-CN");
		expect(getLocale()).toBe("zh-CN");
		expect(i18n.t("save")).toBe("保存");
		expect(documentElement.lang).toBe("zh-CN");
	});

	it("honors a saved English preference", async () => {
		stored.set("bifrost.locale", "en");
		const { getLocale, default: i18n } = await import("./index");
		expect(getLocale()).toBe("en");
		expect(i18n.t("save")).toBe("Save");
		expect(documentElement.lang).toBe("en");
	});

	it.each(["de", "ja", "zh-TW"])("replaces a removed %s preference with Simplified Chinese", async (locale) => {
		stored.set("bifrost.locale", locale);
		const { getLocale } = await import("./index");
		expect(getLocale()).toBe("zh-CN");
		expect(stored.get("bifrost.locale")).toBe("zh-CN");
	});

	it("persists language changes and updates the document language", async () => {
		const { changeLocale, getLocale } = await import("./index");
		await changeLocale("en");
		expect(getLocale()).toBe("en");
		expect(stored.get("bifrost.locale")).toBe("en");
		expect(documentElement.lang).toBe("en");
		await changeLocale("zh-CN");
		expect(stored.get("bifrost.locale")).toBe("zh-CN");
		expect(documentElement.lang).toBe("zh-CN");
	});

	it("falls back to Chinese for copy missing from English", async () => {
		const { changeLocale, default: i18n } = await import("./index");
		i18n.addResource("zh-CN", "common", "testFallback", "中文回退文案");
		await changeLocale("en");
		expect(i18n.t("testFallback")).toBe("中文回退文案");
	});
});