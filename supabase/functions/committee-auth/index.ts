import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});
const enc = new TextEncoder();
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
};
const randomCode = () => [...crypto.getRandomValues(new Uint8Array(6))].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
const safeDbError = (e: any) => ({ code: e?.code || 'DB_ERROR', details: e?.message || String(e || 'Unknown database error') });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) return json({ error: 'Server configuration missing', stage: 'config' }, 500);
  const adminClient = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON', stage: 'request' }, 400); }
  const action = String(body.action || '');

  try {
    if (action === 'login') {
      const memberId = String(body.memberId || '').trim().toUpperCase();
      const password = String(body.password || '');
      if (!memberId || !password) return json({ error: 'Member ID and password are required', stage: 'input' }, 400);

      const { data: directory, error: dirError } = await adminClient
        .from('committee_directory').select('member_id,display_name,role,auth_user_id,is_active')
        .eq('member_id', memberId).maybeSingle();
      if (dirError) {
        console.error('login.directory_query', dirError);
        return json({ error: 'Member directory query failed', stage: 'directory_query', ...safeDbError(dirError) }, 500);
      }
      if (!directory) return json({ error: 'Member ID not found in committee directory', stage: 'directory_missing' }, 404);
      if (directory.is_active !== true) return json({ error: 'Member account is inactive in committee directory', stage: 'directory_inactive' }, 403);
      if (!directory.auth_user_id) return json({ error: 'Member has not completed account activation', stage: 'auth_link_missing' }, 409);

      const { data: profile, error: profileError } = await adminClient.from('committee_profiles')
        .select('display_name,role,is_active').eq('user_id', directory.auth_user_id).maybeSingle();
      if (profileError) {
        console.error('login.profile_query', profileError);
        return json({ error: 'Member profile query failed', stage: 'profile_query', ...safeDbError(profileError) }, 500);
      }
      if (!profile) return json({ error: 'Linked Auth user has no committee profile', stage: 'profile_missing' }, 409);
      if (profile.is_active !== true) return json({ error: 'Committee profile is inactive', stage: 'profile_inactive' }, 403);
      if (profile.role !== directory.role) return json({ error: 'Directory role and profile role do not match', stage: 'role_mismatch' }, 409);

      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(directory.auth_user_id);
      if (userError) {
        console.error('login.auth_lookup', userError);
        return json({ error: 'Could not look up linked Auth account', stage: 'auth_lookup', details: userError.message }, 500);
      }
      if (!userData.user?.email) return json({ error: 'Linked Auth account has no email login identifier', stage: 'auth_email_missing' }, 409);
      const publicClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await publicClient.auth.signInWithPassword({ email: userData.user.email, password });
      if (error || !data.session) {
        console.warn('login.password_rejected', { memberId, message: error?.message });
        return json({ error: 'Password rejected by Supabase Auth', stage: 'password_auth', details: error?.message || 'No session returned' }, 401);
      }
      return json({ session: data.session, member: { memberId, displayName: directory.display_name, role: directory.role } });
    }

    if (action === 'activate') {
      const memberId = String(body.memberId || '').trim().toUpperCase();
      const code = String(body.activationCode || '').trim().toUpperCase();
      const password = String(body.password || '');
      if (!memberId || !code || password.length < 10) return json({ error: 'Member ID, activation code and a password of at least 10 characters are required' }, 400);
      const { data: directory, error: dirError } = await adminClient.from('committee_directory')
        .select('member_id,display_name,role,auth_user_id,is_active').eq('member_id', memberId).maybeSingle();
      if (dirError) return json({ error: 'Member directory query failed', stage: 'directory_query', ...safeDbError(dirError) }, 500);
      if (!directory || !directory.is_active || directory.auth_user_id) return json({ error: 'Member not eligible for activation' }, 409);
      const { data: activation, error: codeError } = await adminClient.from('committee_activation_codes')
        .select('id,expires_at,used_at').eq('member_id', memberId).eq('code_hash', await sha256(code))
        .is('used_at', null).gt('expires_at', new Date().toISOString()).maybeSingle();
      if (codeError) return json({ error: 'Activation code lookup failed', stage: 'activation_code_query', ...safeDbError(codeError) }, 500);
      if (!activation) return json({ error: 'Invalid, expired, or already used activation code' }, 401);
      const syntheticEmail = `${memberId.toLowerCase()}@members.invalid`;
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({ email: syntheticEmail, password, email_confirm: true, user_metadata: { committee_member_id: memberId, display_name: directory.display_name } });
      if (createError || !created.user) return json({ error: createError?.message || 'Could not create account', stage: 'auth_create' }, 400);
      const { error: profileError } = await adminClient.from('committee_profiles').insert({ user_id: created.user.id, display_name: directory.display_name, role: directory.role, is_active: true });
      if (profileError) { await adminClient.auth.admin.deleteUser(created.user.id); return json({ error: 'Could not create member profile', stage: 'profile_create', ...safeDbError(profileError) }, 500); }
      const { data: linked, error: updateError } = await adminClient.from('committee_directory').update({ auth_user_id: created.user.id }).eq('member_id', memberId).is('auth_user_id', null).select('member_id').maybeSingle();
      if (updateError || !linked) { await adminClient.from('committee_profiles').delete().eq('user_id', created.user.id); await adminClient.auth.admin.deleteUser(created.user.id); return json({ error: 'Member activation link could not be saved', stage: 'directory_link', ...(updateError ? safeDbError(updateError) : {}) }, 409); }
      const { error: usedError } = await adminClient.from('committee_activation_codes').update({ used_at: new Date().toISOString() }).eq('id', activation.id).is('used_at', null);
      if (usedError) return json({ error: 'Account created but activation code finalization failed', stage: 'activation_finalize', ...safeDbError(usedError) }, 500);
      const publicClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: signed, error: signError } = await publicClient.auth.signInWithPassword({ email: syntheticEmail, password });
      if (signError || !signed.session) return json({ error: 'Account activated. Please sign in using Member ID and password.' }, 200);
      return json({ session: signed.session, member: { memberId, displayName: directory.display_name, role: directory.role } });
    }

    if (action === 'admin-add-member' || action === 'admin-rename-member') {
      const token = (req.headers.get('Authorization') || '').replace(/^Bearer\\s+/i, '');
      if (!token) return json({ error: 'Admin session required', stage: 'admin_auth' }, 401);
      const { data: authData, error: authError } = await adminClient.auth.getUser(token);
      if (authError || !authData.user) return json({ error: 'Invalid session', stage: 'admin_auth' }, 401);
      const { data: adminProfile, error: adminProfileError } = await adminClient.from('committee_profiles')
        .select('role,is_active').eq('user_id', authData.user.id).maybeSingle();
      if (adminProfileError) return json({ error: 'Admin profile lookup failed', stage: 'admin_profile', ...safeDbError(adminProfileError) }, 500);
      if (!adminProfile?.is_active || adminProfile.role !== 'admin') return json({ error: 'Admin permission required', stage: 'admin_role' }, 403);

      const memberId = String(body.memberId || '').trim().toUpperCase();
      const displayName = String(body.displayName || '').trim();
      if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(memberId)) return json({ error: 'Member ID must be 3–32 characters (A–Z, 0–9, underscore or hyphen)', stage: 'member_id' }, 400);
      if (displayName.length < 2 || displayName.length > 100) return json({ error: 'Member name must be 2–100 characters', stage: 'display_name' }, 400);

      if (action === 'admin-add-member') {
        const { data: existing, error: existingError } = await adminClient.from('committee_directory')
          .select('member_id').eq('member_id', memberId).maybeSingle();
        if (existingError) return json({ error: 'Member ID lookup failed', stage: 'member_lookup', ...safeDbError(existingError) }, 500);
        if (existing) return json({ error: 'This Member ID already exists', stage: 'member_exists' }, 409);
        const { data: created, error: createError } = await adminClient.from('committee_directory')
          .insert({ member_id: memberId, display_name: displayName, role: 'member', auth_user_id: null, is_active: true })
          .select('member_id,display_name,role,is_active').single();
        if (createError) return json({ error: 'Could not add member', stage: 'member_insert', ...safeDbError(createError) }, 500);
        console.info('admin.member_added', { memberId, actorId: authData.user.id });
        return json({ member: created, activationCodeRequired: true });
      }

      const { data: directory, error: lookupError } = await adminClient.from('committee_directory')
        .select('member_id,display_name,role,auth_user_id,is_active').eq('member_id', memberId).maybeSingle();
      if (lookupError) return json({ error: 'Member lookup failed', stage: 'member_lookup', ...safeDbError(lookupError) }, 500);
      if (!directory || !directory.is_active) return json({ error: 'Active member not found', stage: 'member_missing' }, 404);
      const oldName = directory.display_name;
      const { error: directoryUpdateError } = await adminClient.from('committee_directory')
        .update({ display_name: displayName }).eq('member_id', memberId);
      if (directoryUpdateError) return json({ error: 'Could not update member directory', stage: 'directory_update', ...safeDbError(directoryUpdateError) }, 500);

      if (directory.auth_user_id) {
        const { error: profileUpdateError } = await adminClient.from('committee_profiles')
          .update({ display_name: displayName }).eq('user_id', directory.auth_user_id);
        if (profileUpdateError) {
          await adminClient.from('committee_directory').update({ display_name: oldName }).eq('member_id', memberId);
          return json({ error: 'Profile update failed; directory name was rolled back', stage: 'profile_update', ...safeDbError(profileUpdateError) }, 500);
        }
        const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(directory.auth_user_id);
        if (authUserError || !authUser.user) {
          await adminClient.from('committee_profiles').update({ display_name: oldName }).eq('user_id', directory.auth_user_id);
          await adminClient.from('committee_directory').update({ display_name: oldName }).eq('member_id', memberId);
          return json({ error: 'Could not verify linked login account; name changes were rolled back', stage: 'auth_lookup', ...safeDbError(authUserError) }, 500);
        }
        const { error: metadataError } = await adminClient.auth.admin.updateUserById(directory.auth_user_id, {
          user_metadata: { ...(authUser.user.user_metadata || {}), display_name: displayName, committee_member_id: memberId },
        });
        if (metadataError) {
          await adminClient.from('committee_profiles').update({ display_name: oldName }).eq('user_id', directory.auth_user_id);
          await adminClient.from('committee_directory').update({ display_name: oldName }).eq('member_id', memberId);
          return json({ error: 'Login metadata update failed; profile and directory names were rolled back', stage: 'auth_metadata_update', ...safeDbError(metadataError) }, 500);
        }
      }
      console.info('admin.member_renamed', { memberId, actorId: authData.user.id });
      return json({ member: { memberId, displayName, role: directory.role, authUserLinked: !!directory.auth_user_id } });
    }

    if (action === 'issue-code') {
      const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      if (!token) return json({ error: 'Admin session required' }, 401);
      const { data: authData, error: authError } = await adminClient.auth.getUser(token);
      if (authError || !authData.user) return json({ error: 'Invalid session' }, 401);
      const { data: profile, error: profileError } = await adminClient.from('committee_profiles').select('role,is_active').eq('user_id', authData.user.id).maybeSingle();
      if (profileError) return json({ error: 'Admin profile lookup failed', ...safeDbError(profileError) }, 500);
      if (!profile?.is_active || profile.role !== 'admin') return json({ error: 'Admin permission required' }, 403);
      const memberId = String(body.memberId || '').trim().toUpperCase();
      const { data: directory, error: directoryError } = await adminClient.from('committee_directory').select('member_id,auth_user_id,is_active').eq('member_id', memberId).maybeSingle();
      if (directoryError) return json({ error: 'Member lookup failed', ...safeDbError(directoryError) }, 500);
      if (!directory || !directory.is_active || directory.auth_user_id) return json({ error: 'Member not eligible for activation' }, 409);
      const { error: invalidateError } = await adminClient.from('committee_activation_codes').update({ used_at: new Date().toISOString() }).eq('member_id', memberId).is('used_at', null);
      if (invalidateError) return json({ error: 'Could not invalidate previous activation codes', ...safeDbError(invalidateError) }, 500);
      const code = randomCode();
      const { error: insertError } = await adminClient.from('committee_activation_codes').insert({ member_id: memberId, code_hash: await sha256(code), expires_at: new Date(Date.now() + 86400000).toISOString(), created_by: authData.user.id });
      if (insertError) return json({ error: 'Could not issue activation code', ...safeDbError(insertError) }, 500);
      return json({ memberId, activationCode: code, expiresInHours: 24 });
    }
    return json({ error: 'Unknown action', stage: 'action' }, 400);
  } catch (error) {
    console.error('committee-auth V2.27.2 unhandled error', error);
    return json({ error: 'Unexpected server error', stage: 'unhandled', details: error instanceof Error ? error.message : String(error) }, 500);
  }
});