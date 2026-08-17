// Synthetic seed data for the v2 features (groups, election history,
// contracts). Same rules as intake-source-data.ts: no real voter names,
// addresses, or registration numbers.

export interface SeedGroup {
	id: string;
	name: string;
	groupType: string;
}

export const groups: SeedGroup[] = [
	{ id: "grp-fairview", name: "Fairview", groupType: "city" },
	{ id: "grp-millbrook", name: "Millbrook", groupType: "city" },
];

// location_id -> group_id
export const locationGroupAssignments: Record<string, string> = {
	"loc-001": "grp-fairview",
	"loc-002": "grp-fairview",
	"loc-005": "grp-fairview",
	"loc-007": "grp-fairview",
	"loc-003": "grp-millbrook",
	"loc-004": "grp-millbrook",
	"loc-006": "grp-millbrook",
	"loc-008": "grp-millbrook",
};

export interface SeedElectionCycle {
	id: string;
	label: string;
	electionType: "general" | "primary" | "municipal" | "special" | "runoff";
	electionDate: string;
}

export const electionCycles: SeedElectionCycle[] = [
	{ id: "ec-2022-general", label: "2022 General Election", electionType: "general", electionDate: "2022-11-08" },
	{ id: "ec-2024-primary", label: "2024 Primary Election", electionType: "primary", electionDate: "2024-03-05" },
	{ id: "ec-2024-general", label: "2024 General Election", electionType: "general", electionDate: "2024-11-05" },
];

export interface SeedHistoryItem {
	itemType: string;
	quantityUsed: number;
}

export interface SeedHistoryIssue {
	issueType: string;
	itemType?: string;
	description: string;
}

export interface SeedLocationHistory {
	locationId: string;
	electionCycleId: string;
	registeredVoters: number;
	turnoutPercent: number;
	notes?: string;
	items: SeedHistoryItem[];
	issues: SeedHistoryIssue[];
}

// loc-006 and loc-004 consistently run heavier on hand sanitizer than the
// other sites — the exact kind of pattern the item-usage leaderboard query
// is meant to surface, not something read off a single election's notes.
export const locationHistory: SeedLocationHistory[] = [
	// loc-001 — Fairview, 1 precinct
	{
		locationId: "loc-001",
		electionCycleId: "ec-2022-general",
		registeredVoters: 1690,
		turnoutPercent: 0.55,
		items: [
			{ itemType: "ballots", quantityUsed: 930 },
			{ itemType: "hand_sanitizer", quantityUsed: 6 },
			{ itemType: "privacy_sleeves", quantityUsed: 40 },
		],
		issues: [],
	},
	{
		locationId: "loc-001",
		electionCycleId: "ec-2024-general",
		registeredVoters: 1810,
		turnoutPercent: 0.59,
		items: [
			{ itemType: "ballots", quantityUsed: 1068 },
			{ itemType: "hand_sanitizer", quantityUsed: 7 },
			{ itemType: "privacy_sleeves", quantityUsed: 45 },
		],
		issues: [],
	},

	// loc-002 — Fairview, signage issue recurring
	{
		locationId: "loc-002",
		electionCycleId: "ec-2024-general",
		registeredVoters: 2050,
		turnoutPercent: 0.6,
		items: [
			{ itemType: "ballots", quantityUsed: 1230 },
			{ itemType: "hand_sanitizer", quantityUsed: 8 },
		],
		issues: [{ issueType: "other", description: "Accessible-entrance signage was missing again — same gap flagged the prior cycle." }],
	},

	// loc-003 — Millbrook, co-located, ran short on provisional envelopes
	{
		locationId: "loc-003",
		electionCycleId: "ec-2022-general",
		registeredVoters: 2610,
		turnoutPercent: 0.47,
		items: [
			{ itemType: "ballots", quantityUsed: 1227 },
			{ itemType: "provisional_ballot_envelopes", quantityUsed: 50 },
			{ itemType: "hand_sanitizer", quantityUsed: 9 },
		],
		issues: [
			{
				issueType: "ran_out_of_supply",
				itemType: "provisional_ballot_envelopes",
				description: "Ran out of provisional ballot envelopes around 6pm; borrowed a box from loc-004.",
			},
		],
	},
	{
		locationId: "loc-003",
		electionCycleId: "ec-2024-general",
		registeredVoters: 2890,
		turnoutPercent: 0.51,
		notes: "Increased provisional envelope order after 2022 shortfall.",
		items: [
			{ itemType: "ballots", quantityUsed: 1474 },
			{ itemType: "provisional_ballot_envelopes", quantityUsed: 75 },
			{ itemType: "hand_sanitizer", quantityUsed: 10 },
		],
		issues: [],
	},

	// loc-004 — Millbrook, consistently heavy hand sanitizer use
	{
		locationId: "loc-004",
		electionCycleId: "ec-2022-general",
		registeredVoters: 1840,
		turnoutPercent: 0.53,
		items: [
			{ itemType: "ballots", quantityUsed: 975 },
			{ itemType: "hand_sanitizer", quantityUsed: 22 },
		],
		issues: [],
	},
	{
		locationId: "loc-004",
		electionCycleId: "ec-2024-primary",
		registeredVoters: 1900,
		turnoutPercent: 0.22,
		items: [
			{ itemType: "ballots", quantityUsed: 418 },
			{ itemType: "hand_sanitizer", quantityUsed: 14 },
		],
		issues: [],
	},
	{
		locationId: "loc-004",
		electionCycleId: "ec-2024-general",
		registeredVoters: 1930,
		turnoutPercent: 0.56,
		items: [
			{ itemType: "ballots", quantityUsed: 1081 },
			{ itemType: "hand_sanitizer", quantityUsed: 24 },
		],
		issues: [],
	},

	// loc-005 — Fairview, large 3-precinct site
	{
		locationId: "loc-005",
		electionCycleId: "ec-2024-general",
		registeredVoters: 4380,
		turnoutPercent: 0.61,
		items: [
			{ itemType: "ballots", quantityUsed: 2672 },
			{ itemType: "hand_sanitizer", quantityUsed: 12 },
			{ itemType: "pens", quantityUsed: 6 },
		],
		issues: [{ issueType: "long_lines", description: "Line backed up to the parking lot for roughly 90 minutes after 5pm." }],
	},

	// loc-006 — Millbrook, no restroom on-site (matches its ADA facts), heaviest sanitizer use by far
	{
		locationId: "loc-006",
		electionCycleId: "ec-2022-general",
		registeredVoters: 940,
		turnoutPercent: 0.41,
		items: [
			{ itemType: "ballots", quantityUsed: 385 },
			{ itemType: "hand_sanitizer", quantityUsed: 28 },
		],
		issues: [{ issueType: "equipment_failure", description: "One e-poll pad lost power mid-morning; backup unit swapped in within 20 minutes." }],
	},
	{
		locationId: "loc-006",
		electionCycleId: "ec-2024-general",
		registeredVoters: 965,
		turnoutPercent: 0.45,
		notes: "Site has no indoor restroom — portable unit brought in, which correlates with heavier sanitizer use.",
		items: [
			{ itemType: "ballots", quantityUsed: 434 },
			{ itemType: "hand_sanitizer", quantityUsed: 31 },
		],
		issues: [],
	},

	// loc-007 — Fairview
	{
		locationId: "loc-007",
		electionCycleId: "ec-2024-general",
		registeredVoters: 2180,
		turnoutPercent: 0.55,
		items: [
			{ itemType: "ballots", quantityUsed: 1199 },
			{ itemType: "hand_sanitizer", quantityUsed: 9 },
		],
		issues: [],
	},

	// loc-008 — Millbrook
	{
		locationId: "loc-008",
		electionCycleId: "ec-2024-general",
		registeredVoters: 1080,
		turnoutPercent: 0.49,
		items: [
			{ itemType: "ballots", quantityUsed: 529 },
			{ itemType: "hand_sanitizer", quantityUsed: 8 },
		],
		issues: [],
	},
];

export interface SeedContract {
	id: string;
	vendorName: string;
	itemType: string;
	quantityAvailable: number;
	validFrom: string;
	validUntil: string;
	notes?: string;
}

export const contracts: SeedContract[] = [
	// Deliberately tight relative to total demand across all 8 locations, so
	// Stage 3 can demonstrate a real shortfall flag rather than an
	// always-green happy path.
	{ id: "ctr-ballots", vendorName: "Meridian Print & Ballot Co.", itemType: "ballots", quantityAvailable: 8000, validFrom: "2026-01-01", validUntil: "2026-12-31", notes: "Primary print run — a second press run can be ordered if this is exhausted." },
	{ id: "ctr-booths", vendorName: "Civic Systems Equipment", itemType: "voting_booths", quantityAvailable: 100, validFrom: "2026-01-01", validUntil: "2026-12-31" },
	{ id: "ctr-pollpads", vendorName: "Civic Systems Equipment", itemType: "poll_pads", quantityAvailable: 20, validFrom: "2026-01-01", validUntil: "2026-12-31" },
	{ id: "ctr-envelopes", vendorName: "Meridian Print & Ballot Co.", itemType: "provisional_ballot_envelopes", quantityAvailable: 500, validFrom: "2026-01-01", validUntil: "2026-12-31" },
	{ id: "ctr-parking-kit", vendorName: "AccessPath ADA Supply", itemType: "accessible_parking_kit", quantityAvailable: 10, validFrom: "2026-01-01", validUntil: "2026-12-31" },
	{ id: "ctr-matting", vendorName: "AccessPath ADA Supply", itemType: "matting_runway", quantityAvailable: 10, validFrom: "2026-01-01", validUntil: "2026-12-31" },
	{ id: "ctr-restroom", vendorName: "AccessPath ADA Supply", itemType: "portable_restroom", quantityAvailable: 5, validFrom: "2026-01-01", validUntil: "2026-12-31" },
	{ id: "ctr-signage", vendorName: "AccessPath ADA Supply", itemType: "ada_signage_kit", quantityAvailable: 10, validFrom: "2026-01-01", validUntil: "2026-12-31" },
];
