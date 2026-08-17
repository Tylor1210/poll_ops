// Stage 1: precinct intake (deterministic — pure data transform).
//
// Reads a precinct's relational data from D1 plus its polling location's raw
// ADA survey facts (the synthetic intake source, standing in for a real
// field-intake form) and writes a formatted baseline JSON artifact to R2.
// This is the only artifact keyed by precinct_id rather than location_id.

import { getPollingLocation, getPrecinct } from "@/lib/db";
import { locations } from "@/lib/intake-source-data";
import { precinctBaselineKey } from "@/lib/r2-keys";
import type { AdaSurvey } from "@/lib/intake-source-data";

export interface PrecinctBaseline {
	precinctId: string;
	name: string;
	pollingLocationId: string;
	registeredVoters: number;
	historicalTurnout: number;
	locationAddress: string;
	adaSurvey: AdaSurvey;
	generatedAt: string;
}

export async function runStage1(
	env: { DB: D1Database; STAGE_ARTIFACTS: R2Bucket },
	precinctId: string,
): Promise<PrecinctBaseline> {
	const precinct = await getPrecinct(env.DB, precinctId);
	if (!precinct) throw new Error(`Stage 1: precinct ${precinctId} not found in D1`);

	const location = await getPollingLocation(env.DB, precinct.polling_location_id);
	if (!location) throw new Error(`Stage 1: polling location ${precinct.polling_location_id} not found in D1`);

	const intakeLocation = locations.find((loc) => loc.id === location.id);
	if (!intakeLocation) throw new Error(`Stage 1: no ADA survey intake data for location ${location.id}`);

	const baseline: PrecinctBaseline = {
		precinctId: precinct.id,
		name: precinct.name,
		pollingLocationId: precinct.polling_location_id,
		registeredVoters: precinct.registered_voters,
		historicalTurnout: precinct.historical_turnout,
		locationAddress: location.address,
		adaSurvey: intakeLocation.adaSurvey,
		generatedAt: new Date().toISOString(),
	};

	await env.STAGE_ARTIFACTS.put(precinctBaselineKey(precinctId), JSON.stringify(baseline, null, 2), {
		httpMetadata: { contentType: "application/json" },
	});

	return baseline;
}

export async function getPrecinctBaseline(env: { STAGE_ARTIFACTS: R2Bucket }, precinctId: string): Promise<PrecinctBaseline | null> {
	const object = await env.STAGE_ARTIFACTS.get(precinctBaselineKey(precinctId));
	if (!object) return null;
	return object.json<PrecinctBaseline>();
}
