# SUPRAAKASH PUJA COMMITTEE — V2.27.10

A separate development build continuing the V2.27.7 feature set and the V2.27.9 stable-member-identity work.

## Included
- Immutable Member ID values in the main member selectors and collection picker.
- Member name and Member ID rendered from the same directory record.
- ID-linked Receipt Issued By, Receipt Filter, Handover, Finance, member details and reports.
- New receipt, handover, finance and committee-contribution records retain permanent Member ID plus a display-name snapshot.
- Duplicate names are supported in the UI because selectors use Member ID; ambiguous legacy name-only records are not guessed or reassigned.
- Authenticated admin member add and rename actions in the Edge Function source.
- Member add issues an activation code using the existing activation-code action.
- Rename preserves Member ID and synchronizes the directory, profile and Auth metadata.
- Preserves the V2.27.7 receipt, budget, booking, sponsorship, loan, QR, history, cashbook, collection, backup/restore and mobile features.

## Important deployment note
The Edge Function source is in supabase/functions/committee-auth/index.ts, but it has not been deployed. V2.27.10 is not production-ready until GitHub Actions checks, Supabase RLS review, live account tests and Android PWA regression tests pass. No live Supabase data or production branch was modified.