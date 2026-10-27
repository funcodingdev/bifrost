import { useTranslation } from "react-i18next";
import { Construction } from "lucide-react";
import ContactUsView from "../views/contactUsView";

export default function GuardrailIncidentsView() {
	const { t: tCopy } = useTranslation();
	return (
		<div className="h-full w-full">
			<ContactUsView
				className="mx-auto min-h-[80vh]"
				icon={<Construction className="h-[5.5rem] w-[5.5rem]" strokeWidth={1} />}
				title={tCopy("guardrails.unlockTitle", { ns: "governance" })}
				description={tCopy("enterprise.sharedDescription", { ns: "config" })}
				readmeLink="https://docs.getbifrost.ai/enterprise/guardrails"
			/>
		</div>
	);
}