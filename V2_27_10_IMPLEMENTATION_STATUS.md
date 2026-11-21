# SUPRAAKASH PUJA COMMITTEE — V2.27.10 DEVELOPMENT STATUS

## Branch and protection
- Development branch: v2.27.10-development
- Built from the reviewed V2.27.9 development line.
- main, V2.27.5, V2.27.7, and live Supabase resources have not been changed.
- The new Edge Function source is committed for review only; it has NOT been deployed to Supabase.

## V2.27.10 app changes
- Core member selectors now use immutable committee_directory.member_id values; labels show the matching display name and exact ID from the same directory row.
- Active Member, Receipt Issued By, Receipt Filter, Handover Member, Finance Entered By, and Committee Members Collection picker use ID-valued options.
- Existing local Active Member name values are migrated to an ID only when the directory resolves that name uniquely.
- Login response Member ID is retained on the authenticated user object; member-role selectors are restricted to that exact ID.
- New receipts save issuerMemberId and retain issuer as a historical display-name snapshot.
- New handovers and finance entries save memberId and retain member as a historical display-name snapshot.
- New Committee Members Collection entries save the selected exact memberId and its corresponding name.
- Receipt filters, member detail, member list totals, handover totals, and member reports match by ID. Legacy records without an ID are attributed by name only when that name is unique in the active directory; ambiguous legacy records are not assigned to either same-name member.
- Receipt update permission checks use the immutable issuer ID, with a safe unique-name fallback only for legacy receipts.
- Member Add and Edit Name call authenticated server actions. Adding a member creates a directory row with role member, then requests an activation code. Renaming updates the directory and, when activated, the linked committee profile and Auth user metadata without changing Member ID.
- The app and cloud backup metadata identify V2.27.10.
- After cloud hydration, the Committee Collection picker and rows refresh from the loaded directory/data.

## Preserved V2.27.7 feature set
- Receipt register and Family/Outside bill quantities.
- Budget, bookings, sponsorship, loans, QR payment verification and QR change history.
- Year-wise history and JSON export.
- Cloud backup/restore and automatic browser-open snapshot behavior.
- Cashbook and permission matrix.
- Helping Members Collection and Committee Members Collection, separate histories and WhatsApp thank-you actions; these collections do not create receipt numbers.
- Source-wise budget inputs: Family, Outside, Committee Members Special, Sponsorship Special and Helping Members.
- Actual Paid Amount in receipt WhatsApp acknowledgement.
- Mobile horizontal table scrolling and language selector.

## Authenticated Edge Function source added
File: supabase/functions/committee-auth/index.ts
- Preserves existing login, activate, and issue-code actions.
- Adds admin-add-member and admin-rename-member.
- Both new actions verify the bearer session against Supabase Auth and require an active committee_profiles.role = admin profile.
- Add action accepts only role member; it does not allow privilege escalation.
- Rename action keeps member_id unchanged and synchronizes directory, linked profile and Auth metadata, with rollback attempts if a linked update fails.
- This source is not deployed. Deploying it requires a separate review and explicit go-ahead.

## Automated checks
- Added GitHub Actions workflow: .github/workflows/v2-27-10-validation.yml.
- It checks every inline app JavaScript block, required ID safeguards, and type-checks the Edge Function.
- Passed on the latest application/backend commit: GitHub Actions run 44934120371 (inline JavaScript validation and Deno type-check both successful).

## Still required before production
1. Confirm GitHub Actions validation result is green; fix any failures.
2. Review Edge Function action changes and deploy the reviewed source to Supabase only with explicit approval.
3. Verify Supabase RLS and constraints allow the intended admin directory/profile writes; do not weaken RLS to make the UI work.
4. Run real tests with admin and member accounts: add member, issue activation code, activate, login, rename, re-login, receipt create/filter/update, handover, finance, committee contribution, duplicate names, cloud sync and restore.
5. Verify old backups and historical records remain readable and correctly associated.
6. Test on Android mobile browser/PWA, including refresh, navigation and offline/local backup behavior.

## Release state
V2.27.10 is a development build, not yet a production release. No browser runtime test or live Supabase integration test has been completed. Do not replace the production PWA until the checks above pass.