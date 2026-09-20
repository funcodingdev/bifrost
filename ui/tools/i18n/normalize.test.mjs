// The normaliser runs over every translation before it is accepted, so a rule
// that overreaches corrupts copy silently and at scale.
//
//   npx vitest run tools/i18n

import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { fullWidthParens, normalizeTranslation } = require("./normalize.cjs");

describe("full-width parentheses", () => {
	it("widens parentheses in Chinese copy", () => {
		expect(fullWidthParens("(可选)")).toBe("（可选）");
		expect(fullWidthParens("批处理请求 (处理中)")).toBe("批处理请求 （处理中）");
	});

	it("widens them around ASCII too, because the sentence decides", () => {
		// 云元数据地址（169.254.x.x）is correct Chinese typography; the content
		// being ASCII does not make half-width right.
		expect(fullWidthParens("云元数据地址 (169.254.x.x) 始终被阻止")).toBe("云元数据地址 （169.254.x.x） 始终被阻止");
	});

	it("leaves copy with no Chinese alone", () => {
		expect(fullWidthParens("Cache read / token (priority)")).toBe("Cache read / token (priority)");
		expect(fullWidthParens("(Optional)")).toBe("(Optional)");
	});

	it("keeps a function call's parentheses intact", () => {
		// Widening these would break something the reader is meant to type.
		expect(fullWidthParens("调用 foo() 即可")).toBe("调用 foo() 即可");
		expect(fullWidthParens("使用 env.VAR(name) 引用")).toBe("使用 env.VAR(name) 引用");
	});

	it("preserves placeholders", () => {
		expect(fullWidthParens("批处理请求 ({0})")).toBe("批处理请求 （{0}）");
		expect(fullWidthParens("(全选{0})")).toBe("（全选{0}）");
	});

	it("leaves already-correct copy unchanged", () => {
		const already = "在请求前承担 IAM 角色。同时适用于显式凭证和继承的 IAM（EC2、ECS、EKS）。";
		expect(fullWidthParens(already)).toBe(already);
	});

	it("is idempotent", () => {
		const once = fullWidthParens("(可选) 与 (必填)");
		expect(fullWidthParens(once)).toBe(once);
	});
});

describe("locale scoping", () => {
	it("applies the Chinese rules to zh-CN", () => {
		expect(normalizeTranslation("(可选)", "zh-CN")).toBe("（可选）");
	});

	it("passes other locales through untouched", () => {
		// What is right for Chinese is not automatically right elsewhere.
		expect(normalizeTranslation("(optionnel)", "fr")).toBe("(optionnel)");
		expect(normalizeTranslation("(可选)", "ja")).toBe("(可选)");
	});
});