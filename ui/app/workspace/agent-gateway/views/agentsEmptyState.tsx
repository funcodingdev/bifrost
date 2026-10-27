import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Bot } from "lucide-react";

const AGENT_GATEWAY_DOCS_URL = "https://docs.getbifrost.ai/features/agent-gateway/overview";

interface AgentsEmptyStateProps {
	onAddClick: () => void;
	canCreate?: boolean;
}

export function AgentsEmptyState({ onAddClick, canCreate = true }: AgentsEmptyStateProps) {
	const { t: tCopy } = useTranslation();
	return (
		<div className="flex min-h-[80vh] w-full flex-col items-center justify-center gap-4 py-16 text-center">
			<div className="text-muted-foreground">
				<Bot className="h-[5.5rem] w-[5.5rem]" strokeWidth={1} />
			</div>
			<div className="flex flex-col gap-1">
				<h1 className="text-muted-foreground text-xl font-medium">
					{tCopy("ui.agentsEmptyState.agentsRouteA2ATrafficThroughTheGateway", { ns: "agents" })}
				</h1>
				<div className="text-muted-foreground mx-auto mt-2 w-full max-w-[600px] text-sm font-normal">
					{tCopy("ui.agentsEmptyState.registerYourFirstAgentToServeItsAgentCard", { ns: "agents" })}
				</div>
				<div className="mx-auto mt-6 flex flex-row flex-wrap items-center justify-center gap-2">
					<Button
						variant="outline"
						aria-label={tCopy("ui.agentsEmptyState.readMoreAboutTheAgentGatewayOpensInNew", { ns: "agents" })}
						data-testid="agent-gateway-button-read-more"
						onClick={() => {
							window.open(`${AGENT_GATEWAY_DOCS_URL}?utm_source=bfd`, "_blank", "noopener,noreferrer");
						}}
					>
						{tCopy("enterprise.readMore", { ns: "config" }) + " "}
						<ArrowUpRight className="text-muted-foreground h-3 w-3" />
					</Button>
					<Button
						aria-label={tCopy("ui.agentsEmptyState.registerYourFirstAgent", { ns: "agents" })}
						onClick={onAddClick}
						disabled={!canCreate}
						data-testid="create-agent-btn"
					>
						{tCopy("ui.agentsEmptyState.newAgent", { ns: "agents" })}
					</Button>
				</div>
			</div>
		</div>
	);
}