import { NextResponse } from "next/server";

// Stage functions throw plain Errors for expected invalid-state conditions
// (missing precinct, stage run out of order, etc.) — treat all of them as
// 400s with the message surfaced, since that's the actual failure mode a
// dashboard caller needs to act on.
export function errorResponse(err: unknown) {
	const message = err instanceof Error ? err.message : "Unknown error";
	return NextResponse.json({ error: message }, { status: 400 });
}
