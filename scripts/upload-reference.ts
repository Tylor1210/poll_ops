// Uploads the static 00_reference/ layer to R2.
// Usage: tsx scripts/upload-reference.ts --local | --remote

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { referenceChecklistKey } from "../src/lib/r2-keys";

const target = process.argv.includes("--remote") ? "--remote" : "--local";
const bucket = "poll-ops-stage-artifacts";
const filePath = join(__dirname, "..", "src/lib/reference/ada-checklist.md");

console.log(`Uploading ${referenceChecklistKey()} to ${bucket} (${target.slice(2)})...`);

execFileSync(
	"npx",
	["wrangler", "r2", "object", "put", `${bucket}/${referenceChecklistKey()}`, "--file", filePath, "--content-type", "text/markdown", target],
	{ stdio: "inherit" },
);

console.log("Done.");
