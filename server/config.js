import 'dotenv/config';

const list = (v, d) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : d);

export const config = {
  baseUrl: (process.env.JIRA_BASE_URL || '').replace(/\/+$/, ''),
  email: process.env.JIRA_EMAIL,
  token: process.env.JIRA_API_TOKEN,
  filterName: process.env.JIRA_FILTER_NAME || 'Roadmap Mimic app filter',
  filterId: process.env.JIRA_FILTER_ID || '',
  port: Number(process.env.PORT || 3001),
  // Jira field names (resolved to IDs at runtime) that drive public visibility.
  fields: {
    roadmap: process.env.FIELD_ROADMAP || 'Roadmap?',
    fixVersion: process.env.FIELD_FIX_VERSION || 'Fix Version',
    security: process.env.FIELD_SECURITY || 'Security Level',
    releaseNote: process.env.FIELD_RELEASE_NOTE || 'Release Note',
    publicNotes: process.env.FIELD_PUBLIC_NOTES || 'Public Notes',
    addToReleaseNotes: process.env.FIELD_ADD_TO_RELEASE_NOTES || 'Add to Release Notes',
  },
  // Public-site allow-lists (empty = not enforced). Types may be "Type" or "PROJECT:Type".
  allowedProjects: list(process.env.ALLOWED_PROJECTS, []),
  allowedIssueTypes: list(process.env.ALLOWED_ISSUE_TYPES, []),
  // Security levels (case-insensitive exact match) considered public. An unset level is NOT public.
  publicSecurityLevels: list(process.env.PUBLIC_SECURITY_LEVELS, ['Public-Global']),
  // An issue needs at least one of these Fix Versions (case-insensitive exact match).
  allowedFixVersions: list(process.env.ALLOWED_FIX_VERSIONS, ['Current Development', 'Up Next', 'Following Release', 'Future Consideration']),
};
