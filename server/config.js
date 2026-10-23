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
    addToReleaseNote: process.env.FIELD_ADD_TO_RELEASE_NOTE || 'Add to Release Notes',
    releaseNote: process.env.FIELD_RELEASE_NOTE || 'Release Note',
    publicNotes: process.env.FIELD_PUBLIC_NOTES || 'Public Notes',
  },
  // Security levels (case-insensitive substrings) considered public. An unset level is also public.
  publicSecurityLevels: list(process.env.PUBLIC_SECURITY_LEVELS, ['public']),
  // Values treated as "not set/false" for select/checkbox criteria.
  negativeValues: list(process.env.NEGATIVE_VALUES, ['no', 'false', 'none', 'n/a']),
};
