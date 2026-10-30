import localeMessages from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TriStateCheckbox } from "@/components/ui/tristateCheckbox";
import { exposedByRule, isExposed, nextExposeList } from "./mcpExposeList.utils";
import { SectionHeader } from "./sectionHeader";

export interface MCPExposeItem {
	key: string; // What the allow-list holds: a prompt's own name, a resource URI or a URI template
	label: string;
	detail?: string;
	description?: string;
}

/** One allow-list (prompts or resources) of an MCP server: what the gateway serves from it. */
export function MCPExposeList({
	kind,
	title,
	description,
	items,
	value,
	onChange,
}: {
	kind: "prompts" | "resources";
	title: string;
	description: string;
	items: MCPExposeItem[];
	value: string[] | null | undefined;
	onChange: (next: string[]) => void;
}) {
	const allKeys = items.map((item) => item.key);
	const selected = allKeys.filter((key) => isExposed(value, key));
	const status =
		selected.length === allKeys.length
			? localeMessages.t("ui.upstream.allServed", { ns: "common" })
			: selected.length === 0
				? localeMessages.t("ui.upstream.noneServed", { ns: "common" })
				: `${selected.length} served`;

	return (
		<div className="space-y-4" data-testid={`mcp-expose-${kind}`}>
			<div className="flex items-start justify-between gap-4">
				<SectionHeader title={`${title} (${items.length})`} description={description} />
				{items.length > 0 && (
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground text-sm" data-testid={`mcp-expose-${kind}-status`}>
							{status}
						</span>
						<TriStateCheckbox
							allIds={allKeys}
							selectedIds={selected}
							ariaLabel={localeMessages.t("ui.upstream.serveAll", { ns: "common", v0: kind, v1: status })}
							data-testid={`mcp-expose-${kind}-all`}
							onChange={(next) => onChange(next.length === allKeys.length ? ["*"] : next)}
						/>
					</div>
				)}
			</div>
			{items.length > 0 ? (
				<div className="rounded-sm border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{localeMessages.t("ui.upstream.name", { ns: "common" })}</TableHead>
								<TableHead className="w-24 text-center">{localeMessages.t("ui.upstream.served", { ns: "common" })}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.map((item) => {
								const exposed = isExposed(value, item.key);
								const byRule = exposedByRule(value, item.key);
								return (
									<TableRow key={item.key} data-testid={`mcp-expose-${kind}-row-${item.key}`}>
										<TableCell className="max-w-[360px]">
											<div className="text-foreground truncate text-sm font-medium">{item.label}</div>
											{item.detail && <div className="text-muted-foreground truncate font-mono text-xs">{item.detail}</div>}
											{item.description && <p className="text-muted-foreground mt-0.5 truncate text-xs">{item.description}</p>}
										</TableCell>
										<TableCell className="text-center">
											<div className="flex h-11 items-center justify-center">
												<Switch
													size="md"
													checked={exposed}
													disabled={byRule}
													title={byRule ? localeMessages.t("ui.upstream.servedByAPatternRule", { ns: "common" }) : undefined}
													aria-label={
														byRule
															? localeMessages.t("ui.upstream.isServedByAPattern", { ns: "common", v0: item.label })
															: `${exposed ? localeMessages.t("ui.upstream.stopServing", { ns: "common" }) : localeMessages.t("ui.upstream.serve", { ns: "common" })} ${item.label}`
													}
													data-testid={`mcp-expose-${kind}-toggle-${item.key}`}
													onCheckedChange={(checked) => onChange(nextExposeList(value, allKeys, item.key, checked))}
												/>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			) : (
				<div className="text-muted-foreground rounded-sm border p-6 text-center" data-testid={`mcp-expose-${kind}-empty`}>
					<p className="text-sm">
						{localeMessages.t("ui.upstream.thisServerListsNo", { ns: "common" })} {kind}
					</p>
				</div>
			)}
		</div>
	);
}