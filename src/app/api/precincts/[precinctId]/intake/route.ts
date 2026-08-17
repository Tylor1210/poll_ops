import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { getEnv } from "@/lib/cf";
import { runStage1 } from "@/lib/stages/stage1-precinct-intake";

export async function POST(_request: Request, { params }: { params: Promise<{ precinctId: string }> }) {
	const { precinctId } = await params;
	const env = await getEnv();
	try {
		const baseline = await runStage1(env, precinctId);
		return NextResponse.json(baseline);
	} catch (err) {
		return errorResponse(err);
	}
}
