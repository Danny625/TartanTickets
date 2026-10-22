// HW3 Part B post-implementation browser verification. Run with the production
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
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/checkin' });
  await waitFor("document.querySelectorAll('.sample-tickets li').length === 4");
  assert.equal(await evaluate("!!document.querySelector('#officer-name') && !!document.querySelector('#qr-token')"), true);
  pass('Story 6: manual token form and four clearly labeled sample tickets load');
  assert.equal(await evaluate("document.body.innerText.includes('not authentication') && document.body.innerText.includes('not shared across Vercel')"), true);
  pass('Production authorization and server-memory limitations are visible');
  const fill = async (selector, value) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const submit = () => evaluate("document.querySelector('button[type=submit]').click()");
  const unused = await evaluate("Array.from(document.querySelectorAll('.sample-tickets li')).filter(e => e.textContent.includes('Unused sample')).map(e => ({token: e.querySelector('code').textContent, name: e.querySelector('strong').textContent}))");
  assert.equal(unused.length, 3);
  await fill('#qr-token', unused[0].token);
  await submit();
  assert.equal(await evaluate("document.querySelector('#officer-name').validity.valueMissing"), true);
  assert.equal(await evaluate("document.querySelector('.checkin-result').textContent"), '');
  pass('Empty officer label is rejected by form validation');
  await fill('#officer-name', 'Demo Officer');
  let mode = 'delay';
  handlers.set('Fetch.requestPaused', async ({ requestId }) => {
    try {
      if (mode === 'offline') await send('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' });
      else {
        if (mode === 'delay') await sleep(500);
        await send('Fetch.continueRequest', { requestId });
      }
    } catch(error) { errors.push(String(error)); }
  });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://127.0.0.1:3000/api/checkin', requestStage: 'Request' }] });
  await submit();
  await waitFor("document.querySelector('button[type=submit]').disabled && document.querySelector('.checkin-result').textContent.includes('Checking ticket')");
  await waitFor("!!document.querySelector('.checkin-success')");
  assert.equal(await evaluate("document.querySelector('.checkin-success').textContent.includes(" + JSON.stringify(unused[0].name) + ")"), true);
  const time = await evaluate("document.querySelector('.checkin-result time').dateTime");
  assert.ok(!Number.isNaN(Date.parse(time)));
  pass('Story 6: valid token checks in, shows attendee and timestamp; pending submission is disabled');
  mode = 'normal';
  await submit();
  await waitFor("document.querySelector('.checkin-rejection')?.textContent.includes('Already used')");
  assert.equal(await evaluate("document.querySelector('.checkin-result time').dateTime"), time);
  pass('Story 6: duplicate token rejected with Already used and original check-in timestamp');
  await fill('#qr-token', 'not-a-real-ticket');
  await submit();
  await waitFor("document.querySelector('.checkin-rejection')?.textContent.includes('Invalid ticket')");
  assert.equal(await evaluate("!!document.querySelector('.checkin-success')"), false);
  pass('Unknown token is rejected with Invalid ticket');
  mode = 'offline';
  await submit();
  await waitFor("document.querySelector('.checkin-rejection')?.textContent.includes('No connection')");
  assert.equal(await evaluate("!!document.querySelector('.checkin-success')"), false);
  mode = 'normal';
  await submit();
  await waitFor("document.querySelector('.checkin-rejection')?.textContent.includes('Invalid ticket')");
  pass('Offline submission never shows admission; retry after reconnect recovers');
  await fill('#qr-token', unused[1].token);
  await evaluate("document.querySelector('button[type=submit]').focus()");
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await waitFor("!!document.querySelector('.checkin-success')");
  pass('Check-in supports keyboard Enter activation');
  const scanResponses = await Promise.all(Array.from({length: 50}, () => fetch('http://127.0.0.1:3000/api/checkin', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ token: unused[2].token, officerName: 'Demo Officer' }),
  })));
  assert.equal(scanResponses.filter(response => response.status === 200).length, 1);
  assert.equal(scanResponses.filter(response => response.status === 409).length, 49);
  pass('50 real concurrent local HTTP submissions: exactly 1 success, 49 duplicate rejections (one process)');
  let screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile('verification/hw3-part-b-desktop.png', Buffer.from(screenshot.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile('verification/hw3-part-b-mobile.png', Buffer.from(screenshot.data, 'base64'));
  pass('Mobile layout has no horizontal overflow; desktop/mobile screenshots saved');
  assert.deepEqual(errors, []);
  pass('No uncaught browser exceptions');
  console.log(`HW3 Part B browser checks: ${passed} passed, 0 failed`);
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(3000)]);
  await rm(profile, { recursive: true, force: true, maxRetries: 3 });
}
