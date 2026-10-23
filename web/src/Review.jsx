import React, { useMemo, useState } from 'react';
import { faSkull } from '@fortawesome/free-solid-svg-icons';
import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';

const HEADER_TIPS = {
  publicNotes:
    'Optional. Displays as a separate free-text field beneath the Release Note. Use this for stories you wish to display publicly that do not have a release note.',
  roadmap:
    'Does this issue belong on the public roadmap? If yes, you have about 15 other things to check beside this Yes/No field.',
};

function FaIcon({ icon, className = '', label }) {
  const [w, h, , , path] = icon.icon;
  return (
    <svg className={`fa-icon ${className}`} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <title>{label}</title>
      <path d={path} />
    </svg>
  );
}

const SKULL_WHEN_EMPTY = ['roadmap', 'security'];
const WRAPPING = ['summary', 'releaseNote', 'publicNotes'];

function HeaderLabel({ col }) {
  const tip = HEADER_TIPS[col.key];
  if (!tip) return col.label;
  return (
    <span className="th-tip" tabIndex={0}>
      {col.label}
      <FaIcon icon={faCircleQuestion} className="help" label="More info" />
      <span className="tip-text" role="tooltip">{tip}</span>
    </span>
  );
}

const CRITERIA_LABELS = {
  roadmap: 'Roadmap?',
  fixVersion: 'Fix Version',
  security: 'Security Level',
  addToReleaseNote: 'Add to Release Notes',
  releaseNote: 'Release Note',
};

export async function patchIssues(keys, field, value) {
  const res = await fetch('/api/issues', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys, field, value }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body.results;
}

function ValueInput({ options, value, onChange, ...rest }) {
  const listId = useMemo(() => 'dl-' + Math.random().toString(36).slice(2), []);
  return (
    <>
      <input list={options?.length ? listId : undefined} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {options?.length > 0 && <datalist id={listId}>{options.map((o) => <option key={o} value={o} />)}</datalist>}
    </>
  );
}

export default function Review({ data, reload, projects = [], quick = '', onProject }) {
  const { issues, meta, baseUrl } = data;
  const editable = meta.columns.filter((c) => c.editable);
  const shown = meta.columns.filter((c) => !['project', 'labels'].includes(c.key));
  const [q, setQ] = useState('');
  const [onlyHidden, setOnlyHidden] = useState(false);
  const [sel, setSel] = useState(new Set());
  const [bulkField, setBulkField] = useState(editable[0]?.key);
  const [bulkValue, setBulkValue] = useState('');
  const [edit, setEdit] = useState(null); // { key, field, value }
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = issues.filter((i) => {
    if (onlyHidden && i.visibility.visible) return false;
    if (!q) return true;
    return Object.values(i.cells).join(' ').toLowerCase().includes(q.toLowerCase());
  });
  const allSel = rows.length > 0 && rows.every((r) => sel.has(r.key));
  const toggle = (k) => setSel((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const run = async (keys, field, value) => {
    setBusy(true);
    setMsg(null);
    try {
      const results = await patchIssues(keys, field, value);
      const failed = results.filter((r) => !r.ok);
      setMsg({ ok: !failed.length, text: failed.length
        ? `Updated ${results.length - failed.length}/${results.length}. Failed: ` + failed.map((f) => `${f.key} (${f.error})`).join('; ')
        : `Updated ${results.length} issue(s).` });
      await reload();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const applyBulk = () => {
    const label = editable.find((c) => c.key === bulkField).label;
    const shownVal = bulkValue.trim() ? `"${bulkValue}"` : '(empty / clear)';
    if (confirm(`Set ${label} to ${shownVal} on ${sel.size} issue(s)?`)) run([...sel], bulkField, bulkValue);
  };

  const saveInline = () => {
    const { key, field, value } = edit;
    setEdit(null);
    run([key], field, value);
  };

  return (
    <>
      <div className="bar">
        <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label><input type="checkbox" checked={onlyHidden} onChange={(e) => setOnlyHidden(e.target.checked)} /> Not publicly visible only</label>
        <span>{rows.length} shown · {issues.filter((i) => i.visibility.visible).length}/{issues.length} public</span>
        <a className="btn sdsc" href="https://support.sirsidynix.com/product/roadmap" target="_blank" rel="noopener noreferrer">SDSC</a>
      </div>
      <div className="bar quick">
        <label>Project quick filter
          <select value={quick} onChange={(e) => onProject(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.key} value={p.key}>{p.name ? `${p.key} – ${p.name}` : p.key}</option>)}
          </select>
        </label>
      </div>
      {msg && <div className={msg.ok ? 'info' : 'error'}>{msg.text}</div>}
      {sel.size > 0 && (
        <div className="bar bulk">
          <b>{sel.size} selected</b>
          <select value={bulkField} onChange={(e) => { setBulkField(e.target.value); setBulkValue(''); }}>
            {editable.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <ValueInput options={meta.options[bulkField]} value={bulkValue} onChange={setBulkValue} placeholder="New value (blank clears; comma-separate multiples)" size={40} />
          <button className="primary" disabled={busy} onClick={applyBulk}>Apply to selected</button>
          <button onClick={() => setSel(new Set())}>Clear selection</button>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r.key)))} /></th>
            <th className="criteria">Criteria</th>
            {shown.map((c) => <th key={c.key}><HeaderLabel col={c} /></th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.key} className={sel.has(i.key) ? 'sel' : ''}>
              <td><input type="checkbox" checked={sel.has(i.key)} onChange={() => toggle(i.key)} /></td>
              <td className="criteria">
                {i.visibility.visible ? (
                  <span className="overall" title="Visible">
                    <svg className="status-icon" viewBox="0 0 512 512" role="img" aria-label="Visible">
                      <path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm177.6 62.1C192.8 334.5 218.8 352 256 352s63.2-17.5 78.4-33.9c9-9.7 24.2-10.4 33.9-1.4s10.4 24.2 1.4 33.9c-22 23.8-60 49.4-113.6 49.4s-91.7-25.5-113.6-49.4c-9-9.7-8.4-24.9 1.4-33.9s24.9-8.4 33.9 1.4zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm192-32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z" />
                    </svg>
                  </span>
                ) : (
                  <span className="overall" title="Hidden">
                    <svg className="status-icon bad" viewBox="0 0 512 512" role="img" aria-label="Hidden">
                      <path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM174.6 384.1c-4.5 12.5-18.2 18.9-30.7 14.4s-18.9-18.2-14.4-30.7C146.9 319.4 198.9 288 256 288s109.1 31.4 126.6 79.9c4.5 12.5-2 26.2-14.4 30.7s-26.2-2-30.7-14.4C328.2 358.5 297.2 336 256 336s-72.2 22.5-81.4 48.1zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm192-32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z" />
                    </svg>
                  </span>
                )}
                <span className="crit-list">
                  {Object.entries(CRITERIA_LABELS).map(([k, label]) => (
                    <span key={k} className={`crit ${i.visibility.criteria[k] ? 'pass' : 'fail'}`}>
                      {i.visibility.criteria[k] ? '✓' : '✗'} {label}
                    </span>
                  ))}
                </span>
              </td>
              {shown.map((c) => {
                const isEdit = edit && edit.key === i.key && edit.field === c.key;
                const cls = [c.editable ? 'editable' : '', /note/i.test(c.key) ? 'notes' : '', WRAPPING.includes(c.key) ? 'wrap' : 'fit'].join(' ');
                return (
                  <td key={c.key} className={cls} title={c.editable ? 'Double-click to edit' : undefined}
                      onDoubleClick={() => c.editable && !busy && setEdit({ key: i.key, field: c.key, value: i.cells[c.key] })}>
                    {isEdit ? (
                      <ValueInput autoFocus options={meta.options[c.key]} value={edit.value}
                        onChange={(v) => setEdit({ ...edit, value: v })}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveInline(); if (e.key === 'Escape') setEdit(null); }} />
                    ) : c.key === 'key' ? (
                      <a href={`${baseUrl}/browse/${i.key}`} target="_blank" rel="noreferrer">{i.key}</a>
                    ) : SKULL_WHEN_EMPTY.includes(c.key) && !i.cells[c.key] ? (
                      <FaIcon icon={faSkull} className="empty" label="Empty" />
                    ) : i.cells[c.key]}
                    {isEdit && <button className="primary" onClick={saveInline}>Save</button>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
