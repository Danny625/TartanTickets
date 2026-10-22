import test from 'node:test';
import assert from 'node:assert/strict';
import { upcomingEvents, eventPresentation, createDemoEvents } from '../lib/events.mjs';
import { GET } from '../app/api/events/route.js';

const now = new Date('2026-10-22T12:00:00Z');
const base = { id: 'one', club: 'Film Club', title: 'Film night', startsAt: '2026-10-23T23:00:00Z', location: 'University Center', priceCents: 1200, capacity: 30, sold: 7, status: 'published', category: 'Arts' };

test('Story 1: lists upcoming published events, excluding past, started, cancelled and draft events', () => {
  const rows = [base, { ...base, id: 'past', startsAt: '2026-10-21T12:00:00Z' }, { ...base, id: 'started', startsAt: now.toISOString() }, { ...base, id: 'cancelled', status: 'cancelled' }, { ...base, id: 'draft', status: 'draft' }];
  assert.deepEqual(upcomingEvents(rows, now).map(e => e.id), ['one']);
});

test('Story 1: sorts events chronologically without mutating server records', () => {
  const rows = [{ ...base, id: 'later', startsAt: '2026-10-25T12:00:00Z' }, base];
  assert.deepEqual(upcomingEvents(rows, now).map(e => e.id), ['one', 'later']);
  assert.equal(rows[0].id, 'later');
  const result = upcomingEvents(rows, now);
  result[0].title = 'Changed';
  assert.equal(base.title, 'Film night');
});

test('Story 1: each event exposes date, Pittsburgh time, location, USD price and seats remaining', () => {
  const view = eventPresentation(base);
  assert.match(view.date, /Oct.*23.*2026/);
  assert.match(view.time, /7:00 PM/);
  assert.equal(view.location, 'University Center');
  assert.equal(view.price, '$12.00');
  assert.equal(view.remaining, 23);
  assert.equal(view.seats, '23 seats remaining');
  assert.equal(view.action, 'Buy');
});

test('Story 1: sold-out events show Join waitlist instead of Buy', () => {
  const view = eventPresentation({ ...base, sold: 30 });
  assert.equal(view.remaining, 0);
  assert.equal(view.seats, 'Sold out');
  assert.equal(view.action, 'Join waitlist');
});

test('Story 1: over-capacity records never show negative inventory or Buy', () => {
  const view = eventPresentation({ ...base, sold: 31 });
  assert.equal(view.remaining, 0);
  assert.equal(view.action, 'Join waitlist');
});

test('Story 1: free events and the last available seat have clear labels', () => {
  const view = eventPresentation({ ...base, priceCents: 0, sold: 29 });
  assert.equal(view.price, 'Free');
  assert.equal(view.seats, '1 seat remaining');
  assert.equal(view.action, 'Buy');
});

test('Story 1: no upcoming events produces an empty list', () => {
  assert.deepEqual(upcomingEvents([], now), []);
  assert.deepEqual(upcomingEvents([{ ...base, status: 'cancelled' }], now), []);
});

test('Story 1: demo inventory includes paid, free, sold-out and past events, relative to server start', () => {
  const rows = createDemoEvents(now);
  const upcoming = upcomingEvents(rows, now);
  assert.ok(upcoming.some(e => e.priceCents === 0));
  assert.ok(upcoming.some(e => e.priceCents > 0));
  assert.ok(upcoming.some(e => e.sold === e.capacity));
  assert.ok(rows.some(e => Date.parse(e.startsAt) < now.getTime()));
});

test('Story 1: GET /api/events returns public upcoming data and prevents stale inventory caching', async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const body = await response.json();
  assert.ok(body.events.length >= 3);
  for (const event of body.events) {
    assert.ok(Date.parse(event.startsAt) > Date.now());
    assert.equal(event.status, 'published');
    assert.equal(typeof event.location, 'string');
    assert.equal(typeof event.priceCents, 'number');
    assert.equal(typeof event.remaining, 'number');
    assert.ok(!('attendees' in event));
  }
});
