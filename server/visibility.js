const isEmpty = (v) => v == null || String(v).trim() === '';

const isPositive = (v, negatives) => {
  if (isEmpty(v)) return false;
  return !String(v)
    .split(',')
    .every((p) => negatives.includes(p.trim().toLowerCase()));
};

/**
 * Evaluate the public-visibility criteria for an issue.
 * `values` maps a criterion key (roadmap, fixVersion, security, addToReleaseNote, releaseNote)
 * to its display string.
 */
export function evaluateVisibility(values, cfg) {
  const security = values.security;
  const criteria = {
    roadmap: isPositive(values.roadmap, cfg.negativeValues),
    fixVersion: !isEmpty(values.fixVersion),
    security:
      !isEmpty(security) &&
      cfg.publicSecurityLevels.some((l) => String(security).trim().toLowerCase() === l.toLowerCase()),
    addToReleaseNote: isPositive(values.addToReleaseNote, cfg.negativeValues),
    releaseNote: !isEmpty(values.releaseNote),
  };
  // Some projects only publish Epics.
  if ((cfg.epicOnlyProjects || []).some((p) => p.toLowerCase() === String(values.project || '').toLowerCase())) {
    criteria.issueType = String(values.issueType).trim().toLowerCase() === 'epic';
  }
  const failing = Object.keys(criteria).filter((k) => !criteria[k]);
  return { criteria, failing, visible: failing.length === 0 };
}
