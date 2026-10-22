import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createCheckinStore } from '../lib/checkin.mjs';

const routeUrl = new URL('../app/api/checkin/route.js', import.meta.url).href;
const scan = token => new Request('http://localhost/api/checkin', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, officerName: 'Demo Officer' }),
});

// A separate worker has a separate JS global environment and module cache.
// That models independent server instances without a database or external calls.
function inIsolatedRuntime(operation, token) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      import { parentPort, workerData } from 'node:worker_threads';
      const route = await import(workerData.url);
      let response;
      if (workerData.operation === 'get') response = await route.GET();
      else response = await route.POST(new Request('http://localhost/api/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: workerData.token, officerName: 'Demo Officer' }),
      }));
      parentPort.postMessage({ status: response.status, body: await response.json() });
    `, { eval: true, type: 'module', workerData: { url: routeUrl, operation, token } });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', code => { if (code !== 0) reject(new Error(`Isolated runtime exited ${code}`)); });
  });
}

test('Story 6 regression: separate route module loads share the same process store', async () => {
  const first = await import(`${routeUrl}?store-regression=first`);
  const second = await import(`${routeUrl}?store-regression=second`);
  const firstResponse = await first.GET();
  const secondResponse = await second.GET();
  const a = await firstResponse.json();
  const b = await secondResponse.json();
  assert.deepEqual(a.tickets.map(t => t.token), b.tickets.map(t => t.token));
  const ticket = a.tickets.find(t => t.status === 'valid');
  const accepted = await second.POST(scan(ticket.token));
  assert.equal(accepted.status, 200);
  const timestamp = (await accepted.json()).checkedInAt;
  const duplicate = await first.POST(scan(ticket.token));
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).checkedInAt, timestamp);
  assert.ok(firstResponse.headers.get('X-Demo-Store-Id'));
  assert.equal(firstResponse.headers.get('X-Demo-Store-Id'), secondResponse.headers.get('X-Demo-Store-Id'));
  assert.equal(firstResponse.headers.get('X-Demo-Fixture-Version'), 'hw3-v2');
});

test('Story 6 regression: a token returned by GET is recognized in an independent POST runtime', async () => {
  const first = await inIsolatedRuntime('get');
  const second = await inIsolatedRuntime('get');
  assert.equal(first.status, 200);
  assert.deepEqual(first.body.tickets.map(t => t.token), second.body.tickets.map(t => t.token));
  const alex = first.body.tickets.find(t => t.attendeeName === 'Sample Alex');
  const accepted = await inIsolatedRuntime('post', alex.token);
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.attendeeName, 'Sample Alex');
  // State intentionally does not cross runtimes: a fresh instance may accept
  // the same sample again. Preserve and test that limitation, never hide it.
  const independent = await inIsolatedRuntime('post', alex.token);
  assert.equal(independent.status, 200);
  const used = first.body.tickets.find(t => t.status === 'used');
  assert.equal((await inIsolatedRuntime('post', used.token)).status, 409);
  assert.equal((await inIsolatedRuntime('post', 'unknown-token')).status, 404);
});

test('Story 6 regression: explicit public seed identities stay stable but mutable state remains independent', () => {
  const tokens = ['a', 'b', 'c', 'd'].map(c => c.repeat(32));
  const first = createCheckinStore({ tokens });
  const second = createCheckinStore({ tokens });
  assert.deepEqual(first.samples().map(t => t.token), tokens);
  assert.deepEqual(second.samples().map(t => t.token), tokens);
  assert.equal(first.checkIn({ token: tokens[0], officerName: 'Demo Officer' }).status, 200);
  assert.equal(first.samples()[0].status, 'used');
  assert.equal(second.samples()[0].status, 'valid');
  assert.equal(second.checkIn({ token: tokens[0], officerName: 'Demo Officer' }).status, 200);
});

test('Story 6 regression: malformed or duplicate explicit seeds are refused', () => {
  for (const tokens of [[], ['x'], ['a', 'a', 'b', 'c'].map(c => c.repeat(32)), Array(4).fill('not-a-token')]) {
    assert.throws(() => createCheckinStore({ tokens }));
  }
});
