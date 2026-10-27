import { describe, expect, it } from "vitest";
import { NAMESPACES, resources } from "./resources";

function flatten(value: unknown, prefix = "", result: Record<string, unknown> = {}): Record<string, unknown> {
	if (value !== null && typeof value === "object") {
		for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, result);
	} else {
		result[prefix] = value;
	}
	return result;
}

function tokens(value: string, pattern: RegExp) {
	return [...value.matchAll(pattern)].map(([token]) => token).sort();
}

describe("translation resource integrity", () => {
	it("only registers English and Simplified Chinese with the same namespaces", () => {
		expect(Object.keys(resources).sort()).toEqual(["en", "zh-CN"]);
		for (const locale of Object.values(resources)) expect(Object.keys(locale).sort()).toEqual([...NAMESPACES].sort());
	});

	it.each(NAMESPACES)("keeps %s keys, interpolation parameters and rich text tags in sync", (namespace) => {
		const english = flatten(resources.en[namespace]);
		const chinese = flatten(resources["zh-CN"][namespace]);
		expect(Object.keys(chinese).sort()).toEqual(Object.keys(english).sort());
		for (const [key, source] of Object.entries(english)) {
			const translation = chinese[key];
			expect(typeof translation, key).toBe(typeof source);
			if (typeof source !== "string" || typeof translation !== "string") continue;
			expect(translation.trim(), key).not.toBe("");
			expect(tokens(translation, /\{\{.*?\}\}/g), key).toEqual(tokens(source, /\{\{.*?\}\}/g));
			expect(tokens(translation, /<\/?[A-Za-z][A-Za-z0-9]*\s*\/?>/g), key).toEqual(tokens(source, /<\/?[A-Za-z][A-Za-z0-9]*\s*\/?>/g));
		}
	});
});