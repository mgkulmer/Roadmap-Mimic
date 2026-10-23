import React, { useEffect, useState } from 'react';
import Review from './Review.jsx';
import Report from './Report.jsx';

export default function App() {
  const [tab, setTab] = useState('review');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(''); // session-only JQL override; '' = saved filter
  const [draft, setDraft] = useState('');
  const [quick, setQuick] = useState(''); // selected project quick filter
  const [preQuick, setPreQuick] = useState(''); // JQL before the quick filter was applied
  const [projectOpts, setProjectOpts] = useState([]);

  const load = async (jql = applied, q = quick) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/issues' + (jql ? `?jql=${encodeURIComponent(jql)}` : ''));
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || res.statusText);
      setData(body);
      setApplied(jql);
      setDraft((d) => (jql ? d : body.filter.jql));
      if (!q) setProjectOpts(body.meta.projectList);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load('', ''); }, []);

  const original = data?.filter.jql ?? '';
  const modified = applied !== '';
  const run = () => {
    setQuick('');
    load(draft.trim() === original.trim() ? '' : draft, '');
  };

  const selectProject = (p) => {
    if (!p) {
      setQuick('');
      setDraft(preQuick);
      load(preQuick.trim() === original.trim() ? '' : preQuick, '');
      return;
    }
    const base = quick ? preQuick : draft;
    if (!quick) setPreQuick(base);
    const jql = `(${base.replace(/\border\s+by\b[\s\S]*$/i, '').trim()}) AND project = "${p}"`;
    setQuick(p);
    setDraft(jql);
    load(jql, p);
  };

  return (
    <>
      <header className="top">
        <img className="logo" src="/mimic.png" alt="" />
        <h1>Roadmap Mimic</h1>
        <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>Review &amp; edit</button>
        <button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}>PDF report</button>
        <button onClick={() => load()} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
      </header>
      {data && (
        <section className="filterbar">
          <div className="filtertitle">
            <span className="label">Jira filter</span>
            <strong>{data.filter.name}</strong>
            {modified && <span className="pill bad">JQL modified (this session only)</span>}
          </div>
          <textarea
            aria-label="Filter JQL"
            rows={Math.min(8, Math.max(2, draft.split('\n').length))}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && run()}
          />
          <div className="bar">
            <button className="primary" disabled={loading || !draft.trim()} onClick={run}>Run</button>
            <button disabled={loading || draft === original} onClick={() => { setDraft(original); setQuick(''); load('', ''); }}>Reset Filter</button>
            <span className="hint"><em>Edits are temporary and never change the saved Jira filter.</em></span>
          </div>
        </section>
      )}
      <main>
        {error && <div className="error">{error}</div>}
        {data?.meta.missingFields.length > 0 && (
          <div className="error">Jira fields not found: {data.meta.missingFields.join(', ')}. Set FIELD_* in .env.</div>
        )}
        {!data && loading && <div className="info">Loading issues from Jira…</div>}
        {data && tab === 'review' && <Review data={data} reload={() => load()} projects={projectOpts} quick={quick} onProject={selectProject} />}
        {data && tab === 'report' && <Report meta={data.meta} baseJql={applied} />}
      </main>
    </>
  );
}
