import { useTranslation } from "react-i18next";
import { Network } from "lucide-react";
import ContactUsView from "../../views/contactUsView";

export function OrgChartView() {
	const { t: tCopy } = useTranslation();
	return (
		<div className="w-full">
			<ContactUsView
				className="mx-auto min-h-[80vh]"
				testIdPrefix="org-chart"
				icon={<Network className="h-[5.5rem] w-[5.5rem]" strokeWidth={1} />}
				title={tCopy("ui.orgChartView.unlockTheOrgChart", { ns: "common" })}
				description={tCopy("ui.orgChartView.seeBudgetsSpendModelsAndToolsAcrossBusinessUnits", { ns: "common" })}
				readmeLink="https://docs.getbifrost.ai/enterprise/advanced-governance"
			/>
		</div>
	);
}