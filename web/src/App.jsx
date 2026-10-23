import React, { useEffect, useState } from 'react';
import Review from './Review.jsx';
import Report from './Report.jsx';

export default function App() {
  const [tab, setTab] = useState('review');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/issues');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || res.statusText);
      setData(body);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <>
      <header className="top">
        <h1>Roadmap Mimic</h1>
        <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>Review &amp; edit</button>
        <button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}>PDF report</button>
        <button onClick={load} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
      </header>
      <main>
        {error && <div className="error">{error}</div>}
        {data?.meta.missingFields.length > 0 && (
          <div className="error">Jira fields not found: {data.meta.missingFields.join(', ')}. Set FIELD_* in .env.</div>
        )}
        {!data && loading && <div className="info">Loading issues from Jira…</div>}
        {data && tab === 'review' && <Review data={data} reload={load} />}
        {data && tab === 'report' && <Report meta={data.meta} />}
      </main>
    </>
  );
}
