// Deployed Story 6 valid-token regression verification. Pass the public HTTPS URL as argv[2]. Run with the production
// server already running: node verification/browser-check.mjs
// Uses installed Chrome with a fresh temporary profile and no extra packages.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profile = await mkdtemp(join(tmpdir(), 'tartan-browser-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeError = '';
chrome.stderr.on('data', chunk => { chromeError = (chromeError + chunk).slice(-4000); });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
let passed = 0;
function pass(message) { passed++; console.log(`PASS ${message}`); }
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
    catch { await sleep(100); }
  }
  assert.ok(port, `Chrome failed to start: ${chromeError}`);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find(item => item.type === 'page');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  const handlers = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id);
      if (item) { pending.delete(message.id); message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result); }
    } else handlers.get(message.method)?.(message.params);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return;
      await sleep(50);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  const errors = [];
  handlers.set('Runtime.exceptionThrown', data => errors.push(data));
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1200, deviceScaleFactor: 1, mobile: false });
  const base = new URL(process.argv[2]);
  assert.equal(base.protocol, 'https:', 'Live verification requires the public HTTPS deployment URL.');
  const report = { url: base.origin, checkedAt: new Date().toISOString(), automated: true, checks: [] };
  const probes = [];
  for (let i=0; i<3; i++) {
    const response = await fetch(new URL('/api/checkin', base), { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-Demo-Fixture-Version'), 'hw3-v2');
    const data = await response.json();
    assert.equal(data.tickets.length, 4);
    probes.push({ storeId: response.headers.get('X-Demo-Store-Id'), tokens: data.tickets.map(t => t.token) });
  }
  assert.deepEqual(probes[0].tokens, probes[1].tokens);
  assert.deepEqual(probes[1].tokens, probes[2].tokens);
  report.catalog = { fixtureVersion: 'hw3-v2', stableAcrossThreeGets: true, distinctStoreIdsObserved: new Set(probes.map(p => p.storeId)).size };
  pass('Live deployment serves hw3-v2 and a stable sample catalog across three GET requests');
  const requests = [];
  const responseHeader = (response, name) => Object.entries(response.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  await send('Network.enable');
  handlers.set('Network.responseReceived', ({ response }) => {
    if (new URL(response.url).pathname === '/api/checkin') requests.push({ status: response.status, storeId: responseHeader(response, 'X-Demo-Store-Id'), fixtureVersion: responseHeader(response, 'X-Demo-Fixture-Version') });
  });
  await send('Page.navigate', { url: new URL('/checkin', base).href });
  await waitFor("document.querySelectorAll('.sample-tickets li').length === 4");
  await sleep(400);
  const samples = await evaluate("Array.from(document.querySelectorAll('.sample-tickets li')).map(e => ({name: e.querySelector('strong').textContent, token: e.querySelector('code').textContent, unused: e.textContent.includes('Unused sample')}))");
  const sample = samples.find(t => t.name === 'Sample Alex' && t.unused) || samples.find(t => t.unused);
  assert.ok(sample, 'No unused live fixtures remain. A fresh deployment is needed for a first-use verification.');
  const fill = async (selector, value) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const submit = () => evaluate("document.querySelector('button[type=submit]').click()");
  await fill('#officer-name', 'Demo Officer');
  await fill('#qr-token', sample.token);
  let before = requests.length;
  await submit();
  for(let i=0; i<100 && requests.length === before; i++) await sleep(100);
  const accepted = requests.at(-1);
  assert.ok(requests.length > before);
  assert.equal(accepted.status, 200);
  await waitFor("!!document.querySelector('.checkin-success')");
  assert.equal(await evaluate("document.querySelector('.checkin-success').textContent.includes(" + JSON.stringify(sample.name) + ")"), true);
  const firstTime = await evaluate("document.querySelector('.checkin-result time').dateTime");
  assert.ok(!Number.isNaN(Date.parse(firstTime)));
  report.checks.push({ action: 'Enter the exact unused token displayed on the live page with Demo Officer', sampleName: sample.name, status: accepted.status, outcome: 'Checked in', timestamp: firstTime, storeId: accepted.storeId, result: 'Passed' });
  pass(`Live browser: exact displayed unused ${sample.name} token is accepted with attendee and timestamp`);
  before = requests.length;
  await submit();
  for(let i=0; i<100 && requests.length === before; i++) await sleep(100);
  const duplicate = requests.at(-1);
  assert.ok(requests.length > before);
  if (duplicate.status === 409) {
    await waitFor("document.querySelector('.checkin-rejection')?.textContent.includes('Already used')");
    assert.equal(await evaluate("document.querySelector('.checkin-result time').dateTime"), firstTime);
    report.checks.push({ action: 'Submit the same token again', status: 409, outcome: 'Already used', timestampPreserved: true, storeId: duplicate.storeId, result: 'Passed on observed runtime' });
    pass('Live browser: repeat rejected with Already used and original timestamp');
  } else {
    assert.equal(duplicate.status, 200, 'A known public token must never become unknown in another instance.');
    assert.notEqual(duplicate.storeId, accepted.storeId, 'One runtime must not accept a duplicate.');
    report.checks.push({ action: 'Submit the same token again', status: 200, outcome: 'Accepted by a different instance', storeId: duplicate.storeId, result: 'Distributed duplicate limitation observed; not a pass' });
    console.log('OBSERVED LIMITATION: duplicate accepted by a distinct store; no distributed duplicate guarantee.');
  }
  await fill('#qr-token', 'not-a-real-ticket');
  before = requests.length;
  await submit();
  for(let i=0; i<100 && requests.length === before; i++) await sleep(100);
  const invalid = requests.at(-1);
  assert.ok(requests.length > before);
  assert.equal(invalid.status, 404);
  await waitFor("document.querySelector('.checkin-rejection')?.textContent.includes('Invalid ticket')");
  report.checks.push({ action: 'Submit not-a-real-ticket', status: 404, outcome: 'Invalid ticket', storeId: invalid.storeId, result: 'Passed' });
  pass('Live browser: genuinely unknown token rejected with Invalid ticket');
  assert.deepEqual(errors, []);
  pass('No uncaught browser exceptions during live verification');
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile('verification/hw3-part-b-checkin-fix-live.png', Buffer.from(screenshot.data, 'base64'));
  report.limitations = 'This is automated deployed-browser evidence, not the user manual retest. No database or cross-instance duplicate guarantee.';
  await writeFile('verification/hw3-part-b-checkin-fix-live-after.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  console.log(`Deployed browser verification: ${passed} checks passed; any distributed duplicate limitation is recorded separately.`);
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(3000)]);
  await rm(profile, { recursive: true, force: true, maxRetries: 3 });
}
