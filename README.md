# Roadmap Mimic

Local web app to review the Jira issues behind your public roadmap, see why an issue is (not) publicly visible, batch/inline edit the criteria fields, and generate customer PDF reports.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` (Jira Cloud API token).
3. `npm run dev` → open http://localhost:5173 (API on :3001). Or `npm start` → http://localhost:3001.

## Features
- Loads issues from the Jira filter "Roadmap Mimic app filter" (`JIRA_FILTER_NAME` / `JIRA_FILTER_ID`).
- Columns: Key, Summary, Status, Issue Type, Parent (hidden when Epic), Roadmap?, Fix Version, Security Level, Add to Release Notes, Release Note, Public Notes.
- **Public?** column: an issue is visible when Roadmap? is set, Fix Version set, Security Level is unset/public, Add to Release Notes set and Release Note present. Failing criteria are listed. Rules live in `server/visibility.js` and `.env` (`PUBLIC_SECURITY_LEVELS`, `NEGATIVE_VALUES`).
- Edit: double-click a cell, or select rows and use the bulk bar (confirmation + per-issue results). Multi-value fields take comma-separated values.
- **PDF report**: filter by labels, projects, fix versions; default columns Key/Summary/Fix Version plus optional fields; custom header and message; preview then download (attach to your email manually). Only publicly visible issues by default.

Field names are resolved to Jira field IDs at runtime; override with `FIELD_*` in `.env`.

## Tests
`npm test`
