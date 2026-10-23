# Roadmap Mimic

Local web app to review the Jira issues behind your public roadmap, see why an issue is (not) publicly visible, batch/inline edit the criteria fields, and generate customer PDF reports.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` (Jira Cloud API token).
3. `npm run dev` → open http://localhost:5173 (API on :3001). Or `npm start` → http://localhost:3001.

## Features
- Loads issues from the Jira filter "Roadmap Mimic app filter" (`JIRA_FILTER_NAME` / `JIRA_FILTER_ID`).
- Columns: Key, Summary, Status, Issue Type, Parent (hidden when Epic), Roadmap?, Fix Version, Security Level, Add to Release Notes, Release Note, Public Notes.
- **Criteria** column: an issue is visible when Roadmap? is set, Fix Version set, Security Level is exactly a public level (default `Public-Global`; an unset level is not public), Add to Release Notes set and Release Note present. For projects listed in `EPIC_ONLY_PROJECTS` (default `BCD`) the issue type must also be Epic. Failing criteria are listed. Rules live in `server/visibility.js` and `.env` (`PUBLIC_SECURITY_LEVELS`, `EPIC_ONLY_PROJECTS`, `NEGATIVE_VALUES`).
- Edit: double-click a cell, or select rows and use the bulk bar (confirmation + per-issue results). Multi-value fields take comma-separated values.
- **PDF report**: filter by labels, projects, fix versions; default columns Key/Summary/Fix Version plus optional fields; custom header and message; preview then download (attach to your email manually). Only publicly visible issues by default.

Field names are resolved to Jira field IDs at runtime; override with `FIELD_*` in `.env`.

## Tests
`npm test`

## UI theme

The header now shows a mimic (treasure-chest monster) image scaled to the header height, a Creepster display font, and a plum/gold/magenta palette drawn from the image. Table labels, buttons and icons keep their original colors. Other changes: empty-value skulls are centered, **Run JQL** is now **Run**, and **Reset to saved filter** is now **Reset Filter**.

**Mimic image courtesy of Ebonyinkstone of deviantart.
