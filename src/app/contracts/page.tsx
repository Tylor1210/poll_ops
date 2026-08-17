import Link from "next/link";
import { AddContractForm } from "@/components/AddContractForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getEnv } from "@/lib/cf";
import { listContractsWithUsage } from "@/lib/contracts";
import { itemLabel } from "@/lib/item-catalog";
import { getCurrentRole, permissions } from "@/lib/roles";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
	const [role, env] = await Promise.all([getCurrentRole(), getEnv()]);

	if (!permissions.canManageSetup(role)) {
		return (
			<>
				<SiteHeader />
				<div className="page">
					<p className={styles.denied}>Contracts are only visible to coordinators. Switch role to view this page.</p>
					<Link href="/" className="btn btn--secondary">
						← Status board
					</Link>
				</div>
			</>
		);
	}

	const contracts = await listContractsWithUsage(env.DB);

	return (
		<>
			<SiteHeader />
			<div className="page">
				<div className={styles.header}>
					<h1 className={styles.title}>Contracts</h1>
					<p className={styles.subtitle}>
						Vendor contracts cap what Stage 3 can order for a given item — the same finite-pool pattern used for the shared
						roving-tech and portable-ramp resources. A location that can&apos;t be fully covered shows a shortfall flag
						instead of an unlimited order.
					</p>
				</div>

				<section className={`card ${styles.section}`}>
					<h2 className={styles.sectionTitle}>Active contracts</h2>
					<div className={styles.table}>
						{contracts.map((c) => (
							<div key={c.id} className={styles.row}>
								<div>
									<div className={styles.vendor}>{c.vendor_name}</div>
									<div className={styles.itemName}>{itemLabel(c.item_type)}</div>
								</div>
								<div>
									{c.remaining.toLocaleString("en-US")} / {c.quantity_available.toLocaleString("en-US")} remaining
								</div>
								<div>
									<span className={`badge ${c.remaining > 0 ? "badge--teal" : "badge--red"}`}>
										{c.remaining > 0 ? "Available" : "Exhausted"}
									</span>
								</div>
								<div className={styles.dates}>
									{c.valid_from} → {c.valid_until}
									{c.notes ? ` · ${c.notes}` : ""}
								</div>
							</div>
						))}
						{contracts.length === 0 && <p className={styles.itemName}>No contracts yet.</p>}
					</div>
				</section>

				<section className={`card ${styles.section}`} style={{ marginTop: "1rem" }}>
					<h2 className={styles.sectionTitle}>Add a contract</h2>
					<AddContractForm />
				</section>
			</div>
		</>
	);
}
