"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setRoleAction } from "@/app/actions";
import type { Role } from "@/lib/role-constants";
import { ROLE_LABELS } from "@/lib/role-constants";
import styles from "./RoleSwitcher.module.css";

const ROLES: Role[] = ["coordinator", "supervisor", "poll_worker"];

export function RoleSwitcher({ currentRole }: { currentRole: Role }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function handleChange(role: Role) {
		startTransition(async () => {
			await setRoleAction(role);
			router.refresh();
		});
	}

	return (
		<label className={styles.switcher}>
			<span className={styles.label}>Viewing as</span>
			<select
				value={currentRole}
				disabled={isPending}
				onChange={(e) => handleChange(e.target.value as Role)}
				className={styles.select}
			>
				{ROLES.map((role) => (
					<option key={role} value={role}>
						{ROLE_LABELS[role]}
					</option>
				))}
			</select>
		</label>
	);
}
