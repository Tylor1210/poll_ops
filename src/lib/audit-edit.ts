// Orchestrates a dashboard audit edit: applies the correction to the R2
// audit artifact + D1 status (Stage 2's concern), logs provenance, and
// invalidates any downstream Stage 3/4 artifacts since they were derived
// from the pre-edit findings and are now stale.

import { insertAuditEdit, replaceManifestItems } from "@/lib/db";
import { applyAuditEdit } from "@/lib/stages/stage2-ada-audit";
import type { AuditFindings, CheckId } from "@/lib/stages/stage2-ada-audit";
import { locationDispatchKey, locationManifestKey } from "@/lib/r2-keys";

export async function submitAuditEdit(
	env: { DB: D1Database; STAGE_ARTIFACTS: R2Bucket },
	params: { locationId: string; checkId: CheckId; newPass: boolean; editedBy: string; note?: string },
): Promise<AuditFindings> {
	const findings = await applyAuditEdit(env, { locationId: params.locationId, checkId: params.checkId, newPass: params.newPass });

	await insertAuditEdit(env.DB, {
		locationId: params.locationId,
		editedBy: params.editedBy,
		fieldChanged: params.checkId,
		note: params.note ?? null,
	});

	// The manifest/dispatch artifacts were built from the pre-edit findings —
	// drop them rather than leave stale content behind a "manifest_ready" or
	// "dispatched" badge that no longer reflects the current audit.
	await Promise.all([
		env.STAGE_ARTIFACTS.delete(locationManifestKey(params.locationId)),
		env.STAGE_ARTIFACTS.delete(locationDispatchKey(params.locationId)),
		replaceManifestItems(env.DB, params.locationId, []),
	]);

	return findings;
}
