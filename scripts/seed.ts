// Generates SQL from seed-data.ts and applies it to D1 via `wrangler d1 execute`.
// Usage: tsx scripts/seed.ts --local | --remote

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { locations, precincts } from "../src/lib/intake-source-data";

const target = process.argv.includes("--remote") ? "--remote" : "--local";

function sqlString(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

const statements: string[] = [
	"DELETE FROM audit_edits;",
	"DELETE FROM resource_allocations;",
	"DELETE FROM manifest_items;",
	"DELETE FROM precincts;",
	"DELETE FROM polling_locations;",
];

for (const loc of locations) {
	statements.push(
		`INSERT INTO polling_locations (id, address, ada_audit_status, last_audited_at) VALUES (${sqlString(loc.id)}, ${sqlString(loc.address)}, 'pending', NULL);`,
	);
}

for (const pct of precincts) {
	statements.push(
		`INSERT INTO precincts (id, name, polling_location_id, registered_voters, historical_turnout) VALUES (${sqlString(pct.id)}, ${sqlString(pct.name)}, ${sqlString(pct.pollingLocationId)}, ${pct.registeredVoters}, ${pct.historicalTurnout});`,
	);
}

const sql = statements.join("\n") + "\n";

const dir = mkdtempSync(join(tmpdir(), "poll-ops-seed-"));
const sqlPath = join(dir, "seed.sql");
writeFileSync(sqlPath, sql, "utf8");

console.log(`Seeding D1 (${target.slice(2)}) with ${locations.length} locations and ${precincts.length} precincts...`);

execFileSync("npx", ["wrangler", "d1", "execute", "poll-ops-db", target, "--file", sqlPath], {
	stdio: "inherit",
});

console.log("Done.");
