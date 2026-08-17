// Stage 3: logistics manifest (deterministic — ballot/equipment math plus
// checklist-driven kit selection, no model call).
//
// A location flagged needs_relocation gets no supply manifest — it gets a
// review flag artifact instead, and no manifest_items rows, so the
// dashboard can surface it as needing supervisor action rather than a
// routine order.
//
// Shared, date-scoped resources (roving ADA tech, portable ramp) are drawn
// from resource_allocations, which has finite capacity per (resource_type,
// date). A request that can't be satisfied is recorded as unallocated in
// the manifest artifact rather than silently double-booking the pool.

import { getPollingLocation, listPrecinctsForLocation, replaceManifestItems, tryAllocateResource } from "@/lib/db";
import { getAuditFindings } from "@/lib/stages/stage2-ada-audit";
import { locationManifestKey } from "@/lib/r2-keys";

// Synthetic v1 assumption: all logistics are scheduled for a single election
// day, and the shared pool has a small fixed daily capacity per resource
// type. A real system would take these as inputs (per-location dispatch
// date, actual crew/inventory counts).
export const ELECTION_DAY = "2026-11-03";
export const ROVING_TECH_DAILY_CAPACITY = 2;
export const PORTABLE_RAMP_DAILY_CAPACITY = 2;

const BALLOT_BUFFER = 1.1;
const VOTERS_PER_BOOTH = 100;
const MIN_BOOTHS = 2;
const PROVISIONAL_ENVELOPES = 50;

export interface BallotEquipmentPlan {
	expectedVoters: number;
	ballots: number;
	votingBooths: number;
	pollPads: number;
	provisionalEnvelopes: number;
}

export interface SupplyManifest {
	type: "supply_manifest";
	locationId: string;
	generatedAt: string;
	ballotEquipment: BallotEquipmentPlan;
	items: Array<{ itemType: string; quantity: number }>;
	rovingTech: { requested: boolean; allocated: boolean };
	portableRamp: { requested: boolean; allocated: boolean };
}

export interface ReviewFlag {
	type: "review_flag";
	locationId: string;
	generatedAt: string;
	reason: string;
}

export type ManifestArtifact = SupplyManifest | ReviewFlag;

function planBallotEquipment(precincts: Array<{ registered_voters: number; historical_turnout: number }>): BallotEquipmentPlan {
	const expectedVoters = Math.round(precincts.reduce((sum, p) => sum + p.registered_voters * p.historical_turnout, 0));
	return {
		expectedVoters,
		ballots: Math.ceil(expectedVoters * BALLOT_BUFFER),
		votingBooths: Math.max(MIN_BOOTHS, Math.ceil(expectedVoters / VOTERS_PER_BOOTH)),
		pollPads: Math.max(1, precincts.length),
		provisionalEnvelopes: PROVISIONAL_ENVELOPES,
	};
}

export async function runStage3(
	env: { DB: D1Database; STAGE_ARTIFACTS: R2Bucket },
	locationId: string,
): Promise<ManifestArtifact> {
	const location = await getPollingLocation(env.DB, locationId);
	if (!location) throw new Error(`Stage 3: polling location ${locationId} not found in D1`);
	if (location.ada_audit_status === "pending") {
		throw new Error(`Stage 3: location ${locationId} has not been audited yet — run Stage 2 first`);
	}

	const findings = await getAuditFindings(env, locationId);
	if (!findings) throw new Error(`Stage 3: audit artifact missing for location ${locationId}`);

	const generatedAt = new Date().toISOString();

	if (findings.status === "needs_relocation") {
		const artifact: ReviewFlag = {
			type: "review_flag",
			locationId,
			generatedAt,
			reason: findings.relocationReason ?? "Location requires relocation before it can be provisioned.",
		};
		await env.STAGE_ARTIFACTS.put(locationManifestKey(locationId), JSON.stringify(artifact, null, 2), {
			httpMetadata: { contentType: "application/json" },
		});
		await replaceManifestItems(env.DB, locationId, []);
		return artifact;
	}

	const precincts = await listPrecinctsForLocation(env.DB, locationId);
	const ballotEquipment = planBallotEquipment(precincts);

	const items: Array<{ itemType: string; quantity: number }> = [
		{ itemType: "ballots", quantity: ballotEquipment.ballots },
		{ itemType: "voting_booths", quantity: ballotEquipment.votingBooths },
		{ itemType: "poll_pads", quantity: ballotEquipment.pollPads },
		{ itemType: "provisional_ballot_envelopes", quantity: ballotEquipment.provisionalEnvelopes },
	];
	// Kit remediation items from the audit, minus the portable ramp — that's
	// a shared scheduled resource (resource_allocations), not a consumable.
	for (const item of findings.remediationItems) {
		if (item.startsWith("Portable ramp deployment")) continue;
		items.push({ itemType: item, quantity: 1 });
	}

	const rovingTechRequested = findings.status === "remediated_with_kit";
	const rovingTechAllocation = rovingTechRequested
		? await tryAllocateResource(env.DB, { resourceType: "roving_tech", date: ELECTION_DAY, locationId, capacity: ROVING_TECH_DAILY_CAPACITY })
		: null;

	const portableRampRequested = findings.needsPortableRamp;
	const portableRampAllocation = portableRampRequested
		? await tryAllocateResource(env.DB, { resourceType: "portable_ramp", date: ELECTION_DAY, locationId, capacity: PORTABLE_RAMP_DAILY_CAPACITY })
		: null;

	const artifact: SupplyManifest = {
		type: "supply_manifest",
		locationId,
		generatedAt,
		ballotEquipment,
		items,
		rovingTech: { requested: rovingTechRequested, allocated: rovingTechAllocation !== null },
		portableRamp: { requested: portableRampRequested, allocated: portableRampAllocation !== null },
	};

	await env.STAGE_ARTIFACTS.put(locationManifestKey(locationId), JSON.stringify(artifact, null, 2), {
		httpMetadata: { contentType: "application/json" },
	});
	await replaceManifestItems(env.DB, locationId, items.map((i) => ({ itemType: i.itemType, quantity: i.quantity })));

	return artifact;
}

export async function getManifest(env: { STAGE_ARTIFACTS: R2Bucket }, locationId: string): Promise<ManifestArtifact | null> {
	const object = await env.STAGE_ARTIFACTS.get(locationManifestKey(locationId));
	if (!object) return null;
	return object.json<ManifestArtifact>();
}
