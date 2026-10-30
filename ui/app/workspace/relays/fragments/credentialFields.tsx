import localeMessages from "@/lib/i18n";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecretVarInput } from "@/components/ui/secretVarInput";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RelayAuthTypeLabels, RelayAuthTypes } from "@/lib/types/relays";
import type { RelayFormValues } from "@/lib/types/schemas";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { InfoLabel } from "../fragments/infoLabel";

/**
 * How the endpoint signs in to the upstream: the auth type and its one credential. Laid out like the
 * provider key form; the AWS fields follow the Bedrock key's authentication tabs.
 */
export function CredentialFields({ form, disabled }: { form: UseFormReturn<RelayFormValues>; disabled?: boolean }) {
	const authType = form.watch("auth.type");
	const hasExplicitAWS = !!(form.getValues("aws.access_key")?.value || form.getValues("aws.access_key")?.ref);
	const [awsMode, setAwsMode] = useState<"iam_role" | "explicit">(hasExplicitAWS ? "explicit" : "iam_role");
	useEffect(() => {
		if (hasExplicitAWS) setAwsMode("explicit");
	}, [hasExplicitAWS]);

	return (
		<div className="space-y-4">
			<FormField
				control={form.control}
				name="auth.type"
				render={({ field }) => (
					<FormItem>
						<InfoLabel
							label={localeMessages.t("ui.upstream.authentication", { ns: "common" })}
							info={localeMessages.t("ui.upstream.howTheGatewayAuthenticatesToThe", { ns: "common" })}
						/>
						<Select onValueChange={field.onChange} value={field.value} disabled={disabled}>
							<FormControl>
								<SelectTrigger className="w-60" data-testid="relay-auth-type">
									<SelectValue />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{RelayAuthTypes.map((t) => (
									<SelectItem key={t} value={t}>
										{RelayAuthTypeLabels[t]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>

			{authType === "header" && (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="auth.header_name"
						render={({ field }) => (
							<FormItem>
								<InfoLabel
									label={localeMessages.t("ui.upstream.headerNameRequired", { ns: "common" })}
									info={localeMessages.t("ui.upstream.theRequestHeaderThatCarriesThe", { ns: "common" })}
								/>
								<FormControl>
									<Input placeholder="x-api-key" data-testid="relay-header-name" disabled={disabled} {...field} value={field.value ?? ""} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="auth.value_prefix"
						render={({ field }) => (
							<FormItem>
								<InfoLabel
									label={localeMessages.t("ui.upstream.valuePrefixOptional", { ns: "common" })}
									info={localeMessages.t("ui.upstream.textPutBeforeTheCredentialIn", { ns: "common" })}
								/>
								<FormControl>
									<Input placeholder="Token " disabled={disabled} {...field} value={field.value ?? ""} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			)}
			{authType === "query" && (
				<FormField
					control={form.control}
					name="auth.query_param"
					render={({ field }) => (
						<FormItem>
							<InfoLabel
								label={localeMessages.t("ui.upstream.queryParameterRequired", { ns: "common" })}
								info={localeMessages.t("ui.upstream.theQueryParameterThatCarriesThe", { ns: "common" })}
							/>
							<FormControl>
								<Input placeholder="api_key" data-testid="relay-query-param" disabled={disabled} {...field} value={field.value ?? ""} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			)}

			{authType !== "none" && authType !== "aws_sigv4" && (
				<FormField
					control={form.control}
					name="credential_value"
					render={({ field }) => (
						<FormItem>
							<InfoLabel
								label={
									authType === "basic"
										? localeMessages.t("ui.upstream.credentialsRequired", { ns: "common" })
										: localeMessages.t("ui.upstream.apiKeyRequired", { ns: "common" })
								}
								info={localeMessages.t("ui.upstream.storedEncryptedAndNeverSentBy", { ns: "common" })}
							/>
							<FormControl>
								<SecretVarInput
									placeholder={authType === "basic" ? "user:password or env.API_CREDENTIALS" : "API Key or env.API_KEY"}
									data-testid="relay-credential"
									disabled={disabled}
									{...field}
									value={field.value}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			)}

			{authType === "aws_sigv4" && (
				<>
					<FormField
						control={form.control}
						name="auth.aws.service"
						render={({ field }) => (
							<FormItem>
								<InfoLabel
									label={localeMessages.t("ui.upstream.awsServiceRequired", { ns: "common" })}
									info={localeMessages.t("ui.upstream.theSigv4SigningNameSuchAs", { ns: "common" })}
								/>
								<FormControl>
									<Input placeholder="textract" data-testid="relay-aws-service" disabled={disabled} {...field} value={field.value ?? ""} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="space-y-2">
						<InfoLabel
							label={localeMessages.t("ui.upstream.authenticationMethod", { ns: "common" })}
							info={localeMessages.t("ui.upstream.iamRoleUsesTheCredentialsOf", { ns: "common" })}
						/>
						<Tabs
							value={awsMode}
							onValueChange={(v) => {
								setAwsMode(v as "iam_role" | "explicit");
								if (v === "iam_role") {
									form.setValue("aws.access_key", undefined, { shouldDirty: true });
									form.setValue("aws.secret_key", undefined, { shouldDirty: true });
									form.setValue("aws.session_token", undefined, { shouldDirty: true });
								}
							}}
						>
							<TabsList className="flex w-full justify-start">
								<TabsTrigger value="iam_role" data-testid="relay-aws-iam-role-tab">
									{localeMessages.t("ui.upstream.iamRoleInherited", { ns: "common" })}
								</TabsTrigger>
								<TabsTrigger value="explicit" data-testid="relay-aws-explicit-tab">
									{localeMessages.t("ui.upstream.explicitCredentials", { ns: "common" })}
								</TabsTrigger>
							</TabsList>
						</Tabs>
						{awsMode === "iam_role" && (
							<p className="text-muted-foreground text-sm">
								{localeMessages.t("ui.upstream.usesIamRolesAttachedToYour", { ns: "common" })}
							</p>
						)}
					</div>
					{awsMode === "explicit" &&
						(
							[
								[
									"access_key",
									localeMessages.t("ui.upstream.accessKeyRequired", { ns: "common" }),
									"your-aws-access-key or env.AWS_ACCESS_KEY_ID",
								],
								[
									"secret_key",
									localeMessages.t("ui.upstream.secretKeyRequired", { ns: "common" }),
									"your-aws-secret-key or env.AWS_SECRET_ACCESS_KEY",
								],
								[
									"session_token",
									localeMessages.t("ui.upstream.sessionTokenOptional", { ns: "common" }),
									"your-aws-session-token or env.AWS_SESSION_TOKEN",
								],
							] as const
						).map(([key, label, placeholder]) => (
							<FormField
								key={key}
								control={form.control}
								name={`aws.${key}`}
								render={({ field }) => (
									<FormItem>
										<FormLabel>{label}</FormLabel>
										<FormControl>
											<SecretVarInput
												placeholder={placeholder}
												data-testid={`relay-aws-${key}`}
												disabled={disabled}
												{...field}
												value={field.value}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						))}
					<FormField
						control={form.control}
						name="aws.region"
						render={({ field }) => (
							<FormItem>
								<InfoLabel
									label={localeMessages.t("ui.upstream.regionRequired", { ns: "common" })}
									info={localeMessages.t("ui.upstream.theAwsRegionRequestsAreSigned", { ns: "common" })}
								/>
								<FormControl>
									<SecretVarInput
										placeholder="us-east-1 or env.AWS_REGION"
										data-testid="relay-aws-region"
										disabled={disabled}
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
						name="aws.role_arn"
						render={({ field }) => (
							<FormItem>
								<InfoLabel
									label={localeMessages.t("ui.upstream.assumeRoleArnOptional", { ns: "common" })}
									info={localeMessages.t("ui.upstream.assumeAnIamRoleBeforeRequests", { ns: "common" })}
								/>
								<FormControl>
									<SecretVarInput
										placeholder="arn:aws:iam::123456789:role/MyRole or env.AWS_ROLE_ARN"
										disabled={disabled}
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
						name="aws.external_id"
						render={({ field }) => (
							<FormItem>
								<InfoLabel
									label={localeMessages.t("ui.upstream.externalIdOptional", { ns: "common" })}
									info={<>{localeMessages.t("ui.upstream.requiredByTheRoleSTrust2", { ns: "common" })}</>}
								/>
								<FormControl>
									<SecretVarInput placeholder="external-id or env.AWS_EXTERNAL_ID" disabled={disabled} {...field} value={field.value} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</>
			)}
		</div>
	);
}