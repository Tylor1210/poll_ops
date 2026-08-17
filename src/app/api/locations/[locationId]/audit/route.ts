import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { getEnv } from "@/lib/cf";
import { runStage2 } from "@/lib/stages/stage2-ada-audit";

// Triggers Stage 2 (and, transitively, Stage 1 for any precinct baseline
// that isn't cached yet) for this location.
export async function POST(_request: Request, { params }: { params: Promise<{ locationId: string }> }) {
	const { locationId } = await params;
	const env = await getEnv();
	try {
		const findings = await runStage2(env, locationId);
		return NextResponse.json(findings);
	} catch (err) {
		return errorResponse(err);
	}
}
