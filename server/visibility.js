const isEmpty = (v) => v == null || String(v).trim() === '';

const isPositive = (v, negatives) => {
  if (isEmpty(v)) return false;
  return !String(v)
    .split(',')
    .every((p) => negatives.includes(p.trim().toLowerCase()));
};

// Fix Version must be non-empty and include a roadmap bucket or a specific release (e.g. 26.04.00).
const hasPublicFixVersion = (v, cfg) => {
  if (isEmpty(v)) return false;
  const names = (cfg.fixVersionNames || []).map((n) => n.toLowerCase());
  const release = new RegExp(cfg.fixVersionReleasePattern || '^\\d+(\\.\\d+)+$');
  return String(v)
    .split(',')
    .map((p) => p.trim())
    .some((p) => names.includes(p.toLowerCase()) || release.test(p));
};

/**
 * Evaluate the public-visibility criteria for an issue.
 * `values` maps a criterion key (roadmap, fixVersion, security, releaseNote)
 * to its display string.
 */
export function evaluateVisibility(values, cfg) {
  const security = values.security;
  const criteria = {
    roadmap: isPositive(values.roadmap, cfg.negativeValues),
    fixVersion: hasPublicFixVersion(values.fixVersion, cfg),
    security:
      !isEmpty(security) &&
      cfg.publicSecurityLevels.some((l) => String(security).trim().toLowerCase() === l.toLowerCase()),
    releaseNote: !isEmpty(values.releaseNote) || !isEmpty(values.publicNotes),
  };
  // Some projects only publish Epics.
  if ((cfg.epicOnlyProjects || []).some((p) => p.toLowerCase() === String(values.project || '').toLowerCase())) {
    criteria.issueType = String(values.issueType).trim().toLowerCase() === 'epic';
  }
  const failing = Object.keys(criteria).filter((k) => !criteria[k]);
  return { criteria, failing, visible: failing.length === 0 };
}
