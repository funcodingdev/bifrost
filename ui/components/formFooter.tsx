import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Validator } from "@/lib/utils/validation";
import { Save } from "lucide-react";

interface FormFooterProps {
	validator: Validator;
	label: string;
	onCancel: () => void;
	isLoading: boolean;
	isEditing: boolean;
	hasPermission?: boolean;
}

export default function FormFooter({ validator, label, onCancel, isLoading, isEditing, hasPermission = true }: FormFooterProps) {
	const { t: tCopy } = useTranslation();
	const isDisabled = isLoading || !validator.isValid() || !hasPermission;

	const getTooltipMessage = () => {
		if (!hasPermission) return tCopy("form.noPermission");
		if (isLoading) return tCopy("form.saving");
		return validator.getFirstError() || tCopy("form.fixErrors");
	};

	return (
		<DialogFooter className="mt-4">
			<Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
				{tCopy("cancel", { ns: "common" })}
			</Button>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<span>
							<Button type="submit" disabled={isDisabled}>
								<Save className="h-4 w-4" />
								{isLoading
									? tCopy("skillsRepo.savingDots", { ns: "config" })
									: isEditing
										? tCopy("form.updateEntity", { entity: label })
										: tCopy("form.createEntity", { entity: label })}
							</Button>
						</span>
					</TooltipTrigger>
					{isDisabled && (
						<TooltipContent>
							<p>{getTooltipMessage()}</p>
						</TooltipContent>
					)}
				</Tooltip>
			</TooltipProvider>
		</DialogFooter>
	);
}