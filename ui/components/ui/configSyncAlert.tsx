import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConfigSyncAlertProps {
	className?: string;
}

export function ConfigSyncAlert({ className }: ConfigSyncAlertProps) {
	const { t: tCopy } = useTranslation();
	return (
		<Alert variant="info" className={className}>
			<Info className="h-4 w-4" />
			<AlertDescription>
				<p>
					{tCopy("ui.configSyncAlert.thisConfigIsSyncedFrom", { ns: "common" }) + " "}
					<code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">config.json</code>
					{tCopy("ui.configSyncAlert.anyFutureUpdatesToConfigJsonWillOverwriteUI", { ns: "common" })}
				</p>
			</AlertDescription>
		</Alert>
	);
}