'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function timestamp(value) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium', timeStyle: 'medium', timeZone: 'America/New_York',
  }).format(new Date(value));
}

export default function CheckinForm() {
  const [tickets, setTickets] = useState([]);
  const [sampleState, setSampleState] = useState('loading');
  const [officerName, setOfficerName] = useState('');
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const busy = useRef(false);

  const loadSamples = useCallback(async () => {
    setSampleState('loading');
    try {
      const response = await fetch('/api/checkin', { cache: 'no-store' });
      if (!response.ok) throw new Error('Sample load failed');
      const data = await response.json();
      if (!Array.isArray(data.tickets)) throw new Error('Invalid sample response');
      setTickets(data.tickets);
      setSampleState('ready');
    } catch {
      setSampleState('error');
    }
  }, []);

  useEffect(() => { loadSamples(); }, [loadSamples]);

  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setResult(null);
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ officerName: officerName.trim(), token: token.trim() }),
      });
      const data = await response.json();
      if (![200, 400, 404, 409].includes(response.status) || typeof data.message !== 'string') throw new Error('Unexpected response');
      setResult({ ...data, ok: response.status === 200 });
      if (response.status === 200 || response.status === 409) {
        setTickets(current => current.map(ticket => ticket.token === token.trim() ? { ...ticket, status: 'used', checkedInAt: data.checkedInAt } : ticket));
      }
    } catch {
      setResult({ ok: false, message: 'No connection or server unavailable. Check-in was not confirmed. Retry when connected; the server may already have processed the request.' });
    } finally {
      setPending(false);
      busy.current = false;
    }
  }

  return <div className="checkin-grid">
    <section className="checkin-panel" aria-labelledby="entry-title">
      <h2 id="entry-title">Enter QR token</h2>
      <form onSubmit={submit} aria-busy={pending}>
        <label htmlFor="officer-name">Officer name (demo label)</label>
        <input id="officer-name" name="officerName" value={officerName} onChange={event => setOfficerName(event.target.value)} required maxLength={80} autoComplete="off" placeholder="e.g. Demo Officer" />
        <label htmlFor="qr-token">QR token</label>
        <input id="qr-token" name="token" value={token} onChange={event => setToken(event.target.value)} required maxLength={128} autoComplete="off" spellCheck={false} aria-describedby="token-help" />
        <p id="token-help">Copy a token from the seeded sample tickets. Only fictional sample attendees are included.</p>
        <button className="event-action" type="submit" disabled={pending}>{pending ? 'Checking…' : 'Check in ticket'}</button>
      </form>
      <div className="checkin-result" role="status" aria-live="polite" aria-atomic="true">
        {pending && <p>Checking ticket…</p>}
        {result && <div className={result.ok ? 'checkin-success' : 'checkin-rejection'}>
          <strong>{result.message}</strong>
          {result.attendeeName && <p>{result.attendeeName}</p>}
          {result.checkedInAt && <p>{result.ok ? 'Checked in' : 'First check-in'}: <time dateTime={result.checkedInAt}>{timestamp(result.checkedInAt)} Eastern Time</time></p>}
        </div>}
      </div>
    </section>
    <section className="checkin-panel" aria-labelledby="sample-title">
      <h2 id="sample-title">Seeded sample tickets</h2>
      <p className="sample-help">Public fixtures for Tartan After Hours, not purchased tickets. The last ticket starts already used so you can always test a rejection.</p>
      {sampleState === 'loading' && <p role="status">Loading sample tickets…</p>}
      {sampleState === 'error' && <div role="alert">Couldn’t load sample tickets. <button className="refresh-button" onClick={loadSamples}>Try again</button></div>}
      {sampleState === 'ready' && (tickets.length === 0 ? <p>No sample tickets available.</p> : <ul className="sample-tickets">{tickets.map(ticket => <li key={ticket.token}>
        <div><strong>{ticket.attendeeName}</strong><span>{ticket.status === 'used' ? 'Already used' : 'Unused sample'}</span></div>
        <code>{ticket.token}</code>
      </li>)}</ul>)}
      <p className="sample-help">If an unused sample returns “Invalid ticket,” the request may have reached another server instance. This demo cannot synchronize instances. Use the local single-process server for repeatable duplicate checks.</p>
    </section>
  </div>;
}
