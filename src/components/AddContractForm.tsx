"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContractAction } from "@/app/actions";
import { ITEM_CATALOG } from "@/lib/item-catalog";
import styles from "./AddContractForm.module.css";

const ITEM_OPTIONS = Object.entries(ITEM_CATALOG).map(([key, entry]) => ({ key, label: entry.label }));

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export function AddContractForm() {
	const router = useRouter();
	const [vendorName, setVendorName] = useState("");
	const [itemType, setItemType] = useState(ITEM_OPTIONS[0]?.key ?? "");
	const [quantity, setQuantity] = useState("");
	const [validFrom, setValidFrom] = useState("2026-01-01");
	const [validUntil, setValidUntil] = useState("2026-12-31");
	const [notes, setNotes] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function submit() {
		setError(null);
		const qty = Number(quantity);
		if (!vendorName.trim()) return setError("Vendor name is required.");
		if (!qty || qty <= 0) return setError("Quantity must be a positive number.");

		const id = `ctr-${slugify(itemType)}-${slugify(vendorName)}-${Date.now().toString(36)}`;

		startTransition(async () => {
			try {
				await createContractAction({
					id,
					vendorName: vendorName.trim(),
					itemType,
					quantityAvailable: qty,
					validFrom,
					validUntil,
					notes: notes.trim() || undefined,
				});
				setVendorName("");
				setQuantity("");
				setNotes("");
				router.refresh();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to create contract.");
			}
		});
	}

	return (
		<div className={styles.form}>
			<div className={styles.row}>
				<div className="field">
					<label htmlFor="vendor-name">Vendor</label>
					<input id="vendor-name" type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor name" />
				</div>
				<div className="field">
					<label htmlFor="item-type">Item</label>
					<select id="item-type" value={itemType} onChange={(e) => setItemType(e.target.value)} className={styles.select}>
						{ITEM_OPTIONS.map((opt) => (
							<option key={opt.key} value={opt.key}>
								{opt.label}
							</option>
						))}
					</select>
				</div>
				<div className="field">
					<label htmlFor="quantity">Quantity</label>
					<input id="quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
				</div>
			</div>
			<div className={styles.row}>
				<div className="field">
					<label htmlFor="valid-from">Valid from</label>
					<input id="valid-from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
				</div>
				<div className="field">
					<label htmlFor="valid-until">Valid until</label>
					<input id="valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
				</div>
			</div>
			<div className="field">
				<label htmlFor="notes">Notes (optional)</label>
				<input id="notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contact, terms, PO number..." />
			</div>
			{error && <p className={styles.error}>{error}</p>}
			<button type="button" className="btn" disabled={isPending} onClick={submit}>
				{isPending ? "Saving…" : "Add contract"}
			</button>
		</div>
	);
}
