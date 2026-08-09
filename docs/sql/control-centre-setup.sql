-- ══════════════════════════════════════════════════════════════════════════
-- GALEYR — Control Centre account setup
-- ══════════════════════════════════════════════════════════════════════════
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/lsxeernnmohrsjoqmyxo/sql/new
--
-- Safe to run before or after creating the auth user, and safe to run twice.
--
-- Creates:
--   · the public.users invitation row for xisbiga@gmail.com, role = admin
--   · the galeyr_staff record — reference CC1
--   · the staff code 1596, stored as a bcrypt hash
--
-- Does NOT create the login itself. Passwords are set in
-- Authentication → Users → Add user, by you.
-- ══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. The invitation row ────────────────────────────────────────────────
-- `handle_new_auth_user` (an existing trigger on auth.users) looks for a
-- public.users row with a matching email and a null auth_id. If it finds one it
-- adopts that row and keeps the role it was given, instead of creating a fresh
-- 'rider'. That is what makes this work without touching a password: the role
-- is decided here, the credential is created by you, and they meet on first
-- sign-in.
--
-- Stored lowercase — the trigger matches on lower(email), and keeping the table
-- consistent avoids two rows that look identical to a human.
insert into public.users (email, first_name, last_name, role, is_active)
values ('xisbiga@gmail.com', 'Control', 'Centre', 'admin', true)
on conflict (email) do update
  set role = 'admin',
      is_active = true;

-- ── 2. The staff record ──────────────────────────────────────────────────
-- CC1 rather than a person's name: this is the shared Control Centre login.
-- When individual operators get their own accounts, each gets their own
-- reference and their own code, and the audit trail starts naming people
-- instead of a desk.
insert into galeyr_staff (user_id, staff_ref, display_name, role, notes)
select u.id, 'CC1', 'Control Centre', 'admin',
       'Shared Control Centre login. Give operators individual accounts before launch.'
from public.users u
where u.email = 'xisbiga@gmail.com'
on conflict (staff_ref) do update
  set user_id = excluded.user_id,
      role    = excluded.role,
      is_active = true;

-- ── 3. The staff code ────────────────────────────────────────────────────
-- Bcrypt, cost 10. The digits exist nowhere after this statement runs — not in
-- the table, not in the application, not in any screen. `galeyr_set_staff_code`
-- would normally do this, but it requires an existing platform admin session,
-- which does not exist while running SQL as the service role.
--
-- pgcrypto lives in the `extensions` schema on Supabase, hence the qualified
-- call: an unqualified crypt() is not resolvable from every search_path.
insert into galeyr_staff_secrets (staff_id, code_hash)
select s.id, extensions.crypt('1596', extensions.gen_salt('bf', 10))
from galeyr_staff s
where s.staff_ref = 'CC1'
on conflict (staff_id) do update
  set code_hash       = excluded.code_hash,
      failed_attempts = 0,
      locked_until    = null,
      updated_at      = now();

commit;

-- ── Verify ───────────────────────────────────────────────────────────────
-- `auth_id` is null until the login is created and used for the first time.
-- Everything else should be populated immediately.
select
  s.staff_ref,
  s.display_name,
  s.role,
  s.is_active,
  u.email,
  (u.auth_id is not null)  as login_linked,
  (sec.staff_id is not null) as code_set,
  left(sec.code_hash, 7) || '…' as code_storage   -- proves it is a hash
from galeyr_staff s
left join public.users u on u.id = s.user_id
left join galeyr_staff_secrets sec on sec.staff_id = s.id
order by s.staff_ref;
