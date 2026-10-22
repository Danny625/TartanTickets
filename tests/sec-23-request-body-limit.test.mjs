import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from '../app/api/checkin/route.js';

const endpoint = 'http://localhost/api/checkin';
const encoder = new TextEncoder();
async function tickets() { return (await (await GET()).json()).tickets; }
function request(body, extra = {}) {
  return new Request(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body });
}
function paddedBody(bytes, { token = 'unknown-token', padding = '' } = {}) {
  const data = { token, officerName: 'Demo Officer', padding };
  const initial = JSON.stringify(data);
  assert.ok(bytes >= Buffer.byteLength(initial));
  data.padding += ' '.repeat(bytes - Buffer.byteLength(initial));
  const body = JSON.stringify(data);
  assert.equal(Buffer.byteLength(body), bytes);
  return body;
}
function streamedRequest(chunks, tracking = {}, extraHeaders = {}) {
  let index = 0;
  tracking.pulls = 0;
  tracking.cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      tracking.pulls++;
      if (index < chunks.length) controller.enqueue(chunks[index++]);
      else controller.close();
    },
    cancel() { tracking.cancelled = true; },
  }, { highWaterMark: 0 });
  return new Request(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: stream, duplex: 'half',
  });
}

test('SEC-23: oversized_request_returns_413_without_changing_ticket_state', async () => {
  const before = await tickets();
  const unused = before.find(ticket => ticket.status === 'valid');
  assert.ok(unused);
  const oversized = request(paddedBody(2049, { token: unused.token }));
  let unboundedJsonCalls = 0;
  const originalJson = oversized.json.bind(oversized);
  oversized.json = () => { unboundedJsonCalls++; return originalJson(); };
  const response = await POST(oversized);
  const after = await tickets();
  assert.deepEqual({
    status: response.status,
    ticketStateUnchanged: JSON.stringify(after) === JSON.stringify(before),
    unboundedJsonCalls,
  }, { status: 413, ticketStateUnchanged: true, unboundedJsonCalls: 0 });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { message: 'Request body exceeds 2,048 bytes.' });
});

test('SEC-23: body_at_exactly_2048_bytes_can_check_in_a_valid_ticket', async () => {
  const unused = (await tickets()).find(ticket => ticket.status === 'valid');
  assert.ok(unused);
  const response = await POST(request(paddedBody(2048, { token: unused.token })));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).message, 'Checked in');
});

test('SEC-23: body_at_2047_bytes_reaches_normal_validation', async () => {
  const response = await POST(request(paddedBody(2047)));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: 'Invalid ticket' });
});

test('SEC-23: body_at_2049_bytes_is_rejected', async () => {
  assert.equal((await POST(request(paddedBody(2049)))).status, 413);
});

test('SEC-23: streamed_body_without_content_length_stops_and_cancels_at_overflow', async () => {
  const before = await tickets();
  const unused = before.find(ticket => ticket.status === 'valid');
  const bytes = encoder.encode(paddedBody(2049, { token: unused.token }));
  const tracking = {};
  const streamed = streamedRequest([
    bytes.slice(0, 1024), bytes.slice(1024, 2048), bytes.slice(2048),
    encoder.encode('this trailing chunk must never be requested'),
  ], tracking);
  assert.equal(streamed.headers.has('Content-Length'), false);
  const response = await POST(streamed);
  assert.deepEqual({ status: response.status, pulls: tracking.pulls, cancelled: tracking.cancelled },
    { status: 413, pulls: 3, cancelled: true });
  assert.deepEqual(await tickets(), before);
});

test('SEC-23: falsely_small_content_length_cannot_bypass_actual_byte_limit', async () => {
  const response = await POST(request(paddedBody(2049), { 'Content-Length': '1' }));
  assert.equal(response.status, 413);
});

test('SEC-23: a_single_large_stream_chunk_is_rejected_and_cancelled', async () => {
  const tracking = {};
  const response = await POST(streamedRequest([encoder.encode(paddedBody(4096))], tracking));
  assert.equal(response.status, 413);
  assert.equal(tracking.cancelled, true);
  assert.equal(tracking.pulls, 1);
});

test('SEC-23: UTF8_byte_count_rejects_multibyte_body_under_2048_characters', async () => {
  const body = JSON.stringify({ token: 'unknown-token', officerName: 'Demo Officer', padding: 'é'.repeat(1000) });
  assert.ok(body.length < 2048);
  assert.ok(Buffer.byteLength(body) > 2048);
  assert.equal((await POST(request(body))).status, 413);
});

test('SEC-23: exact_limit_UTF8_json_split_inside_a_multibyte_character_still_parses', async () => {
  const bytes = encoder.encode(paddedBody(2048, { padding: 'é' }));
  const split = bytes.indexOf(0xc3) + 1;
  assert.ok(split > 0);
  const response = await POST(streamedRequest([bytes.slice(0, split), bytes.slice(split)]));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: 'Invalid ticket' });
});

test('SEC-23: oversized_malformed_json_returns_413_before_JSON_parsing', async () => {
  assert.equal((await POST(request('{' + ' '.repeat(2048)))).status, 413);
});

test('SEC-23: within_limit_malformed_JSON_and_empty_body_still_return_400', async () => {
  assert.equal((await POST(request('{'))).status, 400);
  assert.equal((await POST(new Request(endpoint, { method: 'POST' }))).status, 400);
});

test('SEC-23: stream_read_failure_returns_400_without_changing_ticket_state', async () => {
  const before = await tickets();
  const stream = new ReadableStream({ start(controller) { controller.error(new Error('Simulated read failure')); } });
  const response = await POST(new Request(endpoint, { method: 'POST', body: stream, duplex: 'half' }));
  assert.equal(response.status, 400);
  assert.deepEqual(await tickets(), before);
});
