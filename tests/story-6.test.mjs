import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckinStore } from '../lib/checkin.mjs';
import { GET, POST } from '../app/api/checkin/route.js';

const firstTime = '2026-10-22T22:00:00.000Z';
const secondTime = '2026-10-22T22:05:00.000Z';
const input = token => ({ token, officerName: 'Demo Officer' });

test('Story 6: story6_valid_scan_marks_ticket_used', () => {
  const store = createCheckinStore();
  const ticket = store.samples().find(t => t.status === 'valid');
  const result = store.checkIn(input(ticket.token), new Date(firstTime));
  assert.equal(result.status, 200);
  assert.equal(result.body.message, 'Checked in');
  assert.equal(result.body.attendeeName, ticket.attendeeName);
  assert.equal(result.body.checkedInAt, firstTime);
  assert.equal(store.samples().find(t => t.token === ticket.token).status, 'used');
});

test('Story 6: story6_duplicate_scan_rejected', () => {
  const store = createCheckinStore();
  const ticket = store.samples().find(t => t.status === 'valid');
  store.checkIn(input(ticket.token), new Date(firstTime));
  const result = store.checkIn(input(ticket.token), new Date(secondTime));
  assert.equal(result.status, 409);
  assert.equal(result.body.message, 'Already used');
  assert.equal(result.body.checkedInAt, firstTime);
  assert.equal(store.samples().find(t => t.token === ticket.token).checkedInAt, firstTime);
});

test('Story 6: story6_invalid_scan_rejected_without_mutation', () => {
  const store = createCheckinStore();
  const before = store.samples();
  const result = store.checkIn(input('not-a-real-ticket'));
  assert.equal(result.status, 404);
  assert.deepEqual(result.body, { message: 'Invalid ticket' });
  assert.deepEqual(store.samples(), before);
});

test('Story 6: story6_concurrent_scans_single_checkin (SEC-14, one process)', async () => {
  const store = createCheckinStore();
  const ticket = store.samples().find(t => t.status === 'valid');
  const results = await Promise.all(Array.from({ length: 50 }, () => Promise.resolve().then(() => store.checkIn(input(ticket.token), new Date(firstTime)))));
  assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.equal(results.filter(r => r.status === 409 && r.body.message === 'Already used').length, 49);
  assert.equal(store.samples().find(t => t.token === ticket.token).checkedInAt, firstTime);
});

test('Story 6: story6_tokens_random_and_pii_free (token portion of SEC-13)', () => {
  const tokens = new Set();
  for (let i = 0; i < 25000; i++) {
    for (const sample of createCheckinStore().samples()) {
      assert.match(sample.token, /^[a-f0-9]{32}$/);
      assert.ok(!sample.token.includes(sample.attendeeName));
      tokens.add(sample.token);
    }
  }
  assert.equal(tokens.size, 100000);
});

test('Story 6: story6_validation_rejects_missing_or_oversized_inputs', () => {
  const store = createCheckinStore();
  const before = store.samples();
  const token = before.find(t => t.status === 'valid').token;
  for (const body of [null, [], {}, input(''), input('x'.repeat(129)), { token, officerName: '' }, { token, officerName: ' '.repeat(4) }, { token, officerName: 'x'.repeat(81) }, { token: 42, officerName: 'Demo' }]) {
    assert.equal(store.checkIn(body).status, 400);
  }
  assert.deepEqual(store.samples(), before);
});

test('Story 6: story6_sample_records_are_copies_and_restart_reseeds', () => {
  const store = createCheckinStore();
  const samples = store.samples();
  samples[0].status = 'used';
  assert.equal(store.samples()[0].status, 'valid');
  const fresh = createCheckinStore();
  assert.notEqual(fresh.samples()[0].token, store.samples()[0].token);
  assert.equal(fresh.samples()[0].status, 'valid');
});

test('Story 6: story6_seeded_used_ticket_is_rejected', () => {
  const store = createCheckinStore();
  const used = store.samples().find(t => t.status === 'used');
  const result = store.checkIn(input(used.token));
  assert.equal(result.status, 409);
  assert.equal(result.body.message, 'Already used');
  assert.equal(result.body.checkedInAt, used.checkedInAt);
});

test('Story 6: story6_api_valid_duplicate_invalid_and_no_cache', async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const body = await response.json();
  assert.equal(body.demo, true);
  assert.equal(body.tickets.length, 4);
  const ticket = body.tickets.find(t => t.status === 'valid');
  const request = payload => new Request('http://localhost/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const success = await POST(request(input(ticket.token)));
  assert.equal(success.status, 200);
  assert.equal(success.headers.get('Cache-Control'), 'no-store');
  const accepted = await success.json();
  assert.equal(accepted.attendeeName, ticket.attendeeName);
  assert.ok(!Number.isNaN(Date.parse(accepted.checkedInAt)));
  const duplicate = await POST(request(input(ticket.token)));
  assert.equal(duplicate.status, 409);
  const denied = await duplicate.json();
  assert.equal(denied.message, 'Already used');
  assert.equal(denied.checkedInAt, accepted.checkedInAt);
  const invalid = await POST(request(input('unknown-token')));
  assert.equal(invalid.status, 404);
  assert.deepEqual(await invalid.json(), { message: 'Invalid ticket' });
});

test('Story 6: story6_api_malformed_json_and_missing_name_rejected', async () => {
  const malformed = new Request('http://localhost/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal((await POST(malformed)).status, 400);
  const noName = new Request('http://localhost/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'unknown' }) });
  assert.equal((await POST(noName)).status, 400);
});
