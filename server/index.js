import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { loadIssues, loadMeta, getResolvedFields, COLUMNS } from './issues.js';
import { toJiraValue, updateIssue, getFilter } from './jira.js';
import { renderPdf } from './pdf.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => res.status(e.status && e.status < 600 ? e.status : 500).json({ error: e.message }));

const jqlList = (vals) => vals.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(', ');

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Help page: shows the .env contents with secret values masked.
app.get('/api/help', (_req, res) => {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
  const raw = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '(no .env file found)';
  const masked = raw.replace(/^(\s*[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD)[A-Z0-9_]*\s*=).+$/gim, '$1********');
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>Roadmap Mimic – Help</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#222}h1{color:#3b0f33}pre{background:#f6f1f5;border:1px solid #d9c3d3;border-radius:6px;padding:14px;white-space:pre-wrap;word-break:break-word}</style></head>
<body><h1>Roadmap Mimic – .env</h1><p>Current contents of the <code>.env</code> file (API token masked).</p><pre>${escapeHtml(masked)}</pre></body></html>`);
});

app.get('/api/issues', wrap(async (req, res) => {
  const filter = await getFilter();
  const custom = typeof req.query.jql === 'string' ? req.query.jql : '';
  const { jql, issues } = await loadIssues('', custom);
  const meta = await loadMeta(issues);
  res.json({ filter, jql, issues, meta, baseUrl: config.baseUrl });
}));

// Batch update: { keys: [], field: 'roadmap', value: 'Yes' } -> per-issue results.
app.patch('/api/issues', wrap(async (req, res) => {
  const { keys, field, value } = req.body || {};
  const col = COLUMNS.find((c) => c.key === field && c.editable);
  const def = (await getResolvedFields())[field];
  if (!col || !def || !Array.isArray(keys) || !keys.length) {
    return res.status(400).json({ error: 'Invalid field or keys' });
  }
  const payload = toJiraValue(def, value);
  const results = [];
  for (const key of keys) {
    try {
      await updateIssue(key, def.id, payload);
      results.push({ key, ok: true });
    } catch (e) {
      results.push({ key, ok: false, error: e.message });
    }
  }
  res.json({ results });
}));

async function buildReport(body) {
  const { labels = [], projects = [], fixVersions = [], publicOnly = true } = body;
  const parts = [];
  if (labels.length) parts.push(`labels in (${jqlList(labels)})`);
  if (projects.length) parts.push(`project in (${jqlList(projects)})`);
  if (fixVersions.length) parts.push(`fixVersion in (${jqlList(fixVersions)})`);
  const { issues, jql } = await loadIssues(parts.join(' AND '), body.baseJql || '');
  const picked = publicOnly ? issues.filter((i) => i.visibility.visible) : issues;
  const wanted = ['key', 'summary', 'fixVersion', ...(body.columns || [])];
  const columns = [...new Set(wanted)].map((k) => COLUMNS.find((c) => c.key === k)).filter(Boolean);
  return { jql, columns, rows: picked.map((i) => i.cells), total: issues.length };
}

app.post('/api/report/preview', wrap(async (req, res) => {
  const r = await buildReport(req.body || {});
  res.json(r);
}));

app.post('/api/report/pdf', wrap(async (req, res) => {
  const r = await buildReport(req.body || {});
  const pdf = await renderPdf({ header: req.body?.header, message: req.body?.message, ...r });
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="roadmap-report.pdf"' });
  res.send(pdf);
}));

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

if (!config.baseUrl || !config.email || !config.token) {
  console.warn('Missing JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN – copy .env.example to .env');
}
app.listen(config.port, '127.0.0.1', () => console.log(`API on http://localhost:${config.port}`));
