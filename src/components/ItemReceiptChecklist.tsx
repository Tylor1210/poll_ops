"use client";

import { useState, useTransition } from "react";
import { recordItemReceiptAction } from "@/app/actions";
import type { ManifestItemRow } from "@/lib/db";
import { itemLabel } from "@/lib/item-catalog";
import type { ItemReceiptRow } from "@/lib/receipts";
import styles from "./ItemReceiptChecklist.module.css";

export function ItemReceiptChecklist({
	locationId,
	manifestItems,
	itemReceipts,
	canReceive,
}: {
	locationId: string;
	manifestItems: ManifestItemRow[];
	itemReceipts: ItemReceiptRow[];
	canReceive: boolean;
}) {
	const [receivedBy, setReceivedBy] = useState("");
	const [pendingId, setPendingId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function receivedTotal(itemId: number): number {
		return itemReceipts.filter((r) => r.manifest_item_id === itemId).reduce((sum, r) => sum + r.received_quantity, 0);
	}

	function markReceived(item: ManifestItemRow) {
		setError(null);
		if (!receivedBy.trim()) {
			setError("Enter your name before checking items in.");
			return;
		}
		const remaining = item.quantity - receivedTotal(item.id);
		setPendingId(item.id);
		startTransition(async () => {
			try {
				await recordItemReceiptAction({
					locationId,
					manifestItemId: item.id,
					receivedQuantity: remaining,
					receivedBy,
				});
			} catch (err) {
				setError(err instanceof Error ? err.message : "Check-in failed.");
			} finally {
				setPendingId(null);
			}
		});
	}

	return (
		<div>
			{canReceive && (
				<div className={`field ${styles.nameField}`}>
					<label htmlFor="receivedBy">Your name</label>
					<input id="receivedBy" type="text" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Poll worker name" />
				</div>
			)}
			<div className={styles.checklist}>
				{manifestItems.map((item) => {
					const received = receivedTotal(item.id);
					const complete = received >= item.quantity;
					return (
						<div key={item.id} className={styles.checkItem}>
							<div className={styles.itemInfo}>
								<span>{itemLabel(item.item_type)}</span>
								<span className={styles.qtyLine}>
									{received} / {item.quantity} received
									{item.status === "shortfall" && <span className="badge badge--red" style={{ marginLeft: "0.4rem" }}>contract short</span>}
								</span>
							</div>
							{canReceive ? (
								complete ? (
									<span className="badge badge--teal">Received</span>
								) : (
									<button type="button" className="btn btn--secondary btn--small" disabled={isPending} onClick={() => markReceived(item)}>
										{pendingId === item.id && isPending ? "Saving…" : "Mark received"}
									</button>
								)
							) : (
								<span className={`badge ${complete ? "badge--teal" : "badge--gray"}`}>{complete ? "Received" : "Pending"}</span>
							)}
						</div>
					);
				})}
			</div>
			{error && <p className={styles.error}>{error}</p>}
		</div>
	);
}
