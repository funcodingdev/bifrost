import { useTranslation } from "react-i18next";
import { MonitorSmartphone } from "lucide-react";

// OSS stub for the Edge OS icon - there are no platform icons in OSS, so
// always render the generic device glyph.
export function OsIcon({ className }: { platform?: string; className?: string }) {
	const { t: tCopy } = useTranslation();
	return <MonitorSmartphone className={className} aria-label={tCopy("ui.edgeApps.unknownOS", { ns: "common" })} />;
}