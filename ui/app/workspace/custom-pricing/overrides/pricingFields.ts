import i18n from "@/lib/i18n";
import type { RequestType } from "@/lib/types/config";
import type { PricingOverrideMatchType, PricingOverridePatch } from "@/lib/types/governance";

// Shared pricing-field metadata for override editing and display.
//
// Extracted from pricingOverrideSheet.tsx so read-only consumers (e.g. the
// model-catalog detail sheet) can reuse the labels without pulling that
// component's form/mutation dependencies into their bundle.

export const REQUEST_TYPE_GROUPS = [
	{
		get label() {
			return i18n.t("customPricing.requestGroups.chat", { ns: "models" });
		},
		types: ["chat_completion", "text_completion", "responses"],
	},
	{
		get label() {
			return i18n.t("customPricing.requestGroups.embedding", { ns: "models" });
		},
		types: ["embedding"],
	},
	{
		get label() {
			return i18n.t("customPricing.requestGroups.rerank", { ns: "models" });
		},
		types: ["rerank"],
	},
	{
		get label() {
			return i18n.t("customPricing.requestGroups.decisions", { ns: "models" });
		},
		types: ["decisions"],
	},
	{
		get label() {
			return i18n.t("customPricing.requestGroups.audio", { ns: "models" });
		},
		types: ["speech", "transcription", "live"],
	},
	{
		get label() {
			return i18n.t("customPricing.requestGroups.image", { ns: "models" });
		},
		types: ["image_generation", "image_variation", "image_edit"],
	},
	{
		get label() {
			return i18n.t("customPricing.requestGroups.video", { ns: "models" });
		},
		types: ["video_generation", "video_remix"],
	},
	{
		get label() {
			return i18n.t("customPricing.requestGroups.ocr", { ns: "models" });
		},
		types: ["ocr"],
	},
] as const;

export const REQUEST_TYPE_OPTIONS = REQUEST_TYPE_GROUPS.flatMap((g) => g.types);

export function getRequestTypeGroup(rt: string): string | undefined {
	return REQUEST_TYPE_GROUPS.find((g) => (g.types as readonly string[]).includes(rt))?.label;
}

export const PRICING_FIELDS = [
	// Chat / Text / Responses fields
	{
		key: "input_cost_per_token",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat", "embedding", "rerank", "audio", "image", "video"],
	},
	{
		key: "output_cost_per_token",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat", "rerank", "audio", "image", "video"],
	},
	{
		key: "input_cost_per_token_batches",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_batches", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "output_cost_per_token_batches",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_batches", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "input_cost_per_token_priority",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_priority", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "output_cost_per_token_priority",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_priority", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "input_cost_per_token_ultrafast",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_ultrafast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "output_cost_per_token_ultrafast",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_ultrafast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "input_cost_per_token_flex",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_flex", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "output_cost_per_token_flex",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_flex", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "input_cost_per_token_decisions",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_decisions", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["decisions"],
	},
	{
		key: "output_cost_per_token_decisions",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_decisions", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["decisions"],
	},
	{
		key: "input_cost_per_token_fast",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_fast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "output_cost_per_token_fast",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_fast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "input_cost_per_token_above_128k_tokens",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_above_128k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat", "embedding", "rerank"],
	},
	{
		key: "output_cost_per_token_above_128k_tokens",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_above_128k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat", "rerank", "audio"],
	},
	{
		key: "input_cost_per_token_above_100k_tokens",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_above_100k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat", "embedding", "rerank"],
	},
	{
		key: "output_cost_per_token_above_100k_tokens",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_above_100k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat", "rerank", "audio"],
	},
	{
		key: "input_cost_per_token_above_200k_tokens",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_above_200k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat", "embedding", "rerank"],
	},
	{
		key: "input_cost_per_token_above_200k_tokens_priority",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_above_200k_tokens_priority", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "output_cost_per_token_above_200k_tokens",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_above_200k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat", "rerank", "audio"],
	},
	{
		key: "output_cost_per_token_above_200k_tokens_priority",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_above_200k_tokens_priority", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "input_cost_per_token_above_272k_tokens",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_above_272k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "input_cost_per_token_above_272k_tokens_priority",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_above_272k_tokens_priority", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "output_cost_per_token_above_272k_tokens",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_above_272k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "output_cost_per_token_above_272k_tokens_priority",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_above_272k_tokens_priority", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "input_cost_per_token_flex_above_272k_tokens",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_flex_above_272k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "output_cost_per_token_flex_above_272k_tokens",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_flex_above_272k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "input_cost_per_token_above_272k_tokens_ultrafast",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_token_above_272k_tokens_ultrafast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "output_cost_per_token_above_272k_tokens_ultrafast",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_token_above_272k_tokens_ultrafast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_above_200k_tokens",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_above_200k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost_above_200k_tokens",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost_above_200k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_above_1hr",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_above_1hr", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_above_1hr_above_200k_tokens",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_above_1hr_above_200k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_above_100k_tokens",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_above_100k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost_above_100k_tokens",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost_above_100k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_above_1hr_above_100k_tokens",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_above_1hr_above_100k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost_priority",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost_priority", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost_ultrafast",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost_ultrafast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost_flex",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost_flex", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_fast",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_fast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_above_1hr_fast",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_above_1hr_fast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost_fast",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost_fast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost_above_200k_tokens_priority",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost_above_200k_tokens_priority", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost_above_272k_tokens",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost_above_272k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost_above_272k_tokens_priority",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost_above_272k_tokens_priority", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost_flex_above_272k_tokens",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost_flex_above_272k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_read_input_token_cost_above_272k_tokens_ultrafast",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_token_cost_above_272k_tokens_ultrafast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_priority",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_priority", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_ultrafast",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_ultrafast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_flex",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_flex", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_above_272k_tokens",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_above_272k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_flex_above_272k_tokens",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_flex_above_272k_tokens", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_above_272k_tokens_ultrafast",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_above_272k_tokens_ultrafast", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cache_creation_input_token_cost_above_272k_tokens_priority",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_token_cost_above_272k_tokens_priority", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "web_search_cost_per_request",
		get label() {
			return i18n.t("customPricing.fields.web_search_cost_per_request", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat", "rerank"],
	},
	{
		key: "input_cost_per_query",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_query", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["rerank"],
	},
	{
		key: "code_interpreter_cost_per_session",
		get label() {
			return i18n.t("customPricing.fields.code_interpreter_cost_per_session", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "inference_geo_us_multiplier",
		get label() {
			return i18n.t("customPricing.fields.inference_geo_us_multiplier", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat"],
	},
	{
		key: "cost_per_request",
		get label() {
			return i18n.t("customPricing.fields.cost_per_request", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat", "embedding", "rerank", "audio", "image", "video", "ocr"],
	},
	{
		key: "off_peak_cost_multiplier",
		get label() {
			return i18n.t("customPricing.fields.off_peak_cost_multiplier", { ns: "models" });
		},
		group: "chat",
		requestTypeGroups: ["chat", "embedding", "rerank", "audio", "image", "video", "ocr"],
	},
	// Audio fields
	{
		key: "input_cost_per_character",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_character", { ns: "models" });
		},
		group: "audio",
		requestTypeGroups: ["audio"],
	},
	{
		key: "input_cost_per_audio_token",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_audio_token", { ns: "models" });
		},
		group: "audio",
		requestTypeGroups: ["audio"],
	},
	{
		key: "input_cost_per_audio_per_second",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_audio_per_second", { ns: "models" });
		},
		group: "audio",
		requestTypeGroups: ["audio"],
	},
	{
		key: "input_cost_per_audio_per_second_above_128k_tokens",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_audio_per_second_above_128k_tokens", { ns: "models" });
		},
		group: "audio",
		requestTypeGroups: ["audio"],
	},
	{
		key: "input_cost_per_second",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_second", { ns: "models" });
		},
		group: "audio",
		requestTypeGroups: ["audio", "video"],
	},
	{
		key: "output_cost_per_audio_token",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_audio_token", { ns: "models" });
		},
		group: "audio",
		requestTypeGroups: ["audio"],
	},
	{
		key: "output_cost_per_second",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_second", { ns: "models" });
		},
		group: "audio",
		requestTypeGroups: ["audio", "video"],
	},
	{
		key: "cache_creation_input_audio_token_cost",
		get label() {
			return i18n.t("customPricing.fields.cache_creation_input_audio_token_cost", { ns: "models" });
		},
		group: "audio",
		requestTypeGroups: ["audio"],
	},
	// Image fields
	{
		key: "input_cost_per_image_token",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_image_token", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "input_cost_per_image",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_image", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "input_cost_per_image_above_128k_tokens",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_image_above_128k_tokens", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "input_cost_per_pixel",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_pixel", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_token",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_token", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_pixel",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_pixel", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_premium_image",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_premium_image", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_512_and_512_pixels",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_512_and_512_pixels", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_512_and_512_pixels_and_premium_image",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_512_and_512_pixels_and_premium_image", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1024_and_1024_pixels",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1024_and_1024_pixels", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1024_and_1024_pixels_and_premium_image",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1024_and_1024_pixels_and_premium_image", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1024_and_1536_pixels",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1024_and_1536_pixels", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1536_and_1024_pixels",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1536_and_1024_pixels", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_2048_and_2048_pixels",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_2048_and_2048_pixels", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_4096_and_4096_pixels",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_4096_and_4096_pixels", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_4_megapixels",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_4_megapixels", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_8_megapixels",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_8_megapixels", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_16_megapixels",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_16_megapixels", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_32_megapixels",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_32_megapixels", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_64_megapixels",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_64_megapixels", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_low_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_low_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_medium_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_medium_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_high_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_high_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_auto_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_auto_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1024_and_1024_pixels_low_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1024_and_1024_pixels_low_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1024_and_1536_pixels_low_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1024_and_1536_pixels_low_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1536_and_1024_pixels_low_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1536_and_1024_pixels_low_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1024_and_1024_pixels_medium_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1024_and_1024_pixels_medium_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1024_and_1536_pixels_medium_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1024_and_1536_pixels_medium_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1536_and_1024_pixels_medium_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1536_and_1024_pixels_medium_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1024_and_1024_pixels_high_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1024_and_1024_pixels_high_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1024_and_1536_pixels_high_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1024_and_1536_pixels_high_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1536_and_1024_pixels_high_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1536_and_1024_pixels_high_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1024_and_1024_pixels_standard_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1024_and_1024_pixels_standard_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1024_and_1536_pixels_standard_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1024_and_1536_pixels_standard_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "output_cost_per_image_above_1536_and_1024_pixels_standard_quality",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_image_above_1536_and_1024_pixels_standard_quality", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	{
		key: "cache_read_input_image_token_cost",
		get label() {
			return i18n.t("customPricing.fields.cache_read_input_image_token_cost", { ns: "models" });
		},
		group: "image",
		requestTypeGroups: ["image"],
	},
	// Video fields
	{
		key: "input_cost_per_video_per_second",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_video_per_second", { ns: "models" });
		},
		group: "video",
		requestTypeGroups: ["video"],
	},
	{
		key: "input_cost_per_video_per_second_above_128k_tokens",
		get label() {
			return i18n.t("customPricing.fields.input_cost_per_video_per_second_above_128k_tokens", { ns: "models" });
		},
		group: "video",
		requestTypeGroups: ["video"],
	},
	{
		key: "output_cost_per_video_per_second",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_video_per_second", { ns: "models" });
		},
		group: "video",
		requestTypeGroups: ["video"],
	},
	{
		key: "output_cost_per_video_per_second_480p",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_video_per_second_480p", { ns: "models" });
		},
		group: "video",
		requestTypeGroups: ["video"],
	},
	{
		key: "output_cost_per_video_per_second_720p",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_video_per_second_720p", { ns: "models" });
		},
		group: "video",
		requestTypeGroups: ["video"],
	},
	{
		key: "output_cost_per_video_per_second_1024p",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_video_per_second_1024p", { ns: "models" });
		},
		group: "video",
		requestTypeGroups: ["video"],
	},
	{
		key: "output_cost_per_video_per_second_1080p",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_video_per_second_1080p", { ns: "models" });
		},
		group: "video",
		requestTypeGroups: ["video"],
	},
	{
		key: "output_cost_per_video_per_second_4k",
		get label() {
			return i18n.t("customPricing.fields.output_cost_per_video_per_second_4k", { ns: "models" });
		},
		group: "video",
		requestTypeGroups: ["video"],
	},
	// OCR fields
	{
		key: "ocr_cost_per_page",
		get label() {
			return i18n.t("customPricing.fields.ocr_cost_per_page", { ns: "models" });
		},
		group: "ocr",
		requestTypeGroups: ["ocr"],
	},
	{
		key: "annotation_cost_per_page",
		get label() {
			return i18n.t("customPricing.fields.annotation_cost_per_page", { ns: "models" });
		},
		group: "ocr",
		requestTypeGroups: ["ocr"],
	},
] as const;

/** What a pricing field's number means, which decides how it is rendered. */
export type PricingFieldUnit = "token" | "character" | "currency" | "multiplier";

/**
 * Classifies a pricing field key by unit.
 *
 * Note the `_above_NNNk_tokens` strip: those suffixes name the *context tier* a
 * rate applies above, not the unit being priced. Without removing them first,
 * fields like `input_cost_per_audio_per_second_above_128k_tokens` and
 * `input_cost_per_image_above_128k_tokens` look token-priced when they are
 * priced per second and per image.
 */
export function pricingFieldUnit(key: string): PricingFieldUnit {
	if (key.endsWith("_multiplier")) return "multiplier";
	const withoutContextTier = key.replace(/_above_\d+k_tokens/g, "");
	// Before the token check: character-priced fields are scaled per 1M like
	// token pricing, but naming their unit "tokens" contradicts their label.
	if (withoutContextTier.includes("_per_character")) return "character";
	if (withoutContextTier.includes("token")) return "token";
	return "currency";
}

export type PricingFieldKey = (typeof PRICING_FIELDS)[number]["key"];

export const fieldLabelByKey = Object.defineProperties(
	{},
	Object.fromEntries(PRICING_FIELDS.map((field) => [field.key, { enumerable: true, get: () => field.label }])),
) as Record<PricingFieldKey, string>;
export const patchKeys = PRICING_FIELDS.map((field) => field.key) as PricingFieldKey[];

/**
 * Per-field numeric bounds for fields that are not plain "any non-negative
 * cost". Fields absent from this map keep the default `>= 0` rule.
 */
export const FIELD_BOUNDS: Partial<Record<PricingFieldKey, { min?: number; max?: number; message: string }>> = {
	// Every base rate is the peak price, so the off-peak multiplier can only
	// ever scale downward. A value of 0 would make off-peak requests free and a
	// value above 1 would make them cost more than peak; the pricing engine
	// rejects both and bills at peak, so reject them here too rather than
	// silently accepting a setting that will never take effect.
	off_peak_cost_multiplier: {
		min: 0,
		max: 1,
		get message() {
			return i18n.t("customPricing.validation.multiplierRange", { ns: "models" });
		},
	},
};

/**
 * Validates one raw form value for a pricing field. Returns an error message,
 * or undefined when the value is acceptable. An empty value is not an error —
 * it means "do not override this field".
 */
export function pricingFieldError(key: PricingFieldKey, raw: string | undefined): string | undefined {
	if (raw == null || raw.trim() === "") return undefined;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) return i18n.t("customPricing.validation.number", { ns: "models" });

	const bounds = FIELD_BOUNDS[key];
	if (bounds) {
		if (bounds.min != null && parsed <= bounds.min) return bounds.message;
		if (bounds.max != null && parsed > bounds.max) return bounds.message;
		return undefined;
	}
	if (parsed < 0) return i18n.t("customPricing.validation.nonNegative", { ns: "models" });
	return undefined;
}

export type FieldErrors = Partial<Record<PricingFieldKey | "name" | "scope" | "pattern" | "patch", string>>;

// ---------------------------------------------------------------------------
// Override form state
//
// Lives here rather than in pricingOverrideSheet.tsx so the patch-building
// logic can be unit tested without pulling the sheet's React tree in.
// ---------------------------------------------------------------------------

export type ScopeRoot = "global" | "virtual_key" | "user";

export interface FormState {
	name: string;
	scopeRoot: ScopeRoot;
	userID: string;
	virtualKeyID: string;
	providerID: string;
	providerKeyID: string;
	matchType: PricingOverrideMatchType;
	pattern: string;
	requestTypes: RequestType[];
	pricingValues: Partial<Record<PricingFieldKey, string>>;
	/**
	 * Patch fields this form does not render — currently `peak_hours`, which is
	 * a schedule object rather than a number and is set via the API or the
	 * datasheet. Carried through verbatim so opening and saving an override in
	 * the UI never silently drops what the form cannot display.
	 */
	preservedPatch: Record<string, unknown>;
}

export const defaultFormState: FormState = {
	name: "",
	scopeRoot: "global",
	userID: "",
	virtualKeyID: "",
	providerID: "",
	providerKeyID: "",
	matchType: "exact",
	pattern: "",
	requestTypes: [],
	pricingValues: {},
	preservedPatch: {},
};

/**
 * Patch keys the form cannot render as a number but still round-trips. Today
 * only the `peak_hours` schedule object. Anything outside this list that is
 * also outside `patchKeys` is a typo, and the JSON editor rejects it rather
 * than saving a key the pricing engine will ignore forever.
 */
export const PRESERVED_PATCH_KEYS: readonly string[] = ["peak_hours"];

/**
 * `__proto__` and friends are never valid pricing field names, and assigning
 * them onto a plain object walks into `Object.prototype`'s accessor instead of
 * creating an own property: the value is silently dropped and the object's
 * prototype is mutated. JSON.parse does create `__proto__` as an own property,
 * so a patch fetched from the API can carry one. Refuse to carry these keys at
 * every point where an arbitrary patch key is copied.
 */
export function isUnsafePatchKey(key: string): boolean {
	return key === "__proto__" || key === "constructor" || key === "prototype";
}

export function buildPatchFromForm(form: FormState): { patch: PricingOverridePatch; errors: FieldErrors } {
	const errors: FieldErrors = {};
	const patch: PricingOverridePatch = {};

	// Only keys the form cannot render ride through. A key the form does render
	// can still reach preservedPatch when the stored value was not a number, and
	// copying it here would resurrect that stale value even after the user
	// cleared the field. The rendered form stays authoritative for its own keys.
	for (const [key, value] of Object.entries(form.preservedPatch ?? {})) {
		if (isUnsafePatchKey(key) || patchKeys.includes(key as PricingFieldKey)) continue;
		(patch as Record<string, unknown>)[key] = value;
	}

	for (const key of patchKeys) {
		const raw = form.pricingValues[key];
		if (raw == null || raw.trim() === "") continue;
		const err = pricingFieldError(key, raw);
		if (err) {
			errors[key] = err;
			continue;
		}
		(patch as Record<string, number>)[key] = Number(raw);
	}

	return { patch, errors };
}