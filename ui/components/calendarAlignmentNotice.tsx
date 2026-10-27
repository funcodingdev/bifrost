import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isMultiUnitDuration } from "@/lib/constants/governance";

export function CalendarAlignmentNotice({ enabled, durations }: { enabled: boolean; durations: string[] }) {
	const { t: tCopy } = useTranslation();
	const rolling = [...new Set(durations.filter(isMultiUnitDuration))];
	if (!enabled || rolling.length === 0) return null;
	return (
		<Alert variant="warning" data-testid="calendar-alignment-rolling-warning">
			<AlertDescription>
				{rolling.join(", ")} {tCopy("ui.calendarAlignmentNotice.willUseRollingWindowsForTheirFullDurationCalendar", { ns: "common" })}
			</AlertDescription>
		</Alert>
	);
}