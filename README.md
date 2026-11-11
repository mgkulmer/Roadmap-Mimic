# Roadmap Mimic

Local web app to review the Jira issues behind your public roadmap, see why an issue is (not) publicly visible, batch/inline edit the criteria fields, and generate customer PDF reports.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` (Jira Cloud API token).
3. `npm run dev` → open http://localhost:5173 (API on :3001). Or `npm start` → http://localhost:3001.

## Features
- Loads issues from the Jira filter "Roadmap Mimic app filter" (`JIRA_FILTER_NAME` / `JIRA_FILTER_ID`).
- Columns: Key, Summary, Status, Issue Type, Parent (hidden when Epic), Roadmap?, Fix Version, Security Level, Release Note, Public Notes.
- **Criteria** column: mirrors the public website's check order and stops at the first failure: the issue's project is in the allowed project list (`ALLOWED_PROJECTS`), its issue type is in the allowed type map (`ALLOWED_ISSUE_TYPES`, entries `Type` or `PROJECT:Type`), and its Security Level is exactly a public level (`PUBLIC_SECURITY_LEVELS`, default `Public-Global`; unset is not public), then the `Roadmap?` and `Add to Release Notes` checkbox fields must both be Yes. An empty allow-list isn't enforced. Existence in Jira is implied, and the final check (a matching Drupal node exists) can't be evaluated by this app. Rules live in `server/visibility.js`.
- Edit: double-click a cell, or select rows and use the bulk bar (confirmation + per-issue results). Multi-value fields take comma-separated values.
- **PDF report**: filter by labels, projects, fix versions; default columns Key/Summary/Fix Version plus optional fields; custom header and message; preview then download (attach to your email manually). Only publicly visible issues by default.

Field names are resolved to Jira field IDs at runtime; override with `FIELD_*` in `.env`.

## Tests
`npm test`

## UI theme

The header now shows a mimic (treasure-chest monster) image scaled to the header height, a Creepster display font, and a plum/gold/magenta palette drawn from the image. Table labels, buttons and icons keep their original colors. Other changes: empty-value skulls are centered, **Run JQL** is now **Run**, and **Reset to saved filter** is now **Reset Filter**.

**Mimic image courtesy of Ebonyinkstone of deviantart.
