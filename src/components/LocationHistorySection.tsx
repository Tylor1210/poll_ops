import { formatNumber } from "@/lib/format";
import type { LocationHistoryEntry } from "@/lib/history";
import { itemLabel } from "@/lib/item-catalog";
import styles from "./LocationHistorySection.module.css";

const ELECTION_TYPE_LABEL: Record<string, string> = {
	general: "General",
	primary: "Primary",
	municipal: "Municipal",
	special: "Special",
	runoff: "Runoff",
};

export function LocationHistorySection({ history }: { history: LocationHistoryEntry[] }) {
	if (history.length === 0) return null;

	return (
		<section className="card" style={{ marginTop: "1rem", padding: "1.1rem 1.25rem 1.25rem" }}>
			<h2 style={{ fontSize: "1.05rem", marginBottom: "0.85rem" }}>History</h2>
			{history.map(({ cycle, record, items, issues }) => (
				<div key={cycle.id} className={styles.cycle}>
					<div className={styles.cycleHeader}>
						<span className={styles.cycleLabel}>{cycle.label}</span>
						<span className={styles.cycleMeta}>
							{ELECTION_TYPE_LABEL[cycle.election_type] ?? cycle.election_type} · {cycle.election_date}
						</span>
					</div>
					<div className={styles.statRow}>
						<span>{formatNumber(record.registered_voters)} registered voters</span>
						<span>{Math.round(record.turnout_percent * 100)}% turnout</span>
					</div>
					{items.length > 0 && (
						<div className={styles.itemChips}>
							{items.map((item) => (
								<span key={item.id} className={styles.chip}>
									{itemLabel(item.item_type)}: {item.quantity_used}
								</span>
							))}
						</div>
					)}
					{issues.map((issue) => (
						<div key={issue.id} className={styles.issue}>
							{issue.description}
						</div>
					))}
					{record.notes && <div className={styles.notes}>{record.notes}</div>}
				</div>
			))}
		</section>
	);
}
