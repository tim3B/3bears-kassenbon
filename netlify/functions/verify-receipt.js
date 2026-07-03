// Secure server-side proxy for receipt verification.
// - Holds the Anthropic key (never shipped to the browser).
// - Requires a valid Supabase (Entra) session — no anonymous spend.
// - Builds the Claude prompt at runtime from the Supabase config tables,
//   so admins can teach it new retailers/products without a code change.
//
// Env vars (set in Netlify → Site settings → Environment variables):
//   ANTHROPIC_API_KEY      - the (rotated) Claude key
//   SUPABASE_URL           - https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE  - service_role key (server-only; bypasses RLS to read config)
//   ANTHROPIC_MODEL        - optional, defaults to claude-haiku-4-5-20251001

// Most accurate widely-available OCR model (high-resolution vision). Override per-deploy
// with the ANTHROPIC_MODEL env var (e.g. 'claude-sonnet-5' to cut cost at near-Opus quality).
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  // --- 1. Authenticate the caller (Supabase JWT from the logged-in Entra user) ---
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(401, { error: 'Nicht angemeldet' });

  const user = await getSupabaseUser(token);
  if (!user) return json(401, { error: 'Sitzung ungültig oder abgelaufen' });

  // --- 2. Parse request ---
  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Ungültige Anfrage' }); }
  const { base64, mediaType } = payload;
  if (!base64 || !mediaType) return json(400, { error: 'Kein Bild übermittelt' });

  // --- 3. Build the prompt from live config ---
  let prompt;
  try { prompt = await buildPrompt(); }
  catch (e) { return json(500, { error: 'Konfiguration konnte nicht geladen werden: ' + e.message }); }

  const contentBlock = mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image',    source: { type: 'base64', media_type: mediaType,          data: base64 } };

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: prompt }] }],
  });

  // --- 4. Call Claude with retry on rate limits ---
  const MAX_RETRIES = 4;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body,
    });
    const d = await resp.json();
    if (d.error) {
      if (d.error.type === 'rate_limit_error' && attempt < MAX_RETRIES - 1) {
        await sleep((attempt + 1) * 15000);
        continue;
      }
      return json(502, { error: d.error.type + ': ' + d.error.message });
    }
    const text = d.content?.[0]?.text || '{}';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch { parsed = { retailer: '–', date: '–', total: '–', products: [{ name: 'Fehler', price: '–' }], found: false, verdict: 'Abgelehnt', fingerprint: '' }; }
    return json(200, parsed);
  }
  return json(502, { error: 'Maximale Wiederholungsversuche erreicht' });
};

// --- Supabase helpers (REST; no SDK needed in the function) ---
async function getSupabaseUser(token) {
  try {
    const resp = await fetch(process.env.SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE, Authorization: 'Bearer ' + token },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

async function sbSelect(path) {
  const resp = await fetch(process.env.SUPABASE_URL + '/rest/v1/' + path, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE,
    },
  });
  if (!resp.ok) throw new Error('Supabase ' + resp.status);
  return await resp.json();
}

// Assemble the German verification prompt from retailers/products/training_examples.
async function buildPrompt() {
  const [retailers, products, examples] = await Promise.all([
    sbSelect('retailers?select=name,aliases,eligible&order=name'),
    sbSelect('products?select=canonical_name,variants,active,retailer_id,retailers(name)&active=eq.true'),
    sbSelect('training_examples?select=note,correct_retailer,correct_products&order=created_at.desc&limit=25'),
  ]);

  const eligible = retailers.filter(r => r.eligible);
  const retailerLines = retailers.map(r =>
    `- ${(r.aliases || []).join(', ')} → ${r.name}${r.eligible ? '' : ' (NICHT teilnahmeberechtigt)'}`
  ).join('\n');

  // Group products by retailer name (or "Allgemein").
  const byRetailer = {};
  for (const p of products) {
    const key = p.retailers?.name || 'Allgemein';
    (byRetailer[key] = byRetailer[key] || []).push(`${p.canonical_name}: ${(p.variants || []).join(', ')}`);
  }
  const productLines = Object.entries(byRetailer)
    .map(([ret, lines]) => `${ret}:\n${lines.map(l => '  ' + l).join('\n')}`).join('\n\n');

  const exampleLines = (examples || [])
    .filter(e => e.note || e.correct_retailer)
    .map(e => `- ${e.note || ''}${e.correct_retailer ? ' → Händler: ' + e.correct_retailer : ''}`)
    .join('\n');

  return `Du prüfst einen Kassenbon für ein Gewinnspiel.
Antworte NUR mit einem JSON-Objekt (kein Markdown):
{"retailer":"Händlername","date":"TT.MM.JJJJ","total":"12,99 €","products":[{"name":"Produktname","price":"4,99 €"}],"found":true,"verdict":"Genehmigt oder Abgelehnt","reason":"nur bei Abgelehnt","fingerprint":"retailer|date|total"}

GRUNDPRINZIP: Der Standardfall ist GENEHMIGT. Lehne NUR ab wenn du dir absolut sicher bist, dass etwas grundlegend falsch ist.

HÄNDLERERKENNUNG — häufige OCR-Fehler, die korrekt interpretiert werden müssen:
${retailerLines}
- Bauer Markt, Bauernmarkt → wenn deutschsprachiger Supermarkt → Genehmigt

GENEHMIGT — in allen diesen Fällen:
- Kassenbon eines deutschen oder österreichischen Lebensmittelhändlers oder Drogeriemarkts
- Auch wenn das Bild unscharf, dunkel, abgeschnitten, gefaltet oder schwer lesbar ist
- Auch wenn kein 3Bears Produkt eindeutig erkennbar ist — der Bon vom richtigen Händler reicht
- Auch wenn der Produktname abgekürzt, abgeschnitten oder nur teilweise lesbar ist
- Auch wenn kein Datum vorhanden ist (date="Unbekannt")
- eBons, digitale Bons, App-Screenshots, Netto Plus App — alle gültig
- Thermobons, Globus-Bons, schlecht gedruckte Bons — alle gültig
- Wenn irgendwo "3B", "3Bear", "OAT BAR", "OVERNIGHT", "BLUEY", "PORRIDGE" o.ä. zu erkennen ist → Genehmigt

ABGELEHNT — NUR in diesen 3 Fällen, und nur wenn du dir 100% sicher bist:
1. Das Bild ist eindeutig KEIN Kassenbon (Selfie, leere Seite, Website-Screenshot, Produktfoto ohne Bon)
2. Der Bon stammt eindeutig von einem nicht teilnahmeberechtigten Ort (Restaurant, Tankstelle, Online-Shop wie Amazon/Zalando, Apotheke)
3. Das Bild ist vollständig schwarz, weiß oder unleserlich — keinerlei Bon-Struktur erkennbar

PRODUKTERKENNUNG — WICHTIG: Trage im products-Array NUR 3Bears Produkte ein, KEINE anderen Artikel.
Wenn ein 3Bears Produkt erkannt wurde, gib nur dieses an. Wenn kein 3Bears Produkt lesbar ist aber der Bon gültig ist, verwende: {"name":"Produkt nicht lesbar","price":"–"}

Diese Strings auf dem Bon sind alle 3Bears Produkte:

${productLines}

FUZZY: Jede Zeile mit "OAT BAR", "3BEARS OAT", "3BEARS OVERNIGHT", "3BEARS X SALLY", "3BEARS X SHELLY", "3B.", "3Bea.", "3Bear" ist automatisch ein 3Bears Produkt. OVERNIGHT + Flavour bei REWE immer 3Bears. Coupon-Zeilen wie "3bears Overn" beweisen den Kauf.
${exampleLines ? '\nVOM TEAM GELERNTE KORREKTUREN:\n' + exampleLines + '\n' : ''}
WICHTIG: Wenn kein 3Bears Produkt erkannt wurde aber der Bon von einem gültigen Händler stammt → verdict=Genehmigt, products=[{"name":"Produkt nicht lesbar","price":"–"}]. Nur bei den 3 Ablehnungsgründen oben → verdict=Abgelehnt.
NIEMALS wegen Namensähnlichkeit ablehnen. Duplikate nur per Fingerprint (retailer|date|total).
NIEMALS andere Produkte (Kinder Pingui, Haribo, Milch usw.) in das products-Array aufnehmen — NUR 3Bears Produkte.`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
