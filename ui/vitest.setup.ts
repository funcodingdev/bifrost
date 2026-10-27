import { beforeEach, expect } from "vitest";

// Existing copy assertions choose English explicitly. Initialization tests load
// i18n themselves after installing their browser storage and document fixtures.
if (!expect.getState().testPath?.endsWith("/lib/i18n/index.test.ts")) {
	const { default: i18n } = await import("@/lib/i18n");
	await i18n.changeLanguage("en");
	beforeEach(async () => {
		await i18n.changeLanguage("en");
	});
}