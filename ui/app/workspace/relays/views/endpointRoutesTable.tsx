import localeMessages from "@/lib/i18n";
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
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdownMenu";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage, useUpdateRelayMutation } from "@/lib/store";
import type { Relay } from "@/lib/types/relays";
import { cn } from "@/lib/utils";
import { cleanUsage, describePricing, mergeUsage, routeBillableByDefault, toRelayForm } from "@/lib/utils/relayForm";
import type { OpenAPIImport } from "@/lib/utils/openapiImport";
import { RbacOperation, RbacResource, useRbac } from "@enterprise/lib";
import { EllipsisIcon, FileUpIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { HeaderActionButton } from "../fragments/headerActionButton";
import { OpenAPIImportDialog } from "../fragments/openapiImportDialog";
import { withRoutes, type RouteForm } from "../routes.utils";
import { RouteSheet } from "../sheets/routeSheet";

function RouteActionsMenu({
	index,
	hasUpdateAccess,
	onEdit,
	onDelete,
}: {
	index: number;
	hasUpdateAccess: boolean;
	onEdit: () => void;
	onDelete: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					aria-label={localeMessages.t("ui.upstream.routeActions", { ns: "common" })}
					data-testid={`relay-route-actions-${index}`}
				>
					<EllipsisIcon className="h-5 w-5" aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={onEdit} disabled={!hasUpdateAccess} data-testid={`relay-route-edit-${index}`}>
					<PencilIcon className="mr-1 h-4 w-4" />
					{localeMessages.t("ui.upstream.edit", { ns: "common" })}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" onSelect={onDelete} disabled={!hasUpdateAccess} data-testid={`relay-route-remove-${index}`}>
					<TrashIcon className="mr-1 h-4 w-4" />
					{localeMessages.t("ui.upstream.delete", { ns: "common" })}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** The routes of a relay, in the same card and table shape as a provider's configured keys. */
export function EndpointRoutesTable({ endpoint, headerActions }: { endpoint: Relay; headerActions?: ReactNode }) {
	const canUpdate = useRbac(RbacResource.Relays, RbacOperation.Update);
	const [updateEndpoint, { isLoading: saving }] = useUpdateRelayMutation();
	const [editing, setEditing] = useState<{ index: number; route: RouteForm } | null>(null);
	const [deleting, setDeleting] = useState<number | null>(null);
	const [importOpen, setImportOpen] = useState(false);
	const [pendingImport, setPendingImport] = useState<{ routes: RouteForm[]; dropped: string[] } | null>(null);
	// Shown in saved order, which is the order requests are matched in; every save writes compareRoutes order.
	const routes = toRelayForm(endpoint).routes;
	const endpointUsage = cleanUsage(endpoint.usage, false);

	const save = async (next: RouteForm[], success: string) => {
		try {
			await updateEndpoint({ name: endpoint.name, data: withRoutes(endpoint, next) }).unwrap();
			toast.success(success);
			return true;
		} catch (e) {
			toast.error(localeMessages.t("ui.upstream.failedToUpdateRoutes", { ns: "common" }), { description: getErrorMessage(e) });
			return false;
		}
	};

	// An import is staged for review: nothing replaces the saved routes until the person applies it.
	const stageImport = (result: OpenAPIImport) => {
		for (const w of result.warnings) toast.warning(w);
		if (result.routes.length === 0) {
			toast.error(localeMessages.t("ui.upstream.theDocumentHasNoOperationsTo", { ns: "common" }));
			return;
		}
		// A route the document still lists keeps what the import cannot express: its pricing
		// override, job, billing, streaming and enabled settings.
		// Header matchers are part of a route's identity: AWS operations share POST / and differ only
		// by X-Amz-Target.
		const key = (method: string, path: string, headers: { name: string; value: string }[]) =>
			[
				`${method.toUpperCase()} ${path}`,
				...headers
					.filter((h) => h.name.trim())
					.map((h) => `${h.name.trim().toLowerCase()}: ${h.value.trim()}`)
					.sort(),
			].join(" ");
		const existing = new Map(routes.map((r) => [key(r.method, r.path, r.headers), r]));
		const imported: RouteForm[] = result.routes.map((r) => {
			const headers = Object.entries(r.headers ?? {}).map(([name, value]) => ({ name, value }));
			return { ...existing.get(key(r.method, r.path, headers)), method: r.method, path: r.path, headers };
		});
		const kept = new Set(imported.map((r) => key(r.method, r.path, r.headers)));
		const dropped = routes.filter((r) => !kept.has(key(r.method, r.path, r.headers)) && (r.job || cleanUsage(r.usage, true)));
		setPendingImport({ routes: imported, dropped: dropped.map((r) => key(r.method, r.path, r.headers)) });
	};

	return (
		<div className="w-full">
			<CardHeader className="mb-4 px-0">
				<CardTitle className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-2">{localeMessages.t("ui.upstream.routes", { ns: "common" })}</div>
					<div className="flex min-w-0 flex-wrap items-center gap-2">
						{headerActions}
						{canUpdate && (
							<HeaderActionButton
								variant="outline"
								icon={<FileUpIcon className="h-4 w-4" />}
								label={localeMessages.t("ui.upstream.importOpenapi", { ns: "common" })}
								aria-label={localeMessages.t("ui.upstream.importOpenapi", { ns: "common" })}
								disabled={saving}
								onClick={() => setImportOpen(true)}
								data-testid="relay-routes-import"
							/>
						)}
						{canUpdate && (
							<HeaderActionButton
								icon={<PlusIcon className="h-4 w-4" />}
								label={localeMessages.t("ui.upstream.addRoute", { ns: "common" })}
								aria-label={localeMessages.t("ui.upstream.addRoute", { ns: "common" })}
								disabled={saving}
								onClick={() => setEditing({ index: -1, route: { method: "POST", path: "/", headers: [], enabled: true } })}
								data-testid="relay-routes-add"
							/>
						)}
					</div>
				</CardTitle>
			</CardHeader>
			<div className="flex w-full flex-col gap-2 rounded-sm border">
				<Table className="w-full min-w-[640px] table-fixed" data-testid="relay-routes-table">
					<colgroup>
						<col className="w-24" />
						<col className="w-[36%]" />
						<col className="w-[32%]" />
						<col className="w-[12%]" />
						<col className="w-[10%]" />
					</colgroup>
					<TableHeader>
						<TableRow>
							<TableHead>{localeMessages.t("ui.upstream.method", { ns: "common" })}</TableHead>
							<TableHead>{localeMessages.t("ui.upstream.route", { ns: "common" })}</TableHead>
							<TableHead>{localeMessages.t("ui.upstream.price", { ns: "common" })}</TableHead>
							<TableHead>{localeMessages.t("ui.upstream.enabled", { ns: "common" })}</TableHead>
							<TableHead className="text-right" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{routes.length === 0 && (
							<TableRow data-testid="relay-routes-empty">
								<TableCell colSpan={5} className="py-6 text-center">
									{endpoint.skip_route_check
										? localeMessages.t("ui.upstream.noRoutesEveryPathIsRelayed", { ns: "common" })
										: localeMessages.t("ui.upstream.noRoutesFoundAddOneOr", { ns: "common" })}
								</TableCell>
							</TableRow>
						)}
						{routes.map((route, index) => {
							const billable = route.billable ?? routeBillableByDefault(route.method);
							const enabled = route.enabled ?? true;
							const override = cleanUsage(route.usage, true);
							return (
								<TableRow
									key={`${route.method}-${route.path}-${index}`}
									data-testid={`relay-route-row-${index}`}
									className={cn("text-sm transition-colors hover:bg-white", !enabled && "opacity-60")}
								>
									<TableCell>
										<Badge variant="secondary" className="font-mono">
											{route.method}
										</Badge>
									</TableCell>
									<TableCell className="overflow-hidden">
										<div className="flex min-w-0 items-center gap-2">
											<span className="truncate font-mono text-sm">{route.path}</span>
											{route.job && <Badge variant="outline">{localeMessages.t("ui.upstream.job2", { ns: "common" })}</Badge>}
										</div>
										{route.headers
											.filter((h) => h.name)
											.map((h) => (
												<div key={h.name} className="text-muted-foreground truncate font-mono text-xs">
													{h.name}: {h.value}
												</div>
											))}
									</TableCell>
									<TableCell className="truncate text-sm">
										{billable ? (
											describePricing(mergeUsage(endpointUsage, override), endpoint.ignore_upstream_cost)
										) : (
											<span className="text-muted-foreground">{localeMessages.t("ui.upstream.free", { ns: "common" })}</span>
										)}
										{override && billable && (
											<Badge variant="outline" className="ml-2">
												{localeMessages.t("ui.upstream.override", { ns: "common" })}
											</Badge>
										)}
									</TableCell>
									<TableCell>
										<Switch
											aria-label={localeMessages.t("ui.upstream.enable", { ns: "common", v0: route.method, v1: route.path })}
											size="md"
											checked={enabled}
											disabled={!canUpdate || saving}
											data-testid={`relay-route-enabled-switch-${index}`}
											onAsyncCheckedChange={async (checked) => {
												await save(
													routes.map((r, i) => (i === index ? { ...r, enabled: checked } : r)),
													checked
														? localeMessages.t("ui.upstream.routeEnabled", { ns: "common" })
														: localeMessages.t("ui.upstream.routeDisabled", { ns: "common" }),
												);
											}}
										/>
									</TableCell>
									<TableCell className="text-right">
										<RouteActionsMenu
											index={index}
											hasUpdateAccess={canUpdate && !saving}
											onEdit={() => setEditing({ index, route: structuredClone(route) })}
											onDelete={() => setDeleting(index)}
										/>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			<RouteSheet
				show={!!editing}
				route={editing?.route ?? null}
				isNew={editing?.index === -1}
				endpointUsage={endpointUsage}
				ignoreUpstreamCost={endpoint.ignore_upstream_cost}
				saving={saving}
				disabled={!canUpdate}
				onCancel={() => setEditing(null)}
				onSave={async (route) => {
					if (!editing) return;
					const next = editing.index < 0 ? [...routes, route] : routes.map((r, i) => (i === editing.index ? route : r));
					if (
						await save(
							next,
							editing.index < 0
								? localeMessages.t("ui.upstream.routeAddedSuccessfully", { ns: "common" })
								: localeMessages.t("ui.upstream.routeUpdatedSuccessfully", { ns: "common" }),
						)
					)
						setEditing(null);
				}}
			/>
			<AlertDialog open={deleting !== null}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{localeMessages.t("ui.upstream.deleteRoute", { ns: "common" })}</AlertDialogTitle>
						<AlertDialogDescription>{localeMessages.t("ui.upstream.areYouSureYouWantTo3", { ns: "common" })}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="pt-4">
						<AlertDialogCancel onClick={() => setDeleting(null)} disabled={saving}>
							{localeMessages.t("ui.upstream.cancel", { ns: "common" })}
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={saving || !canUpdate}
							data-testid="relay-route-delete-confirm"
							onClick={async () => {
								if (deleting === null) return;
								if (
									await save(
										routes.filter((_, i) => i !== deleting),
										localeMessages.t("ui.upstream.routeDeletedSuccessfully", { ns: "common" }),
									)
								)
									setDeleting(null);
							}}
						>
							{localeMessages.t("ui.upstream.delete", { ns: "common" })}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<OpenAPIImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={stageImport} />
			<AlertDialog open={pendingImport !== null} onOpenChange={(o) => !o && setPendingImport(null)}>
				<AlertDialogContent data-testid="relay-import-review">
					<AlertDialogHeader>
						<AlertDialogTitle>{localeMessages.t("ui.upstream.replaceTheRoutesWithTheImported", { ns: "common" })}</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-2">
								<p>
									{pendingImport?.routes.length ?? 0} {localeMessages.t("ui.upstream.route2", { ns: "common" })}
									{pendingImport?.routes.length === 1 ? "" : "s"}{" "}
									{localeMessages.t("ui.upstream.willReplaceTheCurrentListRoutes", { ns: "common" })}
								</p>
								{pendingImport && pendingImport.dropped.length > 0 && (
									<p className="text-destructive">
										{pendingImport.dropped.length} {localeMessages.t("ui.upstream.route2", { ns: "common" })}
										{pendingImport.dropped.length === 1 ? "" : "s"}{" "}
										{localeMessages.t("ui.upstream.withAPricingOverrideOrJob", { ns: "common" })} {pendingImport.dropped.join(", ")}
									</p>
								)}
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel data-testid="relay-import-review-cancel">
							{localeMessages.t("ui.upstream.keepCurrentRoutes", { ns: "common" })}
						</AlertDialogCancel>
						<AlertDialogAction
							data-testid="relay-import-review-apply"
							disabled={saving}
							onClick={async (e) => {
								// A Radix action closes the dialog on click; keep it open so a failed save keeps the staged import.
								e.preventDefault();
								if (!pendingImport) return;
								const imported = pendingImport.routes;
								if (
									await save(
										imported,
										localeMessages.t("ui.upstream.importedRoute", {
											ns: "common",
											v0: imported.length,
										}),
									)
								)
									setPendingImport(null);
							}}
						>
							{localeMessages.t("ui.upstream.applyImport", { ns: "common" })}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}