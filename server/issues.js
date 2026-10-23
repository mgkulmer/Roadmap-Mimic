import { config } from './config.js';
import { jira, resolveField, getBaseJql, stripOrderBy, searchAll, display } from './jira.js';
import { evaluateVisibility } from './visibility.js';

export const COLUMNS = [
  { key: 'key', label: 'Key' },
  { key: 'summary', label: 'Summary' },
  { key: 'status', label: 'Status' },
  { key: 'issueType', label: 'Issue Type' },
  { key: 'parent', label: 'Parent' },
  { key: 'project', label: 'Project' },
  { key: 'labels', label: 'Labels' },
  { key: 'roadmap', label: 'Roadmap?', editable: true },
  { key: 'fixVersion', label: 'Fix Version', editable: true },
  { key: 'security', label: 'Security Level', editable: true },
  { key: 'addToReleaseNote', label: 'Add to Release Note', editable: true },
  { key: 'releaseNote', label: 'Release Note', editable: true },
  { key: 'publicNotes', label: 'Public Notes', editable: true },
];

let resolved;
export async function getResolvedFields() {
  if (!resolved) {
    resolved = {};
    for (const [k, name] of Object.entries(config.fields)) resolved[k] = await resolveField(name);
  }
  return resolved;
}

export function toIssue(raw, fields) {
  const f = raw.fields;
  const cells = {
    key: raw.key,
    summary: f.summary || '',
    status: f.status?.name || '',
    issueType: f.issuetype?.name || '',
    parent:
      f.parent && f.parent.fields?.issuetype?.name !== 'Epic'
        ? `${f.parent.key}${f.parent.fields?.summary ? ' – ' + f.parent.fields.summary : ''}`
        : '',
    project: f.project?.key || raw.key.split('-')[0],
    labels: (f.labels || []).join(', '),
  };
  for (const [k, def] of Object.entries(fields)) cells[k] = def ? display(f[def.id]) : '';
  return {
    key: raw.key,
    url: `${config.baseUrl}/browse/${raw.key}`,
    project: cells.project,
    labels: f.labels || [],
    fixVersions: (f.fixVersions || []).map((v) => v.name),
    cells,
    visibility: evaluateVisibility(cells, config),
  };
}

export async function loadIssues(extraJql = '', overrideJql = '') {
  const fields = await getResolvedFields();
  const base = stripOrderBy(overrideJql.trim() || (await getBaseJql()));
  const jql = `(${base || 'project is not EMPTY'})${extraJql ? ' AND ' + extraJql : ''} ORDER BY key ASC`;
  const ids = [
    'summary', 'status', 'issuetype', 'parent', 'project', 'labels', 'fixVersions',
    ...Object.values(fields).filter(Boolean).map((d) => d.id),
  ];
  const raw = await searchAll(jql, [...new Set(ids)]);
  return { jql, issues: raw.map((r) => toIssue(r, fields)) };
}

/** Allowed option values for editable fields, plus projects/versions for report filters. */
export async function loadMeta(issues) {
  const fields = await getResolvedFields();
  const options = {};
  if (issues[0]) {
    try {
      const em = await jira(`/issue/${issues[0].key}/editmeta`);
      for (const [k, def] of Object.entries(fields)) {
        const av = def && em.fields?.[def.id]?.allowedValues;
        if (av) options[k] = av.map((a) => a.value ?? a.name).filter(Boolean);
      }
    } catch {
      /* options are optional; free-text entry still works */
    }
  }
  const projects = [...new Set(issues.map((i) => i.project))].sort();
  const versions = new Set();
  for (const p of projects) {
    try {
      (await jira(`/project/${p}/versions`)).forEach((v) => versions.add(v.name));
    } catch {
      /* ignore */
    }
  }
  const fixVersions = [...versions].sort();
  options.fixVersion = fixVersions;
  const labels = [...new Set(issues.flatMap((i) => i.labels))].sort();
  return {
    columns: COLUMNS,
    options,
    projects,
    fixVersions,
    labels,
    missingFields: Object.entries(fields).filter(([, d]) => !d).map(([k]) => config.fields[k]),
  };
}
