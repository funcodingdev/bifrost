import localeMessages from "@/lib/i18n";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecretVarInput } from "@/components/ui/secretVarInput";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage, useGetCoreConfigQuery, useUpdateRelayMutation } from "@/lib/store";
import type { Relay } from "@/lib/types/relays";
import { relayFormSchema, type RelayFormValues } from "@/lib/types/schemas";
import { cn } from "@/lib/utils";
import { toRelayConfig, toRelayForm } from "@/lib/utils/relayForm";
import { RbacOperation, RbacResource, useRbac } from "@enterprise/lib";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Info, Waypoints } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, type Control, type FieldValues } from "react-hook-form";
import { secondsToHumanReadable } from "@/lib/utils/strings";
import { toast } from "sonner";
import { CredentialFields } from "../fragments/credentialFields";
import { HeaderPairsTable } from "../fragments/headerPairsTable";
import { InfoLabel } from "../fragments/infoLabel";
import { UsageFields } from "../fragments/usageFields";

const TABS = [
	{ id: "general", label: localeMessages.t("ui.upstream.general", { ns: "common" }) },
	{ id: "authentication", label: localeMessages.t("ui.upstream.authentication", { ns: "common" }) },
	{ id: "advanced", label: localeMessages.t("ui.upstream.advanced", { ns: "common" }) },
	{ id: "network", label: localeMessages.t("ui.upstream.network", { ns: "common" }) },
	{ id: "proxy", label: localeMessages.t("ui.upstream.proxy", { ns: "common" }) },
] as const;

// Which tab a validation error belongs to, so a refused save opens the tab that needs fixing.
const FIELD_TAB: Record<string, string> = {
	name: "general",
	description: "general",
	base_url: "general",
	auth: "authentication",
	credential_value: "authentication",
	aws: "authentication",
	usage: "general",
	streaming: "advanced",
	extra_headers: "advanced",
	network: "network",
	proxy: "proxy",
};

function SwitchField({
	control,
	name,
	label,
	description,
	disabled,
	testId,
}: {
	control: Control<RelayFormValues>;
	name: "skip_route_check" | "ignore_upstream_cost" | "network.insecure_skip_verify";
	label: string;
	description: string;
	disabled?: boolean;
	testId: string;
}) {
	return (
		<FormField
			control={control}
			name={name}
			render={({ field }) => (
				<FormItem className="flex flex-row items-center justify-between">
					<InfoLabel label={label} info={description} />
					<FormControl>
						<Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={disabled} data-testid={testId} />
					</FormControl>
				</FormItem>
			)}
		/>
	);
}

/** The endpoint's configuration, in the same tabbed sheet shape as a provider's configuration. */
export function EndpointConfigSheet({ show, onCancel, endpoint }: { show: boolean; onCancel: () => void; endpoint: Relay }) {
	const canUpdate = useRbac(RbacResource.Relays, RbacOperation.Update);
	const [updateEndpoint, { isLoading }] = useUpdateRelayMutation();
	const [tab, setTab] = useState<string>("general");
	const form = useForm<RelayFormValues>({
		resolver: zodResolver(relayFormSchema),
		mode: "onChange",
		defaultValues: toRelayForm(endpoint),
	});
	const proxyType = form.watch("proxy.type");
	// A relay with no proxy set uses the global proxy only when it is on for inference (as providers
	// do); otherwise it connects directly, so that is what the unset select shows.
	const { data: coreConfig } = useGetCoreConfigQuery({ fromDB: true });
	const globalProxy = coreConfig?.proxy_config;
	const inheritsGlobalProxy = !!globalProxy?.enabled && !!globalProxy.enable_for_inference && !!globalProxy.url?.trim();
	const skipRouteCheck = form.watch("skip_route_check");

	// Every open starts from the latest endpoint, so edits abandoned on close (or routes changed
	// since) are never saved back. A refetch while the sheet stays open does not overwrite unsaved edits.
	const wasShown = useRef(false);
	useEffect(() => {
		const opened = show && !wasShown.current;
		wasShown.current = show;
		if (opened || (show && !form.formState.isDirty)) form.reset(toRelayForm(endpoint));
	}, [show, endpoint, form]);

	const onSubmit = async (values: RelayFormValues) => {
		try {
			const saved = await updateEndpoint({ name: endpoint.name, data: toRelayConfig(values) }).unwrap();
			form.reset(toRelayForm(saved));
			toast.success(localeMessages.t("ui.upstream.relayConfigurationUpdatedSuccessfully", { ns: "common" }));
		} catch (e) {
			toast.error(localeMessages.t("ui.upstream.failedToUpdateRelayConfiguration", { ns: "common" }), { description: getErrorMessage(e) });
		}
	};
	const onInvalid = (errors: Record<string, unknown>) => {
		const first = Object.keys(errors)[0];
		if (!first) return;
		if (FIELD_TAB[first]) {
			setTab(FIELD_TAB[first]);
			return;
		}
		// A field this sheet has no input for (routes are edited elsewhere): say so instead of refusing silently.
		toast.error(localeMessages.t("ui.upstream.relayConfigurationIsInvalid", { ns: "common" }), {
			description: `Fix the "${first}" field before saving.`,
		});
	};

	const saveButton = (label: string) => (
		<div className="bg-card sticky bottom-0 z-10 -mx-4 flex justify-end space-x-2 rounded-b-sm border-t px-4 py-4 md:-mx-6 md:px-6">
			<Button
				type="submit"
				disabled={!form.formState.isDirty || !canUpdate || isLoading}
				isLoading={isLoading}
				data-testid={`relay-save-${label.toLowerCase()}`}
			>
				{localeMessages.t("ui.upstream.save", { ns: "common" })} {label} {localeMessages.t("ui.upstream.configuration", { ns: "common" })}
			</Button>
		</div>
	);
	const usageControl = form.control as unknown as Control<FieldValues>;

	return (
		<Sheet open={show} onOpenChange={(open) => !open && onCancel()}>
			<SheetContent className="p-0 pt-4 sm:max-w-[50%]" data-testid="relay-config-sheet">
				<SheetHeader className="flex flex-col items-start py-4" headerClassName="mb-0 sticky -top-4 bg-card z-10 px-4 md:px-8">
					<SheetTitle>
						<div className="font-lg flex items-center gap-2">
							<Waypoints className="h-5 w-5" />
							{localeMessages.t("ui.upstream.relayConfiguration", { ns: "common" })}
						</div>
					</SheetTitle>
				</SheetHeader>
				<div className="px-4 py-4 md:px-8">
					<div className="w-full rounded-sm border">
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
								<Tabs value={tab} onValueChange={setTab}>
									<div className="mb-4 w-full">
										<TabsList className="h-10 w-max min-w-full justify-start rounded-tl-sm rounded-tr-sm rounded-br-none rounded-bl-none">
											{TABS.map((t) => (
												<TabsTrigger key={t.id} value={t.id} data-testid={`relay-tab-${t.id}`} className="flex-none px-3 whitespace-nowrap">
													{t.label}
												</TabsTrigger>
											))}
										</TabsList>
									</div>

									<TabsContent value="general" className="space-y-6 px-4 md:px-6">
										<FormField
											control={form.control}
											name="base_url"
											render={({ field }) => (
												<FormItem>
													<InfoLabel
														label={localeMessages.t("ui.upstream.baseUrlRequired", { ns: "common" })}
														info={localeMessages.t("ui.upstream.everyRequestIsPinnedUnderThis", { ns: "common" })}
													/>
													<FormControl>
														<Input placeholder="https://api.example.com" disabled={!canUpdate} data-testid="relay-base-url" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="description"
											render={({ field }) => (
												<FormItem>
													<InfoLabel
														label={localeMessages.t("ui.upstream.descriptionOptional", { ns: "common" })}
														info={localeMessages.t("ui.upstream.shownInTheRelayListFor", { ns: "common" })}
													/>
													<FormControl>
														<Textarea rows={2} disabled={!canUpdate} {...field} value={field.value ?? ""} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<SwitchField
											control={form.control}
											name="skip_route_check"
											label={localeMessages.t("ui.upstream.relayAnyPath", { ns: "common" })}
											description={localeMessages.t("ui.upstream.relayRequestsThatMatchNoRoute", { ns: "common" })}
											disabled={!canUpdate}
											testId="relay-skip-route-check"
										/>
										{skipRouteCheck && (
											<Alert variant="warning" data-testid="relay-all-routes-warning">
												<AlertTriangle className="h-4 w-4" />
												<AlertDescription>{localeMessages.t("ui.upstream.everyPathOnTheUpstreamIs", { ns: "common" })}</AlertDescription>
											</Alert>
										)}
										<Separator />
										<div className="space-y-1">
											<div className="text-sm font-medium">{localeMessages.t("ui.upstream.pricing", { ns: "common" })}</div>
											<p className="text-muted-foreground text-sm">
												{localeMessages.t("ui.upstream.theDefaultPriceOfACounted", { ns: "common" })}
											</p>
										</div>
										<UsageFields
											control={usageControl}
											name="usage"
											value={form.watch("usage")}
											disabled={!canUpdate}
											ignoreUpstreamCost={form.watch("ignore_upstream_cost")}
											testIdPrefix="relay-usage"
										/>
										{saveButton(localeMessages.t("ui.upstream.general", { ns: "common" }))}
									</TabsContent>

									<TabsContent value="authentication" className="space-y-6 px-4 md:px-6">
										<CredentialFields form={form} disabled={!canUpdate} />
										{saveButton(localeMessages.t("ui.upstream.authentication", { ns: "common" }))}
									</TabsContent>

									<TabsContent value="advanced" className="space-y-6 px-4 md:px-6">
										<div className="text-sm font-medium">{localeMessages.t("ui.upstream.streaming", { ns: "common" })}</div>
										<FormField
											control={form.control}
											name="streaming.paths"
											render={({ field }) => (
												<FormItem>
													<InfoLabel
														label={localeMessages.t("ui.upstream.alwaysStreamPathsOptional", { ns: "common" })}
														info={localeMessages.t("ui.upstream.oneRouteGlobPerLineMatching", { ns: "common" })}
													/>
													<FormControl>
														<Textarea
															rows={3}
															className="font-mono text-xs"
															placeholder="/v1/chat/**"
															disabled={!canUpdate}
															data-testid="relay-streaming-paths"
															value={field.value.join("\n")}
															onChange={(e) => field.onChange(e.target.value.split("\n"))}
															onBlur={() => field.onChange(field.value.map((p) => p.trim()).filter(Boolean))}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<Separator />
										<div className="text-sm font-medium">{localeMessages.t("ui.upstream.usageExtraction", { ns: "common" })}</div>
										<div className="flex w-full flex-row items-start gap-4">
											{(
												[
													[
														"cost_path",
														localeMessages.t("ui.upstream.reportedCostPathOptional", { ns: "common" }),
														"usage.cost",
														localeMessages.t("ui.upstream.aUsdCostTheUpstreamReports", { ns: "common" }),
													],
													[
														"model_path",
														localeMessages.t("ui.upstream.modelPathOptional", { ns: "common" }),
														"model",
														localeMessages.t("ui.upstream.whereTheModelIsReadFrom", { ns: "common" }),
													],
												] as const
											).map(([key, label, placeholder, description]) => (
												<FormField
													key={key}
													control={form.control}
													name={`usage.${key}`}
													render={({ field }) => (
														<FormItem className="flex-1">
															<InfoLabel label={label} info={description} />
															<FormControl>
																<Input
																	placeholder={placeholder}
																	disabled={!canUpdate}
																	data-testid={`relay-${key.replaceAll("_", "-")}`}
																	value={field.value ?? ""}
																	onChange={(e) => field.onChange(e.target.value || undefined)}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											))}
											<FormField
												control={form.control}
												name="usage.model_source"
												render={({ field }) => (
													<FormItem className="w-40">
														<InfoLabel
															label={localeMessages.t("ui.upstream.modelSource", { ns: "common" })}
															info={localeMessages.t("ui.upstream.whetherModelPathNamesAField", { ns: "common" })}
														/>
														<Select onValueChange={field.onChange} value={field.value ?? "body"} disabled={!canUpdate}>
															<FormControl>
																<SelectTrigger data-testid="relay-model-source">
																	<SelectValue />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																<SelectItem value="body">{localeMessages.t("ui.upstream.body2", { ns: "common" })}</SelectItem>
																<SelectItem value="query">{localeMessages.t("ui.upstream.query", { ns: "common" })}</SelectItem>
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
										<SwitchField
											control={form.control}
											name="ignore_upstream_cost"
											label={localeMessages.t("ui.upstream.ignoreReportedCost", { ns: "common" })}
											description={localeMessages.t("ui.upstream.chargeOnlyYourFeeAndUnit", { ns: "common" })}
											disabled={!canUpdate}
											testId="relay-ignore-upstream-cost"
										/>
										<div className="flex w-full flex-row items-start gap-4">
											{(
												[
													["input_tokens_path", localeMessages.t("ui.upstream.inputTokensPath", { ns: "common" })],
													["output_tokens_path", localeMessages.t("ui.upstream.outputTokensPath", { ns: "common" })],
													["total_tokens_path", localeMessages.t("ui.upstream.totalTokensPath", { ns: "common" })],
												] as const
											).map(([key, label]) => (
												<FormField
													key={key}
													control={form.control}
													name={`usage.${key}`}
													render={({ field }) => (
														<FormItem className="flex-1">
															<InfoLabel
																label={label}
																info={localeMessages.t("ui.upstream.recordedOnRelayLogsNeverPriced", { ns: "common" })}
															/>
															<FormControl>
																<Input
																	placeholder="usage.prompt_tokens"
																	disabled={!canUpdate}
																	value={field.value ?? ""}
																	onChange={(e) => field.onChange(e.target.value || undefined)}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											))}
										</div>
										<Separator />
										<div className="space-y-2">
											<InfoLabel
												label={localeMessages.t("ui.upstream.extraHeadersOptional", { ns: "common" })}
												info={localeMessages.t("ui.upstream.sentOnEveryRequestACaller", { ns: "common" })}
												inForm={false}
											/>
											<HeaderPairsTable
												value={form.watch("extra_headers")}
												onChange={(pairs) => form.setValue("extra_headers", pairs, { shouldDirty: true, shouldValidate: true })}
												errors={form.formState.errors.extra_headers}
												keyPlaceholder="X-Tenant"
												valuePlaceholder="value or env.HEADER_VALUE"
												disabled={!canUpdate}
												useSecretVarInput
												testIdPrefix="relay-extra-header"
											/>
										</div>
										{saveButton(localeMessages.t("ui.upstream.advanced", { ns: "common" }))}
									</TabsContent>

									<TabsContent value="network" className="space-y-6 px-4 md:px-6">
										<Alert>
											<Info className="h-4 w-4" />
											<AlertDescription>{localeMessages.t("ui.upstream.howBifrostTalksToTheUpstream", { ns: "common" })}</AlertDescription>
										</Alert>
										{/* Laid out as the provider config's Network tab: plain labels, the help text under each input. */}
										<div className="flex w-full flex-row items-start gap-4">
											<FormField
												control={form.control}
												name="network.timeout_seconds"
												render={({ field }) => (
													<FormItem className="flex-1">
														<FormLabel>{localeMessages.t("ui.upstream.timeoutSeconds", { ns: "common" })}</FormLabel>
														<FormControl>
															<Input
																placeholder="60"
																disabled={!canUpdate}
																value={field.value === undefined || Number.isNaN(field.value) ? "" : field.value}
																onChange={(e) => {
																	const value = e.target.value;
																	if (value === "") {
																		field.onChange(undefined);
																		return;
																	}
																	const parsed = Number(value);
																	if (!Number.isNaN(parsed)) field.onChange(parsed);
																}}
															/>
														</FormControl>
														<FormDescription>
															{field.value ? `${secondsToHumanReadable(field.value)}. ` : ""}
															{localeMessages.t("ui.upstream.longestABufferedCallMayTake", { ns: "common" })}
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="network.stream_idle_timeout_in_seconds"
												render={({ field }) => (
													<FormItem className="flex-1">
														<FormLabel>{localeMessages.t("ui.upstream.streamIdleTimeoutSeconds", { ns: "common" })}</FormLabel>
														<FormControl>
															<Input
																placeholder="60"
																disabled={!canUpdate}
																value={field.value === undefined || Number.isNaN(field.value) ? "" : field.value}
																onChange={(e) => {
																	const value = e.target.value;
																	if (value === "") {
																		field.onChange(undefined);
																		return;
																	}
																	const parsed = Number(value);
																	if (!Number.isNaN(parsed)) field.onChange(parsed);
																}}
															/>
														</FormControl>
														<FormDescription>
															{field.value ? `${secondsToHumanReadable(field.value)}. ` : ""}
															{localeMessages.t("ui.upstream.aStreamIsClosedWhenNo", { ns: "common" })}
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="network.max_conns_per_host"
												render={({ field }) => (
													<FormItem className="flex-1">
														<FormLabel>{localeMessages.t("ui.upstream.maxConnectionsPerHost", { ns: "common" })}</FormLabel>
														<FormControl>
															<Input
																placeholder="5000"
																disabled={!canUpdate}
																value={field.value === undefined || Number.isNaN(field.value) ? "" : field.value}
																onChange={(e) => {
																	const value = e.target.value;
																	if (value === "") {
																		field.onChange(undefined);
																		return;
																	}
																	const parsed = Number(value);
																	if (!Number.isNaN(parsed)) field.onChange(parsed);
																}}
															/>
														</FormControl>
														<FormDescription>
															{localeMessages.t("ui.upstream.upperBoundOnOpenConnectionsTo", { ns: "common" })}
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
										<SwitchField
											control={form.control}
											name="network.insecure_skip_verify"
											label={localeMessages.t("ui.upstream.insecureSkipVerify", { ns: "common" })}
											description={localeMessages.t("ui.upstream.skipTlsVerificationOfTheUpstream", { ns: "common" })}
											disabled={!canUpdate}
											testId="relay-insecure-skip-verify"
										/>
										<FormField
											control={form.control}
											name="network.ca_cert_pem"
											render={({ field }) => (
												<FormItem>
													<InfoLabel
														label={localeMessages.t("ui.upstream.caCertificatePemOptional", { ns: "common" })}
														info={localeMessages.t("ui.upstream.aCaBundleToTrustWhen", { ns: "common" })}
													/>
													<FormControl>
														<Textarea
															rows={5}
															className="font-mono text-xs"
															placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
															disabled={!canUpdate}
															{...field}
															value={field.value ?? ""}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										{saveButton(localeMessages.t("ui.upstream.network", { ns: "common" }))}
									</TabsContent>

									<TabsContent value="proxy" className="space-y-6 px-4 md:px-6">
										<Alert>
											<Info className="h-4 w-4" />
											<AlertDescription>
												{localeMessages.t("ui.upstream.sendsThisRelaySOutboundTraffic", { ns: "common" })}
											</AlertDescription>
										</Alert>
										<FormField
											control={form.control}
											name="proxy.type"
											render={({ field }) => (
												<FormItem>
													<InfoLabel
														label={localeMessages.t("ui.upstream.proxyType", { ns: "common" })}
														info={localeMessages.t("ui.upstream.httpOrSocks5SendsTrafficThrough", { ns: "common" })}
													/>
													<Select
														onValueChange={field.onChange}
														value={field.value === "inherit" ? (inheritsGlobalProxy ? "" : "none") : field.value}
														disabled={!canUpdate}
													>
														<FormControl>
															<SelectTrigger className="w-48" data-testid="relay-proxy-type">
																<SelectValue placeholder={localeMessages.t("ui.upstream.globalProxy", { ns: "common" })} />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															<SelectItem value="none">{localeMessages.t("ui.upstream.noneDirect", { ns: "common" })}</SelectItem>
															<SelectItem value="http">HTTP</SelectItem>
															<SelectItem value="socks5">SOCKS5</SelectItem>
															<SelectItem value="environment">{localeMessages.t("ui.upstream.environment", { ns: "common" })}</SelectItem>
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
										<div
											className={cn(
												"space-y-4 pt-2",
												(proxyType === "inherit" || proxyType === "none" || proxyType === "environment") && "hidden",
											)}
										>
											<FormField
												control={form.control}
												name="proxy.url"
												render={({ field }) => (
													<FormItem>
														<InfoLabel
															label={localeMessages.t("ui.upstream.proxyUrl", { ns: "common" })}
															info={localeMessages.t("ui.upstream.theProxyAddressOrAnEnv", { ns: "common" })}
														/>
														<FormControl>
															<SecretVarInput
																placeholder="http://proxy.example.com or env.PROXY_URL"
																disabled={!canUpdate}
																data-testid="relay-proxy-url"
																{...field}
																value={field.value}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
												<FormField
													control={form.control}
													name="proxy.username"
													render={({ field }) => (
														<FormItem>
															<FormLabel>{localeMessages.t("ui.upstream.username", { ns: "common" })}</FormLabel>
															<FormControl>
																<SecretVarInput
																	placeholder="Proxy username or env.PROXY_USERNAME"
																	disabled={!canUpdate}
																	{...field}
																	value={field.value}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name="proxy.password"
													render={({ field }) => (
														<FormItem>
															<FormLabel>{localeMessages.t("ui.upstream.password", { ns: "common" })}</FormLabel>
															<FormControl>
																<SecretVarInput
																	type="password"
																	placeholder="Proxy password or env.PROXY_PASSWORD"
																	hideValueWhenEnv
																	redactNonEnvValue
																	disabled={!canUpdate}
																	{...field}
																	value={field.value}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>
											<FormField
												control={form.control}
												name="proxy.ca_cert_pem"
												render={({ field }) => (
													<FormItem>
														<InfoLabel
															label={localeMessages.t("ui.upstream.caCertificatePemOptional", { ns: "common" })}
															info={localeMessages.t("ui.upstream.aPemEncodedCaCertificateTo", { ns: "common" })}
														/>
														<FormControl>
															<SecretVarInput
																variant="textarea"
																rows={6}
																className="font-mono text-xs"
																placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE----- or env.PROXY_CA_CERT_PEM"}
																hideValueWhenEnv
																redactNonEnvValue
																disabled={!canUpdate}
																{...field}
																value={field.value}
																data-testid="relay-proxy-ca-cert-pem"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
										<div className="bg-card sticky bottom-0 z-10 -mx-4 flex justify-end space-x-2 rounded-b-sm border-t px-4 py-4 md:-mx-6 md:px-6">
											<Button
												type="button"
												variant="outline"
												disabled={!canUpdate || isLoading || !endpoint.proxy_config}
												onClick={() => {
													form.setValue("proxy", { type: "inherit" }, { shouldDirty: true });
													void form.handleSubmit(onSubmit, onInvalid)();
												}}
											>
												{localeMessages.t("ui.upstream.removeConfiguration", { ns: "common" })}
											</Button>
											<Button
												type="submit"
												disabled={!form.formState.isDirty || !canUpdate || isLoading}
												isLoading={isLoading}
												data-testid="relay-save-proxy"
											>
												{localeMessages.t("ui.upstream.saveProxyConfiguration", { ns: "common" })}
											</Button>
										</div>
									</TabsContent>
								</Tabs>
							</form>
						</Form>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}