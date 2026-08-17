import type { PollingLocationRow } from "@/lib/db";
import type { PipelineStage } from "@/lib/queries";
import styles from "./PipelineStepper.module.css";

// Mirrors the actual stage graph: a needs_relocation location branches off
// after the audit and never reaches manifest/dispatch, so the stepper shows
// that fork instead of pretending the normal 4-step sequence still applies.
export function PipelineStepper({
	adaAuditStatus,
	pipelineStage,
}: {
	adaAuditStatus: PollingLocationRow["ada_audit_status"];
	pipelineStage: PipelineStage;
}) {
	if (adaAuditStatus === "needs_relocation") {
		const steps = [
			{ key: "not_started", label: "Not started" },
			{ key: "flagged", label: "Flagged for review" },
		];
		return (
			<ol className={styles.stepper}>
				{steps.map((step, i) => (
					<li key={step.key} className={`${styles.step} ${i === 1 ? styles["step--flagged"] : styles["step--done"]}`}>
						<div className={styles.track}>
							<span className={styles.dot} />
							{i < steps.length - 1 && <span className={styles.line} />}
						</div>
						<span className={styles.label}>{step.label}</span>
					</li>
				))}
			</ol>
		);
	}

	const order: PipelineStage[] = ["not_started", "audited", "manifest_ready", "dispatched"];
	const labels: Record<PipelineStage, string> = {
		not_started: "Not started",
		audited: "Audited",
		manifest_ready: "Manifest ready",
		dispatched: "Dispatched",
	};
	const currentIndex = order.indexOf(pipelineStage);

	return (
		<ol className={styles.stepper}>
			{order.map((key, i) => {
				const state = i < currentIndex ? "step--done" : i === currentIndex ? "step--current" : "";
				return (
					<li key={key} className={`${styles.step} ${state ? styles[state] : ""}`}>
						<div className={styles.track}>
							<span className={styles.dot} />
							{i < order.length - 1 && <span className={styles.line} />}
						</div>
						<span className={styles.label}>{labels[key]}</span>
					</li>
				);
			})}
		</ol>
	);
}
