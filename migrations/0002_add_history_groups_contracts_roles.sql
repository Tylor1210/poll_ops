-- Location grouping (city/district/region/etc — the type label is free-form
-- on purpose, since counties don't agree on what to call these).
CREATE TABLE location_groups (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	group_type TEXT NOT NULL DEFAULT 'city'
);

ALTER TABLE polling_locations ADD COLUMN group_id TEXT REFERENCES location_groups(id);

CREATE INDEX idx_polling_locations_group ON polling_locations(group_id);

-- Past election cycles. The *current* cycle isn't a row here — precincts,
-- polling_locations, manifest_items, resource_allocations, and audit_edits
-- all continue to mean "this election," same as v1. This table is strictly
-- historical: past-cycle snapshots that inform planning for the current one.
CREATE TABLE election_cycles (
	id TEXT PRIMARY KEY,
	label TEXT NOT NULL,
	election_type TEXT NOT NULL CHECK (election_type IN ('general', 'primary', 'municipal', 'special', 'runoff')),
	election_date TEXT NOT NULL
);

CREATE TABLE location_history (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	location_id TEXT NOT NULL REFERENCES polling_locations(id),
	election_cycle_id TEXT NOT NULL REFERENCES election_cycles(id),
	registered_voters INTEGER NOT NULL,
	turnout_percent REAL NOT NULL,
	notes TEXT
);

CREATE UNIQUE INDEX idx_location_history_unique ON location_history(location_id, election_cycle_id);
CREATE INDEX idx_location_history_location ON location_history(location_id);

-- Per-cycle supply usage, keyed by the same item catalog used for the
-- current manifest — this is what makes "location X always runs heavier on
-- hand sanitizer" an actual query instead of an anecdote.
CREATE TABLE location_history_items (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	location_history_id INTEGER NOT NULL REFERENCES location_history(id),
	item_type TEXT NOT NULL,
	quantity_used INTEGER NOT NULL
);

CREATE INDEX idx_location_history_items_history ON location_history_items(location_history_id);
CREATE INDEX idx_location_history_items_type ON location_history_items(item_type);

CREATE TABLE location_history_issues (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	location_history_id INTEGER NOT NULL REFERENCES location_history(id),
	issue_type TEXT NOT NULL,
	item_type TEXT,
	description TEXT NOT NULL
);

CREATE INDEX idx_location_history_issues_history ON location_history_issues(location_history_id);

-- Vendor contracts. A contract covers one item type for a date range with a
-- finite quantity — the same "shared, finite pool" shape as
-- resource_allocations, so Stage 3 can flag a shortfall instead of ordering
-- against supply that isn't actually under contract.
CREATE TABLE contracts (
	id TEXT PRIMARY KEY,
	vendor_name TEXT NOT NULL,
	item_type TEXT NOT NULL,
	quantity_available INTEGER NOT NULL,
	valid_from TEXT NOT NULL,
	valid_until TEXT NOT NULL,
	notes TEXT
);

CREATE INDEX idx_contracts_item_type ON contracts(item_type);

-- Ledger of what's been claimed against a contract's quantity_available, so
-- concurrent locations drawing on the same contract can't collectively
-- over-claim it.
CREATE TABLE contract_allocations (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	contract_id TEXT NOT NULL REFERENCES contracts(id),
	location_id TEXT NOT NULL REFERENCES polling_locations(id),
	item_type TEXT NOT NULL,
	quantity_claimed INTEGER NOT NULL,
	allocated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_contract_allocations_contract ON contract_allocations(contract_id);
CREATE INDEX idx_contract_allocations_location ON contract_allocations(location_id);

-- Poll worker confirmation that a manifest line item physically arrived.
CREATE TABLE item_receipts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	manifest_item_id INTEGER NOT NULL REFERENCES manifest_items(id),
	received_quantity INTEGER NOT NULL,
	received_by TEXT NOT NULL,
	received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	condition_note TEXT
);

CREATE INDEX idx_item_receipts_manifest_item ON item_receipts(manifest_item_id);

-- Simulated e-signature sign-off: a supervisor approving a needs_relocation
-- decision, or a poll worker attesting the full manifest arrived. Typed
-- name + timestamp, standing in for a real DocuSign-style flow.
CREATE TABLE signoffs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	location_id TEXT NOT NULL REFERENCES polling_locations(id),
	role TEXT NOT NULL CHECK (role IN ('coordinator', 'supervisor', 'poll_worker')),
	signer_name TEXT NOT NULL,
	signature_text TEXT NOT NULL,
	purpose TEXT NOT NULL CHECK (purpose IN ('relocation_approval', 'inventory_receipt')),
	signed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	note TEXT
);

CREATE INDEX idx_signoffs_location ON signoffs(location_id);
