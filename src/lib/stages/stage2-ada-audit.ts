// Stage 2: ADA survey audit.
//
// Scoped to the *location*, not any one precinct (co-located precincts share
// one audit — see the note on precinctBaselineKey vs locationAuditKey).
// Checklist field-matching (parking, path of travel, doorway, restroom,
// signage) is deterministic. The one judgment call — remediated_with_kit vs.
// needs_relocation for an entrance/doorway failure — goes to the model,
// since that's the genuinely ambiguous case (a boolean alone doesn't capture
// whether a portable ramp can actually clear a given rise; the surveyor's
// free-text note carries that nuance). Everything else is decided in code.

import { runJsonPrompt } from "@/lib/ai";
import { getPollingLocation, listPrecinctsForLocation, setLocationAuditStatus } from "@/lib/db";
import type { PollingLocationRow } from "@/lib/db";
import { getPrecinctBaseline, runStage1 } from "@/lib/stages/stage1-precinct-intake";
import type { AdaSurvey } from "@/lib/intake-source-data";
import { itemLabel, PORTABLE_RAMP_DEPLOYMENT } from "@/lib/item-catalog";
import { locationAuditKey, referenceChecklistKey } from "@/lib/r2-keys";

export type CheckId = "parking" | "pathOfTravel" | "entrance" | "doorway" | "restroom" | "signage";

export interface AuditCheck {
	id: CheckId;
	pass: boolean;
	detail: string;
}

export interface AuditFindings {
	locationId: string;
	status: PollingLocationRow["ada_audit_status"];
	generatedAt: string;
	totalRegisteredVoters: number;
	checks: AuditCheck[];
	remediationItems: string[];
	needsPortableRamp: boolean;
	relocationReason: string | null;
}

const DOORWAY_MIN_INCHES = 32;

function isJudgmentResult(value: unknown): value is { classification: "remediated_with_kit" | "needs_relocation"; reasoning: string } {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	return (v.classification === "remediated_with_kit" || v.classification === "needs_relocation") && typeof v.reasoning === "string";
}

async function classifyEntranceIssue(ai: Ai, checklist: string, survey: AdaSurvey): Promise<{ classification: "remediated_with_kit" | "needs_relocation"; reasoning: string }> {
	const result = await runJsonPrompt(ai, {
		system:
			"You audit polling place ADA accessibility for a county elections office. Given the checklist and one location's entrance survey, decide whether the entrance/path issue can be fixed with a portable kit deployed on election day (a portable ramp, matting, etc.) or whether the location must be relocated because no code-compliant portable fix exists. " +
			'Reply as JSON: {"classification": "remediated_with_kit" | "needs_relocation", "reasoning": "one or two sentences"}.',
		user: `Checklist:\n${checklist}\n\nEntrance survey:\n${JSON.stringify(
			{
				entrance: survey.entrance,
				rampPathViable: survey.rampPathViable,
				surveyorNote: survey.surveyorNote,
			},
			null,
			2,
		)}`,
		isValid: isJudgmentResult,
	});

	// Deterministic fallback if the model call fails or returns something
	// unparseable — never leave the classification undecided.
	return (
		result ?? {
			classification: survey.entrance === "stairs_only" && !survey.rampPathViable ? "needs_relocation" : "remediated_with_kit",
			reasoning: "Model classification unavailable; used deterministic fallback based on entrance type and ramp path viability.",
		}
	);
}

export async function runStage2(
	env: { DB: D1Database; STAGE_ARTIFACTS: R2Bucket; AI: Ai },
	locationId: string,
): Promise<AuditFindings> {
	const location = await getPollingLocation(env.DB, locationId);
	if (!location) throw new Error(`Stage 2: polling location ${locationId} not found in D1`);

	const precincts = await listPrecinctsForLocation(env.DB, locationId);
	if (precincts.length === 0) throw new Error(`Stage 2: no precincts found for location ${locationId}`);

	const baselines = await Promise.all(
		precincts.map(async (p) => (await getPrecinctBaseline(env, p.id)) ?? runStage1(env, p.id)),
	);

	const totalRegisteredVoters = baselines.reduce((sum, b) => sum + b.registeredVoters, 0);
	// All precincts at a location share the same physical site, so they share
	// one ADA survey — take it from any baseline.
	const survey = baselines[0].adaSurvey;

	const checklistObject = await env.STAGE_ARTIFACTS.get(referenceChecklistKey());
	if (!checklistObject) throw new Error("Stage 2: reference checklist missing from R2 — run r2:upload-reference");
	const checklist = await checklistObject.text();

	const entranceOk = survey.entrance === "accessible" || (survey.entrance === "ramp_available" && survey.rampPathViable);
	const doorwayOk = survey.doorwayWidthInches >= DOORWAY_MIN_INCHES;

	const checks: AuditCheck[] = [
		{ id: "parking", pass: survey.accessibleParking, detail: survey.accessibleParking ? "Accessible parking available." : "No accessible parking space designated." },
		{ id: "pathOfTravel", pass: survey.pathOfTravelClear, detail: survey.pathOfTravelClear ? "Path of travel is clear." : "Path of travel is not stable/clear." },
		{ id: "entrance", pass: entranceOk, detail: entranceOk ? "Entrance meets ADA requirements." : `Entrance issue: ${survey.entrance}, ramp path viable: ${survey.rampPathViable}.` },
		{ id: "doorway", pass: doorwayOk, detail: `Doorway width ${survey.doorwayWidthInches}in (minimum ${DOORWAY_MIN_INCHES}in).` },
		{ id: "restroom", pass: survey.restroomAccessible, detail: survey.restroomAccessible ? "Accessible restroom available." : "No accessible restroom." },
		{ id: "signage", pass: survey.signageCompliant, detail: survey.signageCompliant ? "Signage compliant." : "Accessible signage missing." },
	];

	const structuralIssue = !entranceOk || !doorwayOk;

	let status: PollingLocationRow["ada_audit_status"];
	let relocationReason: string | null = null;
	let needsPortableRamp = false;

	if (checks.every((c) => c.pass)) {
		status = "compliant";
	} else if (structuralIssue) {
		const judgment = await classifyEntranceIssue(env.AI, checklist, survey);
		if (judgment.classification === "needs_relocation") {
			status = "needs_relocation";
			relocationReason = judgment.reasoning;
		} else {
			status = "remediated_with_kit";
			needsPortableRamp = true;
		}
	} else {
		status = "remediated_with_kit";
	}

	const remediationItems = deriveRemediationItems(checks, status, needsPortableRamp);
	const generatedAt = new Date().toISOString();

	const findings: AuditFindings = {
		locationId,
		status,
		generatedAt,
		totalRegisteredVoters,
		checks,
		remediationItems,
		needsPortableRamp,
		relocationReason,
	};

	const markdown = renderAuditMarkdown(location, findings);
	await env.STAGE_ARTIFACTS.put(locationAuditKey(locationId), markdown, {
		httpMetadata: { contentType: "text/markdown" },
	});

	await setLocationAuditStatus(env.DB, locationId, status, generatedAt);

	return findings;
}

function deriveRemediationItems(checks: AuditCheck[], status: PollingLocationRow["ada_audit_status"], needsPortableRamp: boolean): string[] {
	if (status !== "remediated_with_kit") return [];
	const items: string[] = [];
	if (needsPortableRamp) items.push(PORTABLE_RAMP_DEPLOYMENT);
	for (const check of checks) {
		if (check.pass) continue;
		if (check.id === "parking") items.push("accessible_parking_kit");
		if (check.id === "pathOfTravel") items.push("matting_runway");
		if (check.id === "restroom") items.push("portable_restroom");
		if (check.id === "signage") items.push("ada_signage_kit");
	}
	return items;
}

export function renderAuditMarkdown(location: PollingLocationRow, findings: AuditFindings): string {
	const lines: string[] = [];
	lines.push(`# ADA Audit — ${location.address}`);
	lines.push("");
	lines.push(`Location: \`${findings.locationId}\`  `);
	lines.push(`Status: **${findings.status}**  `);
	lines.push(`Generated: ${findings.generatedAt}  `);
	lines.push(`Registered voters served: ${findings.totalRegisteredVoters}`);
	lines.push("");
	lines.push("## Checklist results");
	lines.push("");
	for (const check of findings.checks) {
		lines.push(`- [${check.pass ? "x" : " "}] **${check.id}** — ${check.detail}`);
	}
	lines.push("");
	if (findings.status === "needs_relocation") {
		lines.push("## Relocation required");
		lines.push("");
		lines.push(findings.relocationReason ?? "No viable portable remediation was found for the entrance/path issue.");
		lines.push("");
		lines.push("No supply manifest will be generated for this location. This is flagged for supervisor review.");
	} else if (findings.status === "remediated_with_kit") {
		lines.push("## Remediation items");
		lines.push("");
		for (const item of findings.remediationItems) {
			lines.push(`- ${itemLabel(item)}`);
		}
	}
	lines.push("");
	lines.push("```json");
	lines.push(JSON.stringify(findings, null, 2));
	lines.push("```");
	lines.push("");
	return lines.join("\n");
}

// Parses the structured findings block back out of a stored audit markdown
// artifact, for stages/consumers that only have the R2 object (not the
// in-memory result of runStage2).
export function parseAuditMarkdown(markdown: string): AuditFindings {
	const match = markdown.match(/```json\s*([\s\S]*?)```/);
	if (!match) throw new Error("Audit markdown missing structured findings block");
	return JSON.parse(match[1]) as AuditFindings;
}

export async function getAuditFindings(env: { STAGE_ARTIFACTS: R2Bucket }, locationId: string): Promise<AuditFindings | null> {
	const object = await env.STAGE_ARTIFACTS.get(locationAuditKey(locationId));
	if (!object) return null;
	return parseAuditMarkdown(await object.text());
}

// Applies a coordinator's manual correction to one checklist item (the
// dashboard's structured edit form, never raw markdown editing) and
// re-derives status/remediation items from the updated checks. Does not
// call the model again — a human marking an item remediated on the ground
// is itself the judgment, overriding Stage 2's original classification.
//
// Preserves the structural resolution (remediated_with_kit-via-portable-ramp
// vs. needs_relocation) unless the edit itself touches the entrance/doorway
// check, so re-confirming an unrelated item (e.g. signage) can't
// accidentally flip a location out of needs_relocation.
export async function applyAuditEdit(
	env: { DB: D1Database; STAGE_ARTIFACTS: R2Bucket },
	params: { locationId: string; checkId: CheckId; newPass: boolean },
): Promise<AuditFindings> {
	const location = await getPollingLocation(env.DB, params.locationId);
	if (!location) throw new Error(`Audit edit: polling location ${params.locationId} not found in D1`);

	const current = await getAuditFindings(env, params.locationId);
	if (!current) throw new Error(`Audit edit: no existing audit for location ${params.locationId} — run Stage 2 first`);

	const checks = current.checks.map((c) =>
		c.id === params.checkId
			? { ...c, pass: params.newPass, detail: params.newPass ? "Marked remediated by coordinator." : c.detail }
			: c,
	);

	let status = current.status;
	let needsPortableRamp = current.needsPortableRamp;
	let relocationReason = current.relocationReason;

	const structuralCheckEdited = params.checkId === "entrance" || params.checkId === "doorway";
	const stillStructuralFail = checks.some((c) => (c.id === "entrance" || c.id === "doorway") && !c.pass);

	if (checks.every((c) => c.pass)) {
		status = "compliant";
		needsPortableRamp = false;
		relocationReason = null;
	} else if (structuralCheckEdited) {
		// The structural check itself changed — resolve it fresh, deterministically.
		status = stillStructuralFail ? current.status : "remediated_with_kit";
		if (!stillStructuralFail) {
			needsPortableRamp = false;
			relocationReason = null;
		}
	}
	// Otherwise: a non-structural check was edited, so the prior structural
	// resolution (if any) is left untouched.

	const remediationItems = deriveRemediationItems(checks, status, needsPortableRamp);
	const generatedAt = new Date().toISOString();

	const findings: AuditFindings = {
		locationId: params.locationId,
		status,
		generatedAt,
		totalRegisteredVoters: current.totalRegisteredVoters,
		checks,
		remediationItems,
		needsPortableRamp,
		relocationReason,
	};

	const markdown = renderAuditMarkdown(location, findings);
	await env.STAGE_ARTIFACTS.put(locationAuditKey(params.locationId), markdown, {
		httpMetadata: { contentType: "text/markdown" },
	});
	await setLocationAuditStatus(env.DB, params.locationId, status, generatedAt);

	return findings;
}
