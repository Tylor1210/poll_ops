import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { getEnv } from "@/lib/cf";
import { runStage3 } from "@/lib/stages/stage3-logistics-manifest";

// Triggers Stage 3. Requires Stage 2 to have run already (ada_audit_status
// must not be 'pending') — the stage function itself enforces this.
export async function POST(_request: Request, { params }: { params: Promise<{ locationId: string }> }) {
	const { locationId } = await params;
	const env = await getEnv();
	try {
		const manifest = await runStage3(env, locationId);
		return NextResponse.json(manifest);
	} catch (err) {
		return errorResponse(err);
	}
}
