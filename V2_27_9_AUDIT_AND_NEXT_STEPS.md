# V2.27.9 Development Audit — Next Steps

## Current repository audit

Reviewed branch: `v2.27.8-development`

Files present on that branch:
- `index.html`
- `SUPRAAKASH_PUJA_COMMITTEE_V2_27_5.html`
- `SUPRAAKASH_PUJA_COMMITTEE_V2_27_7.html`
- `README.md`

The HTML contains the Supabase client integration and references these backend resources:
- Supabase table: `committee_directory`
- Supabase table: `committee_app_records`
- Supabase Edge Function: `committee-auth`

No Supabase Edge Function source, SQL migration, or database schema file was present in the inspected repository tree.

## Confirmed application risks

1. The member directory is loaded as records containing `member_id` and `display_name`, but the frontend builds a map keyed by display name. Duplicate names can overwrite one another in that map.
2. Member selectors currently use the display name as the option value. This makes a mutable name act as an identity key.
3. Receipt creation stores both `issuer` and `issuerMemberId`, but the selected member is resolved from the name-keyed map.
4. The frontend deliberately disables local-only add/rename operations because the directory and login profile must be updated together. This is a sound safety guard until a verified backend operation exists.
5. The Settings copy describes the cloud backup as covering receipts, handovers, and income/expense. The actual export/restore implementation must be reviewed against every supported entity before claiming it is a full-app backup.
6. The UI itself warns that role permissions need Supabase RLS/Edge Function enforcement. Frontend-only role checks must not be treated as security.

## Required next work (do not guess backend contracts)

1. Obtain the deployed `committee-auth` Edge Function source and the SQL definitions/migrations for `committee_directory`, `committee_app_records`, RLS policies, and related constraints.
2. Verify how login IDs are linked to directory member IDs and how admin activation/name changes are authorized.
3. Design all member operations around immutable `member_id`; display name must remain editable and must never be used as the primary key.
4. Update frontend selectors to submit/store the immutable member ID while displaying the corresponding name. Preserve historical receipt issuer name as a snapshot and keep `issuerMemberId` as the stable identity.
5. Add/rename members through one authenticated backend transaction that updates the directory and login profile consistently, with audit logging.
6. Test duplicate display names, rename, inactive members, member login, admin entry, receipt history, handovers, finance entries, cloud sync, backup and restore.
7. Verify RLS independently of UI role restrictions.

## Safety boundary

Do not change production `main`, the existing V2.27.5/V2.27.7 files, or deployed Supabase resources as part of this audit. Do not invent database columns, Edge Function request shapes, or secrets. Implement backend-dependent changes only after the actual deployed SQL and function source are available.

## Branch

Work is isolated on `v2.27.9-development`.
