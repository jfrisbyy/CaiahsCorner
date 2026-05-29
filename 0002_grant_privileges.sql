-- ============================================================================
-- PATCH 0002 — grant table privileges to anon/authenticated
-- ----------------------------------------------------------------------------
-- WHY: 0001 created RLS *policies*, but in Postgres a role also needs the
-- underlying GRANT or every request fails with:
--   "permission denied for table … (code 42501)"
--
-- Run this whole file once in the Supabase SQL editor. Idempotent & safe.
-- (Already folded into 0001_init.sql for fresh setups — this is just the
--  catch-up for a project where 0001 already ran.)
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on all tables in schema public
  to anon, authenticated;

grant usage, select
  on all sequences in schema public
  to anon, authenticated;

-- make future tables/sequences inherit the same access automatically
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
