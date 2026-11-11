const isEmpty = (v) => v == null || String(v).trim() === '';
const eq = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

// An empty allow-list means the check is not enforced.
const inProjectList = (project, list = []) => list.length === 0 || list.some((p) => eq(p, project));

// Entries are "Type" (any project) or "PROJECT:Type" (that project only).
const typeAllowed = (type, project, list = []) =>
  list.length === 0 ||
  list.some((entry) => {
    const [a, b] = entry.split(':').map((s) => s.trim());
    return b === undefined ? eq(a, type) : eq(a, project) && eq(b, type);
  });

/**
 * Mirrors the public website's check order, stopping at the first failure:
 * project allowed -> issue type allowed -> security level public.
 * (The issue exists, since it came from Jira. The Drupal node check can't be evaluated here.)
 * Only the criteria evaluated so far appear in `criteria`.
 */
export function evaluateVisibility(values, cfg) {
  const checks = [
    ['project', () => inProjectList(values.project, cfg.allowedProjects)],
    ['issueType', () => typeAllowed(values.issueType, values.project, cfg.allowedIssueTypes)],
    ['security', () => !isEmpty(values.security) && (cfg.publicSecurityLevels || []).some((l) => eq(values.security, l))],
  ];
  const criteria = {};
  const failing = [];
  for (const [key, check] of checks) {
    const ok = check();
    criteria[key] = ok;
    if (!ok) {
      failing.push(key);
      break;
    }
  }
  return { criteria, failing, visible: failing.length === 0 };
}
