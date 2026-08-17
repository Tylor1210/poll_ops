export interface ElectionCycleRow {
	id: string;
	label: string;
	election_type: "general" | "primary" | "municipal" | "special" | "runoff";
	election_date: string;
}

export interface LocationHistoryRow {
	id: number;
	location_id: string;
	election_cycle_id: string;
	registered_voters: number;
	turnout_percent: number;
	notes: string | null;
}

export interface LocationHistoryItemRow {
	id: number;
	location_history_id: number;
	item_type: string;
	quantity_used: number;
}

export interface LocationHistoryIssueRow {
	id: number;
	location_history_id: number;
	issue_type: string;
	item_type: string | null;
	description: string;
}

export interface LocationHistoryEntry {
	cycle: ElectionCycleRow;
	record: LocationHistoryRow;
	items: LocationHistoryItemRow[];
	issues: LocationHistoryIssueRow[];
}

export async function listElectionCycles(db: D1Database): Promise<ElectionCycleRow[]> {
	const { results } = await db.prepare("SELECT * FROM election_cycles ORDER BY election_date DESC").all<ElectionCycleRow>();
	return results;
}

// Full history for one location, newest cycle first, with items/issues
// nested under each cycle — this is what the location detail page's
// History section renders directly.
export async function getLocationHistory(db: D1Database, locationId: string): Promise<LocationHistoryEntry[]> {
	const { results: records } = await db
		.prepare(
			`SELECT lh.*, ec.label as cycle_label, ec.election_type as cycle_election_type, ec.election_date as cycle_election_date
			 FROM location_history lh
			 JOIN election_cycles ec ON ec.id = lh.election_cycle_id
			 WHERE lh.location_id = ?
			 ORDER BY ec.election_date DESC`,
		)
		.bind(locationId)
		.all<
			LocationHistoryRow & { cycle_label: string; cycle_election_type: ElectionCycleRow["election_type"]; cycle_election_date: string }
		>();

	if (records.length === 0) return [];

	const historyIds = records.map((r) => r.id);
	const placeholders = historyIds.map(() => "?").join(",");

	const { results: allItems } = await db
		.prepare(`SELECT * FROM location_history_items WHERE location_history_id IN (${placeholders}) ORDER BY item_type`)
		.bind(...historyIds)
		.all<LocationHistoryItemRow>();

	const { results: allIssues } = await db
		.prepare(`SELECT * FROM location_history_issues WHERE location_history_id IN (${placeholders}) ORDER BY id`)
		.bind(...historyIds)
		.all<LocationHistoryIssueRow>();

	return records.map((record) => ({
		cycle: { id: record.election_cycle_id, label: record.cycle_label, election_type: record.cycle_election_type, election_date: record.cycle_election_date },
		record,
		items: allItems.filter((i) => i.location_history_id === record.id),
		issues: allIssues.filter((i) => i.location_history_id === record.id),
	}));
}

export interface ItemUsageLeaderboardRow {
	location_id: string;
	address: string;
	avg_quantity_used: number;
	cycles_recorded: number;
}

// "Which locations run heaviest on item X across past cycles" — the query
// that makes the hand-sanitizer anecdote an actual, checkable number.
export async function getItemUsageLeaderboard(db: D1Database, itemType: string): Promise<ItemUsageLeaderboardRow[]> {
	const { results } = await db
		.prepare(
			`SELECT pl.id as location_id, pl.address as address,
			        AVG(lhi.quantity_used) as avg_quantity_used,
			        COUNT(DISTINCT lh.id) as cycles_recorded
			 FROM location_history_items lhi
			 JOIN location_history lh ON lh.id = lhi.location_history_id
			 JOIN polling_locations pl ON pl.id = lh.location_id
			 WHERE lhi.item_type = ?
			 GROUP BY pl.id
			 ORDER BY avg_quantity_used DESC`,
		)
		.bind(itemType)
		.all<ItemUsageLeaderboardRow>();
	return results;
}
