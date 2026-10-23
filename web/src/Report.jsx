import React, { useState } from 'react';

function MultiPick({ label, options, values, onChange }) {
  const [text, setText] = useState('');
  const id = 'mp-' + label.replace(/\W/g, '');
  const add = (v) => {
    v = v.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setText('');
  };
  return (
    <label>
      {label}
      <input list={id} value={text} placeholder="Type or pick, press Enter"
        onChange={(e) => (options.includes(e.target.value) ? add(e.target.value) : setText(e.target.value))}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add(text))} />
      <datalist id={id}>{options.map((o) => <option key={o} value={o} />)}</datalist>
      <span className="chips">
        {values.map((v) => (
          <span className="chip" key={v}>{v}<button onClick={() => onChange(values.filter((x) => x !== v))}>×</button></span>
        ))}
      </span>
    </label>
  );
}

const DEFAULT_COLS = ['key', 'summary', 'fixVersion'];

export default function Report({ meta, baseJql }) {
  const [labels, setLabels] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fixVersions, setFixVersions] = useState([]);
  const [extra, setExtra] = useState([]);
  const [publicOnly, setPublicOnly] = useState(true);
  const [header, setHeader] = useState('Roadmap Update');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const body = () => JSON.stringify({ baseJql, labels, projects, fixVersions, columns: extra, publicOnly, header, message });
  const post = (url) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body() });

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const doPreview = () => run(async () => {
    const res = await post('/api/report/preview');
    const b = await res.json();
    if (!res.ok) throw new Error(b.error);
    setPreview(b);
  });

  const doPdf = () => run(async () => {
    const res = await post('/api/report/pdf');
    if (!res.ok) throw new Error((await res.json()).error);
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: 'roadmap-report.pdf' });
    a.click();
    URL.revokeObjectURL(url);
  });

  const optionalCols = meta.columns.filter((c) => !DEFAULT_COLS.includes(c.key));

  return (
    <div className="grid">
      <div className="panel">
        <label>Header<input value={header} onChange={(e) => setHeader(e.target.value)} /></label>
        <label>Message<textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Intro text shown under the header" /></label>
        <MultiPick label="Labels (e.g. customer)" options={meta.labels} values={labels} onChange={setLabels} />
        <MultiPick label="Projects" options={meta.projects} values={projects} onChange={setProjects} />
        <MultiPick label="Fix versions" options={meta.fixVersions} values={fixVersions} onChange={setFixVersions} />
        <label>Additional fields
          <span className="checks">
            {optionalCols.map((c) => (
              <label key={c.key}>
                <input type="checkbox" checked={extra.includes(c.key)}
                  onChange={(e) => setExtra(e.target.checked ? [...extra, c.key] : extra.filter((x) => x !== c.key))} />
                {c.label}
              </label>
            ))}
          </span>
        </label>
        <label className="checks"><span><input type="checkbox" checked={publicOnly} onChange={(e) => setPublicOnly(e.target.checked)} /> Only publicly visible issues</span></label>
        <button disabled={busy} onClick={doPreview}>Preview</button>
        <button className="primary" disabled={busy} onClick={doPdf}>Download PDF</button>
        {error && <div className="error">{error}</div>}
      </div>
      <div>
        {!preview ? <div className="info">Choose filters and click Preview. Default columns: Key, Summary, Fix Version.</div> : (
          <>
            <h2>{header}</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
            <p>{preview.rows.length} of {preview.total} matching issue(s)</p>
            <table>
              <thead><tr>{preview.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
              <tbody>{preview.rows.map((r) => <tr key={r.key}>{preview.columns.map((c) => <td key={c.key}>{r[c.key]}</td>)}</tr>)}</tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
