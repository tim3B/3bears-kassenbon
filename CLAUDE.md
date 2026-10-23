# 3bears-kassenbon

@HOUSE_RULES.md

## Rules from past sessions

Background knowledge per topic — read the relevant section before working on it: `docs/KNOWLEDGE.md`.

- The Anthropic key stays server-side (`verify-receipt` function, Netlify env); never put it in the browser or `public/config.js`.
- The verify prompt is built at runtime from the config tables (`retailers`, `products`, `training_examples`); never hardcode retailers or product spellings. "Training" is dictionary + few-shot, not fine-tuning.
- Supabase auto-expose is OFF: every new table or view needs explicit grants. Edits to config tables stay admin-only (`is_admin()`); promoting a user to admin is SQL-only.
- Every new UI string needs DE and EN. Stored data (incl. the verdict values in export cells) and the AI prompt stay German. Excel export headers and sheet name follow the chosen language (house rule, Tim 12.10.2026); the Merge tab reads exports by column position, so keep the column order fixed.
- Monthly Tally export: chunk by receipt COUNT (~80 rows, zip well under ~100 MB), never patch a failed download by re-fetching under its base filename, and check zip entries == CSV rows (details in KNOWLEDGE).

## 3Bears Backlog — task rules (all sessions)

Tim's work is tracked as issues in **tim3B/3bears-backlog** (full rules: that repo's `CLAUDE.md`).
When a session works a backlog task:

1. Read the issue and all its comments first — the issue is the brief. Post this session's link on it.
2. **Change only what the task says.** Treat everything else in this tool as correct. If anything else
   would need to change, stop and ask on the issue.
3. Work on a `claude/` branch, one commit per change; the PR says `Closes tim3B/3bears-backlog#<n>`.
4. Never touch live data while testing.
5. A change to a **figure, a calculation or a data flow** never goes live without Tim's `ship` label.
6. Finish with one short comment on the issue: what changed, how it was tested, the link, how to undo it.

## Session titles: label every session with its topic
Tim, 23.10.2026: every Claude Code session (local or cloud) starts its title with the topic it belongs to, e.g. "Cockpit: no step change at month close (backlog #263)".
- As soon as the topic is clear, rename the session to `<Topic>: <short task>`, adding the backlog/issue/PR number when there is one. Re-title if the scope clearly changes.
- `<Topic>` matches the Code-tab sidebar sections: Cockpit, eCom tool, Order intake, BI, AI Hub, Ops tool, Sales tool, Tool ideas, Influencer tool, Customer Success tool, Retention, SEO, Subscriptions, Shopify B2B, Personal.
- Repo → topic: 3bears-cockpit → Cockpit, 3bears-ecom-forecast → eCom tool, 3bears-order-intake → Order intake, 3bears-bi → BI, 3bears-b2b → Shopify B2B, 3bears-subscriptions → Subscriptions, 3bears-organic-seo → SEO, 3bears-sales-tool → Sales tool, 3bears-ai-hub → AI Hub. In 3bears-backlog, use the topic of the tool the item is about. Any other repo: use the repo's short name (e.g. "Fulfilment:").
