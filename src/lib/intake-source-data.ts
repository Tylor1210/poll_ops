// Synthetic seed/intake data for local/demo use only. No real voter names,
// addresses, or registration numbers.
//
// This module is the single source of truth for the synthetic dataset. Two
// consumers:
//   - scripts/seed.ts inserts the relational subset (precincts,
//     polling_locations) into D1.
//   - Stage 1 (src/lib/stages/stage1-precinct-intake.ts) reads `adaSurvey`
//     from here to produce each precinct's R2 baseline JSON — standing in
//     for a real field-intake form, since this is a synthetic demo rather
//     than a live county with an actual intake pipeline.

export type EntranceType = "accessible" | "ramp_available" | "stairs_only";

export interface AdaSurvey {
	entrance: EntranceType;
	rampPathViable: boolean;
	accessibleParking: boolean;
	pathOfTravelClear: boolean;
	doorwayWidthInches: number;
	restroomAccessible: boolean;
	signageCompliant: boolean;
	surveyorNote: string;
}

export interface SeedLocation {
	id: string;
	address: string;
	adaSurvey: AdaSurvey;
}

export interface SeedPrecinct {
	id: string;
	name: string;
	pollingLocationId: string;
	registeredVoters: number;
	historicalTurnout: number;
}

export const locations: SeedLocation[] = [
	{
		id: "loc-001",
		address: "100 Maple Community Center, Fairview",
		adaSurvey: {
			entrance: "accessible",
			rampPathViable: true,
			accessibleParking: true,
			pathOfTravelClear: true,
			doorwayWidthInches: 38,
			restroomAccessible: true,
			signageCompliant: true,
			surveyorNote: "Fully compliant. No action needed.",
		},
	},
	{
		id: "loc-002",
		address: "220 Birchwood Elementary Gym, Fairview",
		adaSurvey: {
			entrance: "ramp_available",
			rampPathViable: true,
			accessibleParking: true,
			pathOfTravelClear: true,
			doorwayWidthInches: 34,
			restroomAccessible: true,
			signageCompliant: false,
			surveyorNote: "Ramp and path are fine; accessible-entrance signage is missing at the main door.",
		},
	},
	{
		id: "loc-003",
		address: "45 Cedar Grange Hall, Millbrook",
		adaSurvey: {
			entrance: "ramp_available",
			rampPathViable: true,
			accessibleParking: false,
			pathOfTravelClear: true,
			doorwayWidthInches: 36,
			restroomAccessible: true,
			signageCompliant: true,
			surveyorNote: "No van-accessible parking space striped. Portable signage/cones can designate one for election day.",
		},
	},
	{
		id: "loc-004",
		address: "12 Oakview Library Branch, Millbrook",
		adaSurvey: {
			entrance: "accessible",
			rampPathViable: true,
			accessibleParking: true,
			pathOfTravelClear: true,
			doorwayWidthInches: 40,
			restroomAccessible: true,
			signageCompliant: true,
			surveyorNote: "Fully compliant. No action needed.",
		},
	},
	{
		id: "loc-005",
		address: "300 Willow Recreation Complex, Fairview",
		adaSurvey: {
			entrance: "accessible",
			rampPathViable: true,
			accessibleParking: true,
			pathOfTravelClear: true,
			doorwayWidthInches: 42,
			restroomAccessible: true,
			signageCompliant: true,
			surveyorNote: "Fully compliant. Large shared site serving three precincts.",
		},
	},
	{
		id: "loc-006",
		address: "8 Chapel Hill Fire Station, Millbrook",
		adaSurvey: {
			entrance: "stairs_only",
			rampPathViable: false,
			accessibleParking: true,
			pathOfTravelClear: false,
			doorwayWidthInches: 32,
			restroomAccessible: false,
			signageCompliant: false,
			surveyorNote:
				"Only entrance is a raised stoop with four steps; building sits on a slope with no grade elsewhere for a compliant ramp run. No portable-ramp configuration clears the rise within code. Relocation recommended.",
		},
	},
	{
		id: "loc-007",
		address: "77 Riverside Grange, Fairview",
		adaSurvey: {
			entrance: "ramp_available",
			rampPathViable: true,
			accessibleParking: true,
			pathOfTravelClear: false,
			doorwayWidthInches: 34,
			restroomAccessible: true,
			signageCompliant: true,
			surveyorNote: "Ramp is compliant but gravel path from the lot to the ramp needs a temporary matting runway.",
		},
	},
	{
		id: "loc-008",
		address: "19 Sunset Senior Center, Millbrook",
		adaSurvey: {
			entrance: "accessible",
			rampPathViable: true,
			accessibleParking: true,
			pathOfTravelClear: true,
			doorwayWidthInches: 36,
			restroomAccessible: true,
			signageCompliant: true,
			surveyorNote: "Fully compliant. No action needed.",
		},
	},
];

export const precincts: SeedPrecinct[] = [
	{ id: "pct-01", name: "Fairview 01", pollingLocationId: "loc-001", registeredVoters: 1840, historicalTurnout: 0.58 },
	{ id: "pct-02", name: "Fairview 02", pollingLocationId: "loc-002", registeredVoters: 2105, historicalTurnout: 0.61 },
	// Co-located precincts: loc-003 serves two precincts (edge case 1).
	{ id: "pct-03", name: "Millbrook 03", pollingLocationId: "loc-003", registeredVoters: 1370, historicalTurnout: 0.49 },
	{ id: "pct-04", name: "Millbrook 04", pollingLocationId: "loc-003", registeredVoters: 1590, historicalTurnout: 0.52 },
	{ id: "pct-05", name: "Millbrook 05", pollingLocationId: "loc-004", registeredVoters: 1960, historicalTurnout: 0.55 },
	// Co-located precincts: loc-005 serves three precincts.
	{ id: "pct-06", name: "Fairview 06", pollingLocationId: "loc-005", registeredVoters: 1425, historicalTurnout: 0.63 },
	{ id: "pct-07", name: "Fairview 07", pollingLocationId: "loc-005", registeredVoters: 1680, historicalTurnout: 0.60 },
	{ id: "pct-08", name: "Fairview 08", pollingLocationId: "loc-005", registeredVoters: 1512, historicalTurnout: 0.59 },
	{ id: "pct-09", name: "Millbrook 09", pollingLocationId: "loc-006", registeredVoters: 980, historicalTurnout: 0.44 },
	{ id: "pct-10", name: "Fairview 10", pollingLocationId: "loc-007", registeredVoters: 2230, historicalTurnout: 0.57 },
	{ id: "pct-11", name: "Millbrook 11", pollingLocationId: "loc-008", registeredVoters: 1105, historicalTurnout: 0.51 },
];
