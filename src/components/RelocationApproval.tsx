"use client";

import { useState, useTransition } from "react";
import { approveRelocationAction } from "@/app/actions";
import { formatDateTime } from "@/lib/format";
import type { SignoffRow } from "@/lib/receipts";
import type { Role } from "@/lib/role-constants";
import styles from "./RelocationApproval.module.css";

// Separation of duties: only a supervisor can sign off on a relocation
// decision, even though a coordinator can run every other stage. Everyone
// else just sees whether it's been approved yet.
export function RelocationApproval({
	locationId,
	role,
	existingSignoff,
}: {
	locationId: string;
	role: Role;
	existingSignoff: SignoffRow | null;
}) {
	const [signerName, setSignerName] = useState("");
	const [note, setNote] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	if (existingSignoff) {
		return (
			<div className={styles.wrap}>
				<div className={styles.approved}>
					Relocation approved by <strong>{existingSignoff.signer_name}</strong> (supervisor) on{" "}
					{formatDateTime(existingSignoff.signed_at)}
					{existingSignoff.note ? ` — "${existingSignoff.note}"` : ""}
				</div>
			</div>
		);
	}

	if (role !== "supervisor") {
		return (
			<div className={styles.wrap}>
				<p className={styles.pending}>Awaiting supervisor sign-off before this relocation is finalized.</p>
			</div>
		);
	}

	function submit() {
		setError(null);
		if (!signerName.trim()) {
			setError("Enter your name to sign.");
			return;
		}
		startTransition(async () => {
			try {
				await approveRelocationAction({ locationId, signerName, note: note || undefined });
			} catch (err) {
				setError(err instanceof Error ? err.message : "Sign-off failed.");
			}
		});
	}

	return (
		<div className={styles.wrap}>
			<div className={styles.form}>
				<p>Sign to approve this location&apos;s relocation. This is a simulated e-signature — your typed name is the signature.</p>
				<div className="field">
					<label htmlFor="relocation-note">Note (optional)</label>
					<input id="relocation-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Replacement site, timeline, etc." />
				</div>
				<div className={styles.row}>
					<div className="field">
						<label htmlFor="relocation-signer">Your name (signature)</label>
						<input
							id="relocation-signer"
							type="text"
							value={signerName}
							onChange={(e) => setSignerName(e.target.value)}
							placeholder="Supervisor name"
						/>
					</div>
					<button type="button" className="btn" disabled={isPending} onClick={submit}>
						{isPending ? "Signing…" : "Sign & approve"}
					</button>
				</div>
				{error && <p className={styles.error}>{error}</p>}
			</div>
		</div>
	);
}
