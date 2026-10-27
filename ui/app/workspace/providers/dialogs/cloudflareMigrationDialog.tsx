"use client";
import { useTranslation } from "react-i18next";
import { formatMigrationMessage } from "@/lib/utils/databricksMigration";
import i18n from "@/lib/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alertDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SecretVarInput } from "@/components/ui/secretVarInput";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProviderIconType, RenderProviderIcon } from "@/lib/constants/icons";
import {
	getErrorMessage,
	providersApi,
	useAppDispatch,
	useAppSelector,
	useCreateProviderKeyMutation,
	useLazyGetProviderKeysQuery,
	useLazyGetProviderQuery,
	useRefreshProviderModelsMutation,
	useUpdateProviderKeyMutation,
	useUpdateProviderMutation,
} from "@/lib/store";
import { ModelProvider, ModelProviderName, UpdateProviderRequest } from "@/lib/types/config";
import { SecretVar } from "@/lib/types/schemas";
import {
	buildCloudflareMigrationPlan,
	buildMigrationSteps,
	CLOUDFLARE_PROVIDER,
	CloudflareMigrationApi,
	MigrationPlan,
	planNeedsInput,
	runCloudflareMigration,
} from "@/lib/utils/cloudflareMigration";
import { getErrorStatus, maskSecret, MigrationResult, MigrationStep } from "@/lib/utils/databricksMigration";
import { RbacOperation, RbacResource, useRbac } from "@enterprise/lib";
import { AlertTriangle, Check, CircleDashed, Loader2, X } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";

interface Props {
	show: boolean;
	provider: ModelProvider;
	onDeferred: () => void;
	onMigrated: () => void;
}

type Stage = "intro" | "loading" | "preview" | "running" | "finished";

/** Wraps an RTK error so the pure orchestrator can read a message and HTTP status. */
const wrapError = (err: unknown): Error =>
	Object.assign(new Error(getErrorMessage(err)), {
		status: getErrorStatus(err),
	});

export default function CloudflareMigrationDialog({ show, provider, onDeferred, onMigrated }: Props) {
	const { t: tCopy } = useTranslation();
	const dispatch = useAppDispatch();
	const providerFormIsDirty = useAppSelector((state) => state.provider.isDirty);
	const canCreate = useRbac(RbacResource.ModelProvider, RbacOperation.Create);
	const canUpdate = useRbac(RbacResource.ModelProvider, RbacOperation.Update);
	const hasAccess = canCreate && canUpdate;

	const [getProvider] = useLazyGetProviderQuery();
	const [getProviderKeys] = useLazyGetProviderKeysQuery();
	const [updateProvider] = useUpdateProviderMutation();
	const [createProviderKey] = useCreateProviderKeyMutation();
	const [updateProviderKey] = useUpdateProviderKeyMutation();
	const [refreshModels] = useRefreshProviderModelsMutation();

	const [stage, setStage] = useState<Stage>("intro");
	const [plan, setPlan] = useState<MigrationPlan | undefined>();
	const [loadError, setLoadError] = useState<string | undefined>();
	const [steps, setSteps] = useState<MigrationStep[]>([]);
	const [result, setResult] = useState<MigrationResult | undefined>();

	// Start over whenever a different provider is opened.
	useEffect(() => {
		setStage("intro");
		setPlan(undefined);
		setLoadError(undefined);
		setSteps([]);
		setResult(undefined);
	}, [provider.name]);

	const api = useMemo<CloudflareMigrationApi>(
		() => ({
			getProvider: (name) =>
				getProvider(name, false)
					.unwrap()
					.catch((err) => Promise.reject(wrapError(err))),
			getProviderKeys: (name) =>
				getProviderKeys(name, false)
					.unwrap()
					.catch((err) => Promise.reject(wrapError(err))),
			// The shared request type has no null custom_provider_config; the endpoint reads null as removing it.
			updateProvider: (name, body) =>
				updateProvider({ name: name as ModelProviderName, ...(body as unknown as UpdateProviderRequest) })
					.unwrap()
					.catch((err) => Promise.reject(wrapError(err))),
			createProviderKey: (p, key) =>
				createProviderKey({ provider: p, key })
					.unwrap()
					.catch((err) => Promise.reject(wrapError(err))),
			updateProviderKey: (p, keyId, key) =>
				updateProviderKey({ provider: p, keyId, key })
					.unwrap()
					.catch((err) => Promise.reject(wrapError(err))),
			refreshModels: (p) =>
				refreshModels(p)
					.unwrap()
					.catch((err) => Promise.reject(wrapError(err))),
		}),
		[getProvider, getProviderKeys, updateProvider, createProviderKey, updateProviderKey, refreshModels],
	);

	const loadPlan = async () => {
		setStage("loading");
		setLoadError(undefined);
		try {
			const [sourceProvider, sourceKeys] = await Promise.all([api.getProvider(provider.name), api.getProviderKeys(provider.name)]);
			setPlan(buildCloudflareMigrationPlan(sourceProvider, sourceKeys));
			setStage("preview");
		} catch (err) {
			setLoadError(err instanceof Error ? err.message : getErrorMessage(err));
			setStage("intro");
		}
	};

	const runMigration = async () => {
		if (!plan) return;
		setStage("running");
		setSteps(buildMigrationSteps(plan));
		const outcome = await runCloudflareMigration(plan, api, setSteps);
		setResult(outcome);
		setStage("finished");
		if (outcome.ok) {
			dispatch(providersApi.util.invalidateTags(["Providers", { type: "ProviderKeys", id: CLOUDFLARE_PROVIDER }, "DBKeys", "VirtualKeys"]));
		}
	};

	const updateHeaderToken = (value: SecretVar) => {
		setPlan((prev) => (prev?.headerToken ? { ...prev, headerToken: { ...prev.headerToken, value } } : prev));
	};

	const migrateDisabledReason = !hasAccess
		? "Migrating requires create and update access to providers."
		: providerFormIsDirty
			? "Save or discard your unsaved provider changes first."
			: undefined;

	const canMigrate = !!plan && !migrateDisabledReason && !planNeedsInput(plan);

	return (
		<AlertDialog open={show}>
			<AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" data-testid="cloudflare-migration-dialog">
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<RenderProviderIcon provider={CLOUDFLARE_PROVIDER as ProviderIconType} size="sm" className="h-5 w-5 shrink-0" />
						{stage === "finished" && result
							? result.ok
								? tCopy("providers.databricksMigration.complete", { ns: "models" })
								: tCopy("providers.databricksMigration.failed", { ns: "models" })
							: tCopy("ui.cloudflareMigrationDialog.cloudflareIsNowAFirstPartyProvider", { ns: "models" })}
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-2">
							{(stage === "intro" || stage === "loading") && (
								<>
									<p>
										<span className="text-foreground font-medium">{provider.name}</span>{" "}
										{tCopy("ui.cloudflareMigrationDialog.isACustomProviderPointingAtCloudflareWorkersAI", { ns: "models" })}
									</p>
									<p>{tCopy("ui.cloudflareMigrationDialog.theProviderIsConvertedInPlaceSoItsKeys", { ns: "models" })}</p>
								</>
							)}
							{stage === "preview" && (
								<p>{tCopy("ui.cloudflareMigrationDialog.reviewWhatWillChangeKeysKeepTheirStoredTokens", { ns: "models" })}</p>
							)}
							{stage === "running" && <p>{tCopy("providers.databricksMigration.runningHint", { ns: "models" })}</p>}
							{stage === "finished" && result && (
								<p>{formatMigrationMessage(result.message, (key, values) => i18n.t(key, { ns: "models", ...values }))}</p>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>

				{loadError && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>{tCopy("providers.databricksMigration.loadErrorTitle", { ns: "models" })}</AlertTitle>
						<AlertDescription>{loadError}</AlertDescription>
					</Alert>
				)}

				{stage === "preview" && plan && (
					<MigrationPreview
						plan={plan}
						onAccountIdChange={(v) => setPlan({ ...plan, accountId: v })}
						onHeaderTokenChange={updateHeaderToken}
					/>
				)}

				{(stage === "running" || stage === "finished") && <MigrationProgress steps={steps} />}

				<AlertDialogFooter>
					{(stage === "intro" || stage === "loading") && (
						<>
							<AlertDialogCancel onClick={onDeferred} disabled={stage === "loading"} data-testid="cloudflare-migration-not-now">
								{tCopy("providers.databricksMigration.notNow", { ns: "models" })}
							</AlertDialogCancel>
							<DisabledTooltip reason={migrateDisabledReason}>
								<Button
									onClick={loadPlan}
									disabled={!!migrateDisabledReason || stage === "loading"}
									data-testid="cloudflare-migration-start"
								>
									{stage === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
									{tCopy("ui.cloudflareMigrationDialog.letSMigrate", { ns: "models" })}
								</Button>
							</DisabledTooltip>
						</>
					)}
					{stage === "preview" && (
						<>
							<Button variant="ghost" onClick={() => setStage("intro")}>
								{tCopy("back", { ns: "common" })}
							</Button>
							<AlertDialogCancel onClick={onDeferred}>{tCopy("providers.databricksMigration.notNow", { ns: "models" })}</AlertDialogCancel>
							<DisabledTooltip
								reason={migrateDisabledReason ?? (plan && planNeedsInput(plan) ? "Fill in the missing values above." : undefined)}
							>
								<Button onClick={runMigration} disabled={!canMigrate} data-testid="cloudflare-migration-confirm">
									{tCopy("providers.databricksMigration.migrate", { ns: "models" })}
								</Button>
							</DisabledTooltip>
						</>
					)}
					{stage === "finished" && result && (
						<>
							{!result.ok && (
								<AlertDialogCancel onClick={onDeferred} data-testid="cloudflare-migration-close">
									{tCopy("close", { ns: "common" })}
								</AlertDialogCancel>
							)}
							{result.ok && (
								<AlertDialogAction onClick={onMigrated} data-testid="cloudflare-migration-done">
									{tCopy("ui.cloudflareMigrationDialog.goToCloudflare", { ns: "models" })}
								</AlertDialogAction>
							)}
						</>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function DisabledTooltip({ reason, children }: { reason?: string; children: ReactNode }) {
	if (!reason) return <>{children}</>;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span tabIndex={0}>{children}</span>
			</TooltipTrigger>
			<TooltipContent>{reason}</TooltipContent>
		</Tooltip>
	);
}

interface PreviewProps {
	plan: MigrationPlan;
	onAccountIdChange: (value: string) => void;
	onHeaderTokenChange: (value: SecretVar) => void;
}

function MigrationPreview({ plan, onAccountIdChange, onHeaderTokenChange }: PreviewProps) {
	const { t: tCopy } = useTranslation();
	const net = plan.providerSettings.network_config;
	const perf = plan.providerSettings.concurrency_and_buffer_size;
	const otherHeaders = Object.keys(net.extra_headers ?? {});

	return (
		<div className="space-y-4 text-sm" data-testid="cloudflare-migration-preview">
			<section className="space-y-2">
				<SectionTitle>{tCopy("ui.cloudflareMigrationDialog.account", { ns: "models" })}</SectionTitle>
				<div className="space-y-1">
					<Label htmlFor="cloudflare-migration-account-id">{tCopy("ui.cloudflareMigrationDialog.accountID", { ns: "models" })}</Label>
					<Input
						id="cloudflare-migration-account-id"
						data-testid="cloudflare-migration-account-id"
						value={plan.accountId}
						placeholder="023e105f4ecef8ad9ca31a8372d0c353"
						onChange={(e) => onAccountIdChange(e.target.value)}
					/>
					<p className="text-muted-foreground text-xs">
						{tCopy("ui.cloudflareMigrationDialog.readFromTheCustomProviderSBaseURL", { ns: "models" })}
					</p>
				</div>
			</section>

			<section className="space-y-2">
				<SectionTitle>
					{plan.headerToken
						? tCopy("providers.databricksMigration.authentication", { ns: "models" })
						: tCopy("providers.migration.keyCount", { ns: "models", count: plan.keys.length })}
				</SectionTitle>
				<div className="divide-y rounded-md border">
					{plan.keys.map((key) => (
						<div key={key.id} className="space-y-1 p-3" data-testid={`cloudflare-migration-key-${key.id}`}>
							<span className="font-medium">{key.name}</span>
							<div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
								<span>
									{tCopy("ui.cloudflareMigrationDialog.models", { ns: "models" }) + " "}
									{!key.models?.length || key.models.includes("*")
										? tCopy("providers.databricksMigration.modelsAll", { ns: "models" })
										: key.models.join(", ")}
								</span>
								<span>
									{tCopy("ui.cloudflareMigrationDialog.aliases", { ns: "models" }) + " "}
									{Object.keys(key.aliases ?? {}).length}
								</span>
								<span>{tCopy("ui.cloudflareMigrationDialog.tokenKept", { ns: "models" })}</span>
								{!key.enabled && <span>{tCopy("providers.databricksMigration.disabled", { ns: "models" })}</span>}
							</div>
						</div>
					))}
					{plan.headerToken && (
						<div className="space-y-2 p-3" data-testid="cloudflare-migration-header-token">
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-medium">{plan.headerToken.name}</span>
								<Badge variant="outline" className="text-muted-foreground">
									{tCopy("providers.databricksMigration.fromAuthHeader", { ns: "models" })}
								</Badge>
							</div>
							{/* needsValue is fixed when the plan is built, so the input stays up while the token is typed. */}
							{!plan.headerToken.needsValue ? (
								<div className="text-xs">
									<span className="text-muted-foreground">{tCopy("ui.cloudflareMigrationDialog.aPIToken", { ns: "models" }) + " "}</span>
									<code className="bg-muted rounded px-1 py-0.5 font-mono">{maskSecret(plan.headerToken.value)}</code>
								</div>
							) : (
								<div className="space-y-1">
									<Label htmlFor="cloudflare-migration-token">
										{tCopy("ui.cloudflareMigrationDialog.aPIToken2", { ns: "models" }) + " "}
										<span className="text-destructive">*</span>
									</Label>
									<SecretVarInput
										id="cloudflare-migration-token"
										data-testid="cloudflare-migration-token"
										value={plan.headerToken.value ?? { value: "", ref: "" }}
										onChange={onHeaderTokenChange}
										placeholder={tCopy("ui.cloudflareMigrationDialog.aPITokenOrEnvCLOUDFLAREAPITOKEN", { ns: "models" })}
									/>
								</div>
							)}
						</div>
					)}
				</div>
			</section>

			<section className="space-y-2">
				<SectionTitle>{tCopy("providers.databricksMigration.providerSettings", { ns: "models" })}</SectionTitle>
				<dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
					<Stat
						label={tCopy("providers.databricksMigration.timeout", { ns: "models" })}
						value={`${net.default_request_timeout_in_seconds}s`}
					/>
					<Stat label={tCopy("providers.databricksMigration.retries", { ns: "models" })} value={String(net.max_retries)} />
					<Stat
						label={tCopy("providers.databricksMigration.backoff", { ns: "models" })}
						value={`${net.retry_backoff_initial}ms → ${net.retry_backoff_max}ms`}
					/>
					<Stat label={tCopy("providers.databricksMigration.concurrency", { ns: "models" })} value={String(perf.concurrency)} />
					<Stat label={tCopy("providers.databricksMigration.bufferSize", { ns: "models" })} value={String(perf.buffer_size)} />
					<Stat label={tCopy("providers.proxy", { ns: "models" })} value={plan.providerSettings.proxy_config?.type ?? "none"} />
					<Stat
						label={tCopy("providers.databricksMigration.extraHeaders", { ns: "models" })}
						value={otherHeaders.length > 0 ? otherHeaders.join(", ") : "none"}
					/>
					<Stat
						label={tCopy("providers.databricksMigration.privateNetwork", { ns: "models" })}
						value={net.allow_private_network ? "allowed" : "blocked"}
					/>
					<Stat
						label={tCopy("providers.databricksMigration.rawReqRes", { ns: "models" })}
						value={plan.providerSettings.send_back_raw_request || plan.providerSettings.send_back_raw_response ? "on" : "off"}
					/>
				</dl>
			</section>

			{plan.warnings.length > 0 && (
				<Alert data-testid="cloudflare-migration-warnings">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>{tCopy("providers.databricksMigration.beforeContinue", { ns: "models" })}</AlertTitle>
					<AlertDescription>
						<ul className="list-disc space-y-1 pl-4">
							{plan.warnings.map((warning) => (
								<li key={formatMigrationMessage(warning, (key, values) => i18n.t(key, { ns: "models", ...values }))}>
									{formatMigrationMessage(warning, (key, values) => i18n.t(key, { ns: "models", ...values }))}
								</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}

function MigrationProgress({ steps }: { steps: MigrationStep[] }) {
	return (
		<ol className="space-y-2 text-sm" data-testid="cloudflare-migration-progress">
			{steps.map((step) => (
				<li key={step.id} className="flex items-start gap-2" data-testid={`cloudflare-migration-step-${step.id}`} data-status={step.status}>
					<StepIcon status={step.status} />
					<div className="min-w-0 flex-1">
						<div className={step.status === "pending" ? "text-muted-foreground" : ""}>
							{formatMigrationMessage(step.label, (key, values) => i18n.t(key, { ns: "models", ...values }))}
						</div>
						{step.detail && (
							<div
								className={`mt-0.5 text-xs whitespace-pre-line ${step.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}
							>
								{formatMigrationMessage(step.detail, (key, values) => i18n.t(key, { ns: "models", ...values }))}
							</div>
						)}
					</div>
				</li>
			))}
		</ol>
	);
}

function StepIcon({ status }: { status: MigrationStep["status"] }) {
	switch (status) {
		case "running":
			return <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />;
		case "done":
			return <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />;
		case "failed":
			return <X className="text-destructive mt-0.5 h-4 w-4 shrink-0" />;
		case "skipped":
			return <CircleDashed className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />;
		default:
			return <CircleDashed className="text-muted-foreground/50 mt-0.5 h-4 w-4 shrink-0" />;
	}
}

function SectionTitle({ children }: { children: ReactNode }) {
	return <h4 className="flex items-center text-xs font-semibold tracking-wide uppercase">{children}</h4>;
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<dt className="inline">{label}: </dt>
			<dd className="text-foreground inline break-all">{value}</dd>
		</div>
	);
}