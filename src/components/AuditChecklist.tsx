"use client";

import { useState, useTransition } from "react";
import { submitAuditEditAction } from "@/app/actions";
import type { AuditCheck, CheckId } from "@/lib/stages/stage2-ada-audit";
import styles from "./AuditChecklist.module.css";

const CHECK_LABEL: Record<CheckId, string> = {
	parking: "Accessible parking",
	pathOfTravel: "Path of travel",
	entrance: "Entrance",
	doorway: "Doorway width",
	restroom: "Restroom",
	signage: "Signage",
};

export function AuditChecklist({ locationId, checks, canEdit }: { locationId: string; checks: AuditCheck[]; canEdit: boolean }) {
	const [editedBy, setEditedBy] = useState("");
	const [pendingCheck, setPendingCheck] = useState<CheckId | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const hasFailures = checks.some((c) => !c.pass);

	function markRemediated(checkId: CheckId) {
		setError(null);
		if (!editedBy.trim()) {
			setError("Enter your name before marking an item remediated.");
			return;
		}
		setPendingCheck(checkId);
		startTransition(async () => {
			try {
				await submitAuditEditAction({ locationId, checkId, newPass: true, editedBy });
			} catch (err) {
				setError(err instanceof Error ? err.message : "Edit failed.");
			} finally {
				setPendingCheck(null);
			}
		});
	}

	return (
		<div>
			<ul className={styles.list}>
				{checks.map((check) => (
					<li key={check.id} className={styles.item}>
						<span className={`${styles.mark} ${check.pass ? styles["mark--pass"] : styles["mark--fail"]}`}>
							{check.pass ? "✓" : "✕"}
						</span>
						<div className={styles.body}>
							<span className={styles.checkName}>{CHECK_LABEL[check.id]}</span>
							<span className={styles.detail}>{check.detail}</span>
						</div>
						{!check.pass && canEdit && (
							<button
								type="button"
								className="btn btn--secondary btn--small"
								disabled={isPending}
								onClick={() => markRemediated(check.id)}
							>
								{pendingCheck === check.id && isPending ? "Saving…" : "Mark remediated"}
							</button>
						)}
					</li>
				))}
			</ul>

			{hasFailures && canEdit && (
				<div className={styles.editPanel}>
					<p>Marking an item remediated logs an edit with your name and the current time, and updates the audit record.</p>
					<div className={`field ${styles.nameField}`}>
						<label htmlFor="editedBy">Your name</label>
						<input
							id="editedBy"
							type="text"
							value={editedBy}
							onChange={(e) => setEditedBy(e.target.value)}
							placeholder="Coordinator name"
						/>
					</div>
					{error && <p className={styles.error}>{error}</p>}
				</div>
			)}
		</div>
	);
}
