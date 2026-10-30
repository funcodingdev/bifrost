import localeMessages from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/store";
import { cn } from "@/lib/utils";

interface LoadErrorViewProps {
	entity: string;
	error: unknown;
	onRetry?: () => void;
	testId?: string;
	className?: string;
}

/** Replaces a list page whose first load failed. See showLoadError. */
export function LoadErrorView({ entity, error, onRetry, testId, className }: LoadErrorViewProps) {
	return (
		<div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)} data-testid={testId}>
			<p className="text-sm font-medium">
				{localeMessages.t("ui.upstream.failedToLoad", { ns: "common" })} {entity}.
			</p>
			<p className="text-muted-foreground max-w-md text-sm">{getErrorMessage(error)}</p>
			{onRetry && (
				<Button variant="outline" size="sm" onClick={onRetry}>
					{localeMessages.t("ui.upstream.retry", { ns: "common" })}
				</Button>
			)}
		</div>
	);
}