# V2.27.9 Development Update

## Implemented in SUPRAAKASH_PUJA_COMMITTEE_V2_27_9.html
- Preserved the V2.27.7 file unchanged; created a separate V2.27.9 development build.
- Replaced the display-name Map construction that silently overwrote duplicate names with explicit duplicate-name detection.
- Added directory lookup helpers keyed by immutable `member_id`.
- Receipt creation now stops when the issuer's Member ID is missing or when the display name is ambiguous. It does not guess which member owns the receipt.
- New Handover and Finance entries now save both the historical display-name snapshot and the immutable `memberId`; they are blocked if the selected name cannot resolve to one active ID.
- Receipt filtering, member-list totals, member detail history, and member report aggregation now prefer the saved Member ID. Legacy rows without an ID are associated by name only when that name maps to exactly one active directory member; ambiguous legacy rows are deliberately not assigned to either same-name member.
- Updated visible version strings to V2.27.9.

## Important scope and remaining work
This is an incremental, backwards-compatible ID association patch, not the complete ID-valued UI migration. Existing selectors still use display names as their option values. Newly created receipt, handover, and finance rows carry immutable IDs while retaining their display-name snapshots. A full migration must change selector values to immutable IDs and update every consumer (active member, committee collections, cloud sync, and historical display) together.

The deployed `committee-auth` Edge Function currently exposes login, activate, and issue-code actions; it does not expose a verified admin member-create/rename operation. No new backend action or live database change was made. Do not add a frontend-only member create/rename path.

## Required next validation
1. Test with two active directory rows sharing the same display_name: receipt creation must be blocked with the ambiguity message.
2. Test a unique active member: receipt saves the correct issuerMemberId.
3. Test a member with no directory match: receipt creation is blocked.
4. Regression-test login, receipt list/filter, handovers, finance, cloud sync, backup/restore, and mobile UI.
5. Implement the full ID-valued selector migration only after these dependencies are updated and tested.
6. Design and review an authenticated Edge Function admin action that updates directory and login profile consistently, with audit logging; deploy only after explicit approval.

## Safety
- `main`, V2.27.5, and V2.27.7 remain unchanged.
- Supabase live tables, policies, and Edge Functions were not modified.
- No secrets were added to the repository.
