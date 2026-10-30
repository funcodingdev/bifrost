import localeMessages from "@/lib/i18n";
import { formatLatency } from "@/app/workspace/dashboard/utils/chartUtils";
import BlockHeader from "@/app/workspace/logs/views/blockHeader";
import LogEntryDetailsView from "@/app/workspace/logs/views/logEntryDetailsView";
import { CopyInlineButton, HeroIdRow, HeroStat, StatusPill } from "@/app/workspace/logs/views/logHeroStat";
import PassthroughBodyBox from "@/app/workspace/logs/views/passthroughBodyBox";
import PluginLogsView from "@/app/workspace/logs/views/pluginLogsView";
import { OverheadBreakdown } from "@/components/logs/overheadBreakdown";
import { SheetNavigationButtons } from "@/components/sheetNavigationButtons";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alertDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdownMenu";
import { DottedSeparator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSheetNavigation } from "@/hooks/useSheetNavigation";
import { logAppDisplayName, mapAppToClientApp, mapUserAgentToApp, type Status } from "@/lib/constants/logs";
import { useGetRelayLogQuery, useGetUserAgentMappingsQuery } from "@/lib/store";
import type { RelayLog } from "@/lib/types/relays";
import { cn } from "@/lib/utils";
import { downloadAsJson } from "@/lib/utils/browser-download";
import { formatCompactNumber } from "@/lib/utils/numbers";
import { Link } from "@tanstack/react-router";
import { addMilliseconds, format, isValid } from "date-fns";
import { AlertCircle, ChevronDown, Download, Loader2, MoreVertical, Trash2, Waypoints, X } from "lucide-react";
import { useMemo, useState } from "react";

interface RelayLogDetailSheetProps {
	log: RelayLog | null;
	/** The selected row's id, so a row the list has paged out is still fetched and shown. */
	logId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	handleDelete?: (log: RelayLog) => Promise<void>;
	onNavigate?: (direction: "prev" | "next") => void;
	hasPrev?: boolean;
	hasNext?: boolean;
}

// Relay fees are tiny per call, so show them at the same precision the LLM sheet uses for
// sidecar costs rather than formatCost's 2-4 dp rounding.
export const formatCostPrecise = (value: number): string => `$${parseFloat(value.toFixed(6))}`;
const usd = (v?: number | null) => (v === undefined || v === null ? null : formatCostPrecise(v));

// The chat request type's colour on the LLM sheet (RequestTypeColors["chat.completion"]).
const RELAY_KIND_PILL_CLASS = "bg-blue-100 text-blue-800";

const KIND_LABELS: Record<RelayLog["kind"], string> = {
	call: localeMessages.t("ui.upstream.call", { ns: "common" }),
	job: localeMessages.t("ui.upstream.jobSettlement", { ns: "common" }),
};

type RelayLogFilterKey = "user_ids" | "team_ids" | "customer_ids" | "business_unit_ids" | "project_ids";

/** A governance attribution row that filters the Relay Logs list by the same id, as the LLM sheet's rows do. */
function AttributionLink({ label, id, name, filterKey }: { label: string; id?: string; name?: string; filterKey: RelayLogFilterKey }) {
	if (!id) return null;
	return (
		<LogEntryDetailsView
			className="w-full"
			label={label}
			value={
				<Tooltip>
					<TooltipTrigger asChild>
						<Link
							to="/workspace/relay-logs"
							search={(prev) => ({ ...prev, offset: 0, selected_log: "", [filterKey]: [id] })}
							className={cn(
								"block max-w-full min-w-0 cursor-pointer truncate text-sm font-normal text-blue-600 underline-offset-2 hover:underline dark:text-blue-400",
								!name && "font-mono",
							)}
							data-testid={`relay-log-${filterKey}-link`}
						>
							{name || id}
						</Link>
					</TooltipTrigger>
					<TooltipContent sideOffset={6}>
						{name ? id : localeMessages.t("ui.upstream.filterBy", { ns: "common", v0: label.toLowerCase() })}
					</TooltipContent>
				</Tooltip>
			}
		/>
	);
}

function HeadersGrid({ headers }: { headers: Record<string, string> }) {
	const entries = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b));
	if (entries.length === 0) return null;
	return (
		<div className="grid w-full grid-cols-1 items-start gap-4 md:grid-cols-3">
			{entries.map(([key, value]) => (
				<LogEntryDetailsView key={key} className="w-full" label={key} value={<code className="font-mono text-xs">{value}</code>} />
			))}
		</div>
	);
}

/** One Relay Logs row, rendered with the same hero card, disclosure and body boxes as the LLM log sheet. */
export function RelayLogDetailSheet({
	log,
	logId,
	open,
	onOpenChange,
	handleDelete,
	onNavigate,
	hasPrev = false,
	hasNext = false,
}: RelayLogDetailSheetProps) {
	// The list carries bodies already; the detail read refreshes a row the list has paged out.
	// currentData, not data: data keeps the previous log while the next one loads, and Delete and
	// Export must never act on it.
	const id = logId ?? log?.id ?? "";
	const { currentData: fetched, isFetching, isError } = useGetRelayLogQuery(id, { skip: !open || !id });
	const display = fetched ?? (log?.id === id ? log : null);
	const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
	const { prev: prevKeys, next: nextKeys } = useSheetNavigation({ enabled: open, hasPrev, hasNext, onNavigate: (d) => onNavigate?.(d) });

	const start = display ? new Date(display.timestamp) : null;
	const hasStart = start !== null && isValid(start);
	const hasLatency = display?.latency != null && !isNaN(display.latency);
	const end = hasStart && hasLatency ? addMilliseconds(start, display.latency as number) : null;
	const errorMessage = display?.error_details?.error?.message;
	const errorRaw = display?.error_details?.error?.error;
	const showError = !!display && (display.status === "error" || !!errorMessage);
	// The row stores the redacted query on the path; split it back out as the LLM sheet shows Path and Query.
	const queryIndex = display?.path.indexOf("?") ?? -1;
	const pathOnly = display ? (queryIndex >= 0 ? display.path.slice(0, queryIndex) : display.path) : "";
	const queryOnly = display && queryIndex >= 0 ? display.path.slice(queryIndex + 1) : "";
	const queryParams = useMemo(() => [...new URLSearchParams(queryOnly).entries()], [queryOnly]);
	const requestLine = display ? (display.kind === "job" ? `job ${display.job_id ?? "—"}` : `${display.method} ${pathOnly}`) : "";

	// Client app, mapped the same way the LLM sheet maps it: the backend-detected app first, then the User-Agent.
	const { data: userAgentMappingsData } = useGetUserAgentMappingsQuery(undefined, { skip: !open });
	const customAppIcons = useMemo(() => {
		const icons: Record<string, string> = {};
		for (const mapping of userAgentMappingsData?.mappings ?? []) {
			if (mapping.app && mapping.logo && mapping.logo_mime) {
				icons[mapping.app] = `data:${mapping.logo_mime};base64,${mapping.logo}`;
			}
		}
		return icons;
	}, [userAgentMappingsData?.mappings]);
	const detectedApp = display?.app ? mapAppToClientApp(display.app) : display?.user_agent ? mapUserAgentToApp(display.user_agent) : null;
	const detectedAppIcon = display?.app && detectedApp ? customAppIcons[display.app] || detectedApp.icon : detectedApp?.icon;
	const detectedAppLabel = detectedApp ? logAppDisplayName(detectedApp, display?.user_agent) : "";

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				className="border-secondary flex w-full flex-col gap-2 overflow-x-hidden border p-0 sm:max-w-[60%] 2xl:max-w-[40%]"
				data-testid="relay-log-details"
			>
				{!display ? (
					<div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center" data-testid="relay-log-details-empty">
						<SheetTitle className="sr-only">
							{isFetching
								? localeMessages.t("ui.upstream.loadingRelayLogDetails", { ns: "common" })
								: localeMessages.t("ui.upstream.relayLogNotFound", { ns: "common" })}
						</SheetTitle>
						{isFetching ? (
							<Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
						) : (
							<>
								<p className="text-muted-foreground text-sm">
									{isError
										? localeMessages.t("ui.upstream.thisRelayLogCouldNotBe", { ns: "common" })
										: localeMessages.t("ui.upstream.thisRelayLogNoLongerExists", { ns: "common" })}
								</p>
								<Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)} data-testid="relay-log-close-button">
									{localeMessages.t("ui.upstream.close", { ns: "common" })}
								</Button>
							</>
						)}
					</div>
				) : (
					<>
						{/* Breadcrumb header with actions, mirroring the LLM log sheet */}
						<div className="bg-card sticky -top-5 z-20 mx-4 flex items-center justify-between gap-3 pt-4 pb-2 md:mx-8 md:pt-8">
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<SheetNavigationButtons
									hasPrev={hasPrev}
									hasNext={hasNext}
									onNavigate={(d) => onNavigate?.(d)}
									prevKeys={prevKeys}
									nextKeys={nextKeys}
									entityLabel="log"
								/>
								<SheetTitle className="text-foreground text-sm font-medium">
									{localeMessages.t("ui.upstream.requestDetails", { ns: "common" })}
								</SheetTitle>
							</div>
							<div className="flex items-center gap-3">
								<AlertDialog>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												className="size-7"
												type="button"
												aria-label={localeMessages.t("ui.upstream.logActions", { ns: "common" })}
												data-testid="relay-log-actions"
											>
												<MoreVertical className="h-3 w-3" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												onSelect={() => downloadAsJson(display, `relay-log-${display.id}.json`)}
												data-testid="export-log-json"
											>
												<Download className="h-4 w-4" />
												{localeMessages.t("ui.upstream.exportAsJson", { ns: "common" })}
											</DropdownMenuItem>
											{handleDelete && (
												<>
													<DropdownMenuSeparator />
													<AlertDialogTrigger asChild>
														<DropdownMenuItem variant="destructive" data-testid="relay-log-delete">
															<Trash2 className="h-4 w-4" />
															{localeMessages.t("ui.upstream.delete", { ns: "common" })}
														</DropdownMenuItem>
													</AlertDialogTrigger>
												</>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>{localeMessages.t("ui.upstream.areYouSureYouWantTo", { ns: "common" })}</AlertDialogTitle>
											<AlertDialogDescription>
												{localeMessages.t("ui.upstream.thisActionCannotBeUndoneThis", { ns: "common" })}
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel data-testid="relay-log-delete-cancel">
												{localeMessages.t("ui.upstream.cancel", { ns: "common" })}
											</AlertDialogCancel>
											<AlertDialogAction
												data-testid="relay-log-delete-confirm"
												onClick={() =>
													handleDelete?.(display).then(
														() => onOpenChange(false),
														() => undefined,
													)
												}
											>
												{localeMessages.t("ui.upstream.delete", { ns: "common" })}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
								<Button
									variant="ghost"
									className="size-7"
									type="button"
									onClick={() => onOpenChange(false)}
									data-testid="relay-log-close-button"
									aria-label={localeMessages.t("ui.upstream.close", { ns: "common" })}
								>
									<X className="h-3 w-3" />
								</Button>
							</div>
						</div>

						<div className="flex flex-col gap-4 px-4 pb-4 md:px-8 md:pb-8">
							{/* Hero card: badges, identifiers and headline stats */}
							<div className="border-border rounded-sm border">
								<div className="flex items-start justify-between gap-6 px-5 pt-5 pb-4">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											{/* The kind pill wears the LLM sheet's chat colour, so the two headers read alike. */}
											<Badge variant="outline" className={cn("rounded-sm px-2 py-0.5 font-medium", RELAY_KIND_PILL_CLASS)}>
												{KIND_LABELS[display.kind]}
											</Badge>
											{display.streamed && (
												<Badge
													variant="outline"
													className="rounded-sm bg-teal-100 px-2 py-0.5 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
												>
													{localeMessages.t("ui.upstream.streamed", { ns: "common" })}
												</Badge>
											)}
											<StatusPill status={display.status as Status} />
											{!display.billable && (
												<Badge variant="outline" className="bg-card text-muted-foreground rounded-sm px-2 py-0.5 font-normal">
													{localeMessages.t("ui.upstream.notBillable", { ns: "common" })}
												</Badge>
											)}
										</div>
										<HeroIdRow
											label={display.kind === "job" ? "Job" : localeMessages.t("ui.upstream.route", { ns: "common" })}
											value={requestLine}
											testId="relay-log-copy-route-button"
											className="mt-3"
										/>
										<HeroIdRow
											label={localeMessages.t("ui.upstream.request2", { ns: "common" })}
											value={display.request_id}
											testId="relay-log-copy-request-id-button"
											className="mt-1"
										/>
										{display.route_path && (
											<HeroIdRow
												label={localeMessages.t("ui.upstream.matched", { ns: "common" })}
												value={display.route_path}
												className="mt-1"
											/>
										)}
										{display.virtual_key_name && (
											<HeroIdRow
												label={localeMessages.t("ui.upstream.virtualKey2", { ns: "common" })}
												value={display.virtual_key_name}
												className="mt-1"
											/>
										)}
									</div>
									<div className="flex shrink-0 items-center gap-1.5 rounded-sm border bg-white px-2 py-1 font-mono text-[12px] font-medium dark:bg-zinc-900">
										<Waypoints className="text-muted-foreground h-3.5 w-3.5" />
										{display.relay_name}
									</div>
								</div>
								<div className="border-border grid grid-cols-1 border-t sm:grid-cols-2 md:grid-cols-4">
									<HeroStat
										label={localeMessages.t("ui.upstream.latency", { ns: "common" })}
										valueClass="text-primary"
										value={hasLatency ? formatLatency(display.latency as number) : "—"}
										sub={hasStart ? (end ? `${format(start, "HH:mm:ss")} → ${format(end, "HH:mm:ss")}` : format(start, "HH:mm:ss")) : ""}
										hasRightBorder
									/>
									<HeroStat
										label={
											display.total_tokens
												? localeMessages.t("ui.upstream.tokensInOut", { ns: "common" })
												: localeMessages.t("ui.upstream.units", { ns: "common" })
										}
										mono
										value={
											display.total_tokens
												? `${formatCompactNumber(display.input_tokens ?? 0)} / ${formatCompactNumber(display.output_tokens ?? 0)}`
												: display.billed_units !== undefined
													? formatCompactNumber(display.billed_units)
													: display.units !== undefined
														? formatCompactNumber(display.units)
														: "—"
										}
										sub={
											display.total_tokens
												? localeMessages.t("ui.upstream.totalNotPriced", { ns: "common", v0: formatCompactNumber(display.total_tokens) })
												: display.billed_units !== undefined && display.units !== undefined && display.billed_units !== display.units
													? `${formatCompactNumber(display.units)} read`
													: display.model
														? display.model
														: ""
										}
										hasRightBorder
									/>
									<HeroStat
										label={localeMessages.t("ui.upstream.cost", { ns: "common" })}
										value={display.cost != null ? formatCostPrecise(display.cost) : "—"}
										sub={
											display.cost != null && display.billed_units
												? localeMessages.t("ui.upstream.perUnit", {
														ns: "common",
														v0: formatCostPrecise(display.cost / display.billed_units),
													})
												: display.cost_per_request != null
													? localeMessages.t("ui.upstream.perCall", { ns: "common", v0: formatCostPrecise(display.cost_per_request) })
													: display.cost == null
														? "not charged"
														: ""
										}
										hasRightBorder
									/>
									<HeroStat
										label={localeMessages.t("ui.upstream.bytesOut", { ns: "common" })}
										mono
										value={formatCompactNumber(display.bytes_out)}
										sub={display.bytes_out.toLocaleString()}
									/>
								</div>
							</div>

							{/* Collapsed secondary detail, the LLM sheet's "More details" */}
							<details
								className="group bg-card rounded-sm border"
								open={moreDetailsOpen}
								onToggle={(e) => setMoreDetailsOpen(e.currentTarget.open)}
								data-testid="relay-log-more-details"
							>
								<summary className="hover:bg-muted/30 flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition">
									<span className="text-foreground font-medium">{localeMessages.t("ui.upstream.moreDetails", { ns: "common" })}</span>
									<span className="text-muted-foreground flex items-center gap-2 text-xs">
										<span className="hidden md:inline">
											{localeMessages.t("ui.upstream.timingsCostRequestMetaHeaders", { ns: "common" })}
										</span>
										<ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
									</span>
								</summary>
								<div className="space-y-4 border-t px-4 py-4 md:px-6">
									<div className="space-y-4">
										<BlockHeader title={localeMessages.t("ui.upstream.timings", { ns: "common" })} />
										<div className="grid w-full grid-cols-1 items-center gap-4 md:grid-cols-3">
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.startTimestamp", { ns: "common" })}
												value={hasStart ? format(start, "yyyy-MM-dd hh:mm:ss aa") : "N/A"}
											/>
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.endTimestamp", { ns: "common" })}
												value={end ? format(end, "yyyy-MM-dd hh:mm:ss aa") : "N/A"}
											/>
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.latency", { ns: "common" })}
												tooltip={localeMessages.t("ui.upstream.totalEndToEndRequestTime", { ns: "common" })}
												value={
													hasLatency
														? `${(display.latency as number).toFixed(2)}ms`
														: localeMessages.t("ui.upstream.notRecorded", { ns: "common" })
												}
											/>
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.upstreamLatency", { ns: "common" })}
												tooltip={localeMessages.t("ui.upstream.timeSpentWaitingOnTheUpstream", { ns: "common" })}
												value={display.upstream_latency != null ? `${display.upstream_latency.toFixed(2)}ms` : "N/A"}
											/>
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.bifrostOverhead", { ns: "common" })}
												tooltip={localeMessages.t("ui.upstream.timeAddedByBifrostItselfRouting", { ns: "common" })}
												value={display.overhead_latency != null ? `${display.overhead_latency.toFixed(2)}ms` : "N/A"}
											/>
										</div>
										{display.overhead_breakdown && display.overhead_breakdown.length > 0 ? (
											<OverheadBreakdown buckets={display.overhead_breakdown} overheadMs={display.overhead_latency} />
										) : null}
									</div>
									<DottedSeparator />
									<div className="space-y-4" data-testid="relay-log-cost">
										<BlockHeader title={localeMessages.t("ui.upstream.cost", { ns: "common" })} />
										<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.charged", { ns: "common" })}
												value={usd(display.cost) ?? localeMessages.t("ui.upstream.notCharged", { ns: "common" })}
											/>
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.feePerCall", { ns: "common" })}
												value={usd(display.cost_per_request)}
											/>
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.pricePerUnit", { ns: "common" })}
												value={usd(display.cost_per_unit)}
											/>
											{display.units !== undefined && (
												<LogEntryDetailsView
													className="w-full"
													label={localeMessages.t("ui.upstream.unitsRead", { ns: "common" })}
													value={String(display.units)}
												/>
											)}
											{display.billed_units !== undefined && (
												<LogEntryDetailsView
													className="w-full"
													label={localeMessages.t("ui.upstream.unitsBilled", { ns: "common" })}
													value={String(display.billed_units)}
												/>
											)}
											{display.extracted_cost !== undefined && (
												<LogEntryDetailsView
													className="w-full"
													label={localeMessages.t("ui.upstream.reportedCost", { ns: "common" })}
													value={usd(display.extracted_cost)}
												/>
											)}
											{!!display.total_tokens && (
												<LogEntryDetailsView
													className="w-full"
													label={localeMessages.t("ui.upstream.tokensNotPriced", { ns: "common" })}
													value={`${display.input_tokens ?? 0} in / ${display.output_tokens ?? 0} out`}
												/>
											)}
										</div>
									</div>
									<DottedSeparator />
									<div className="space-y-4">
										<BlockHeader title={localeMessages.t("ui.upstream.requestDetails2", { ns: "common" })} />
										<div className="grid w-full grid-cols-1 items-start gap-4 md:grid-cols-3">
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.relay", { ns: "common" })}
												value={display.relay_name}
											/>
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.kind", { ns: "common" })}
												value={KIND_LABELS[display.kind]}
											/>
											{detectedApp && (
												<LogEntryDetailsView
													className="w-full"
													label={localeMessages.t("ui.upstream.app", { ns: "common" })}
													value={
														<div className="flex min-w-0 items-center gap-2" title={display.user_agent || undefined}>
															{detectedAppIcon ? (
																<img
																	className="rounded-sm"
																	src={detectedAppIcon}
																	alt={detectedAppLabel}
																	width={20}
																	height={20}
																	loading="lazy"
																	decoding="async"
																/>
															) : null}
															<span className="truncate">{detectedAppLabel}</span>
														</div>
													}
												/>
											)}
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.method", { ns: "common" })}
												value={display.method || "—"}
											/>
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.path", { ns: "common" })}
												value={pathOnly || "—"}
											/>
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.matchedRoute", { ns: "common" })}
												value={display.route_path || localeMessages.t("ui.upstream.none", { ns: "common" })}
											/>
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.billable", { ns: "common" })}
												value={display.billable ? "Yes" : "No"}
											/>
											<LogEntryDetailsView
												className="w-full"
												label={localeMessages.t("ui.upstream.streamed", { ns: "common" })}
												value={display.streamed ? "Yes" : "No"}
											/>
											{display.model && (
												<LogEntryDetailsView
													className="w-full"
													label={localeMessages.t("ui.upstream.model", { ns: "common" })}
													value={display.model}
												/>
											)}
											{display.job_id && (
												<LogEntryDetailsView
													className="w-full"
													label={localeMessages.t("ui.upstream.job", { ns: "common" })}
													value={`${display.job_id} (${display.job_status ?? "-"})`}
												/>
											)}
											{display.parent_log_id && (
												<LogEntryDetailsView
													className="w-full"
													label={localeMessages.t("ui.upstream.parentLog", { ns: "common" })}
													value={<code className="font-mono text-xs">{display.parent_log_id}</code>}
												/>
											)}
											{display.virtual_key_id && (
												<LogEntryDetailsView
													className="w-full"
													label={localeMessages.t("ui.upstream.virtualKey2", { ns: "common" })}
													value={
														<Link
															to="/workspace/governance/virtual-keys"
															search={{ selected_vk: display.virtual_key_id }}
															className="text-blue-600 hover:underline dark:text-blue-400"
															data-testid="relay-log-virtual-key-link"
														>
															{display.virtual_key_name || display.virtual_key_id}
														</Link>
													}
												/>
											)}
											<AttributionLink
												label={localeMessages.t("ui.upstream.user", { ns: "common" })}
												id={display.user_id}
												name={display.user_name}
												filterKey="user_ids"
											/>
											<AttributionLink
												label={localeMessages.t("ui.upstream.team", { ns: "common" })}
												id={display.team_id}
												name={display.team_name}
												filterKey="team_ids"
											/>
											<AttributionLink
												label={localeMessages.t("ui.upstream.customer", { ns: "common" })}
												id={display.customer_id}
												name={display.customer_name}
												filterKey="customer_ids"
											/>
											<AttributionLink
												label={localeMessages.t("ui.upstream.businessUnit2", { ns: "common" })}
												id={display.business_unit_id}
												name={display.business_unit_name}
												filterKey="business_unit_ids"
											/>
											<AttributionLink
												label={localeMessages.t("ui.upstream.project", { ns: "common" })}
												id={display.project_id}
												name={display.project_name}
												filterKey="project_ids"
											/>
										</div>
									</div>
									{queryParams.length > 0 && (
										<>
											<DottedSeparator />
											{/* Laid out like Matched Headers below: one field per parameter, full value on hover. Names
											    are shown as sent, since query parameters are case-sensitive. */}
											<div className="space-y-4" data-testid="relay-log-query">
												<BlockHeader title={localeMessages.t("ui.upstream.queryParameters", { ns: "common" })} />
												<div className="grid w-full grid-cols-1 items-start gap-4 md:grid-cols-3">
													{queryParams.map(([key, value], i) => (
														<LogEntryDetailsView key={`${key}-${i}`} className="w-full" label={key} rawLabel value={value || "—"} />
													))}
												</div>
											</div>
										</>
									)}
									{display.metadata && Object.keys(display.metadata).length > 0 && (
										<>
											<DottedSeparator />
											<div className="space-y-4">
												<BlockHeader title={localeMessages.t("ui.upstream.metadata", { ns: "common" })} />
												<div className="grid w-full grid-cols-1 items-start justify-between gap-4 md:grid-cols-3">
													{Object.entries(display.metadata)
														.sort(([a], [b]) => a.localeCompare(b))
														.map(([key, value]) => (
															<LogEntryDetailsView key={key} className="w-full" label={key} value={String(value)} />
														))}
												</div>
											</div>
										</>
									)}
									{display.request_headers && Object.keys(display.request_headers).length > 0 && (
										<>
											<DottedSeparator />
											<div className="space-y-4">
												<BlockHeader title={localeMessages.t("ui.upstream.matchedHeaders", { ns: "common" })} />
												<HeadersGrid headers={display.request_headers} />
											</div>
										</>
									)}
								</div>
							</details>

							{showError && (
								<div
									className="rounded-sm border border-red-200 bg-red-50/70 p-5 dark:border-red-900 dark:bg-red-950/30"
									data-testid="relay-log-error"
								>
									<div className="flex items-center gap-2 text-red-700 dark:text-red-400">
										<AlertCircle className="h-4 w-4 shrink-0" />
										<span className="text-[12.5px] font-semibold">{localeMessages.t("ui.upstream.error", { ns: "common" })}</span>
										{errorMessage ? <CopyInlineButton text={errorMessage} /> : null}
									</div>
									<div className="mt-2 text-[13px] leading-relaxed break-words whitespace-pre-wrap text-red-700 dark:text-red-400">
										{errorMessage ??
											(display.status_code
												? localeMessages.t("ui.upstream.theRelayReturnedAnError", { ns: "common", v0: display.status_code })
												: localeMessages.t("ui.upstream.theRelayReturnedAnErrorWithout", { ns: "common" }))}
									</div>
									{errorRaw != null ? (
										<details className="group mt-3 rounded-sm border border-red-200/70 bg-white/40 dark:border-red-900/70 dark:bg-red-950/40">
											<summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-[12px] text-red-700 hover:bg-red-50/80 dark:text-red-400 dark:hover:bg-red-950/60">
												<span className="font-medium">{localeMessages.t("ui.upstream.details", { ns: "common" })}</span>
												<ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
											</summary>
											<div className="custom-scrollbar max-h-[400px] overflow-y-auto border-t border-red-200/70 px-3 py-2 font-mono text-[11.5px] leading-[1.6] break-words whitespace-pre-wrap text-red-900 dark:border-red-900/70 dark:text-red-300">
												{typeof errorRaw === "string" ? errorRaw : JSON.stringify(errorRaw, null, 2)}
											</div>
										</details>
									) : null}
								</div>
							)}

							{display.content_hidden ? (
								<div className="text-muted-foreground rounded-sm border px-4 py-3 text-sm" data-testid="relay-log-content-hidden">
									{localeMessages.t("ui.upstream.contentLoggingHasBeenDisabledFor", { ns: "common" })}
								</div>
							) : (
								<>
									{display.request_body && (
										<PassthroughBodyBox
											title={localeMessages.t("ui.upstream.requestBody", { ns: "common" })}
											body={display.request_body}
											testId="relay-log-request-body"
										/>
									)}
									{display.response_body && display.status !== "processing" && (
										<PassthroughBodyBox
											title={localeMessages.t("ui.upstream.responseBody", { ns: "common" })}
											body={display.response_body}
											testId="relay-log-response-body"
										/>
									)}
								</>
							)}
							{display.plugin_logs && (
								<div data-testid="relay-log-plugin-logs">
									<PluginLogsView pluginLogs={display.plugin_logs} />
								</div>
							)}
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}