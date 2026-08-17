// Single source of truth for manifest item keys — used by Stage 3 (what
// gets ordered), contracts (what a vendor covers), location_history_items
// (what a past cycle used), and the UI (display labels). Everything keys
// off the same stable strings so a query like "average hand sanitizer usage
// per location" and a contract lookup for "ballots" are matching on the
// same identifier, not fuzzy string variants.

export type ItemCategory = "ballot_equipment" | "ada_kit" | "consumable";

export interface ItemCatalogEntry {
	label: string;
	category: ItemCategory;
}

export const ITEM_CATALOG: Record<string, ItemCatalogEntry> = {
	ballots: { label: "Ballots", category: "ballot_equipment" },
	voting_booths: { label: "Voting booths", category: "ballot_equipment" },
	poll_pads: { label: "Poll pads", category: "ballot_equipment" },
	provisional_ballot_envelopes: { label: "Provisional ballot envelopes", category: "ballot_equipment" },

	accessible_parking_kit: { label: "Accessible parking signage & cone kit", category: "ada_kit" },
	matting_runway: { label: "Temporary matting runway", category: "ada_kit" },
	portable_restroom: { label: "Portable ADA-accessible restroom", category: "ada_kit" },
	ada_signage_kit: { label: "ADA entrance signage kit", category: "ada_kit" },

	hand_sanitizer: { label: "Hand sanitizer (bottles)", category: "consumable" },
	bottled_water: { label: "Bottled water (cases)", category: "consumable" },
	privacy_sleeves: { label: "Ballot privacy sleeves (packs)", category: "consumable" },
	pens: { label: "Pens (boxes)", category: "consumable" },
};

// The shared roving-tech/portable-ramp resource pool covers this, not a
// manifest_items row or a contract — it's a scheduled service, not a
// consumable. Kept out of ITEM_CATALOG deliberately.
export const PORTABLE_RAMP_DEPLOYMENT = "portable_ramp_deployment";

export function itemLabel(itemType: string): string {
	if (itemType === PORTABLE_RAMP_DEPLOYMENT) return "Portable ramp deployment (shared resource pool)";
	return ITEM_CATALOG[itemType]?.label ?? itemType.replaceAll("_", " ");
}
