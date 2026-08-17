// Generates SQL from the seed-data modules and applies it to D1 via
// `wrangler d1 execute`. Usage: tsx scripts/seed.ts --local | --remote

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { locations, precincts } from "../src/lib/intake-source-data";
import { contracts, electionCycles, groups, locationGroupAssignments, locationHistory } from "../src/lib/v2-seed-data";

const target = process.argv.includes("--remote") ? "--remote" : "--local";

function sqlString(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

function sqlNullableString(value: string | undefined | null): string {
	return value ? sqlString(value) : "NULL";
}

const statements: string[] = [
	// Children before parents, so this is safe to re-run regardless of
	// whether the DB enforces foreign keys.
	"DELETE FROM item_receipts;",
	"DELETE FROM resource_allocations;",
	"DELETE FROM audit_edits;",
	"DELETE FROM contract_allocations;",
	"DELETE FROM signoffs;",
	"DELETE FROM location_history_issues;",
	"DELETE FROM location_history_items;",
	"DELETE FROM location_history;",
	"DELETE FROM manifest_items;",
	"DELETE FROM precincts;",
	"DELETE FROM polling_locations;",
	"DELETE FROM contracts;",
	"DELETE FROM election_cycles;",
	"DELETE FROM location_groups;",
];

for (const group of groups) {
	statements.push(`INSERT INTO location_groups (id, name, group_type) VALUES (${sqlString(group.id)}, ${sqlString(group.name)}, ${sqlString(group.groupType)});`);
}

for (const loc of locations) {
	const groupId = sqlNullableString(locationGroupAssignments[loc.id]);
	statements.push(
		`INSERT INTO polling_locations (id, address, ada_audit_status, last_audited_at, group_id) VALUES (${sqlString(loc.id)}, ${sqlString(loc.address)}, 'pending', NULL, ${groupId});`,
	);
}

for (const pct of precincts) {
	statements.push(
		`INSERT INTO precincts (id, name, polling_location_id, registered_voters, historical_turnout) VALUES (${sqlString(pct.id)}, ${sqlString(pct.name)}, ${sqlString(pct.pollingLocationId)}, ${pct.registeredVoters}, ${pct.historicalTurnout});`,
	);
}

for (const cycle of electionCycles) {
	statements.push(
		`INSERT INTO election_cycles (id, label, election_type, election_date) VALUES (${sqlString(cycle.id)}, ${sqlString(cycle.label)}, ${sqlString(cycle.electionType)}, ${sqlString(cycle.electionDate)});`,
	);
}

let historyRowId = 1;
for (const h of locationHistory) {
	const thisId = historyRowId++;
	statements.push(
		`INSERT INTO location_history (id, location_id, election_cycle_id, registered_voters, turnout_percent, notes) VALUES (${thisId}, ${sqlString(h.locationId)}, ${sqlString(h.electionCycleId)}, ${h.registeredVoters}, ${h.turnoutPercent}, ${sqlNullableString(h.notes)});`,
	);
	for (const item of h.items) {
		statements.push(
			`INSERT INTO location_history_items (location_history_id, item_type, quantity_used) VALUES (${thisId}, ${sqlString(item.itemType)}, ${item.quantityUsed});`,
		);
	}
	for (const issue of h.issues) {
		statements.push(
			`INSERT INTO location_history_issues (location_history_id, issue_type, item_type, description) VALUES (${thisId}, ${sqlString(issue.issueType)}, ${sqlNullableString(issue.itemType)}, ${sqlString(issue.description)});`,
		);
	}
}

for (const c of contracts) {
	statements.push(
		`INSERT INTO contracts (id, vendor_name, item_type, quantity_available, valid_from, valid_until, notes) VALUES (${sqlString(c.id)}, ${sqlString(c.vendorName)}, ${sqlString(c.itemType)}, ${c.quantityAvailable}, ${sqlString(c.validFrom)}, ${sqlString(c.validUntil)}, ${sqlNullableString(c.notes)});`,
	);
}

const sql = statements.join("\n") + "\n";

const dir = mkdtempSync(join(tmpdir(), "poll-ops-seed-"));
const sqlPath = join(dir, "seed.sql");
writeFileSync(sqlPath, sql, "utf8");

console.log(
	`Seeding D1 (${target.slice(2)}) with ${locations.length} locations, ${precincts.length} precincts, ${groups.length} groups, ${electionCycles.length} election cycles, ${locationHistory.length} history records, ${contracts.length} contracts...`,
);

execFileSync("npx", ["wrangler", "d1", "execute", "poll-ops-db", target, "--file", sqlPath], {
	stdio: "inherit",
});

console.log("Done.");
