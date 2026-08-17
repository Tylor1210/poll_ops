// Read-only composition layer over D1 + R2. Never triggers stage logic —
// GET routes (and later, dashboard views) only read cached artifacts, so a
// page view never regenerates a stage. Only the POST trigger routes do that.

import { getPollingLocation, listAuditEditsForLocation, listManifestItemsForLocation, listPollingLocations, listPrecinctsForLocation } from "@/lib/db";
import type { AuditEditRow, ManifestItemRow, PollingLocationRow, PrecinctRow } from "@/lib/db";
import { listLocationGroups } from "@/lib/groups";
import type { LocationGroupRow } from "@/lib/groups";
import { getLocationHistory } from "@/lib/history";
import type { LocationHistoryEntry } from "@/lib/history";
import { listReceiptsForManifestItems, listSignoffsForLocation } from "@/lib/receipts";
import type { ItemReceiptRow, SignoffRow } from "@/lib/receipts";
import { getPrecinctBaseline } from "@/lib/stages/stage1-precinct-intake";
import { getAuditFindings } from "@/lib/stages/stage2-ada-audit";
import type { AuditFindings } from "@/lib/stages/stage2-ada-audit";
import { getManifest } from "@/lib/stages/stage3-logistics-manifest";
import type { ManifestArtifact } from "@/lib/stages/stage3-logistics-manifest";
import { getDispatchRunbook } from "@/lib/stages/stage4-dispatch-runbook";
import { locationDispatchKey, locationManifestKey } from "@/lib/r2-keys";

export type PipelineStage = "not_started" | "audited" | "manifest_ready" | "dispatched";

export interface LocationSummary {
	id: string;
	address: string;
	adaAuditStatus: PollingLocationRow["ada_audit_status"];
	lastAuditedAt: string | null;
	pipelineStage: PipelineStage;
	precinctCount: number;
	totalRegisteredVoters: number;
	group: LocationGroupRow | null;
}

async function computePipelineStage(env: { STAGE_ARTIFACTS: R2Bucket }, location: PollingLocationRow): Promise<PipelineStage> {
	if (location.ada_audit_status === "pending") return "not_started";
	const [manifest, dispatch] = await Promise.all([
		env.STAGE_ARTIFACTS.head(locationManifestKey(location.id)),
		env.STAGE_ARTIFACTS.head(locationDispatchKey(location.id)),
	]);
	if (!manifest) return "audited";
	if (!dispatch) return "manifest_ready";
	return "dispatched";
}

export async function listLocationSummaries(env: { DB: D1Database; STAGE_ARTIFACTS: R2Bucket }): Promise<LocationSummary[]> {
	const [locations, groups] = await Promise.all([listPollingLocations(env.DB), listLocationGroups(env.DB)]);
	const groupsById = new Map(groups.map((g) => [g.id, g]));

	return Promise.all(
		locations.map(async (location) => {
			const precincts = await listPrecinctsForLocation(env.DB, location.id);
			const pipelineStage = await computePipelineStage(env, location);
			return {
				id: location.id,
				address: location.address,
				adaAuditStatus: location.ada_audit_status,
				lastAuditedAt: location.last_audited_at,
				pipelineStage,
				precinctCount: precincts.length,
				totalRegisteredVoters: precincts.reduce((sum, p) => sum + p.registered_voters, 0),
				group: location.group_id ? (groupsById.get(location.group_id) ?? null) : null,
			};
		}),
	);
}

export interface LocationDetail {
	location: PollingLocationRow;
	group: LocationGroupRow | null;
	precincts: PrecinctRow[];
	pipelineStage: PipelineStage;
	auditFindings: AuditFindings | null;
	manifest: ManifestArtifact | null;
	manifestItems: ManifestItemRow[];
	itemReceipts: ItemReceiptRow[];
	dispatchRunbook: string | null;
	auditEdits: AuditEditRow[];
	history: LocationHistoryEntry[];
	signoffs: SignoffRow[];
}

export async function getLocationDetail(env: { DB: D1Database; STAGE_ARTIFACTS: R2Bucket }, locationId: string): Promise<LocationDetail | null> {
	const location = await getPollingLocation(env.DB, locationId);
	if (!location) return null;

	const [precincts, pipelineStage, auditFindings, manifest, manifestItems, dispatchRunbook, auditEdits, groups, history, signoffs] =
		await Promise.all([
			listPrecinctsForLocation(env.DB, locationId),
			computePipelineStage(env, location),
			getAuditFindings(env, locationId),
			getManifest(env, locationId),
			listManifestItemsForLocation(env.DB, locationId),
			getDispatchRunbook(env, locationId),
			listAuditEditsForLocation(env.DB, locationId),
			listLocationGroups(env.DB),
			getLocationHistory(env.DB, locationId),
			listSignoffsForLocation(env.DB, locationId),
		]);

	const itemReceipts = await listReceiptsForManifestItems(
		env.DB,
		manifestItems.map((i) => i.id),
	);

	const group = location.group_id ? (groups.find((g) => g.id === location.group_id) ?? null) : null;

	return {
		location,
		group,
		precincts,
		pipelineStage,
		auditFindings,
		manifest,
		manifestItems,
		itemReceipts,
		dispatchRunbook,
		auditEdits,
		history,
		signoffs,
	};
}

export async function getPrecinctBaselineOrNull(env: { STAGE_ARTIFACTS: R2Bucket }, precinctId: string) {
	return getPrecinctBaseline(env, precinctId);
}
