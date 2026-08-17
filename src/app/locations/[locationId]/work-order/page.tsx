import { notFound } from "next/navigation";
import { getEnv } from "@/lib/cf";
import { getLocationDetail } from "@/lib/queries";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

// Minimal-chrome, mobile-first: this is the view a roving tech opens on
// their phone at the curb. No nav, no status board, no editing — just
// today's task list for this one location.
export default async function WorkOrderPage({ params }: { params: Promise<{ locationId: string }> }) {
	const { locationId } = await params;
	const env = await getEnv();
	const detail = await getLocationDetail(env, locationId);
	if (!detail) notFound();

	const { location, manifest, dispatchRunbook } = detail;

	return (
		<div className={styles.shell}>
			<div className={styles.topBar}>
				<div className={styles.topBarLabel}>Work order</div>
				<div className={styles.address}>{location.address}</div>
				<div className={`${styles.id} mono`}>{location.id}</div>
			</div>

			<div className={styles.content}>
				{!dispatchRunbook ? (
					<p className={styles.notReady}>No dispatch runbook has been generated for this location yet.</p>
				) : manifest?.type === "review_flag" ? (
					<div className={styles.blockedBanner}>
						This location is flagged for supervisor review and is not ready for dispatch. {manifest.reason}
					</div>
				) : (
					<>
						<section>
							<div className={styles.sectionTitle}>Runbook</div>
							<p className={styles.prose}>{extractRunbookProse(dispatchRunbook)}</p>
						</section>

						{manifest?.type === "supply_manifest" && (
							<>
								<section>
									<div className={styles.sectionTitle}>Bring</div>
									<div className={styles.checklist}>
										{manifest.items.map((item) => (
											<div key={item.itemType} className={styles.checkItem}>
												<span>{item.itemType.replaceAll("_", " ")}</span>
												<span className={styles.qty}>{item.quantity}</span>
											</div>
										))}
									</div>
								</section>

								{(manifest.rovingTech.requested || manifest.portableRamp.requested) && (
									<section>
										<div className={styles.sectionTitle}>Support</div>
										<div className={styles.checklist}>
											{manifest.rovingTech.requested && (
												<div className={styles.resourceRow}>
													<span>Roving ADA tech</span>
													<span className={`badge ${manifest.rovingTech.allocated ? "badge--teal" : "badge--red"}`}>
														{manifest.rovingTech.allocated ? "Assigned" : "Unassigned"}
													</span>
												</div>
											)}
											{manifest.portableRamp.requested && (
												<div className={styles.resourceRow}>
													<span>Portable ramp</span>
													<span className={`badge ${manifest.portableRamp.allocated ? "badge--teal" : "badge--red"}`}>
														{manifest.portableRamp.allocated ? "Assigned" : "Unassigned"}
													</span>
												</div>
											)}
										</div>
									</section>
								)}
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
}

function extractRunbookProse(markdown: string): string {
	const match = markdown.match(/## Runbook\n\n([\s\S]*?)\n\n##/);
	return match ? match[1] : markdown;
}
