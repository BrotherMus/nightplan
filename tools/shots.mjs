// Takes the entry's screenshots: serves game/, opens each ?shot= scene in headless Chrome over the
// DevTools protocol, waits for window.__shotReady and saves a JPEG into screenshots/.
//   node tools/shots.mjs            (all scenes in shots.json)
//   node tools/shots.mjs --probe    (also prints console errors from a normal page load)
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const gameDir = join(root, 'game');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const QUALITY = Number(process.env.SHOT_QUALITY || 86);

function serveGame() {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = join(gameDir, path === '/' ? 'index.html' : path);
    if (!file.startsWith(gameDir) || !existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'nightplan-chrome-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1280,800', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    chrome.stderr.on('data', (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolve(m[1]);
    });
    setTimeout(() => reject(new Error('chrome did not start')), 15000);
  });
  return { chrome, wsUrl };
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const waiting = new Map();
  const listeners = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && waiting.has(msg.id)) {
      waiting.get(msg.id)(msg);
      waiting.delete(msg.id);
    } else listeners.forEach((fn) => fn(msg));
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve) => {
    id += 1;
    waiting.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  return new Promise((resolve) => { ws.onopen = () => resolve({ ws, send, listeners }); });
}

async function capture(cdp, url, out, logErrors) {
  const { result } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { result: att } = await cdp.send('Target.attachToTarget', { targetId: result.targetId, flatten: true });
  const s = att.sessionId;
  await cdp.send('Runtime.enable', {}, s);
  await cdp.send('Page.enable', {}, s);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, s);
  const errors = [];
  cdp.listeners.push((m) => {
    if (m.sessionId !== s) return;
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
  });
  await cdp.send('Page.navigate', { url }, s);
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    await new Promise((r) => setTimeout(r, 150));
    const { result: r } = await cdp.send('Runtime.evaluate', { expression: 'window.__shotReady === true || !!window.__probe' }, s);
    ready = r.result.value;
    if (!url.includes('shot=') && i > 8) ready = true;
  }
  if (logErrors || errors.length) console.log(url, errors.length ? errors : 'no errors');
  if (out) {
    const { result: clip } = await cdp.send('Runtime.evaluate', {
      expression: 'JSON.stringify((() => { const r = document.getElementById("game").getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height, scale: 1280 / r.width }; })())',
    }, s);
    const c = JSON.parse(clip.result.value);
    const { result: shot } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: QUALITY, clip: c }, s);
    writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log('saved', out, Math.round(Buffer.from(shot.data, 'base64').length / 1024), 'KiB');
  }
  await cdp.send('Target.closeTarget', { targetId: result.targetId });
}

// Plays the real game with key events: title, plan, then a scripted walk; prints state and errors.
async function playtest(cdp, url) {
  const { result } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { result: att } = await cdp.send('Target.attachToTarget', { targetId: result.targetId, flatten: true });
  const s = att.sessionId;
  const errors = [];
  cdp.listeners.push((m) => {
    if (m.sessionId === s && m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description);
  });
  await cdp.send('Runtime.enable', {}, s);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, s);
  await cdp.send('Page.navigate', { url }, s);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = async (code, ms = 80) => {
    const k = code.replace('Key', '').toLowerCase();
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: code === 'Enter' ? 'Enter' : k, windowsVirtualKeyCode: code === 'Enter' ? 13 : k.toUpperCase().charCodeAt(0) }, s);
    await wait(ms);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: code === 'Enter' ? 'Enter' : k }, s);
  };
  const state = async () => (await cdp.send('Runtime.evaluate', {
    expression: 'JSON.stringify((({screen, world}) => world ? {screen, x: +world.thief.x.toFixed(2), y: +world.thief.y.toFixed(2), alarm: Math.round(world.alarm), guards: world.guards.map(g => g.state + ":" + g.x.toFixed(1) + "," + g.y.toFixed(1)), caught: !!world.caughtBy} : {screen})(window.__nightplan))',
  }, s)).result.result.value;
  await wait(800);
  await key('Enter');
  await wait(200);
  await key('Enter');
  await wait(300);
  console.log('start', await state());
  for (const [code, ms] of [['KeyS', 900], ['KeyD', 1600], ['KeyS', 1200], ['KeyD', 2500]]) {
    await key(code, ms);
    console.log(code, ms, await state());
  }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400 }, s);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 400, button: 'left', clickCount: 1 }, s);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 400, button: 'left', clickCount: 1 }, s);
  await wait(6000);
  console.log('after 6 s idle', await state());
  const run = async (js) => (await cdp.send('Runtime.evaluate', { expression: js }, s)).result.result?.value;
  // Crack the target: stand beside it and hold E.
  await run('(() => { const w = window.__nightplan.world; w.guards.forEach(g => { g.x = 2.5; g.y = 15.5; g.route = [{x: 2.5, y: 15.5}]; g.path = []; }); w.thief.x = w.map.target.x - 0.6; w.thief.y = w.map.target.y; })()');
  await key('KeyE', 4200);
  console.log('after holding E at target', await run('JSON.stringify({carrying: window.__nightplan.world.thief.carrying, take: window.__nightplan.world.take})'));
  await run('(() => { const w = window.__nightplan.world; w.thief.x = w.map.exit.x + 1.2; w.thief.y = w.map.exit.y; })()');
  await key('KeyA', 700);
  console.log('after walking to van', await run('JSON.stringify({screen: window.__nightplan.screen, total: window.__nightplan.score && window.__nightplan.score.total})'));
  // Caught: a fresh heist with the thief standing in front of a guard in the light.
  await key('Enter');
  await wait(200);
  await key('Enter');
  await wait(200);
  await run('(() => { const w = window.__nightplan.world; const g = w.guards[0]; g.route = [{x: g.x, y: g.y}]; g.path = []; w.thief.x = g.x + 2; w.thief.y = g.y; g.facing = 0; })()');
  await wait(3500);
  console.log('standing in a guard cone', await state());
  await wait(500);
  if (process.argv.includes('--snap')) {
    const { result: shot } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, s);
    writeFileSync(join(tmpdir(), 'nightplan-playtest.jpg'), Buffer.from(shot.data, 'base64'));
    console.log('snap', join(tmpdir(), 'nightplan-playtest.jpg'));
  }
  console.log('errors', errors.length ? errors : 'none');
  await cdp.send('Target.closeTarget', { targetId: result.targetId });
}

const server = await serveGame();
const base = `http://127.0.0.1:${server.address().port}/`;
const { chrome, wsUrl } = await launchChrome();
const cdp = await connect(wsUrl);
try {
  if (process.argv.includes('--probe')) await capture(cdp, base, null, true);
  if (process.argv.includes('--playtest')) {
    await playtest(cdp, base);
    process.exit(0);
  }
  const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
  mkdirSync(join(root, 'screenshots'), { recursive: true });
  for (const s of shots) await capture(cdp, base + s.query, join(root, 'screenshots', s.name), false);
} finally {
  cdp.ws.close();
  chrome.kill();
  server.close();
}
