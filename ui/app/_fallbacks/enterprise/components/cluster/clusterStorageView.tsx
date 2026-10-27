import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";
import ContactUsView from "../views/contactUsView";

export default function ClusterStorageView() {
	const { t: tCopy } = useTranslation();
	return (
		<div className="h-full w-full">
			<ContactUsView
				className="mx-auto min-h-[80vh]"
				icon={<Layers className="h-[5.5rem] w-[5.5rem]" strokeWidth={1} />}
				title={tCopy("enterprise.clusterTitle", { ns: "config" })}
				description={tCopy("enterprise.sharedDescription", { ns: "config" })}
				readmeLink="https://docs.getbifrost.ai/enterprise/clustering"
			/>
		</div>
	);
}