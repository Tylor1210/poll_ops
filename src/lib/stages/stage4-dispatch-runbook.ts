// Stage 4: field dispatch runbook.
//
// The one genuinely prose-writing stage — turns Stage 3's manifest plus
// Stage 2's audit summary into plain-language instructions for whoever is
// physically dispatched to the location. Model call, since this is writing,
// not a data transform.
//
// A needs_relocation location never reaches this stage with real work to
// do — dispatch to that address is blocked until a supervisor decides on a
// replacement site — so that branch is a deterministic stub, not a model
// call, to avoid spending neurons on a fixed message.

import { runTextPrompt } from "@/lib/ai";
import { getPollingLocation } from "@/lib/db";
import { getAuditFindings } from "@/lib/stages/stage2-ada-audit";
import { getManifest } from "@/lib/stages/stage3-logistics-manifest";
import { locationDispatchKey } from "@/lib/r2-keys";

export async function runStage4(env: { DB: D1Database; STAGE_ARTIFACTS: R2Bucket; AI: Ai }, locationId: string): Promise<string> {
	const location = await getPollingLocation(env.DB, locationId);
	if (!location) throw new Error(`Stage 4: polling location ${locationId} not found in D1`);

	const manifest = await getManifest(env, locationId);
	if (!manifest) throw new Error(`Stage 4: manifest artifact missing for location ${locationId} — run Stage 3 first`);

	const generatedAt = new Date().toISOString();
	let markdown: string;

	if (manifest.type === "review_flag") {
		markdown = [
			`# Field Dispatch — ${location.address}`,
			"",
			`Location: \`${locationId}\`  `,
			`Generated: ${generatedAt}`,
			"",
			"## Dispatch blocked",
			"",
			"This location requires supervisor action before dispatch can be scheduled:",
			"",
			manifest.reason,
		].join("\n");
	} else {
		const findings = await getAuditFindings(env, locationId);
		const prose = await runTextPrompt(env.AI, {
			system:
				"You write short, plain-language field dispatch runbooks for county election logistics staff (roving techs delivering supplies to polling places). Be concrete and concise: what to bring, what to check on arrival, any ADA setup steps. No filler, no headers — 3-6 short paragraphs of prose, no markdown formatting.",
			user: [
				`Location: ${location.address}`,
				`Supply manifest: ${JSON.stringify(manifest.items)}`,
				`Roving tech assigned: ${manifest.rovingTech.allocated ? "yes" : "no — flagged unallocated, coordinate separately"}`,
				`Portable ramp assigned: ${manifest.portableRamp.requested ? (manifest.portableRamp.allocated ? "yes" : "no — flagged unallocated, coordinate separately") : "not needed"}`,
				`ADA audit notes: ${findings?.checks.filter((c) => !c.pass).map((c) => c.detail).join(" ") || "No outstanding ADA issues."}`,
			].join("\n"),
		});

		markdown = [
			`# Field Dispatch — ${location.address}`,
			"",
			`Location: \`${locationId}\`  `,
			`Generated: ${generatedAt}`,
			"",
			"## Runbook",
			"",
			prose || "Dispatch runbook could not be generated — see supply manifest for raw item list.",
			"",
			"## Supply manifest",
			"",
			...manifest.items.map((i) => `- ${i.itemType}: ${i.quantity}`),
		].join("\n");
	}

	await env.STAGE_ARTIFACTS.put(locationDispatchKey(locationId), markdown, {
		httpMetadata: { contentType: "text/markdown" },
	});

	return markdown;
}

export async function getDispatchRunbook(env: { STAGE_ARTIFACTS: R2Bucket }, locationId: string): Promise<string | null> {
	const object = await env.STAGE_ARTIFACTS.get(locationDispatchKey(locationId));
	if (!object) return null;
	return object.text();
}
