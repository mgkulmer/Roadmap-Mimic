import React, { useMemo, useState } from 'react';

const CRITERIA_LABELS = {
  roadmap: 'Roadmap?',
  fixVersion: 'Fix Version',
  security: 'Security Level',
  addToReleaseNote: 'Add to Release Note',
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

export default function Review({ data, reload }) {
  const { issues, meta, jql, baseUrl } = data;
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
        <span title={jql} style={{ color: '#667' }}>(filter JQL on hover)</span>
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
            <th>Public?</th>
            {shown.map((c) => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.key} className={sel.has(i.key) ? 'sel' : ''}>
              <td><input type="checkbox" checked={sel.has(i.key)} onChange={() => toggle(i.key)} /></td>
              <td>
                {i.visibility.visible ? <span className="pill ok">Visible</span> : (
                  <>
                    <span className="pill bad">Hidden</span>
                    {i.visibility.failing.map((f) => <span className="fail" key={f}>✗ {CRITERIA_LABELS[f]}</span>)}
                  </>
                )}
              </td>
              {shown.map((c) => {
                const isEdit = edit && edit.key === i.key && edit.field === c.key;
                const cls = [c.editable ? 'editable' : '', /note/i.test(c.key) ? 'notes' : ''].join(' ');
                return (
                  <td key={c.key} className={cls} title={c.editable ? 'Double-click to edit' : undefined}
                      onDoubleClick={() => c.editable && !busy && setEdit({ key: i.key, field: c.key, value: i.cells[c.key] })}>
                    {isEdit ? (
                      <ValueInput autoFocus options={meta.options[c.key]} value={edit.value}
                        onChange={(v) => setEdit({ ...edit, value: v })}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveInline(); if (e.key === 'Escape') setEdit(null); }} />
                    ) : c.key === 'key' ? (
                      <a href={`${baseUrl}/browse/${i.key}`} target="_blank" rel="noreferrer">{i.key}</a>
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
