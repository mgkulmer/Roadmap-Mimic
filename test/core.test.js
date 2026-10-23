import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateVisibility } from '../server/visibility.js';
import { toJiraValue } from '../server/jira.js';
import { renderPdf } from '../server/pdf.js';

const cfg = { publicSecurityLevels: ['Public-Global'], epicOnlyProjects: ['BCD'], negativeValues: ['no', 'false'] };
const good = { roadmap: 'Yes', fixVersion: '1.0', security: 'Public-Global', addToReleaseNote: 'Yes', releaseNote: 'Shipped', project: 'XYZ', issueType: 'Functional Story' };

test('fully configured issue is visible', () => {
  assert.equal(evaluateVisibility(good, cfg).visible, true);
});

test('reports each failing criterion', () => {
  const r = evaluateVisibility({ ...good, roadmap: 'No', fixVersion: '', security: 'Internal', releaseNote: ' ' }, cfg);
  assert.deepEqual(r.failing, ['roadmap', 'fixVersion', 'security', 'releaseNote']);
});

test('security level must be Public-Global', () => {
  assert.equal(evaluateVisibility({ ...good, security: '' }, cfg).visible, false);
  assert.equal(evaluateVisibility({ ...good, security: 'Internal' }, cfg).visible, false);
  assert.equal(evaluateVisibility(good, cfg).visible, true);
});

test('BCD issues must be Epics', () => {
  const story = evaluateVisibility({ ...good, project: 'BCD' }, cfg);
  assert.deepEqual(story.failing, ['issueType']);
  assert.equal(evaluateVisibility({ ...good, project: 'BCD', issueType: 'Epic' }, cfg).visible, true);
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
