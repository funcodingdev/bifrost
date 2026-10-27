import { useTranslation } from "react-i18next";
import { Badge } from "./ui/badge";

export default function BetaBadge() {
	const { t: tCopy } = useTranslation();
	return <Badge variant="secondary">{tCopy("ui.betaBadge.bETA", { ns: "common" })}</Badge>;
}