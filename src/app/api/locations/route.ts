import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { listLocationSummaries } from "@/lib/queries";

export async function GET() {
	const env = await getEnv();
	const locations = await listLocationSummaries(env);
	return NextResponse.json({ locations });
}
