import type { PollingLocationRow } from "@/lib/db";
import type { PipelineStage } from "@/lib/queries";

const ADA_STATUS_LABEL: Record<PollingLocationRow["ada_audit_status"], string> = {
	pending: "Pending",
	compliant: "Compliant",
	remediated_with_kit: "Remediated w/ kit",
	needs_relocation: "Needs relocation",
};

const ADA_STATUS_CLASS: Record<PollingLocationRow["ada_audit_status"], string> = {
	pending: "badge--gray",
	compliant: "badge--teal",
	remediated_with_kit: "badge--amber",
	needs_relocation: "badge--red",
};

export function AdaStatusBadge({ status }: { status: PollingLocationRow["ada_audit_status"] }) {
	return <span className={`badge ${ADA_STATUS_CLASS[status]}`}>{ADA_STATUS_LABEL[status]}</span>;
}

const PIPELINE_LABEL: Record<PipelineStage, string> = {
	not_started: "Not started",
	audited: "Audited",
	manifest_ready: "Manifest ready",
	dispatched: "Dispatched",
};

const PIPELINE_CLASS: Record<PipelineStage, string> = {
	not_started: "badge--gray",
	audited: "badge--teal",
	manifest_ready: "badge--teal",
	dispatched: "badge--teal",
};

// A needs_relocation location never really reaches "manifest ready" or
// "dispatched" — Stage 3/4 still write artifacts (a review flag, a blocked
// dispatch stub) so the pipeline can be inspected, but that's not the same
// as supplies actually being staged. Show the branch, not the raw stage.
export function PipelineBadge({ stage, adaAuditStatus }: { stage: PipelineStage; adaAuditStatus: PollingLocationRow["ada_audit_status"] }) {
	if (adaAuditStatus === "needs_relocation" && stage !== "not_started") {
		return <span className="badge badge--red">Flagged for review</span>;
	}
	return <span className={`badge ${PIPELINE_CLASS[stage]}`}>{PIPELINE_LABEL[stage]}</span>;
}
