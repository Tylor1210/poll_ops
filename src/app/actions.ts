"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getEnv } from "@/lib/cf";
import { createContract } from "@/lib/contracts";
import { assignLocationGroup, createLocationGroup } from "@/lib/groups";
import { recordItemReceipt, recordSignoff } from "@/lib/receipts";
import { getCurrentRole, permissions, ROLE_COOKIE } from "@/lib/roles";
import type { Role } from "@/lib/roles";
import { runStage2 } from "@/lib/stages/stage2-ada-audit";
import type { CheckId } from "@/lib/stages/stage2-ada-audit";
import { runStage3 } from "@/lib/stages/stage3-logistics-manifest";
import { runStage4 } from "@/lib/stages/stage4-dispatch-runbook";
import { submitAuditEdit } from "@/lib/audit-edit";

export async function setRoleAction(role: Role) {
	const store = await cookies();
	store.set(ROLE_COOKIE, role, { path: "/", maxAge: 60 * 60 * 24 * 30 });
	revalidatePath("/", "layout");
}

async function requirePermission(check: (role: Role) => boolean, action: string) {
	const role = await getCurrentRole();
	if (!check(role)) throw new Error(`Your current role (${role}) can't ${action}.`);
	return role;
}

export async function runAuditAction(locationId: string) {
	await requirePermission(permissions.canRunPipeline, "run the ADA audit");
	const env = await getEnv();
	await runStage2(env, locationId);
	revalidatePath(`/locations/${locationId}`);
	revalidatePath("/");
}

export async function runManifestAction(locationId: string) {
	await requirePermission(permissions.canRunPipeline, "generate the manifest");
	const env = await getEnv();
	await runStage3(env, locationId);
	revalidatePath(`/locations/${locationId}`);
	revalidatePath("/");
}

export async function runDispatchAction(locationId: string) {
	await requirePermission(permissions.canRunPipeline, "generate the dispatch runbook");
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
	await requirePermission(permissions.canRunPipeline, "edit the audit checklist");
	const editedBy = params.editedBy.trim();
	if (!editedBy) throw new Error("Your name is required to log an edit.");

	const env = await getEnv();
	await submitAuditEdit(env, { ...params, editedBy, note: params.note?.trim() || undefined });

	revalidatePath(`/locations/${params.locationId}`);
	revalidatePath("/");
}

export async function approveRelocationAction(params: { locationId: string; signerName: string; note?: string }) {
	const role = await requirePermission(permissions.canApproveRelocation, "approve a relocation");
	const signerName = params.signerName.trim();
	if (!signerName) throw new Error("Your name is required to sign off.");

	const env = await getEnv();
	await recordSignoff(env.DB, {
		locationId: params.locationId,
		role,
		signerName,
		signatureText: signerName,
		purpose: "relocation_approval",
		note: params.note?.trim() || undefined,
	});

	revalidatePath(`/locations/${params.locationId}`);
}

export async function recordItemReceiptAction(params: { locationId: string; manifestItemId: number; receivedQuantity: number; receivedBy: string; conditionNote?: string }) {
	await requirePermission(permissions.canReceiveItems, "record item receipts");
	const receivedBy = params.receivedBy.trim();
	if (!receivedBy) throw new Error("Your name is required to check items in.");

	const env = await getEnv();
	await recordItemReceipt(env.DB, {
		manifestItemId: params.manifestItemId,
		receivedQuantity: params.receivedQuantity,
		receivedBy,
		conditionNote: params.conditionNote?.trim() || undefined,
	});

	revalidatePath(`/locations/${params.locationId}/work-order`);
	revalidatePath(`/locations/${params.locationId}`);
}

export async function submitInventorySignoffAction(params: { locationId: string; signerName: string; note?: string }) {
	const role = await requirePermission(permissions.canReceiveItems, "sign the inventory receipt");
	const signerName = params.signerName.trim();
	if (!signerName) throw new Error("Your name is required to sign off.");

	const env = await getEnv();
	await recordSignoff(env.DB, {
		locationId: params.locationId,
		role,
		signerName,
		signatureText: signerName,
		purpose: "inventory_receipt",
		note: params.note?.trim() || undefined,
	});

	revalidatePath(`/locations/${params.locationId}/work-order`);
	revalidatePath(`/locations/${params.locationId}`);
}

export async function createLocationGroupAction(params: { id: string; name: string; groupType: string }) {
	await requirePermission(permissions.canManageSetup, "create a location group");
	const env = await getEnv();
	await createLocationGroup(env.DB, params);
	revalidatePath("/");
}

export async function assignLocationGroupAction(params: { locationId: string; groupId: string | null }) {
	await requirePermission(permissions.canManageSetup, "reassign a location's group");
	const env = await getEnv();
	await assignLocationGroup(env.DB, params.locationId, params.groupId);
	revalidatePath("/");
	revalidatePath(`/locations/${params.locationId}`);
}

export async function createContractAction(params: {
	id: string;
	vendorName: string;
	itemType: string;
	quantityAvailable: number;
	validFrom: string;
	validUntil: string;
	notes?: string;
}) {
	await requirePermission(permissions.canManageSetup, "create a contract");
	const env = await getEnv();
	await createContract(env.DB, params);
	revalidatePath("/contracts");
}
