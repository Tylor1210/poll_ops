// Thin D1 query helpers shared by the stage logic and API routes.

export interface PollingLocationRow {
	id: string;
	address: string;
	ada_audit_status: "pending" | "compliant" | "remediated_with_kit" | "needs_relocation";
	last_audited_at: string | null;
	group_id: string | null;
}

export interface PrecinctRow {
	id: string;
	name: string;
	polling_location_id: string;
	registered_voters: number;
	historical_turnout: number;
}

export interface ManifestItemRow {
	id: number;
	location_id: string;
	item_type: string;
	quantity: number;
	status: string;
}

export interface AuditEditRow {
	id: number;
	location_id: string;
	edited_by: string;
	edited_at: string;
	field_changed: string;
	note: string | null;
}

export interface ResourceAllocationRow {
	id: number;
	resource_type: string;
	date: string;
	location_id: string;
	precinct_id: string | null;
}

export async function getPollingLocation(db: D1Database, locationId: string): Promise<PollingLocationRow | null> {
	return db.prepare("SELECT * FROM polling_locations WHERE id = ?").bind(locationId).first<PollingLocationRow>();
}

export async function listPollingLocations(db: D1Database): Promise<PollingLocationRow[]> {
	const { results } = await db.prepare("SELECT * FROM polling_locations ORDER BY id").all<PollingLocationRow>();
	return results;
}

export async function getPrecinct(db: D1Database, precinctId: string): Promise<PrecinctRow | null> {
	return db.prepare("SELECT * FROM precincts WHERE id = ?").bind(precinctId).first<PrecinctRow>();
}

export async function listPrecinctsForLocation(db: D1Database, locationId: string): Promise<PrecinctRow[]> {
	const { results } = await db
		.prepare("SELECT * FROM precincts WHERE polling_location_id = ? ORDER BY id")
		.bind(locationId)
		.all<PrecinctRow>();
	return results;
}

export async function setLocationAuditStatus(
	db: D1Database,
	locationId: string,
	status: PollingLocationRow["ada_audit_status"],
	auditedAt: string,
): Promise<void> {
	await db
		.prepare("UPDATE polling_locations SET ada_audit_status = ?, last_audited_at = ? WHERE id = ?")
		.bind(status, auditedAt, locationId)
		.run();
}

export async function replaceManifestItems(
	db: D1Database,
	locationId: string,
	items: Array<{ itemType: string; quantity: number; status?: string }>,
): Promise<void> {
	const statements = [
		db.prepare("DELETE FROM manifest_items WHERE location_id = ?").bind(locationId),
		...items.map((item) =>
			db
				.prepare("INSERT INTO manifest_items (location_id, item_type, quantity, status) VALUES (?, ?, ?, ?)")
				.bind(locationId, item.itemType, item.quantity, item.status ?? "pending"),
		),
	];
	await db.batch(statements);
}

export async function listManifestItemsForLocation(db: D1Database, locationId: string): Promise<ManifestItemRow[]> {
	const { results } = await db
		.prepare("SELECT * FROM manifest_items WHERE location_id = ? ORDER BY item_type")
		.bind(locationId)
		.all<ManifestItemRow>();
	return results;
}

// Attempts to claim one unit of a shared, date-scoped resource. Returns the
// created row, or null if the resource is already at capacity for that
// (resource_type, date) — the caller is responsible for surfacing that as
// an unallocated flag rather than retrying or overbooking.
export async function tryAllocateResource(
	db: D1Database,
	params: { resourceType: string; date: string; locationId: string; precinctId?: string | null; capacity: number },
): Promise<ResourceAllocationRow | null> {
	const { resourceType, date, locationId, precinctId = null, capacity } = params;

	const existing = await db
		.prepare("SELECT COUNT(*) as count FROM resource_allocations WHERE resource_type = ? AND date = ?")
		.bind(resourceType, date)
		.first<{ count: number }>();

	if ((existing?.count ?? 0) >= capacity) {
		return null;
	}

	const result = await db
		.prepare(
			"INSERT INTO resource_allocations (resource_type, date, location_id, precinct_id) VALUES (?, ?, ?, ?) RETURNING *",
		)
		.bind(resourceType, date, locationId, precinctId)
		.first<ResourceAllocationRow>();

	return result ?? null;
}

export async function listAuditEditsForLocation(db: D1Database, locationId: string): Promise<AuditEditRow[]> {
	const { results } = await db
		.prepare("SELECT * FROM audit_edits WHERE location_id = ? ORDER BY edited_at DESC")
		.bind(locationId)
		.all<AuditEditRow>();
	return results;
}

export async function insertAuditEdit(
	db: D1Database,
	params: { locationId: string; editedBy: string; fieldChanged: string; note?: string | null },
): Promise<void> {
	await db
		.prepare("INSERT INTO audit_edits (location_id, edited_by, field_changed, note) VALUES (?, ?, ?, ?)")
		.bind(params.locationId, params.editedBy, params.fieldChanged, params.note ?? null)
		.run();
}
