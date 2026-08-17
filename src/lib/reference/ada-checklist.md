# ADA Polling Place Accessibility Checklist

Reference criteria for Stage 2 (ADA survey audit). Each item below maps to a
field on the location's ADA survey. An item fails if the stated condition is
not met.

## Parking

- At least one accessible parking space, or a space that can be designated
  as accessible for election day, within the shortest accessible route to
  the entrance. **Fails if:** `accessibleParking` is false.

## Path of travel

- The route from parking/drop-off to the accessible entrance is stable,
  firm, slip-resistant, and free of obstructions. **Fails if:**
  `pathOfTravelClear` is false.

## Entrance

- The entrance used by voters has no steps, or has a compliant ramp
  (running slope ≤ 1:12) with a viable, safe path connecting it to the
  route of travel. **Fails if:** `entrance` is `stairs_only`, or `entrance`
  is `ramp_available` but `rampPathViable` is false.
- A `stairs_only` entrance with no viable ramp path is **non-remediable
  with a portable kit** — it requires either permanent construction (out of
  scope for election-day remediation) or relocating the polling place.

## Doorway

- Clear doorway width of at least 32 inches. **Fails if:**
  `doorwayWidthInches` is less than 32.

## Restroom

- At least one accessible restroom available to voters and poll workers.
  **Fails if:** `restroomAccessible` is false.

## Signage

- Accessible-entrance and accessible-parking signage is posted and visible
  from the accessible route. **Fails if:** `signageCompliant` is false.

## Remediation guidance

Most failures here can be corrected with a portable kit deployed on
election day (temporary ramp matting, traffic cones/signage to designate
accessible parking, ADA entrance signage, a portable accessible restroom).
An entrance failure is the one category that can be non-remediable — judge
it on whether a physically viable, code-compliant path exists, not just
whether *a* ramp exists.
