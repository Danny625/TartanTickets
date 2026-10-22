// Additional post-implementation browser verification. Run with the production
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
  await send('Page.navigate', { url: 'http://127.0.0.1:3000' });
  await waitFor("document.querySelectorAll('article').length === 3");
  await sleep(400);
  const cards = await evaluate("Array.from(document.querySelectorAll('article')).map(e => e.innerText)");
  assert.match(cards[0], /Tartan After Hours/);
  assert.match(cards[0], /\$12\.00/);
  assert.match(cards[0], /24 seats remaining/);
  assert.match(cards[1], /Free/);
  assert.match(cards[1], /35 seats remaining/);
  for (const card of cards) { assert.match(card, /2026/); assert.match(card, /PM/); }
  assert.match(cards[0], /Cohon Center/);
  assert.match(cards[1], /McConomy Auditorium/);
  assert.match(cards[2], /Studio Theater/);
  pass('Story 1: all three cards display dates, locations, prices and remaining seats');
  const labels = await evaluate("Array.from(document.querySelectorAll('.event-action')).map(e => e.textContent)");
  assert.match(labels[0], /^Buy/);
  assert.match(labels[2], /^Join waitlist/);
  assert.ok(!labels[2].includes('Buy'));
  assert.ok(!cards.join('').includes('Welcome Mixer'));
  pass('Story 1: sold-out card replaces Buy with Join waitlist; past event is hidden');
  await evaluate("document.querySelector('.explore-link').click()");
  await waitFor("location.hash === '#events'");
  pass('Browse link moves to the events section');
  await evaluate("document.querySelector('.event-action').click()");
  await waitFor("document.querySelector('.notice')?.textContent.includes('No payment or reservation')");
  await evaluate("document.querySelector('[aria-label=\"Dismiss message\"]').click()");
  await evaluate("document.querySelector('.waitlist-action').click()");
  await waitFor("document.querySelector('.notice')?.textContent.includes('not been added')");
  await evaluate("document.querySelector('[aria-label=\"Dismiss message\"]').click()");
  pass('Hydrated Buy and Join waitlist controls explain deferred stories without creating transactions');

  const baseline = await (await fetch('http://127.0.0.1:3000/api/events')).json();
  let responseMode = 'delay';
  handlers.set('Fetch.requestPaused', async ({ requestId }) => {
    try {
      const mode = responseMode;
      if (mode === 'delay') await sleep(600);
      let body = baseline;
      if (mode === 'empty') body = { events: [] };
      if (mode === 'injected') body = { events: baseline.events.map(e => ({ ...e, description: '<img src=x onerror="window.__xssProbe=1">' })) };
      await send('Fetch.fulfillRequest', {
        requestId, responseCode: mode === 'error' ? 503 : 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify(body)).toString('base64'),
      });
    } catch (error) { errors.push(String(error)); }
  });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://127.0.0.1:3000/api/events', requestStage: 'Request' }] });
  await evaluate("document.querySelector('.refresh-button').click()");
  await waitFor("document.querySelector('.refresh-button').disabled && document.querySelector('.status-line').textContent.includes('Loading')");
  await waitFor("document.querySelector('.status-line').textContent.includes('up to date')");
  pass('Refresh shows loading, disables the refresh button, and announces success');
  responseMode = 'error';
  await evaluate("document.querySelector('.refresh-button').click()");
  await waitFor("!!document.querySelector('[role=alert]')");
  assert.equal(await evaluate("document.querySelectorAll('article').length"), 3);
  responseMode = 'normal';
  await evaluate("document.querySelector('.error-box button').click()");
  await waitFor("!document.querySelector('[role=alert]') && document.querySelector('.status-line').textContent.includes('up to date')");
  pass('Failed refresh preserves cards; Try again recovers');
  responseMode = 'empty';
  await evaluate("document.querySelector('.refresh-button').click()");
  await waitFor("document.querySelector('.empty-state')?.textContent.includes('No upcoming events yet.')");
  assert.equal(await evaluate("document.querySelectorAll('article').length"), 0);
  pass('Empty API response displays No upcoming events yet.');
  responseMode = 'injected';
  await evaluate("document.querySelector('.refresh-button').click()");
  await waitFor("document.querySelectorAll('article').length === 3");
  assert.equal(await evaluate("document.querySelector('.event-description').textContent"), '<img src=x onerror="window.__xssProbe=1">');
  assert.equal(await evaluate("document.querySelectorAll('.event-description img').length"), 0);
  assert.equal(await evaluate("window.__xssProbe === undefined"), true);
  pass('SEC-20: injected event description displays as text and does not create executable HTML');
  responseMode = 'normal';
  await evaluate("document.querySelector('.refresh-button').click()");
  await waitFor("document.querySelector('.event-description')?.textContent.startsWith('An evening')");
  responseMode = 'delay';
  await evaluate("document.querySelector('.refresh-button').focus()");
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await waitFor("document.querySelector('.refresh-button').disabled && document.querySelector('.status-line').textContent.includes('Loading')");
  await waitFor("document.querySelector('.status-line').textContent.includes('up to date')");
  pass('Refresh control supports keyboard Enter activation');
  await evaluate('window.scrollTo(0, 0)');
  let screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile('verification/desktop.png', Buffer.from(screenshot.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.event-grid')).gridTemplateColumns.split(' ').length"), 1);
  screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile('verification/mobile.png', Buffer.from(screenshot.data, 'base64'));
  pass('390px viewport uses a single column without horizontal overflow; desktop and mobile screenshots saved');
  assert.deepEqual(errors, []);
  pass('No uncaught browser exceptions');
  console.log(`Browser checks: ${passed} passed, 0 failed`);
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(3000)]);
  await rm(profile, { recursive: true, force: true, maxRetries: 3 });
}
