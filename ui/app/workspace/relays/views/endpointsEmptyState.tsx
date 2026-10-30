import localeMessages from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Waypoints } from "lucide-react";

const RELAYS_DOCS_URL = "https://docs.getbifrost.ai/relays/overview";

export function EndpointsEmptyState({ onCreate, canCreate }: { onCreate: () => void; canCreate: boolean }) {
	return (
		<div className="flex min-h-[80vh] w-full flex-col items-center justify-center gap-4 py-16 text-center" data-testid="relays-empty">
			<div className="text-muted-foreground">
				<Waypoints className="h-[5.5rem] w-[5.5rem]" strokeWidth={1} />
			</div>
			<div className="flex flex-col gap-1">
				<h1 className="text-muted-foreground text-xl font-medium">
					{localeMessages.t("ui.upstream.relaysPutNonLlmApisBehind", { ns: "common" })}
				</h1>
				<div className="text-muted-foreground mx-auto mt-2 w-full max-w-[600px] text-sm font-normal">
					{localeMessages.t("ui.upstream.relayNonLlmApisThroughBifrost", { ns: "common" })}
				</div>
				<div className="mx-auto mt-6 flex flex-row flex-wrap items-center justify-center gap-2">
					<Button
						variant="outline"
						aria-label={localeMessages.t("ui.upstream.readMoreAboutRelaysOpensIn", { ns: "common" })}
						data-testid="relays-button-read-more"
						onClick={() => {
							window.open(`${RELAYS_DOCS_URL}?utm_source=bfd`, "_blank", "noopener,noreferrer");
						}}
					>
						{localeMessages.t("ui.upstream.readMore", { ns: "common" })} <ArrowUpRight className="text-muted-foreground h-3 w-3" />
					</Button>
					<Button onClick={onCreate} disabled={!canCreate} data-testid="relays-create-first">
						{localeMessages.t("ui.upstream.addRelay", { ns: "common" })}
					</Button>
				</div>
			</div>
		</div>
	);
}