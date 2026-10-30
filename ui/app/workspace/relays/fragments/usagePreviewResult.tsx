import localeMessages from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { Relay, RelayUnitsMeasure, UsagePreview } from "@/lib/types/relays";

/** A USD amount with up to six decimals and no trailing zeros: $0.016, $0.0015. */
export const usd = (v: number) => `$${Number(v.toFixed(6))}`;

const MEASURE: Record<RelayUnitsMeasure, (path: string) => string> = {
	value: (path) => localeMessages.t("ui.upstream.theNumberAt", { ns: "common", v0: path }),
	chars: (path) => localeMessages.t("ui.upstream.theCharactersOf", { ns: "common", v0: path }),
	body_bytes: () => "the size of the body in bytes",
	body_chars: () => "the characters of the body",
};

function Code({ children }: { children: React.ReactNode }) {
	return <code className="bg-muted rounded px-1 font-mono text-xs">{children}</code>;
}

/**
 * The outcome of a pricing test, laid out like an itemized bill: what was charged, each part of the
 * formula with the relay's settings that produced it, and the formula written out with those numbers.
 */
export function UsagePreviewResult({ result, endpoint }: { result: UsagePreview; endpoint: Relay }) {
	const route = result.route_index === null ? null : endpoint.routes?.[result.route_index];
	// The server notes a request it would refuse with 400 before relaying it; that is not an upstream failure.
	const refusal = result.notes
		.find((n) => n.startsWith("the relay refuses this request with 400"))
		?.replace(/^the relay refuses this request with 400: ?/, "");
	const billedUnits = result.units_billed ?? 0;
	const unitCharge = result.units !== null && result.cost_per_unit > 0 ? billedUnits * result.cost_per_unit : 0;
	const rounding = [
		result.units_block_size > 1 ? localeMessages.t("ui.upstream.perStartedBlockOf", { ns: "common", v0: result.units_block_size }) : "",
		result.units_minimum > 0 ? `at least ${result.units_minimum}` : "",
	]
		.filter(Boolean)
		.join(", ");
	const formula = [
		usd(result.cost_per_request),
		result.cost_per_unit > 0 ? `${billedUnits} × ${usd(result.cost_per_unit)}` : "",
		result.extracted_cost !== null ? usd(result.extracted_cost) : "",
	]
		.filter(Boolean)
		.join(" + ");

	return (
		<div className="space-y-4 rounded-sm border p-4 text-sm" data-testid="relay-preview-result">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="text-muted-foreground text-xs">{localeMessages.t("ui.upstream.charged", { ns: "common" })}</div>
					<div className="font-mono text-2xl font-semibold" data-testid="relay-preview-cost">
						{usd(result.cost)}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="secondary" className="font-mono">
						{route
							? result.route_allowed
								? `${route.method} ${route.path}`
								: `${route.method} ${route.path} · disabled`
							: result.route_allowed
								? localeMessages.t("ui.upstream.noRouteRelayPricing", { ns: "common" })
								: localeMessages.t("ui.upstream.noRouteRefused", { ns: "common" })}
					</Badge>
					<Badge variant={result.counted ? "default" : "outline"}>
						{result.counted
							? localeMessages.t("ui.upstream.billable", { ns: "common" })
							: localeMessages.t("ui.upstream.notCharged", { ns: "common" })}
					</Badge>
					{result.streams && <Badge variant="outline">{localeMessages.t("ui.upstream.streamed", { ns: "common" })}</Badge>}
				</div>
			</div>

			{!result.route_allowed ? (
				<p className="text-muted-foreground">
					{route
						? localeMessages.t("ui.upstream.thisRouteIsDisabledSoThe", { ns: "common" })
						: localeMessages.t("ui.upstream.noRouteMatchesAndRelayAny", { ns: "common" })}
				</p>
			) : !result.counted ? (
				<p className="text-muted-foreground">
					{refusal
						? localeMessages.t("ui.upstream.theRelayRefusesThisRequest", { ns: "common", v0: refusal })
						: result.billable
							? localeMessages.t("ui.upstream.theUpstreamReplyIsNotA", { ns: "common" })
							: localeMessages.t("ui.upstream.thisRouteIsNotBillableSo", { ns: "common" })}
				</p>
			) : (
				<>
					<div className="overflow-hidden rounded-sm border">
						<Table className="table-fixed">
							<TableBody>
								<TableRow>
									<TableCell className="text-muted-foreground w-32 whitespace-nowrap">
										{localeMessages.t("ui.upstream.feePerCall", { ns: "common" })}
									</TableCell>
									<TableCell className="break-words whitespace-normal">
										{route?.usage?.cost_per_request !== undefined
											? localeMessages.t("ui.upstream.fromTheRouteOverride", { ns: "common" })
											: localeMessages.t("ui.upstream.fromTheRelayPricing", { ns: "common" })}
									</TableCell>
									<TableCell className="w-24 text-right font-mono whitespace-nowrap">{usd(result.cost_per_request)}</TableCell>
								</TableRow>
								{result.cost_per_unit > 0 && (
									<TableRow>
										<TableCell className="text-muted-foreground whitespace-nowrap">
											{localeMessages.t("ui.upstream.units", { ns: "common" })}
										</TableCell>
										<TableCell className="break-words whitespace-normal">
											{result.units === null ? (
												<>
													{localeMessages.t("ui.upstream.nothingFoundAt", { ns: "common" })} <Code>{result.units_path || "the body"}</Code>{" "}
													{localeMessages.t("ui.upstream.inThe", { ns: "common" })} {result.units_source}{" "}
													{localeMessages.t("ui.upstream.bodySoNoUnitsAreBilled", { ns: "common" })}
												</>
											) : (
												<>
													{result.units} {localeMessages.t("ui.upstream.readFrom", { ns: "common" })}{" "}
													{MEASURE[result.units_measure](result.units_path)} {localeMessages.t("ui.upstream.inThe", { ns: "common" })}{" "}
													{result.units_source} {localeMessages.t("ui.upstream.body", { ns: "common" })}
													{rounding && (
														<>
															{localeMessages.t("ui.upstream.billed", { ns: "common" })} {rounding}
														</>
													)}{" "}
													→{" "}
													<span className="font-medium">
														{billedUnits} {localeMessages.t("ui.upstream.billed2", { ns: "common" })}
													</span>{" "}
													× {usd(result.cost_per_unit)}
												</>
											)}
										</TableCell>
										<TableCell className="w-24 text-right font-mono whitespace-nowrap">{usd(unitCharge)}</TableCell>
									</TableRow>
								)}
								{result.extracted_cost !== null && (
									<TableRow>
										<TableCell className="text-muted-foreground whitespace-nowrap">
											{localeMessages.t("ui.upstream.reportedCost", { ns: "common" })}
										</TableCell>
										<TableCell className="break-words whitespace-normal">
											{localeMessages.t("ui.upstream.costTheUpstreamReportedInIts", { ns: "common" })}
										</TableCell>
										<TableCell className="w-24 text-right font-mono whitespace-nowrap">{usd(result.extracted_cost)}</TableCell>
									</TableRow>
								)}
								<TableRow>
									<TableCell className="font-medium">{localeMessages.t("ui.upstream.total2", { ns: "common" })}</TableCell>
									<TableCell />
									<TableCell className="w-24 text-right font-mono font-medium whitespace-nowrap">{usd(result.cost)}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
					<div className="bg-muted/50 rounded-sm px-3 py-2 font-mono text-xs" data-testid="relay-preview-formula">
						<span className="text-muted-foreground">
							{localeMessages.t("ui.upstream.feeBilledUnitsPricePerUnit", { ns: "common" })}
							{result.extracted_cost !== null ? " + reported cost" : ""} ={" "}
						</span>
						{formula} = {usd(result.cost)}
					</div>
				</>
			)}

			{(result.tokens || result.model) && (
				<div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
					{result.tokens && (
						<span>
							{localeMessages.t("ui.upstream.tokens", { ns: "common" })} {result.tokens.input} in, {result.tokens.output}{" "}
							{localeMessages.t("ui.upstream.out", { ns: "common" })}
							{result.tokens.total} {localeMessages.t("ui.upstream.totalLoggedButNotPriced", { ns: "common" })}
						</span>
					)}
					{result.model && (
						<span>
							{localeMessages.t("ui.upstream.model", { ns: "common" })} {result.model}
						</span>
					)}
				</div>
			)}
			{result.notes.length > 0 && (
				<ul className="text-muted-foreground list-disc space-y-0.5 pl-5 text-xs">
					{result.notes.map((n) => (
						<li key={n}>{n}</li>
					))}
				</ul>
			)}
		</div>
	);
}