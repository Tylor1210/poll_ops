"use server";

import { revalidatePath } from "next/cache";
import { getEnv } from "@/lib/cf";
import { runStage2 } from "@/lib/stages/stage2-ada-audit";
import type { CheckId } from "@/lib/stages/stage2-ada-audit";
import { runStage3 } from "@/lib/stages/stage3-logistics-manifest";
import { runStage4 } from "@/lib/stages/stage4-dispatch-runbook";
import { submitAuditEdit } from "@/lib/audit-edit";

export async function runAuditAction(locationId: string) {
	const env = await getEnv();
	await runStage2(env, locationId);
	revalidatePath(`/locations/${locationId}`);
	revalidatePath("/");
}

export async function runManifestAction(locationId: string) {
	const env = await getEnv();
	await runStage3(env, locationId);
	revalidatePath(`/locations/${locationId}`);
	revalidatePath("/");
}

export async function runDispatchAction(locationId: string) {
	const env = await getEnv();
	await runStage4(env, locationId);
	revalidatePath(`/locations/${locationId}`);
	revalidatePath(`/locations/${locationId}/work-order`);
	revalidatePath("/");
}

export async function submitAuditEditAction(params: {
	locationId: string;
	checkId: CheckId;
	newPass: boolean;
	editedBy: string;
	note?: string;
}) {
	const editedBy = params.editedBy.trim();
	if (!editedBy) throw new Error("Your name is required to log an edit.");

	const env = await getEnv();
	await submitAuditEdit(env, { ...params, editedBy, note: params.note?.trim() || undefined });

	revalidatePath(`/locations/${params.locationId}`);
	revalidatePath("/");
}
