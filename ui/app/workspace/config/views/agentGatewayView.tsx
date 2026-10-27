import { Trans, useTranslation } from "react-i18next";
import FullPageLoader from "@/components/fullPageLoader";
import PageTitle from "@/components/pageTitle";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/ui/tagInput";
import { Switch } from "@/components/ui/switch";
import { SecretVarInput } from "@/components/ui/secretVarInput";
import { getErrorMessage, useGetCoreConfigQuery, useUpdateCoreConfigMutation } from "@/lib/store";
import { CoreConfig, DefaultCoreConfig } from "@/lib/types/config";
import { SecretVar } from "@/lib/types/schemas";
import { RbacOperation, RbacResource, useRbac } from "@enterprise/lib";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const secretVarEquals = (a?: SecretVar, b?: SecretVar) =>
	(a?.value ?? "") === (b?.value ?? "") && (a?.ref ?? "") === (b?.ref ?? "") && (a?.type ?? "plain_text") === (b?.type ?? "plain_text");

const stringListEquals = (a?: string[], b?: string[]) => (a ?? []).join("\n") === (b ?? []).join("\n");

export default function AgentGatewayView() {
	const { t: tCopy } = useTranslation();
	const hasSettingsUpdateAccess = useRbac(RbacResource.Settings, RbacOperation.Update);
	const { data: bifrostConfig, isLoading: isConfigLoading, error: configError, refetch } = useGetCoreConfigQuery({ fromDB: true });
	const config = bifrostConfig?.client_config;
	const [updateCoreConfig, { isLoading }] = useUpdateCoreConfigMutation();
	const [localConfig, setLocalConfig] = useState<CoreConfig>(DefaultCoreConfig);
	const draftRevision = useRef(0);
	const syncedRevision = useRef(0);

	useEffect(() => {
		if (bifrostConfig && config && draftRevision.current === syncedRevision.current) {
			setLocalConfig(config);
		}
	}, [config, bifrostConfig]);

	const hasChanges = useMemo(() => {
		if (!config) return false;
		return (
			!secretVarEquals(localConfig.a2a_external_client_url, config.a2a_external_client_url) ||
			Boolean(localConfig.a2a_store_raw_request_response) !== Boolean(config.a2a_store_raw_request_response) ||
			!stringListEquals(localConfig.a2a_private_allowlist, config.a2a_private_allowlist)
		);
	}, [config, localConfig]);

	const handleExternalURLChange = useCallback(
		(value: SecretVar) => {
			draftRevision.current += 1;
			if (
				secretVarEquals(value, config?.a2a_external_client_url) &&
				Boolean(localConfig.a2a_store_raw_request_response) === Boolean(config?.a2a_store_raw_request_response) &&
				stringListEquals(localConfig.a2a_private_allowlist, config?.a2a_private_allowlist)
			) {
				syncedRevision.current = draftRevision.current;
			}
			setLocalConfig((prev) => ({ ...prev, a2a_external_client_url: value }));
		},
		[config, localConfig.a2a_store_raw_request_response, localConfig.a2a_private_allowlist],
	);

	const handleSave = useCallback(async () => {
		const savedRevision = draftRevision.current;
		try {
			if (!bifrostConfig) {
				toast.error(tCopy("configNotLoadedRefresh", { ns: "config" }));
				return;
			}
			await updateCoreConfig({
				...bifrostConfig,
				client_config: {
					...bifrostConfig.client_config,
					a2a_external_client_url: localConfig.a2a_external_client_url,
					a2a_store_raw_request_response: Boolean(localConfig.a2a_store_raw_request_response),
					a2a_private_allowlist: localConfig.a2a_private_allowlist ?? [],
				},
			}).unwrap();
			syncedRevision.current = savedRevision;
			toast.success(tCopy("ui.agentGatewayView.agentGatewaySettingsUpdatedSuccessfully", { ns: "config" }));
		} catch (error) {
			toast.error(getErrorMessage(error));
		}
	}, [bifrostConfig, localConfig, updateCoreConfig, tCopy]);

	if (isConfigLoading && !bifrostConfig) {
		return <FullPageLoader />;
	}

	if (configError && !bifrostConfig) {
		return (
			<div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6" data-testid="agent-gateway-settings-load-error">
				<PageTitle title={tCopy("ui.agentGatewayView.agentGatewaySettings", { ns: "config" })}>
					{tCopy("ui.agentGatewayView.configureAgentGatewayA2ASettings", { ns: "config" })}
				</PageTitle>
				<div className="border-destructive/30 bg-destructive/5 flex flex-col gap-3 rounded-sm border p-4">
					<p className="text-destructive text-sm font-medium">
						{tCopy("ui.agentGatewayView.failedToLoadAgentGatewaySettings", { ns: "config" })}
					</p>
					<p className="text-muted-foreground text-sm">{getErrorMessage(configError)}</p>
					<div>
						<Button variant="outline" size="sm" onClick={() => void refetch()}>
							{tCopy("promptRepo.retry", { ns: "config" })}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6" data-testid="agent-gateway-settings-view">
			<PageTitle title={tCopy("ui.agentGatewayView.agentGatewaySettings", { ns: "config" })}>
				{tCopy("ui.agentGatewayView.configureAgentGatewayA2ASettings", { ns: "config" })}
			</PageTitle>
			<div className="space-y-4">
				<div className="space-y-2 rounded-sm border p-4">
					<label htmlFor="a2a-external-client-url" className="text-sm font-medium">
						{tCopy("mcpSettings.externalClientUrl", { ns: "config" })}
					</label>
					<p className="text-muted-foreground text-sm">
						<Trans ns="config" i18nKey="agentGateway.externalUrlHelp" components={{ code: <code className="text-xs" /> }} />
					</p>
					<SecretVarInput
						id="a2a-external-client-url"
						data-testid="a2a-external-client-url-input"
						placeholder="https://bifrost.example.com or env.BIFROST_EXTERNAL_URL"
						value={localConfig.a2a_external_client_url}
						onChange={handleExternalURLChange}
						disabled={!config || !hasSettingsUpdateAccess}
					/>
				</div>
			</div>
			<div className="space-y-2 rounded-sm border p-4">
				<label htmlFor="a2a-private-allowlist" className="text-sm font-medium">
					{tCopy("ui.agentGatewayView.privateNetworkAllowlist", { ns: "config" })}
				</label>
				<p className="text-muted-foreground text-sm">
					{tCopy("ui.agentGatewayView.hostsIPAddressesOrCIDRRangesWithoutAScheme", { ns: "config" })}
				</p>
				<TagInput
					id="a2a-private-allowlist"
					data-testid="a2a-private-allowlist-input"
					placeholder={tCopy("ui.agentGatewayView.addHostIPOrCIDREnterOrComma", { ns: "config" })}
					value={localConfig.a2a_private_allowlist ?? []}
					readOnly={!config || !hasSettingsUpdateAccess}
					onValueChange={(value) => {
						draftRevision.current += 1;
						if (
							stringListEquals(value, config?.a2a_private_allowlist) &&
							secretVarEquals(localConfig.a2a_external_client_url, config?.a2a_external_client_url) &&
							Boolean(localConfig.a2a_store_raw_request_response) === Boolean(config?.a2a_store_raw_request_response)
						) {
							syncedRevision.current = draftRevision.current;
						}
						setLocalConfig((prev) => ({ ...prev, a2a_private_allowlist: value }));
					}}
				/>
			</div>
			<div className="flex items-center justify-between gap-4 rounded-sm border p-4">
				<div className="space-y-1">
					<label htmlFor="a2a-raw-capture" className="text-sm font-medium">
						{tCopy("ui.agentGatewayView.captureRawRequestAndResponse", { ns: "config" })}
					</label>
					<p className="text-muted-foreground text-sm">
						{tCopy("ui.agentGatewayView.persistRawRequestAndResponsePayloadsInLogRecords", { ns: "config" })}
					</p>
				</div>
				<Switch
					id="a2a-raw-capture"
					data-testid="a2a-raw-capture-switch"
					checked={Boolean(localConfig.a2a_store_raw_request_response)}
					disabled={!config || !hasSettingsUpdateAccess}
					onCheckedChange={(checked) => {
						draftRevision.current += 1;
						if (
							checked === Boolean(config?.a2a_store_raw_request_response) &&
							secretVarEquals(localConfig.a2a_external_client_url, config?.a2a_external_client_url) &&
							stringListEquals(localConfig.a2a_private_allowlist, config?.a2a_private_allowlist)
						) {
							syncedRevision.current = draftRevision.current;
						}
						setLocalConfig((prev) => ({ ...prev, a2a_store_raw_request_response: checked }));
					}}
				/>
			</div>
			<div className="flex justify-end pt-2">
				<Button
					onClick={handleSave}
					disabled={!hasChanges || isLoading || !hasSettingsUpdateAccess}
					data-testid="agent-gateway-settings-save-btn"
				>
					{isLoading ? tCopy("skillsRepo.savingDots", { ns: "config" }) : tCopy("saveChanges", { ns: "config" })}
				</Button>
			</div>
		</div>
	);
}