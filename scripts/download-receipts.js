#!/usr/bin/env node
// Downloads every receipt image referenced in a Tally CSV export directly from
// their signed URLs, instead of Tally's UI which only lets you download the
// image files one page at a time. The CSV export itself already contains
// every submission in one file - only the images were the bottleneck.
//
// Usage:
//   node scripts/download-receipts.js <csv-path> [output.zip] [--month=YYYY-MM]
//   node scripts/download-receipts.js <csv-path> [output.zip] --from=YYYY-MM-DD --to=YYYY-MM-DD
//
// --month filters rows to those with "Submitted at" in that month (e.g.
// --month=2026-07 for July). --from/--to filter to a "Submitted at" date
// range (inclusive), for splitting a month into smaller chunks - the browser
// tool loads the whole ZIP into memory at once, so keep batches well under
// ~100MB / a few hundred receipts. A matching filtered CSV is written
// alongside the zip so the two can be fed into the tool's "Tally" tab together.
//
// The resulting zip can be fed straight into the tool's "Tally" tab together
// with the same CSV, exactly as before.
//
// Note: the CSV's image URLs are signed and can expire. If most downloads
// fail, re-export a fresh CSV from Tally and try again.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

function parseCSVLine(line) {
  const out = []; let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCSV(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
    return row;
  });
}

function toCSVField(value) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function writeCSV(rows, headers, outPath) {
  const lines = [headers.map(toCSVField).join(',')];
  for (const row of rows) lines.push(headers.map(h => toCSVField(row[h] || '')).join(','));
  fs.writeFileSync(outPath, lines.join('\n') + '\n');
}

function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    return decodeURIComponent(path.basename(u.pathname));
  } catch {
    return path.basename(url.split('?')[0]);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const monthArg = args.find(a => a.startsWith('--month='));
  const fromArg = args.find(a => a.startsWith('--from='));
  const toArg = args.find(a => a.startsWith('--to='));
  const month = monthArg ? monthArg.slice('--month='.length) : null;
  const from = fromArg ? fromArg.slice('--from='.length) : null;
  const to = toArg ? toArg.slice('--to='.length) : null;
  const [csvPath, outZipArg] = args.filter(a => !a.startsWith('--'));
  if (!csvPath || (month && (from || to))) {
    console.error('Usage: node scripts/download-receipts.js <csv-path> [output.zip] [--month=YYYY-MM | --from=YYYY-MM-DD --to=YYYY-MM-DD]');
    process.exit(1);
  }

  const allRows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
  if (!allRows.length) { console.error('CSV is empty or unreadable.'); process.exit(1); }
  const headers = Object.keys(allRows[0]);

  const label = month || (from || to ? `${from || '...'}_to_${to || '...'}` : null);
  const rows = month
    ? allRows.filter(r => (r['Submitted at'] || '').startsWith(month))
    : (from || to)
    ? allRows.filter(r => {
        const d = (r['Submitted at'] || '').slice(0, 10);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
    : allRows;
  if (label) console.log(`Filtered to ${rows.length} of ${allRows.length} rows submitted in ${label}.`);
  if (!rows.length) { console.error('No rows match the given date filter.'); process.exit(1); }

  const urlCol = Object.keys(rows[0]).find(k => k.toLowerCase().includes('kassenbon')) || 'Kassenbon hochladen';
  const base = outZipArg || `receipts-${path.basename(csvPath, path.extname(csvPath))}${label ? `-${label}` : ''}.zip`;
  const outZip = path.resolve(base);
  if (label) {
    const outCsv = outZip.replace(/\.zip$/i, '.csv');
    writeCSV(rows, headers, outCsv);
    console.log(`Wrote filtered CSV ${outCsv}`);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kassenbon-'));
  const usedNames = new Map();
  let ok = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const url = row[urlCol];
    if (!url) { skipped++; continue; }

    let name = filenameFromUrl(url);
    const seenCount = usedNames.get(name) || 0;
    usedNames.set(name, seenCount + 1);
    if (seenCount > 0) {
      const ext = path.extname(name);
      name = `${name.slice(0, -ext.length || undefined)} (${seenCount + 1})${ext}`;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(tmpDir, name), buf);
      ok++;
    } catch (e) {
      failed++;
      console.error(`FAILED: ${name} (${row['Vorname'] || ''} ${row['Nachname'] || ''}) - ${e.message}`);
    }
  }

  console.log(`Downloaded ${ok}, skipped ${skipped} (no image URL), failed ${failed} of ${rows.length} rows.`);
  if (ok === 0) {
    console.error('Nothing downloaded - not writing a zip.');
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.exit(1);
  }

  fs.rmSync(outZip, { force: true });
  const files = fs.readdirSync(tmpDir);
  execFileSync('zip', ['-j', '-q', outZip, ...files.map(f => path.join(tmpDir, f))]);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`Wrote ${outZip}`);
}

main();
