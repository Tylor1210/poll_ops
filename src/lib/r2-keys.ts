// Central definition of the ICM stage artifact key structure in R2.
// Every stage reads/writes through these builders — nothing constructs a
// raw key string elsewhere.

export const referenceChecklistKey = () => "00_reference/ada_polling_checklist.md";

// Keyed by precinct_id: this is the one artifact scoped below the location.
export const precinctBaselineKey = (precinctId: string) => `01_precinct_intake/output/precinct_${precinctId}_baseline.json`;

// Everything from here down is keyed by location_id — the ADA audit belongs
// to the location, not any one precinct it serves (co-located precincts
// share a single audit).
export const locationAuditKey = (locationId: string) => `02_ada_survey_audit/output/location_${locationId}_ada_audit.md`;
export const locationManifestKey = (locationId: string) => `03_logistics_manifest/output/location_${locationId}_manifest.json`;
export const locationDispatchKey = (locationId: string) => `04_field_dispatch_runbook/output/location_${locationId}_dispatch.md`;
