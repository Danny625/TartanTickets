// Run against the local production server: node verification/hw3-part-c-http.mjs
import assert from 'node:assert/strict';
import http from 'node:http';

const endpoint = 'http://127.0.0.1:3000/api/checkin';
const samples = async () => (await (await fetch(endpoint)).json()).tickets;
function paddedBody(size, token = 'unknown-token') {
  const payload = { token, officerName: 'Demo Officer', padding: '' };
  payload.padding = ' '.repeat(size - Buffer.byteLength(JSON.stringify(payload)));
  const body = JSON.stringify(payload);
  assert.equal(Buffer.byteLength(body), size);
  return body;
}
const post = body => fetch(endpoint, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
});
function chunkedPost(body) {
  return new Promise((resolve, reject) => {
    const request = http.request(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, response => {
      response.resume();
      response.on('end', () => resolve({ status: response.statusCode, transferEncoding: request.getHeader('Transfer-Encoding'), contentLength: request.getHeader('Content-Length') }));
    });
    request.on('error', reject);
    const bytes = Buffer.from(body);
    request.write(bytes.subarray(0, 1024));
    request.write(bytes.subarray(1024, 2048));
    request.end(bytes.subarray(2048));
  });
}
let passed = 0;
function pass(message) { passed++; console.log(`PASS ${message}`); }
const before = await samples();
const unused = before.find(ticket => ticket.status === 'valid');
assert.ok(unused, 'Start a fresh local server to reseed unused fixtures.');
let response = await post(paddedBody(2049, unused.token));
assert.equal(response.status, 413);
assert.deepEqual(await response.json(), { message: 'Request body exceeds 2,048 bytes.' });
assert.deepEqual(await samples(), before);
pass('Real HTTP: 2,049-byte valid-token request returns 413 and leaves ticket state unchanged');
const streamed = await chunkedPost(paddedBody(2049, unused.token));
assert.equal(streamed.status, 413);
assert.equal(streamed.contentLength, undefined);
assert.deepEqual(await samples(), before);
pass('Real HTTP streamed request without Content-Length: 2,049 bytes returns 413 without mutation');
response = await post(paddedBody(2048, unused.token));
assert.equal(response.status, 200);
assert.equal((await response.json()).message, 'Checked in');
pass('Real HTTP: exactly 2,048 bytes reaches normal check-in and returns 200');
response = await post(paddedBody(2047));
assert.equal(response.status, 404);
pass('Real HTTP: 2,047-byte JSON reaches normal unknown-token validation (404)');
const unicode = JSON.stringify({ token: 'unknown-token', officerName: 'Demo Officer', padding: 'é'.repeat(1000) });
assert.ok(unicode.length < 2048 && Buffer.byteLength(unicode) > 2048);
assert.equal((await post(unicode)).status, 413);
pass('Real HTTP: multibyte payload exceeding 2,048 bytes is rejected even below 2,048 characters');
console.log(`Part C HTTP checks: ${passed} passed, 0 failed`);
