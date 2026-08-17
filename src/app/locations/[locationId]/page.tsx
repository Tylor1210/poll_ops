import Link from "next/link";
import { notFound } from "next/navigation";
import { runAuditAction, runDispatchAction, runManifestAction } from "@/app/actions";
import { AuditChecklist } from "@/components/AuditChecklist";
import { LocationHistorySection } from "@/components/LocationHistorySection";
import { PipelineStepper } from "@/components/PipelineStepper";
import { RelocationApproval } from "@/components/RelocationApproval";
import { AdaStatusBadge } from "@/components/StatusBadge";
import { SiteHeader } from "@/components/SiteHeader";
import { formatDateTime } from "@/lib/format";
import { itemLabel } from "@/lib/item-catalog";
import { getEnv } from "@/lib/cf";
import { getLocationDetail } from "@/lib/queries";
import { getCurrentRole, permissions } from "@/lib/roles";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function LocationDetailPage({ params }: { params: Promise<{ locationId: string }> }) {
	const { locationId } = await params;
	const env = await getEnv();
	const [detail, role] = await Promise.all([getLocationDetail(env, locationId), getCurrentRole()]);
	if (!detail) notFound();

	const { location, group, precincts, pipelineStage, auditFindings, manifest, dispatchRunbook, auditEdits, history, signoffs } = detail;
	const totalVoters = precincts.reduce((sum, p) => sum + p.registered_voters, 0);
	const canRunPipeline = permissions.canRunPipeline(role);
	const relocationSignoff = signoffs.find((s) => s.purpose === "relocation_approval") ?? null;

	return (
		<>
			<SiteHeader />
			<div className="page">
				<Link href="/" className={styles.backLink}>
					← Status board
				</Link>

				<div className={`card ${styles.headerCard}`}>
					<div className={styles.headerTop}>
						<div>
							<h1 className={styles.address}>{location.address}</h1>
							<div className={styles.id}>
								<span className="mono">{location.id}</span>
								{group && <span> · {group.name}</span>}
							</div>
						</div>
						<AdaStatusBadge status={location.ada_audit_status} />
					</div>
					<PipelineStepper adaAuditStatus={location.ada_audit_status} pipelineStage={pipelineStage} />
				</div>

				<section className={`card ${styles.section}`} style={{ marginTop: "1rem" }}>
					<h2 className={styles.sectionTitle}>Precincts served</h2>
					<div className={styles.statGrid}>
						<div className={styles.stat}>
							<span className={styles.statValue}>{precincts.length}</span>
							<span className={styles.statLabel}>Precincts</span>
						</div>
						<div className={styles.stat}>
							<span className={styles.statValue}>{totalVoters.toLocaleString("en-US")}</span>
							<span className={styles.statLabel}>Registered voters</span>
						</div>
					</div>
					<ul className={styles.precinctList}>
						{precincts.map((p) => (
							<li key={p.id} className={styles.precinctRow}>
								<span>{p.name}</span>
								<span className={styles.precinctMeta}>
									<span className="mono">{p.id}</span> · {p.registered_voters.toLocaleString("en-US")} voters ·{" "}
									{Math.round(p.historical_turnout * 100)}% historical turnout
								</span>
							</li>
						))}
					</ul>
				</section>

				<section className={`card ${styles.section}`} style={{ marginTop: "1rem" }}>
					<h2 className={styles.sectionTitle}>ADA audit</h2>
					{!auditFindings ? (
						<div className={styles.emptyState}>
							<p>This location hasn&apos;t been audited yet.</p>
							{canRunPipeline ? (
								<form action={runAuditAction.bind(null, locationId)}>
									<button type="submit" className="btn">
										Run ADA audit
									</button>
								</form>
							) : (
								<p className={styles.roleNote}>Your role can view but not run the audit.</p>
							)}
						</div>
					) : (
						<>
							{auditFindings.status === "needs_relocation" && (
								<div className={`${styles.callout} ${styles["callout--red"]}`}>
									<strong>Flagged for supervisor review — no supply manifest will be generated.</strong>
									<div style={{ marginTop: "0.4rem" }}>{auditFindings.relocationReason}</div>
								</div>
							)}
							<AuditChecklist locationId={locationId} checks={auditFindings.checks} canEdit={canRunPipeline} />
							{auditFindings.status === "remediated_with_kit" && auditFindings.remediationItems.length > 0 && (
								<ul className={styles.remediationList}>
									{auditFindings.remediationItems.map((item) => (
										<li key={item}>{itemLabel(item)}</li>
									))}
								</ul>
							)}
							{auditFindings.status === "needs_relocation" && (
								<RelocationApproval locationId={locationId} role={role} existingSignoff={relocationSignoff} />
							)}
						</>
					)}
				</section>

				{auditFindings && auditFindings.status !== "needs_relocation" && (
					<section className={`card ${styles.section}`} style={{ marginTop: "1rem" }}>
						<h2 className={styles.sectionTitle}>Logistics manifest</h2>
						{!manifest ? (
							<div className={styles.emptyState}>
								<p>No manifest generated yet.</p>
								{canRunPipeline ? (
									<form action={runManifestAction.bind(null, locationId)}>
										<button type="submit" className="btn">
											Generate manifest
										</button>
									</form>
								) : (
									<p className={styles.roleNote}>Your role can view but not generate the manifest.</p>
								)}
							</div>
						) : manifest.type === "supply_manifest" ? (
							<>
								<div className={styles.statGrid}>
									<div className={styles.stat}>
										<span className={styles.statValue}>{manifest.ballotEquipment.ballots.toLocaleString("en-US")}</span>
										<span className={styles.statLabel}>Ballots</span>
									</div>
									<div className={styles.stat}>
										<span className={styles.statValue}>{manifest.ballotEquipment.votingBooths}</span>
										<span className={styles.statLabel}>Voting booths</span>
									</div>
									<div className={styles.stat}>
										<span className={styles.statValue}>{manifest.ballotEquipment.pollPads}</span>
										<span className={styles.statLabel}>Poll pads</span>
									</div>
									<div className={styles.stat}>
										<span className={styles.statValue}>{manifest.ballotEquipment.provisionalEnvelopes}</span>
										<span className={styles.statLabel}>Provisional envelopes</span>
									</div>
								</div>
								<ul className={styles.itemList}>
									{manifest.items.map((item) => (
										<li key={item.itemType} className={styles.itemRow}>
											<span>{itemLabel(item.itemType)}</span>
											<span>
												{item.quantity}
												{item.shortfall > 0 && (
													<span className="badge badge--red" style={{ marginLeft: "0.5rem" }}>
														{item.shortfall} short
													</span>
												)}
											</span>
										</li>
									))}
								</ul>
								{(manifest.rovingTech.requested || manifest.portableRamp.requested) && (
									<div style={{ marginTop: "0.75rem" }}>
										{manifest.rovingTech.requested && (
											<div className={styles.resourceRow}>
												<span>Roving ADA tech</span>
												<span className={`badge ${manifest.rovingTech.allocated ? "badge--teal" : "badge--red"}`}>
													{manifest.rovingTech.allocated ? "Allocated" : "Unallocated"}
												</span>
											</div>
										)}
										{manifest.portableRamp.requested && (
											<div className={styles.resourceRow}>
												<span>Portable ramp</span>
												<span className={`badge ${manifest.portableRamp.allocated ? "badge--teal" : "badge--red"}`}>
													{manifest.portableRamp.allocated ? "Allocated" : "Unallocated"}
												</span>
											</div>
										)}
									</div>
								)}
							</>
						) : null}
					</section>
				)}

				{manifest?.type === "supply_manifest" && (
					<section className={`card ${styles.section}`} style={{ marginTop: "1rem" }}>
						<h2 className={styles.sectionTitle}>Field dispatch</h2>
						{!dispatchRunbook ? (
							<div className={styles.emptyState}>
								<p>No dispatch runbook generated yet.</p>
								{canRunPipeline ? (
									<form action={runDispatchAction.bind(null, locationId)}>
										<button type="submit" className="btn">
											Generate dispatch runbook
										</button>
									</form>
								) : (
									<p className={styles.roleNote}>Your role can view but not generate the dispatch runbook.</p>
								)}
							</div>
						) : (
							<>
								<p className={styles.dispatchProse}>{extractRunbookProse(dispatchRunbook)}</p>
								<div className={styles.actions}>
									<Link href={`/locations/${locationId}/work-order`} className="btn btn--secondary">
										View work order
									</Link>
								</div>
							</>
						)}
					</section>
				)}

				<LocationHistorySection history={history} />

				{(auditEdits.length > 0 || signoffs.length > 0) && (
					<section className={`card ${styles.section}`} style={{ marginTop: "1rem" }}>
						<h2 className={styles.sectionTitle}>Edit &amp; sign-off history</h2>
						<ul className={styles.editHistory}>
							{signoffs.map((s) => (
								<li key={`signoff-${s.id}`} className={styles.editRow}>
									<strong>{s.signer_name}</strong> ({s.role.replace("_", " ")}) signed{" "}
									<strong>{s.purpose === "relocation_approval" ? "relocation approval" : "inventory receipt"}</strong> —{" "}
									{formatDateTime(s.signed_at)}
									{s.note ? ` — "${s.note}"` : ""}
								</li>
							))}
							{auditEdits.map((edit) => (
								<li key={`edit-${edit.id}`} className={styles.editRow}>
									<strong>{edit.edited_by}</strong> marked <strong>{edit.field_changed}</strong> remediated —{" "}
									{formatDateTime(edit.edited_at)}
									{edit.note ? ` — "${edit.note}"` : ""}
								</li>
							))}
						</ul>
					</section>
				)}
			</div>
		</>
	);
}

function extractRunbookProse(markdown: string): string {
	const match = markdown.match(/## Runbook\n\n([\s\S]*?)\n\n##/);
	if (match) return match[1];
	if (markdown.includes("## Dispatch blocked")) {
		const blocked = markdown.match(/## Dispatch blocked\n\n([\s\S]*)/);
		if (blocked) return blocked[1].trim();
	}
	return markdown;
}
