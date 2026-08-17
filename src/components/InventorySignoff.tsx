"use client";

import { useState, useTransition } from "react";
import { submitInventorySignoffAction } from "@/app/actions";
import { formatDateTime } from "@/lib/format";
import type { SignoffRow } from "@/lib/receipts";
import styles from "./InventorySignoff.module.css";

// Simulated e-signature: a typed name is the signature, timestamped and
// logged to `signoffs` — standing in for a real DocuSign-style flow per
// the project's demo-mode scope.
export function InventorySignoff({ locationId, existingSignoff, canSign }: { locationId: string; existingSignoff: SignoffRow | null; canSign: boolean }) {
	const [signerName, setSignerName] = useState("");
	const [note, setNote] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	if (existingSignoff) {
		return (
			<div className={styles.signed}>
				<div className={styles.signature}>{existingSignoff.signature_text}</div>
				<div className={styles.meta}>
					Signed by {existingSignoff.signer_name} · {formatDateTime(existingSignoff.signed_at)}
					{existingSignoff.note ? ` — "${existingSignoff.note}"` : ""}
				</div>
			</div>
		);
	}

	if (!canSign) return null;

	function submit() {
		setError(null);
		if (!signerName.trim()) {
			setError("Type your name to sign.");
			return;
		}
		startTransition(async () => {
			try {
				await submitInventorySignoffAction({ locationId, signerName, note: note || undefined });
			} catch (err) {
				setError(err instanceof Error ? err.message : "Sign-off failed.");
			}
		});
	}

	return (
		<div className={styles.form}>
			<p className={styles.help}>Typing your name below counts as your signature confirming the supplies listed arrived.</p>
			<div className="field">
				<label htmlFor="signoff-note">Note (optional)</label>
				<input id="signoff-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything damaged or missing" />
			</div>
			<div className="field">
				<label htmlFor="signoff-name">Signature (type your full name)</label>
				<input id="signoff-name" type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Full name" className={styles.signatureInput} />
			</div>
			{error && <p className={styles.error}>{error}</p>}
			<button type="button" className="btn" disabled={isPending} onClick={submit}>
				{isPending ? "Signing…" : "Sign & confirm receipt"}
			</button>
		</div>
	);
}
