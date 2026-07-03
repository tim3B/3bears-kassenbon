# Kassenbon-Prüftool — Admin & Maintenance Runbook

Operational reference for whoever maintains the tool. For how to *use* it, see
[USER_GUIDE.md](USER_GUIDE.md); for first-time setup, see [../README.md](../README.md).

## At a glance

| Thing | Value |
|---|---|
| Live URL | https://kassenbon-tool.netlify.app |
| Hosting | Netlify (site `kassenbon-tool`), auto-deploys from GitHub on push to `main` |
| Repo | https://github.com/tim3B/3bears-kassenbon |
| Database / Auth | Supabase project `fsutpvwurmsraupxacvy` (EU region) |
| Login | Microsoft / Entra (Azure provider in Supabase Auth) |
| AI model | Claude Opus 4.8 (set via `ANTHROPIC_MODEL` env var; default in code) |
| Predecessor | v33 prototype Netlify site — **decommissioned** |

## How it fits together

```
Browser (public/index.html)  --Microsoft/Entra login-->  Supabase Auth
   |  Bearer <supabase session token>
   v
Netlify Function verify-receipt.js  --validates session, reads config-->  Supabase (RLS)
   |  ANTHROPIC_API_KEY (server-side only)
   v
Claude (Opus 4.8) -> verdict JSON
```
The Anthropic key never reaches the browser. The prompt is assembled at request time from the
`retailers` / `products` config tables, so the "training" tab changes behaviour without a deploy.

## Deploying a change

1. Edit code locally in `~/Desktop/3bears-kassenbon`.
2. `git commit` then `git push` — Netlify builds and publishes automatically.
3. Bump `APP_VERSION` in `public/index.html` and add a `CHANGELOG` entry for anything
   user-visible.

## Common admin tasks

**Make someone an admin** (grants the Stammdaten & Training tab). They must have logged in once
first. In Supabase → SQL Editor:
```sql
update public.app_users set role='admin' where email='<their-email>@3bears.de';
```
They hard-refresh (Cmd+Shift+R) to see the change.

**Add retailers / products** — do it in the app's Stammdaten & Training tab (no SQL needed).

**Change the AI model** — set the Netlify env var `ANTHROPIC_MODEL`
(`claude-opus-4-8` = most accurate; `claude-sonnet-5` = cheaper, near-Opus), then redeploy.

**Rotate the Anthropic key** — create a new key in the Anthropic Console, update the Netlify
env var `ANTHROPIC_API_KEY`, redeploy, then revoke the old key.

## Environment variables (Netlify → Site configuration → Environment variables)

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude key — **server-side only, never in the repo** |
| `ANTHROPIC_MODEL` | Model id (optional; code defaults to `claude-opus-4-8`) |
| `SUPABASE_URL` | `https://fsutpvwurmsraupxacvy.supabase.co` |
| `SUPABASE_SERVICE_ROLE` | service_role key — server-side only; lets the function read config + validate sessions |

Public Supabase URL + anon key live in `public/config.js` (safe to expose; that file is
excluded from Netlify secret scanning in `netlify.toml`).

## Security model

- **Auth:** only signed-in Entra users can load the app or call the verify function.
- **RLS:** every table has Row-Level Security. Any authenticated user can read/write receipts;
  only admins can edit the retailer/product config; users can create their own `app_users`
  row as a `member` (policy `app_users_self_insert`) — role escalation to admin is SQL-only.
- **Keys:** the Anthropic + service_role keys exist only as Netlify env vars, never in git.

## Data

- `receipts` + `receipt_products` — every checked receipt with verdict, reason, and audit
  fields (`checked_by`, `checked_at`).
- `retailers` / `products` / `training_examples` — the config that drives the AI prompt.
- `app_users` — user roles (member / admin).
- Schema + seed: `supabase/migrations/0001_init.sql`, `0002_seed.sql`.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Login bounces to `localhost` | Supabase → Auth → URL Configuration: Site URL must be the Netlify URL |
| Admin tab missing after granting | User must have logged in once (creates their row); then run the admin `update`; hard-refresh |
| Deploy fails "Exposed secrets detected" | A real secret leaked into a committed file — check it's not the service_role/Anthropic key; public config is already whitelisted in `netlify.toml` |
| "Session expired" / not signed in | Sign out and back in |
| A receipt judged wrongly | Add the retailer/product spelling in the training tab; re-run |
