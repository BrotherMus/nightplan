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

const server = await serveGame();
const base = `http://127.0.0.1:${server.address().port}/`;
const { chrome, wsUrl } = await launchChrome();
const cdp = await connect(wsUrl);
try {
  if (process.argv.includes('--probe')) await capture(cdp, base, null, true);
  const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
  mkdirSync(join(root, 'screenshots'), { recursive: true });
  for (const s of shots) await capture(cdp, base + s.query, join(root, 'screenshots', s.name), false);
} finally {
  cdp.ws.close();
  chrome.kill();
  server.close();
}
