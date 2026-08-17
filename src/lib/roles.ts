import { cookies } from "next/headers";
import { DEFAULT_ROLE, isRole, ROLE_COOKIE } from "@/lib/role-constants";
import type { Role } from "@/lib/role-constants";

export type { Role } from "@/lib/role-constants";
export { DEFAULT_ROLE, permissions, ROLE_COOKIE, ROLE_LABELS } from "@/lib/role-constants";

// No real auth (per the project's v1 scope decision) — this is a role
// switcher, not a login. The cookie just says which hat the current browser
// session is wearing; anyone can flip it. Identity for provenance (audit
// edits, signatures) is still a typed name captured at the point of action,
// same as v1.
export async function getCurrentRole(): Promise<Role> {
	const store = await cookies();
	const value = store.get(ROLE_COOKIE)?.value;
	return isRole(value) ? value : DEFAULT_ROLE;
}
