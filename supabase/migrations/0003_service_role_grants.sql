-- 0003 — Fix: "Konfiguration konnte nicht geladen werden: Supabase 403"
--
-- netlify/functions/verify-receipt.js builds the Claude prompt by reading the
-- config tables with the SERVICE_ROLE key. service_role bypasses RLS but NOT
-- table GRANTs — and auto-expose was disabled at project creation, so 0001
-- granted privileges to `authenticated` only. Every read therefore failed with
-- 42501 (→ HTTP 403 from PostgREST), the prompt was never built, and every
-- submission fell through to "Prüfung fehlgeschlagen / Abgelehnt".
--
-- Least privilege: read-only, and only the three tables the function reads.
-- The function never writes; the browser writes receipts as `authenticated`.

grant usage on schema public to service_role;

grant select on
  public.retailers,
  public.products,
  public.training_examples
to service_role;

-- ---------------------------------------------------------------------------
-- Verification — all three rows must read OK.
-- ---------------------------------------------------------------------------
select
  t.tbl,
  has_schema_privilege('service_role', 'public', 'USAGE') as schema_usage,
  has_table_privilege('service_role', t.tbl, 'SELECT')    as can_read,
  case
    when has_schema_privilege('service_role', 'public', 'USAGE')
     and has_table_privilege('service_role', t.tbl, 'SELECT')
    then 'OK' else 'FAIL'
  end as status
from (values
  ('public.retailers'),
  ('public.products'),
  ('public.training_examples')
) as t(tbl);
