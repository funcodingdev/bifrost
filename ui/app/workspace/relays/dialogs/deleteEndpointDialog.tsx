import localeMessages from "@/lib/i18n";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alertDialog";
import { getErrorMessage, useDeleteRelayMutation } from "@/lib/store";
import { RbacOperation, RbacResource, useRbac } from "@enterprise/lib";
import { toast } from "sonner";

/** Confirms deleting a relay, worded like deleting a provider. */
export function DeleteEndpointDialog({
	name,
	show,
	onCancel,
	onDeleted,
}: {
	name: string;
	show: boolean;
	onCancel: () => void;
	onDeleted: () => void;
}) {
	const [deleteEndpoint, { isLoading }] = useDeleteRelayMutation();
	const canDelete = useRbac(RbacResource.Relays, RbacOperation.Delete);
	return (
		<AlertDialog open={show}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{localeMessages.t("ui.upstream.deleteRelay", { ns: "common" })}</AlertDialogTitle>
					<AlertDialogDescription>
						{localeMessages.t("ui.upstream.areYouSureYouWantTo2", { ns: "common" })}
						{name} {localeMessages.t("ui.upstream.stopWorkingAndItsVirtualKey", { ns: "common" })}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>{localeMessages.t("ui.upstream.cancel", { ns: "common" })}</AlertDialogCancel>
					<AlertDialogAction
						data-testid="relay-delete-confirm"
						disabled={isLoading || !canDelete}
						onClick={() =>
							deleteEndpoint(name)
								.unwrap()
								.then(() => {
									toast.success(localeMessages.t("ui.upstream.relayDeletedSuccessfully", { ns: "common" }));
									onDeleted();
								})
								.catch((err) =>
									toast.error(localeMessages.t("ui.upstream.failedToDeleteRelay", { ns: "common" }), { description: getErrorMessage(err) }),
								)
						}
					>
						{isLoading ? "Deleting..." : localeMessages.t("ui.upstream.delete", { ns: "common" })}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}