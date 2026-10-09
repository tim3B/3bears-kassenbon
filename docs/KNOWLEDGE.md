# Background knowledge — Kassenbon-Prüftool

Read the relevant section before working on that topic. Rules live in `CLAUDE.md`.

## Model and cost
- Production default is Claude Opus 4.8 (max accuracy, high-resolution vision) via `ANTHROPIC_MODEL`; the prototype used Haiku 4.5. `claude-sonnet-5` cuts cost at near-Opus quality. The README architecture diagram and env table still say Haiku; the code default and `docs/MAINTENANCE.md` are authoritative.
- The old v33 prototype had the API key hardcoded in client JS; it was rotated and the prototype site decommissioned. This repo supersedes it.

## Login and roles
- Entra single-tenant login through Supabase Auth (azure provider). Policy `app_users_self_insert` lets a member's `app_users` row auto-create on first login; the first admin was bootstrapped by a direct SQL insert from `auth.users`.
- Netlify's secret scan excludes `public/config.js` (public anon key, safe to expose).
- UI language: DE/EN header toggle, default EN for tim.nichols@3bears.de and DE for everyone else, remembered per browser (localStorage).

## Monthly Tally receipt export
Tally's UI downloads receipt images one page at a time, so use `scripts/download-receipts.js` (usage in its header).
1. Get a fresh submissions CSV from the Tally dashboard (the form "3Bears XXL Kassenbongewinnspiel 2026"); the image URLs in it are signed and expire, so a stale CSV makes most downloads fail.
2. `node scripts/download-receipts.js <csv> <out.zip> --from=YYYY-MM-DD --to=YYYY-MM-DD` per chunk (or `--month=YYYY-MM`). It writes a filtered CSV beside the zip; feed the zip and its CSV together into the tool's Tally tab.
3. Chunk by receipt COUNT, not calendar days: the browser loads a whole zip into memory (cap ~100 MB) and receipts average ~1 MB, so ~80 rows per chunk. Fixed 10-day windows overshoot in busy months.
4. Never patch a failed download by re-fetching under its base filename. The script renames collisions (`image (2).jpg`) and `image.jpg` recurs 8–13 times per chunk, so a base-name write plus `zip -j` overwrites an entry and silently loses a receipt. Re-run the whole chunk with the script.
5. Verify per chunk: zip entry count == filtered-CSV row count, and no zero-byte entries. A few `fetch failed` on the first pass are transient; a re-run usually clears them.
- A naive line-split CSV parse reads 3 phantom rows because of a newline inside the "Ich bestätige…" header; they carry no image URL and are skipped.
