// Vendor contracts and the ledger of what's been claimed against them.
// Same shape as the resource_allocations shared pool (src/lib/db.ts):
// finite capacity, a ledger of claims, no overbooking — but scoped to a
// (contract, item_type) pair instead of (resource_type, date).

export interface ContractRow {
	id: string;
	vendor_name: string;
	item_type: string;
	quantity_available: number;
	valid_from: string;
	valid_until: string;
	notes: string | null;
}

export interface ContractAllocationRow {
	id: number;
	contract_id: string;
	location_id: string;
	item_type: string;
	quantity_claimed: number;
	allocated_at: string;
}

export async function listContracts(db: D1Database): Promise<ContractRow[]> {
	const { results } = await db.prepare("SELECT * FROM contracts ORDER BY item_type, vendor_name").all<ContractRow>();
	return results;
}

async function findActiveContractsForItem(db: D1Database, itemType: string, asOfDate: string): Promise<ContractRow[]> {
	const { results } = await db
		.prepare("SELECT * FROM contracts WHERE item_type = ? AND valid_from <= ? AND valid_until >= ? ORDER BY id")
		.bind(itemType, asOfDate, asOfDate)
		.all<ContractRow>();
	return results;
}

async function getContractClaimedTotal(db: D1Database, contractId: string): Promise<number> {
	const row = await db
		.prepare("SELECT COALESCE(SUM(quantity_claimed), 0) as total FROM contract_allocations WHERE contract_id = ?")
		.bind(contractId)
		.first<{ total: number }>();
	return row?.total ?? 0;
}

// Claims as much of `quantity` as available contracts for this item type
// can cover (oldest contract first), across as many contracts as it takes.
// Returns how much was actually fulfilled — the caller computes the
// shortfall as quantity - fulfilled rather than this function failing
// outright, since a partial fulfillment is still useful information.
export async function tryFulfillFromContracts(
	db: D1Database,
	params: { itemType: string; locationId: string; quantity: number; asOfDate: string },
): Promise<number> {
	const { itemType, locationId, quantity, asOfDate } = params;
	const contracts = await findActiveContractsForItem(db, itemType, asOfDate);

	let remainingNeed = quantity;
	let fulfilled = 0;

	for (const contract of contracts) {
		if (remainingNeed <= 0) break;
		const claimed = await getContractClaimedTotal(db, contract.id);
		const available = contract.quantity_available - claimed;
		if (available <= 0) continue;

		const claim = Math.min(available, remainingNeed);
		await db
			.prepare("INSERT INTO contract_allocations (contract_id, location_id, item_type, quantity_claimed) VALUES (?, ?, ?, ?)")
			.bind(contract.id, locationId, itemType, claim)
			.run();

		fulfilled += claim;
		remainingNeed -= claim;
	}

	return fulfilled;
}

export async function createContract(
	db: D1Database,
	params: { id: string; vendorName: string; itemType: string; quantityAvailable: number; validFrom: string; validUntil: string; notes?: string },
): Promise<void> {
	await db
		.prepare(
			"INSERT INTO contracts (id, vendor_name, item_type, quantity_available, valid_from, valid_until, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(params.id, params.vendorName, params.itemType, params.quantityAvailable, params.validFrom, params.validUntil, params.notes ?? null)
		.run();
}

export async function getContractRemaining(db: D1Database, contractId: string): Promise<number> {
	const contract = await db.prepare("SELECT * FROM contracts WHERE id = ?").bind(contractId).first<ContractRow>();
	if (!contract) return 0;
	const claimed = await getContractClaimedTotal(db, contractId);
	return contract.quantity_available - claimed;
}

export interface ContractWithUsage extends ContractRow {
	claimed: number;
	remaining: number;
}

export async function listContractsWithUsage(db: D1Database): Promise<ContractWithUsage[]> {
	const contracts = await listContracts(db);
	return Promise.all(
		contracts.map(async (contract) => {
			const claimed = await getContractClaimedTotal(db, contract.id);
			return { ...contract, claimed, remaining: contract.quantity_available - claimed };
		}),
	);
}
