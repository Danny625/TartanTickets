'use client';

import { useState } from 'react';
import { eventPresentation } from '../lib/event-format.mjs';

export default function EventBrowser({ initialEvents }) {
  const [events, setEvents] = useState(initialEvents);
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');

  async function refresh() {
    setStatus('loading');
    setNotice('');
    try {
      const response = await fetch('/api/events', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load events');
      const body = await response.json();
      if (!Array.isArray(body.events)) throw new Error('Invalid event response');
      setEvents(body.events);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="events" className="events-section" aria-labelledby="events-title">
      <div className="section-heading"><div><p className="eyebrow">GET OUT. GET TOGETHER.</p><h2 id="events-title">Coming up on campus<span>.</span></h2></div><button className="refresh-button" onClick={refresh} disabled={status === 'loading'}>{status === 'loading' ? 'Refreshing…' : 'Refresh events'} <span aria-hidden="true">↻</span></button></div>
      <div className="events-meta"><span>Upcoming events <span className="count">{events.length}</span></span><span>All times in Pittsburgh · Eastern Time</span></div>
      <div role="status" aria-live="polite" className="status-line">
        {status === 'loading' && 'Loading upcoming events…'}
        {status === 'success' && 'Events are up to date.'}
      </div>
      {status === 'error' && <div role="alert" className="error-box">We couldn’t refresh events. The last loaded events are still shown. <button onClick={refresh}>Try again</button></div>}
      {notice && <div role="status" className="notice">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
      <div aria-busy={status === 'loading'}>
        {events.length === 0 ? <div className="empty-state"><h3>No upcoming events yet.</h3><p>Check back soon for something worth showing up for.</p></div> : <div className="event-grid">{events.map(event => {
          const view = eventPresentation(event);
          return <article className="event-card" key={event.id} aria-labelledby={`title-${event.id}`}>
            <div className={`event-art ${event.theme}`} aria-hidden="true"><span className="art-category">{event.category}</span><span className="event-art-type">{event.theme === 'music' ? <>AFTER<br /><i>HOURS</i><span className="art-rings">◎</span></> : event.theme === 'film' ? <><span className="film-frame">▶</span>ONE MORE<br /><i>FRAME.</i></> : <>PULL UP<br /><i>A CHAIR.</i><span className="table-circle">✳</span></>}</span><span className="art-caption">{event.club} / CMU</span></div>
            <div className="card-content"><p className="club-name">{event.club}</p><h3 id={`title-${event.id}`}>{event.title}</h3><p className="event-description">{event.description}</p>
              <dl><div><dt>Date</dt><dd><time dateTime={event.startsAt}>{view.date} · {view.time}</time></dd></div><div><dt>Location</dt><dd>{view.location}</dd></div></dl>
              <div className="availability"><span className={view.remaining === 0 ? 'sold-out' : ''}><span aria-hidden="true">● </span>{view.seats}</span><strong>{view.price}</strong></div>
              <button className={`event-action ${view.remaining === 0 ? 'waitlist-action' : ''}`} aria-label={`${view.action} — ${event.title}`} onClick={() => setNotice(view.remaining === 0 ? `The waitlist for ${event.title} is planned for Story 4. You have not been added to a waitlist.` : `Buying tickets for ${event.title} is planned for Story 3. No payment or reservation has been made.`)}>{view.action}<span aria-hidden="true">↗</span></button>
            </div>
          </article>;
        })}</div>}
      </div>
      <p className="demo-note">A preview of campus possibilities. These are sample events; purchases and waitlist enrollment are coming later.</p>
    </section>
  );
}
