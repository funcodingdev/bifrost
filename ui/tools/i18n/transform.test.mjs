// Guards the invariants that let auto-i18n run over upstream code untouched.
//
//   npx vitest run tools/i18n
//
// Written as .mjs so it stays outside tsconfig's ts/tsx include and adds no
// typecheck surface to the upstream build.

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const babel = require("@babel/core");
const plugin = require("./babel-plugin.cjs");

const UI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function transform(code, filename = path.join(UI_ROOT, "app", "sample.tsx")) {
	return babel.transformSync(code, {
		filename,
		parserOpts: { plugins: ["typescript", "jsx"] },
		plugins: [plugin],
		configFile: false,
		babelrc: false,
	}).code;
}

describe("wrapping", () => {
	it("wraps plain JSX copy", () => {
		expect(transform("const x = <Button>Save Changes</Button>;")).toContain('_bfT("Save Changes")');
	});

	it("collapses multi-line copy the way JSX does", () => {
		const out = transform("const x = <p>\n\tA sentence that\n\twraps.\n</p>;");
		expect(out).toContain('_bfT("A sentence that wraps.")');
	});

	it("wraps whitelisted attributes and leaves identifiers alone", () => {
		const out = transform('const x = <Input placeholder="Search models" name="model" className="flex" />;');
		expect(out).toContain('placeholder={_bfT("Search models")}');
		expect(out).toContain('name="model"');
		expect(out).toContain('className="flex"');
	});

	it("wraps toast copy including the options bag", () => {
		const out = transform('toast.success("Provider saved", { description: "Changes applied", id: "x" });');
		expect(out).toContain('_bfT("Provider saved")');
		expect(out).toContain('_bfT("Changes applied")');
		expect(out).toContain('id: "x"');
	});

	it("folds interpolated copy into one key with placeholders", () => {
		const out = transform('const x = <FormLabel>Base URL {req ? "(Required)" : "(Optional)"}</FormLabel>;');
		expect(out).toContain('_bfTx("Base URL {0}", [req ? "(Required)" : "(Optional)"])');
	});
});

describe("behaviour preservation", () => {
	// components/ui/truncatedLabel.tsx and friends branch on
	// `typeof children === "string"`, so a wrapped text node must stay a single
	// string child rather than becoming an array.
	it("keeps a lone text child a single expression", () => {
		const out = transform("const x = <TruncatedLabel>Some Label</TruncatedLabel>;");
		expect(out).toBe('import { __t as _bfT } from "@/i18n/runtime";\nconst x = <TruncatedLabel>{_bfT("Some Label")}</TruncatedLabel>;');
	});

	it("preserves a significant inline space", () => {
		const out = transform("const x = <span>Hello <b>x</b></span>;");
		expect(out).toContain('{_bfT("Hello") + " "}');
	});

	it("routes React-node interpolation through __tx, never String()", () => {
		const out = transform("const x = <p>Status {ok && <Badge />}</p>;");
		expect(out).toContain('_bfTx("Status {0}"');
	});
});

describe("exclusions", () => {
	it("skips code-bearing subtrees", () => {
		const out = transform("const x = <CodeBlock>curl https://example.com</CodeBlock>;");
		expect(out).not.toContain("_bfT");
	});

	it("skips identifier-shaped literals", () => {
		expect(transform("const x = <div>openai</div>;")).not.toContain("_bfT");
		expect(transform("const x = <div>gpt-4o-mini</div>;")).not.toContain("_bfT");
		expect(transform('const x = <a title="/api/session/login">x</a>;')).not.toContain("_bfT");
	});

	it("honours the file-level opt-out", () => {
		expect(transform("// @no-i18n\nconst x = <p>Save Changes</p>;")).not.toContain("_bfT");
	});

	it("skips generated and test files", () => {
		const generated = path.join(UI_ROOT, "app", "routeTree.gen.ts");
		expect(transform("const x = <p>Save Changes</p>;", generated)).not.toContain("_bfT");
	});

	it("adds no import when nothing was wrapped", () => {
		expect(transform("const x = <div className='flex' />;")).not.toContain("@/i18n/runtime");
	});
});