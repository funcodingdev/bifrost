import i18n from "@/lib/i18n";
import type { SemanticFallback, SemanticStatusInfo } from "@/lib/types/complexityRouter";

function complexityT(key: string) {
	return i18n.t(`routing.complexityUi.${key}`, { ns: "models" });
}

const FAILURE_KEYS: Partial<Record<NonNullable<SemanticStatusInfo["failure_reason"]>, string>> = {
	authentication: "failureAuthentication",
	model_unavailable: "failureModelUnavailable",
	rate_limited: "failureRateLimited",
	timeout: "failureTimeout",
	provider_unavailable: "failureProviderUnavailable",
	vector_store_unavailable: "failureVectorStore",
	invalid_response: "failureInvalidResponse",
	unknown: "failureUnknown",
};

export function semanticWarmupFailureMessage(status: SemanticStatusInfo): string {
	// Rolling deployments may briefly pair this UI with an older gateway that
	// only returns the former non-actionable message. Do not regress to it.
	if (status.error && !/check server logs/i.test(status.error)) return status.error;
	if (status.failure_reason) return complexityT(FAILURE_KEYS[status.failure_reason] ?? "failureUnknown");
	return complexityT("failureUnknown");
}

// Rules only pause when nothing else can name a tier: a saved llm or decision
// fallback is tried on every request while semantic warmup is failing, though
// it can itself fail or name no tier.
export function semanticWarmupImpactMessage(status: SemanticStatusInfo, fallback: SemanticFallback): string {
	if (status.serving_previous) {
		return "The previous classifier is still routing requests. Your latest phrase or embedding changes will become active after warmup succeeds.";
	}
	if (fallback !== "none") {
		const classifier = fallback === "llm" ? "the LLM classifier" : "the decision model";
		return `Until the classifier is ready, ${classifier} fallback classifies each request instead. Complexity-tier rules match only when it returns a tier. Other routing rules continue normally.`;
	}
	return "Complexity-tier rules are paused until the classifier is ready. Other routing rules continue normally.";
}