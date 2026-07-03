# 3Bears Kassenbon-Prüftool — Production

Receipt-verification tool for the 3Bears Gewinnspiel. Team uploads receipts (Tally
export, email attachments, or manual), Claude OCR-checks each one against the eligible
retailers + 3Bears products, results are stored in Supabase with a full audit trail.

> **🟢 Live:** https://kassenbon-tool.netlify.app · deploys automatically from `main`.
> Supersedes the old v33 prototype (decommissioned).

**Documentation**
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — for the team using the tool
- [docs/MAINTENANCE.md](docs/MAINTENANCE.md) — admin & ops runbook (deploys, env vars, admins, keys, troubleshooting)
- This README — first-time setup (below)

Production hardening vs. the v33 prototype:
- **No API key in the browser** — Claude is called only via the `verify-receipt` Netlify Function.
- **Entra (Microsoft) login** — only signed-in 3Bears users can open the tool or spend API credit.
- **Supabase data layer** — receipts + dedup + audit live in Postgres (RLS-locked), not `localStorage`.
- **Self-service training** — admins add new retailers / product spellings in the app; the prompt is built from those tables at runtime.

## Architecture
```
Browser (public/index.html)  --Entra login-->  Supabase Auth
        |  Bearer <supabase jwt>
        v
Netlify Function verify-receipt  --validates jwt, reads config (service_role)-->  Supabase
        |  ANTHROPIC_API_KEY (server-only)
        v
    Claude (Haiku 4.5)
```

## One-time setup

### 1. Supabase project (`kassenbon-tool`, EU region)
Run the migrations against the new project (SQL Editor → paste, or CLI):
- `supabase/migrations/0001_init.sql` — schema, RLS, grants
- `supabase/migrations/0002_seed.sql` — retailers + products ported from the v33 prompt

> Note: Edge Function deploys are **not** used here (avoids the Supabase-CLI keychain issue).
> Running SQL in the dashboard SQL Editor is fine and doesn't need the CLI.

### 2. Entra (Azure AD) app registration
Azure Portal → App registrations → New registration:
- Redirect URI (Web): `https://<your-netlify-site>.netlify.app` **and** the Supabase
  callback `https://<ref>.supabase.co/auth/v1/callback`
- API permissions: `openid`, `email`, `profile`
- Create a client secret.

Then in Supabase → Authentication → Providers → **Azure**: paste the Application (client) ID,
client secret, and set the Azure Tenant URL. Enable the provider.

### 3. Netlify env vars (Site settings → Environment variables)
| Var | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | the **rotated** Claude key (revoke the old exposed one!) |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` (optional) |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE` | service_role key (Settings → API) |

### 4. Frontend config
Edit `public/config.js` with the **Project URL** and **anon key** (Settings → API).

### 5. Make yourself admin
After your first login (which creates your `app_users` row), run in SQL Editor:
```sql
update public.app_users set role = 'admin' where email = 'tim.nichols@3bears.de';
```
The "Stammdaten & Training" tab then appears for you.

## Deploy
Connect this repo to Netlify (build not required — static `public/` + functions). Publish
dir `public`, functions dir `netlify/functions` (already in `netlify.toml`).

## Local preview
`python3 -m http.server 8888 --directory public` — the login gate shows; full flow needs the
deployed Netlify Function + real Supabase config.

## Teaching it a new receipt (for the team)
Admin → **Stammdaten & Training** tab → add the retailer (with OCR variants) and/or the
product spelling exactly as it prints on the Bon. Takes effect on the next check — no code change.
```
