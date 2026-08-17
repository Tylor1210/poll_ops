export interface ItemReceiptRow {
	id: number;
	manifest_item_id: number;
	received_quantity: number;
	received_by: string;
	received_at: string;
	condition_note: string | null;
}

export interface SignoffRow {
	id: number;
	location_id: string;
	role: "coordinator" | "supervisor" | "poll_worker";
	signer_name: string;
	signature_text: string;
	purpose: "relocation_approval" | "inventory_receipt";
	signed_at: string;
	note: string | null;
}

export async function listReceiptsForManifestItems(db: D1Database, manifestItemIds: number[]): Promise<ItemReceiptRow[]> {
	if (manifestItemIds.length === 0) return [];
	const placeholders = manifestItemIds.map(() => "?").join(",");
	const { results } = await db
		.prepare(`SELECT * FROM item_receipts WHERE manifest_item_id IN (${placeholders}) ORDER BY received_at DESC`)
		.bind(...manifestItemIds)
		.all<ItemReceiptRow>();
	return results;
}

export async function recordItemReceipt(
	db: D1Database,
	params: { manifestItemId: number; receivedQuantity: number; receivedBy: string; conditionNote?: string },
): Promise<void> {
	await db
		.prepare("INSERT INTO item_receipts (manifest_item_id, received_quantity, received_by, condition_note) VALUES (?, ?, ?, ?)")
		.bind(params.manifestItemId, params.receivedQuantity, params.receivedBy, params.conditionNote ?? null)
		.run();
}

export async function listSignoffsForLocation(db: D1Database, locationId: string): Promise<SignoffRow[]> {
	const { results } = await db
		.prepare("SELECT * FROM signoffs WHERE location_id = ? ORDER BY signed_at DESC")
		.bind(locationId)
		.all<SignoffRow>();
	return results;
}

export async function recordSignoff(
	db: D1Database,
	params: { locationId: string; role: SignoffRow["role"]; signerName: string; signatureText: string; purpose: SignoffRow["purpose"]; note?: string },
): Promise<void> {
	await db
		.prepare("INSERT INTO signoffs (location_id, role, signer_name, signature_text, purpose, note) VALUES (?, ?, ?, ?, ?, ?)")
		.bind(params.locationId, params.role, params.signerName, params.signatureText, params.purpose, params.note ?? null)
		.run();
}
