# 3Bears house rules

These rules apply to every Claude session on any 3Bears tool. This file is the same in every repo;
change it in tim3B/3bears-backlog first, then copy it. The repo's own CLAUDE.md adds tool-specific rules.

## Working with Tim
- Short replies, one step at a time. Answer the question asked, then offer the next step in one line.
- Complete first time: before sending, ask "what will Tim ask next?" and include it compactly
  (status, names, what is missing, who does what, what is next). Complete does not mean long.
- If Tim repeats a question, the last answer failed. Lead with the direct answer, then stop.
- The first brief sets the scope. A goal Tim restates mid-task is a check on what you are building, not a
  new task. Do not widen the deliverable and do not tack on offers or caveats.
- 20|10 (20m revenue, 10% EBITDA) is the strategy: the vision and goal. The plan built on it holds the actual
  targets, which differ year by year. Never treat 20|10 as a plan target. Its horizon may move out to end
  2028 (under review).
- Build only what was asked. On a chart, the series Tim lists are the whole spec: no bands, markers or notes
  he did not ask for. Explain in the text, not on the plot. A chart he cannot read is a failed chart: fix it.
- Simple beats complete: fewest inputs, no jargon on screen ("cost per new customer", not CAC), one visible
  sanity check instead of many badges. Prefer an app constant to a new DB column.
- When Tim points at a file, that file is the input. Read it first and keep all his edits. Never regenerate
  it from your own earlier version, and never delete, overwrite or rename it. Deliver new files under new names.
- Investigate before asking. Given an order number, screenshot or record, look it up yourself. Before asking
  for any input, check the repo docs, open branches and issues; it may already be there.
- If a source column or key is missing (SKU, EAN, date, channel), tell Tim exactly what you need and ask if
  the report can add it. KLAR, Minubo and Xentral exports are flexible. Never build fuzzy-match workarounds first.
- Only list a manual step for Tim if it truly needs his own login or dashboard; generate or default the rest.
  Keep one stable delivery process: don't change how Tim deploys or what he clicks from task to task.
- Handovers say the exact click path, order and expected result. Never hand Tim a decision tree to interpret.
- Never suggest Slack (3Bears does not use it) or any tool not already in use unless Tim names it.
  There is no IT department: Tim is IT. Alerts belong inside the tool where the decision is made.

## Verifying
- Verify by comparing, not by plausibility. State the authoritative figure and the new figure, row by row,
  and show they match. "Renders", "non-zero" or "looks about right" is not verified.
- If the data to settle a question is reachable (Supabase, KLAR actuals, a backup), query it before
  claiming anything. A limit, ceiling or threshold is always a lookup, never a guess.
- When Tim points at a figure, read the code that builds that figure end to end before answering. Never write
  a size ("marginally", "slightly") you have not computed. "Expected behaviour" is a conclusion that needs proof.
- Follow the agreed rules, not the code. Work the answer out from the business rules first, then compare the
  code and screens to it. Any difference is a defect, not a second answer.
- Audits: consistent code, comments, tests and docs can still be wrong. For each headline figure ask
  "what would make this move?" and make it move in a test.
- A test or guard only counts if you have seen it fail. Every "it's fine" must be a measurement: a skipped step,
  a missed schedule and a missing credential all exit 0.
- Check links, paths and commands before sending them. Never report a check you did not do.
- Speed: a page is only "fast" after a first-hit, full-page-load measurement on the live site. Those checks
  need Tim's Chrome and run locally afterwards; until then say "not verified".

## Changing things
- Change only what the task says. Never modify, restyle, relabel, tidy or "improve" anything else in a live
  tool, even if it is better. If you spot a problem elsewhere, report it as a backlog task.
- Never change a tool someone else uses (e.g. Katha's planning tool, Belen's screens, Ops tools) until Tim has
  seen the exact change and said go for that tool. If you wrote "this is X's call", the task waits until X is asked.
- New sources run alongside the old ones. Never switch off, repoint or delete an existing source until a
  side-by-side reconciliation (old vs new, per month or product) is shown and Tim says go.
- Before running a pipeline script, check the docs for the agreed one. Where `_daily`, `_v2` or dated
  versions exist, the newer documented path wins.
- When a fact is retired, fix every headline that is read without the body: file names, doc titles, the first
  paragraph of code comments, findings tables. Search all repos that use it.

## Git and delivery
- All code lives on GitHub under tim3B. Work happens in cloud sessions by default.
- Edit files only in the cloned repo with git (edit, commit, push, PR). Never write files via GitHub file APIs.
- Stage files by name. Never `git add -A`, `git add .` or `git commit -am`.
- Standing authority: commit, push, open PRs and merge yourself once tests, build and CI are green. Never ask,
  and never hand Tim a command to run that you can run yourself. If `gh` is missing, merge with plain git.
  Exceptions: figure changes wait for Tim's `ship`; never force-push main, hard-reset or delete shared branches.
- If a check fails, don't merge and don't ask: report what broke and the fix. A timed-out CI job shows "cancelled".
- Add follow-up tasks and bugs you find to tim3B/3bears-backlog directly; never ask Tim first. Make them
  fire-ready: outcome, what Claude will do, what will not change, size, risk and undo, what Tim gets back.
  Never re-list an old long-running topic unless it has a new, agreed approach. Never add `go` or `ship` labels.
- Models: Sonnet for light work, Opus for figures and logic. Fable only when Tim says so for that task.

## Tools and estate
| Tool | Repo (tim3B) | Live site |
|---|---|---|
| Cockpit | 3bears-cockpit | 3bears-cockpit.netlify.app |
| eCom forecast | 3bears-ecom-forecast | 3b-ecom-tool.netlify.app (name differs from repo) |
| Order intake | 3bears-order-intake | order-intake-tool.netlify.app |
| BI (ingest, shared data) | 3bears-bi | |
| AI Hub | 3bears-ai-hub | |
| Sales tool | 3bears-sales-tool | 3bears-sales-tool.netlify.app |
| Ops tool | 3bears-planning-tool, 3bears-kassenbon, Xentral-Runrates-Export-Tool | 3b-planning.netlify.app, kassenbon-tool.netlify.app |
| Influencer tool | giftcard-run, plus a repo and Supabase outside tim3B (migration = backlog #71) | |
| Tool ideas | 3bears-fulfilment and new ideas | |
| Customer Success tool | idea only, no repo | |

- Never ask Tim for a tool's URL. Sites are behind Microsoft sign-in, so a bare request gets a redirect to
  `/sign-in`; that is not a failure. `/api/health` shows a site is up.
- Hosting: Netlify. Login: Microsoft 365 / Entra ID ("Sign in with Microsoft", @3bears.de only), never Google.
  Data store: Supabase. No new external API without Tim's approval.
- The AI Hub is the company register of tools and data: check it before building something a tool may already
  do. The phrase "key data" is banned.

## Data and Supabase
- 3bears-bi is the shared data layer (dim, fact, assumptions). Master data (products, customers, outlets) is
  mirrored from its owning system (Xentral, DATEV), never authored in Supabase. Facts are append-only.
- Product units, revenue and margin come only from the views `v_product_units_daily` / `_weekly` / `_monthly`
  and `v_ecom_product_margin_daily`. No tool loads raw KLAR or Minubo product exports. KLAR = eCom, Minubo = retail.
- Ingest: the only manual step is someone dropping an export into its OneDrive folder. GitHub Actions does the rest.
- Never gate work on the clock (scheduled runs arrive late or not at all). Gate on how old the data is.
- An unbounded Supabase select returns at most 1,000 rows with no error. Page every read whose size depends
  on the data, with a stable ORDER BY, including throwaway check scripts.
- Cockpit and eCom: migrations apply themselves on merge (apply-migrations workflow). Never hand Tim SQL to
  paste there. After each merge, check the workflow run and probe the live object; a later migration can
  silently undo an earlier one. Other repos have no such workflow yet: follow that repo's CLAUDE.md.
- Supabase projects can't join each other. Don't touch Linda's projects or Katha's Ops-Planning project
  without Tim; their apps write with the public key, so locking them down breaks them.

## Excel
- Tim uses Excel for Mac with German settings: formulas use `;` separators. Never send Windows click paths.
  Best: point him to a working formula in the same workbook to copy and adapt.
- Power Query on Mac cannot keep a Web/JSON source refreshing. Feed workbooks via OData or a file in
  SharePoint. Prefer Basic auth to a header written into the query.
- Never save a workbook that holds a Power Query through openpyxl; it wipes the query. openpyxl comments make
  Mac Excel ask to repair, and text starting with `=`, `+`, `-` or `@` becomes a formula.

## Pay data and secrets
- Company rule: individual pay (any salary, bonus or allowance for a named or identifiable person, or any team
  figure covering fewer than 3 people, e.g. managing-director salary account 6027, which covers 2 people) must
  never be written into a repo, file, PR, issue, artifact or message to any service. Aggregate payroll lines are fine.
  Test pay features with counts and masking checks, never real values.
- Secrets never go into a repo. They live in GitHub Actions secrets or the cloud environment settings,
  entered by Tim. Never paste a secret into chat, an issue or a PR.
