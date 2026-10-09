// signal.js — this tool's Signal read (#80, Tim 09.10.2026: every tool gets
// Signal, to one standard — docs/SIGNAL_STANDARD.md in tim3B/3bears-cockpit).
// Returns { rows, checkedAt } in the standard row shape for bears-signal.js.
// Gate: a valid @3bears.de Microsoft session for this tool. Credentials stay
// server-side; nothing secret reaches the browser. Never cached.

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (code, body) => ({ statusCode: code, headers: HEADERS, body: JSON.stringify(body) });
const today = () => new Date().toISOString().slice(0, 10);

// A tool's own check in the standard row shape: green while it works, red
// ("Data missing" / no data) when it does not.
function ownRow(code, de, en, ok) {
  const now = new Date().toISOString();
  return { feed_code: code, source_system: "tool", label_de: de, label_en: en, cadence: "daily",
           latest_date: ok ? today() : null, loaded_at: ok ? now : null, status: ok ? "fresh" : "none" };
}

async function gate(event, authUrl, authKey) {
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return reply(401, { error: "Unauthorized", rows: null, checkedAt: new Date().toISOString() });
  try {
    const u = await fetch(`${authUrl}/auth/v1/user`, { headers: { apikey: authKey, Authorization: "Bearer " + token } });
    if (!u.ok) return reply(401, { error: "Unauthorized", rows: null, checkedAt: new Date().toISOString() });
    const user = await u.json();
    if (!((user && user.email ? user.email : "").toLowerCase().endsWith("@3bears.de")))
      return reply(403, { error: "Forbidden", rows: null, checkedAt: new Date().toISOString() });
  } catch (e) {
    return reply(401, { error: "Auth check failed", rows: null, checkedAt: new Date().toISOString() });
  }
  return null;
}

// Kassenbon reads no BI feed. Its Signal shows the two things a receipt check
// needs: its database, and the AI key (GET /v1/models — no tokens used).
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  const denied = await gate(event, process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
  if (denied) return denied;
  const checkedAt = new Date().toISOString();
  let db = false, ai = false;
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE, Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE },
    });
    db = r.ok;
  } catch (e) { db = false; }
  try {
    const r = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
    });
    ai = r.ok;
  } catch (e) { ai = false; }
  return reply(200, {
    rows: [
      ownRow("kassenbon_db", "Kassenbon-Datenbank", "Kassenbon database", db),
      ownRow("ai_key", "KI-Prüfung (API-Schlüssel)", "AI receipt check (API key)", ai),
    ],
    checkedAt,
  });
};
