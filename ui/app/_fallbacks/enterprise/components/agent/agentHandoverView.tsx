import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleAlert } from "lucide-react";

export default function AgentHandoverView() {
	const { t: tCopy } = useTranslation();
	const status = new URLSearchParams(window.location.search).get("status");
	const isComplete = !status || status === "complete";
	const Icon = isComplete ? CheckCircle2 : CircleAlert;

	return (
		<main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
			<section className="bg-card w-full max-w-xl rounded-sm border p-8 text-center shadow-sm">
				<div className="bg-primary/10 mx-auto mb-5 flex size-12 items-center justify-center rounded-full">
					<Icon className="text-primary size-6" />
				</div>
				<h1 className="text-xl font-semibold tracking-tight">
					{isComplete
						? tCopy("ui.agentHandoverView.bifrostAgentSignInComplete", { ns: "common" })
						: tCopy("ui.agentHandoverView.bifrostAgentSignIn", { ns: "common" })}
				</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					{isComplete
						? tCopy("ui.agentHandoverView.youCanCloseThisWindowAndReturnToThe", { ns: "common" })
						: tCopy("handover.status", { ns: "login", status: status })}
				</p>
			</section>
		</main>
	);
}