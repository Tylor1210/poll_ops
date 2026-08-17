// Role type, labels, and permission matrix — no server-only imports, so
// this can be pulled into client components (RoleSwitcher) as well as
// server code. Cookie reading lives in roles.ts, which does import
// next/headers and is server-only.

export type Role = "coordinator" | "supervisor" | "poll_worker";

export const ROLE_COOKIE = "poll_ops_role";
export const DEFAULT_ROLE: Role = "coordinator";

export const ROLE_LABELS: Record<Role, string> = {
	coordinator: "Coordinator",
	supervisor: "Supervisor",
	poll_worker: "Poll worker",
};

export function isRole(value: string | undefined): value is Role {
	return value === "coordinator" || value === "supervisor" || value === "poll_worker";
}

// Permission matrix — separation of duties is deliberate, not just a UI
// nicety: a coordinator can run the day-to-day pipeline but can't approve
// a relocation (that's the supervisor's call), and neither of them can
// confirm physical receipt of supplies (only the poll worker on-site can).
export const permissions = {
	// Locations, location groups, vendor contracts — the setup layer.
	canManageSetup: (role: Role) => role === "coordinator",
	// Trigger Stage 2/3/4, edit the audit checklist.
	canRunPipeline: (role: Role) => role === "coordinator" || role === "supervisor",
	// Sign off on a needs_relocation decision.
	canApproveRelocation: (role: Role) => role === "supervisor",
	// Mark manifest items received and sign the inventory receipt.
	canReceiveItems: (role: Role) => role === "poll_worker",
};
