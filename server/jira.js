import { config } from './config.js';

const auth = () => 'Basic ' + Buffer.from(`${config.email}:${config.token}`).toString('base64');

export async function jira(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${config.baseUrl}/rest/api/2${path}`, {
    method,
    headers: {
      Authorization: auth(),
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && (Object.values(data.errors || {})[0] || (data.errorMessages || [])[0])) ||
      `Jira ${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9?]/g, '');
const ALIASES = { fixversion: 'fixversions' };

let fieldCache;
export async function getFields() {
  if (!fieldCache) fieldCache = await jira('/field');
  return fieldCache;
}

export async function resolveField(name) {
  const fields = await getFields();
  const n = norm(name);
  const target = ALIASES[n] || n;
  const loose = (s) => norm(s).replace(/s$/, '');
  const exact = fields.filter((f) => norm(f.name) === target || norm(f.name) === n || f.id === name);
  // Tolerate singular/plural differences, e.g. "Release Note" vs "Release Notes".
  const matches = exact.length ? exact : fields.filter((f) => loose(f.name) === loose(target));
  return matches.find((f) => !f.custom) || matches[0] || null;
}

export async function getFilter() {
  if (config.filterId) {
    const f = await jira(`/filter/${config.filterId}`);
    return { name: f.name, jql: f.jql };
  }
  const res = await jira(`/filter/search?filterName=${encodeURIComponent(config.filterName)}&expand=jql`);
  const hit =
    res.values.find((f) => f.name.toLowerCase() === config.filterName.toLowerCase()) || res.values[0];
  if (!hit) throw new Error(`Filter "${config.filterName}" not found. Set JIRA_FILTER_ID in .env.`);
  return { name: hit.name, jql: hit.jql };
}

export const getBaseJql = async () => (await getFilter()).jql;

export const stripOrderBy = (jql) => jql.replace(/\border\s+by\b[\s\S]*$/i, '').trim();

export async function searchAll(jql, fieldIds, max = 1000) {
  const issues = [];
  let nextPageToken;
  while (issues.length < max) {
    const page = await jira('/search/jql', {
      method: 'POST',
      body: { jql, fields: fieldIds, maxResults: 100, ...(nextPageToken ? { nextPageToken } : {}) },
    });
    issues.push(...page.issues);
    nextPageToken = page.nextPageToken;
    if (!nextPageToken || page.isLast) break;
  }
  return issues;
}

/** Convert a raw Jira field value to a display string. */
export function display(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(display).filter(Boolean).join(', ');
  if (typeof v === 'object') return v.value ?? v.name ?? v.displayName ?? v.key ?? '';
  return String(v);
}

/** Build a Jira update payload value from a plain string (comma-separated for multi-value fields). */
export function toJiraValue(field, text) {
  const s = (text ?? '').trim();
  const sch = field.schema || {};
  const parts = s ? s.split(',').map((p) => p.trim()).filter(Boolean) : [];
  if (sch.type === 'array') {
    const map = {
      option: (p) => ({ value: p }),
      version: (p) => ({ name: p }),
      component: (p) => ({ name: p }),
      string: (p) => p,
    };
    return parts.map(map[sch.items] || ((p) => p));
  }
  if (!s) return null;
  switch (sch.type) {
    case 'option':
      return { value: s };
    case 'securitylevel':
    case 'priority':
      return { name: s };
    case 'number':
      return Number(s);
    default:
      return s;
  }
}

export async function updateIssue(key, fieldId, value) {
  await jira(`/issue/${encodeURIComponent(key)}`, { method: 'PUT', body: { fields: { [fieldId]: value } } });
}
