import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { getEnv } from "@/lib/cf";
import { runStage2 } from "@/lib/stages/stage2-ada-audit";
import { runStage3 } from "@/lib/stages/stage3-logistics-manifest";
import { runStage4 } from "@/lib/stages/stage4-dispatch-runbook";

// Convenience route for the dashboard's "run pipeline" action: chains
// Stage 2 → 3 → 4 for a location. Stage 4 still runs for a needs_relocation
// location — it just writes the deterministic blocked-dispatch stub.
export async function POST(_request: Request, { params }: { params: Promise<{ locationId: string }> }) {
	const { locationId } = await params;
	const env = await getEnv();
	try {
		const auditFindings = await runStage2(env, locationId);
		const manifest = await runStage3(env, locationId);
		const dispatchRunbook = await runStage4(env, locationId);
		return NextResponse.json({ auditFindings, manifest, dispatchRunbook });
	} catch (err) {
		return errorResponse(err);
	}
}
