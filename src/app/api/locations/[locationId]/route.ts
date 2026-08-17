import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { getLocationDetail } from "@/lib/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ locationId: string }> }) {
	const { locationId } = await params;
	const env = await getEnv();
	const detail = await getLocationDetail(env, locationId);
	if (!detail) return NextResponse.json({ error: `Location ${locationId} not found` }, { status: 404 });
	return NextResponse.json(detail);
}
