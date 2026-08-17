import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { getEnv } from "@/lib/cf";
import { runStage4 } from "@/lib/stages/stage4-dispatch-runbook";

// Triggers Stage 4. Requires Stage 3 to have run already — the stage
// function itself enforces this.
export async function POST(_request: Request, { params }: { params: Promise<{ locationId: string }> }) {
	const { locationId } = await params;
	const env = await getEnv();
	try {
		const runbook = await runStage4(env, locationId);
		return NextResponse.json({ locationId, runbook });
	} catch (err) {
		return errorResponse(err);
	}
}
