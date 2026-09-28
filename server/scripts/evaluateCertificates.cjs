// Run locally with a private JSON manifest; never adds personnel documents to tests.
// node scripts/evaluateCertificates.cjs <manifest.json> <output-directory> <stage> [split]
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { readCertificateText } = require('../services/certificates/certificateTextReader');
const { parseCertificateFields } = require('../services/certificates/certificateFieldParser');

const normalized = value => typeof value === 'string'
  ? value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') : value;

async function main() {
  const [manifestPath, directory, stage, split] = process.argv.slice(2);
  if (!manifestPath || !directory || !/^[a-z0-9-]+$/i.test(stage || '')) throw new Error('Usage: <manifest.json> <output-directory> <stage> [split]');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const groups = new Map();
  for (const item of manifest) {
    if (groups.has(item.group) && groups.get(item.group) !== item.split) throw new Error('Document group crosses evaluation splits');
    groups.set(item.group, item.split);
  }
  await fs.mkdir(directory, { recursive: true });
  const results = [];
  for (const item of manifest.filter(item => !split || item.split === split)) {
    const start = Date.now();
    try {
      const buffer = await fs.readFile(item.path);
      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      const cachePath = path.join(directory, `${item.id}-ocr.json`);
      let cache;
      try { cache = JSON.parse(await fs.readFile(cachePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (cache && cache.sha256 !== sha256) throw new Error('Source differs from cached extraction');
      if (!cache) {
        cache = { sha256, extraction: await readCertificateText({ buffer, originalname: path.basename(item.path), mimetype: 'image/jpeg' }) };
        await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
      }
      const parsed = parseCertificateFields(cache.extraction);
      const checks = Object.fromEntries(Object.entries(item.expected).map(([key, value]) => [key,
        key === 'restriction' ? parsed.limitations.some(text => /engine\s+not\s+included/i.test(text)) === value
          : normalized(parsed[key]) === normalized(value)]));
      results.push({ id: item.id, group: item.group, split: item.split, checks, parsed });
      console.log(`Document ${item.id}: ${Date.now() - start} ms`);
    } catch (error) {
      // Failed inputs stay in denominators; error messages may contain private paths.
      results.push({ id: item.id, group: item.group, split: item.split, error: error.message,
        checks: Object.fromEntries(Object.keys(item.expected).map(key => [key, false])) });
      console.log(`Document ${item.id}: failed`);
    }
  }
  const summary = {};
  for (const subset of [...new Set(results.map(item => item.split))]) {
    const rows = results.filter(item => item.split === subset);
    const metrics = {};
    for (const key of [...new Set(rows.flatMap(item => Object.keys(item.checks)))]) {
      const scored = rows.filter(item => key in item.checks);
      const docGroups = [...new Set(scored.map(item => item.group))];
      metrics[key] = { photosCorrect: scored.filter(item => item.checks[key]).length, photos: scored.length,
        documentsCorrect: docGroups.filter(group => scored.filter(item => item.group === group).every(item => item.checks[key])).length,
        documents: docGroups.length };
    }
    summary[subset] = { photos: rows.length, documents: new Set(rows.map(item => item.group)).size,
      errors: rows.filter(item => item.error).length, metrics };
  }
  await fs.writeFile(path.join(directory, `${stage}-${split || 'all'}.json`), JSON.stringify({ summary, results }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
