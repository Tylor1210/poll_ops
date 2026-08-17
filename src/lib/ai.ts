// Thin Workers AI helper for the two stages that need judgment rather than
// a pure data transform (Stage 2's non-remediable-violation call, Stage 4's
// dispatch prose). Small model, single pass — see project token-efficiency
// guidance: escalate to a stronger model only if this turns out ambiguous
// in practice, don't default to it.

const JUDGMENT_MODEL = "@cf/meta/llama-3.2-3b-instruct";

// Some Workers AI model versions return an OpenAI-compatible shape where
// `.response` is already a parsed object (when the prompt reads as a JSON
// request) rather than a raw string; others return a plain string, or only
// populate `.choices[0].message.content`. Normalize all three to a string.
function extractResponseText(response: unknown): string {
	if (typeof response !== "object" || response === null) return "";
	const r = response as Record<string, unknown>;

	if (typeof r.response === "string") return r.response;
	if (typeof r.response === "object" && r.response !== null) return JSON.stringify(r.response);

	const choices = r.choices as Array<{ message?: { content?: string } }> | undefined;
	const content = choices?.[0]?.message?.content;
	return typeof content === "string" ? content : "";
}

function extractJson(text: string): unknown {
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced ? fenced[1] : text;
	return JSON.parse(candidate.trim());
}

// Runs a chat prompt that must return a JSON object, validates it with the
// caller's type guard, and retries once before giving up. Returns null on
// failure so the caller can fall back to deterministic behavior rather than
// writing an unvalidated model output into D1/R2.
export async function runJsonPrompt<T>(
	ai: Ai,
	params: { system: string; user: string; isValid: (value: unknown) => value is T },
): Promise<T | null> {
	for (let attempt = 0; attempt < 2; attempt++) {
		const response = await ai.run(JUDGMENT_MODEL, {
			messages: [
				{ role: "system", content: `${params.system}\n\nRespond with a single JSON object and nothing else.` },
				{ role: "user", content: params.user },
			],
		});

		const text = extractResponseText(response);
		if (!text) continue;

		try {
			const parsed = extractJson(text);
			if (params.isValid(parsed)) return parsed;
		} catch {
			// fall through to retry
		}
	}
	return null;
}

export async function runTextPrompt(ai: Ai, params: { system: string; user: string }): Promise<string> {
	const response = await ai.run(JUDGMENT_MODEL, {
		messages: [
			{ role: "system", content: params.system },
			{ role: "user", content: params.user },
		],
	});
	return extractResponseText(response).trim();
}
