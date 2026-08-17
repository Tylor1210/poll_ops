export interface LocationGroupRow {
	id: string;
	name: string;
	group_type: string;
}

export async function listLocationGroups(db: D1Database): Promise<LocationGroupRow[]> {
	const { results } = await db.prepare("SELECT * FROM location_groups ORDER BY name").all<LocationGroupRow>();
	return results;
}

export async function createLocationGroup(db: D1Database, params: { id: string; name: string; groupType: string }): Promise<void> {
	await db
		.prepare("INSERT INTO location_groups (id, name, group_type) VALUES (?, ?, ?)")
		.bind(params.id, params.name, params.groupType)
		.run();
}

export async function assignLocationGroup(db: D1Database, locationId: string, groupId: string | null): Promise<void> {
	await db.prepare("UPDATE polling_locations SET group_id = ? WHERE id = ?").bind(groupId, locationId).run();
}
