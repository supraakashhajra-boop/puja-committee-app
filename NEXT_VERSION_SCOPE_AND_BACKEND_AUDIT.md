# Next Development Version — Frozen Scope and Safe Start

## Release safety
- Work only on `v2.27.10-development` until a separately agreed release branch/version is created.
- Do not modify `main`, the V2.27.7 production build, or live Supabase resources without explicit approval.
- The V2.27.10 Edge Function source is committed for review only and is not deployed.
- This document records scope and prerequisites; it does not claim the new features are implemented.

## Existing development baseline
- V2.27.10 contains the Member ID identity safeguards and authenticated admin add/rename Edge Function source described in `V2_27_10_IMPLEMENTATION_STATUS.md`.
- Existing V2.27.10 validation passed JavaScript syntax checks and Edge Function type-checking (run 44934222855).
- Browser runtime, Android PWA, and live Supabase integration tests remain outstanding.

## Frozen next-version requirements

### Committee identity and login
- Display the exact committee name: **বাড় নন্দনপুর উত্তরপাড়া বারোয়ারি পূজা কমিটি**.
- Add a premium 5–10 second login intro. Final visual treatment/logo asset is not yet approved.

### Dashboard and navigation
- Remove App Version from the Live Financial Scoreboard.
- Remove duplicate Add Receipt, Members, and Reports buttons from Home Quick Actions; keep their navigation destinations.
- Rename Add Receipt to Donation (preserve existing donation/receipt records).
- Add Bill Collection and Daily Cashbook to Home Quick Actions.
- Remove Daily Cashbook from Settings Navigation and repair its non-responsive form/actions.

### Member profile
- Allow a member to upload their own profile photo.
- Add WhatsApp Thank You action to Receipt History inside each Member Profile, alongside Update.
- Profile-photo storage and access policies require review before implementation.

### Donation
- Keep Donation separate from Bill Collection.
- Make Donation Reason mandatory.
- Preserve/migrate existing receipt history and avoid duplicate income accounting.
- Confirm the final donation fields and reason choices before coding.

### Bill Collection
- Provide isolated Outside Bill and Family Bill sections, each with its own forms, histories, reports, totals, pending balances and receipt numbering.
- Outside Bill fields: person/shop/institution, mandatory mobile, optional address, bill amount, actual paid, calculated pending, Cash/Bank/UPI, payment date, Bill Issued By (member ID-linked), remarks. Store Created By separately from Bill Issued By.
- Family Bill fields: family/member name, automatic bill number, bill amount, actual paid, calculated pending, Cash/Bank/UPI, payment date, remarks, and required collector name. No Family ID/Member ID field.
- Maintain a searchable collector directory/profile and collector-wise Family Bill history. Admin/authorized Collection Manager can manage bill batches; ordinary members cannot.
- Member profiles show the entering/issuing member's Outside Bill history and totals.
- Admin-only receipt cancellation/deletion: authenticated admin authorization, confirmation, reason, audit trail, soft-delete/cancelled state, and never reuse a serial.
- Prevent duplicate income posting across dashboard, cashbook and reports.

### Physical bill batch numbering — BLOCKED pending confirmation
- Proposed separate batches for Outside and Family, e.g. A001–A350 then N001–N050 then N2-001–N2-100.
- Before implementation, inspect a photo/sample of the actual printed paper bill. Digital serial must match the physical bill exactly; do not assume the printed paper includes the batch prefix.
- Preserve all old batches and issued/cancelled serials; never reuse numbers.

## First implementation gate: backend and data-model audit
Before writing a migration or deploying any function:
1. Obtain/read the current Supabase schema for the relevant tables, constraints, indexes, RLS policies and Storage buckets/policies.
2. Map existing receipt, bill quantity, cashbook, donation and member-profile data structures from the current app.
3. Identify which existing structures can safely be extended and which new tables are required.
4. Design an additive, backward-compatible migration and rollback/backup plan.
5. Review the Edge Function changes separately; deploy only after explicit approval.

## Decisions still needed (do not silently assume)
- Actual printed bill sample and exact serial format/prefix.
- Whether Family Bill requires a mobile number for WhatsApp messaging.
- Final Donation fields and Donation Reason options.
- Approved login intro design and whether a committee logo asset is available.
- Names/roles of authorized Family Bill collectors and Collection Managers.

## Work discipline
- Implement only this frozen scope during this test cycle.
- Keep a clear distinction between code committed, checks passed, live deployment, and real-device testing.
- Do not mark any feature complete until its relevant integration and regression tests pass.
