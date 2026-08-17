import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { AdaStatusBadge, PipelineBadge } from "@/components/StatusBadge";
import { getEnv } from "@/lib/cf";
import { listLocationSummaries } from "@/lib/queries";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function StatusBoardPage() {
	const env = await getEnv();
	const locations = await listLocationSummaries(env);

	return (
		<>
			<SiteHeader />
			<div className="page">
				<div className={styles.header}>
					<h1 className={styles.title}>Status board</h1>
					<p className={styles.subtitle}>
						One row per polling location. Open a location to run its ADA audit, generate a supply manifest, and dispatch a
						field runbook.
					</p>
				</div>

				<ol className={styles.list}>
					{locations.map((loc) => (
						<li key={loc.id} className="card">
							<Link href={`/locations/${loc.id}`} className={styles.rowLink}>
								<div className={styles.row}>
									<div className={styles.rowTop}>
										<span className={styles.address}>{loc.address}</span>
										<span className={`${styles.id} mono`}>{loc.id}</span>
									</div>
									<div className={styles.meta}>
										<span>
											{loc.precinctCount} precinct{loc.precinctCount === 1 ? "" : "s"}
										</span>
										<span>{loc.totalRegisteredVoters.toLocaleString()} registered voters</span>
									</div>
									<div className={styles.badges}>
										<AdaStatusBadge status={loc.adaAuditStatus} />
										<PipelineBadge stage={loc.pipelineStage} adaAuditStatus={loc.adaAuditStatus} />
									</div>
								</div>
							</Link>
						</li>
					))}
				</ol>
			</div>
		</>
	);
}
