import { describe, expect, it } from "vitest";

import i18n from "@/lib/i18n";

import { authProofOfControlSchema, setupTokenFormSchema } from "./schemas";

describe("authProofOfControlSchema", () => {
	// The server verifies current_password against the stored hash byte for byte (and the
	// password policy allows spaces), so the value must reach the request exactly as typed.
	it("keeps current_password byte-exact, including surrounding whitespace", () => {
		const result = authProofOfControlSchema.safeParse({ current_password: " pass word ", setup_token: "" });
		expect(result.success).toBe(true);
		expect(result.data?.current_password).toBe(" pass word ");
	});

	it("still treats a whitespace-only current_password as missing", () => {
		const result = authProofOfControlSchema.safeParse({ current_password: "   ", setup_token: "" });
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain("current_password");
	});

	it("accepts a setup token on its own and trims it, as the server does", () => {
		const result = authProofOfControlSchema.safeParse({ current_password: "", setup_token: "  tok  " });
		expect(result.success).toBe(true);
		expect(result.data?.setup_token).toBe("tok");
	});

	it("requires one of the two", () => {
		const result = authProofOfControlSchema.safeParse({ current_password: "", setup_token: "" });
		expect(result.success).toBe(false);
	});
});

describe("localized validation", () => {
	it("resolves validation copy in the active language after schemas have been created", async () => {
		await i18n.changeLanguage("zh-CN");
		expect(setupTokenFormSchema.safeParse({ setup_token: "" }).error?.issues[0]?.message).toBe("请输入为此 Bifrost 实例配置的初始化令牌");
		expect(authProofOfControlSchema.safeParse({ current_password: "", setup_token: "" }).error?.issues[0]?.message).toContain(
			"当前管理员密码",
		);
		await i18n.changeLanguage("en");
		expect(setupTokenFormSchema.safeParse({ setup_token: "" }).error?.issues[0]?.message).toBe(
			"Enter the setup token configured for this Bifrost instance",
		);
	});
});