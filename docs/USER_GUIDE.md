# Kassenbon-Prüftool — Team User Guide

The Kassenbon-Prüftool checks receipt submissions for the 3Bears Gewinnspiel. It reads
each receipt with AI, decides whether it qualifies, removes duplicates, and stores every
result centrally with an audit trail.

**Live tool:** https://kassenbon-tool.netlify.app

---

## Signing in

Open the link and click **Sign in with Microsoft / Mit Microsoft anmelden**, then use your
3Bears (Microsoft 365) account. No separate password — it's your normal work login.

Only signed-in 3Bears users can open the tool.

## Language

Top-right there's a **DE / EN** toggle. It switches the whole interface and remembers your
choice on that browser. (Receipt data and Excel exports stay in German.)

---

## The four working tabs

### 1. Tally-Prüfung / Tally Check — the main workflow
For submissions collected via the Tally form.
1. Export the **CSV** (submissions) and the **ZIP** of receipt images from Tally.
2. Upload the CSV on the left, the ZIP on the right.
3. Leave **"Skip already-checked submissions"** ticked so re-runs don't re-check (or re-bill)
   receipts already processed.
4. Click **Start check**. Each receipt is checked in turn; results appear live with a status:
   - **Approved (AI)** — valid receipt from an eligible retailer
   - **Approved (Manual)** — imported from an existing Excel
   - **Rejected** — not a receipt / ineligible place / unreadable (reason shown)
   - **Duplicate** — same retailer + date + total already seen
   - **Already checked** — skipped because it was processed before
5. Use **Export Excel** for a copy of the results.

### 2. E-Mail Import / Email Import
For receipts that arrive by email instead of the form.
1. Save the receipt images/PDFs and upload them here.
2. Type each participant's first name, last name and email.
3. Click **Check all**.

### 3. Excel Import
Bring an older tracking spreadsheet into the system. Every row is imported as
**Approved (Manual)**; incomplete email addresses are flagged. Use this once to bring
historical entries into the central database.

### 4. Zusammenführen / Merge
Combine several exported result files into one master Excel, with duplicates removed.

---

## Teaching the tool new receipts (admins only)

If a new supermarket runs the promotion, or a product prints in a new way that the AI misses,
an admin can teach it in the **Stammdaten & Training / Master Data & Training** tab — no
developer needed. Changes take effect on the next check.

- **Add new retailer:** the display name (e.g. `Combi`), its OCR variants (how the till
  might mis-spell it, comma-separated), and whether it's eligible for the promotion.
- **Add new product / receipt spelling:** the clean product name, the retailer it belongs to
  (or "General" for all), and the exact strings as they print on the receipt (comma-separated).

The "Current master data" section lists everything the AI currently recognises.

> This is not model training in the technical sense — the tool builds the AI's instructions
> live from these lists, so a new entry is used immediately.

---

## Good to know

- **Duplicates** are detected by *retailer + date + total*, so the same receipt submitted twice
  is caught even across different people.
- Blurry, dark, folded, or app-screenshot receipts are usually still accepted — the tool is
  deliberately lenient and only rejects when it's sure.
- Every check is saved centrally (who checked it, when, the verdict), so the team shares one
  consistent dataset instead of separate spreadsheets.
- The **version number** next to the title (e.g. `v1.1.0`) opens the **changelog** — what
  changed in each release.

Questions or a receipt that was judged wrongly? Flag it to Tim.
