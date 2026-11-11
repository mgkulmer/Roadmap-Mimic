import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateVisibility } from '../server/visibility.js';
import { toJiraValue } from '../server/jira.js';
import { renderPdf } from '../server/pdf.js';

const cfg = { allowedProjects: ['BCD', 'SEARCH'], allowedIssueTypes: ['BCD:Epic', 'Functional Story'], publicSecurityLevels: ['Public-Global'] };
const good = { security: 'Public-Global', project: 'SEARCH', issueType: 'Functional Story', roadmap: 'Yes', addToReleaseNotes: 'Yes' };

test('fully configured issue is visible', () => {
  const r = evaluateVisibility(good, cfg);
  assert.equal(r.visible, true);
  assert.deepEqual(Object.keys(r.criteria), ['project', 'issueType', 'security', 'roadmap', 'releaseNotes']);
});

test('stops at the first failing check', () => {
  const r = evaluateVisibility({ ...good, project: 'ZZZ', issueType: 'Bug', security: '' }, cfg);
  assert.deepEqual(r.failing, ['project']);
  assert.deepEqual(Object.keys(r.criteria), ['project']);
  assert.deepEqual(evaluateVisibility({ ...good, issueType: 'Bug', security: '' }, cfg).failing, ['issueType']);
  assert.deepEqual(evaluateVisibility({ ...good, security: 'Internal' }, cfg).failing, ['security']);
});

test('security level must be Public-Global', () => {
  assert.equal(evaluateVisibility({ ...good, security: '' }, cfg).visible, false);
  assert.equal(evaluateVisibility({ ...good, security: 'Internal' }, cfg).visible, false);
  assert.equal(evaluateVisibility(good, cfg).visible, true);
});

test('Roadmap and Release Notes checkboxes must be Yes', () => {
  assert.deepEqual(evaluateVisibility({ ...good, roadmap: 'No' }, cfg).failing, ['roadmap']);
  assert.deepEqual(evaluateVisibility({ ...good, addToReleaseNotes: '' }, cfg).failing, ['releaseNotes']);
});

test('issue type map can be per project', () => {
  assert.equal(evaluateVisibility({ ...good, project: 'BCD' }, cfg).visible, true);
  const strict = { ...cfg, allowedIssueTypes: ['BCD:Epic'] };
  assert.deepEqual(evaluateVisibility({ ...good, project: 'BCD' }, strict).failing, ['issueType']);
  assert.equal(evaluateVisibility({ ...good, project: 'BCD', issueType: 'Epic' }, strict).visible, true);
});

test('empty allow-lists are not enforced', () => {
  assert.equal(evaluateVisibility({ ...good, project: 'ANY', issueType: 'Bug' }, { publicSecurityLevels: ['Public-Global'] }).visible, true);
});

test('toJiraValue maps by schema', () => {
  assert.deepEqual(toJiraValue({ schema: { type: 'array', items: 'version' } }, '1.0, 2.0'), [{ name: '1.0' }, { name: '2.0' }]);
  assert.deepEqual(toJiraValue({ schema: { type: 'option' } }, 'Yes'), { value: 'Yes' });
  assert.equal(toJiraValue({ schema: { type: 'securitylevel' } }, ''), null);
  assert.deepEqual(toJiraValue({ schema: { type: 'array', items: 'option' } }, ''), []);
});

test('renderPdf produces a PDF', async () => {
  const buf = await renderPdf({
    header: 'H', message: 'M',
    columns: [{ key: 'key', label: 'Key' }, { key: 'summary', label: 'Summary' }],
    rows: Array.from({ length: 80 }, (_, i) => ({ key: `A-${i}`, summary: 'Some summary text '.repeat(5) })),
  });
  assert.equal(buf.subarray(0, 4).toString(), '%PDF');
});
