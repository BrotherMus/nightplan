// Nightplan's loop: screens, input routing, the heist step and drawing.
import { VIEW_W, VIEW_H, TILE, HUD_H, LEGEND_H, TOOLS, BUDGET } from './config.js';
import { LEVELS } from './levels.js';
import { bindInput, isHeld, takePresses, takeClicks, mousePos, moveDirection } from './input.js';
import { createHeist, updateHeist, scoreHeist } from './heist.js';
import { useTool } from './tools.js';
import { drawHeist } from './render.js';
import { drawHud, drawLegend, drawBanner } from './hud.js';
import { drawTitle, drawPlan, drawCaught, drawResults, drawFinale, planButtons, planCost } from './screens.js';
import { startAudio, playEffects, updateMusic } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');

const app = {
  screen: 'title', t: 0, paused: false, tool: 'coin', aim: null,
  plan: { levelIndex: 0, entry: 1, kit: { coin: 3, smoke: 1, emp: 1 } },
  world: null, score: null, totals: [],
};

function startHeist() {
  const { levelIndex, entry, kit } = app.plan;
  app.world = createHeist(levelIndex, { entry, kit, spent: planCost(kit) });
  app.screen = 'play';
  app.paused = false;
}

function mapAim() {
  const m = mousePos();
  if (!m.inside || m.y < HUD_H || m.y > VIEW_H - LEGEND_H) return null;
  return { x: m.x / TILE, y: (m.y - HUD_H) / TILE };
}

function changeKit(id, delta) {
  const kit = app.plan.kit;
  const next = { ...kit, [id]: Math.max(0, kit[id] + delta) };
  if (planCost(next) <= BUDGET) app.plan.kit = next;
}

function handlePlan(presses, clicks) {
  presses.forEach((code) => {
    if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') app.plan.entry = Number(code.slice(5));
    if (code === 'Enter' || code === 'Space') startHeist();
  });
  clicks.forEach((c) => {
    const hit = planButtons(app.plan).find((b) => c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h);
    if (!hit) return;
    if (hit.id.startsWith('entry')) app.plan.entry = Number(hit.id.slice(5));
    else if (hit.id.startsWith('plus-')) changeKit(hit.id.slice(5), 1);
    else if (hit.id.startsWith('minus-')) changeKit(hit.id.slice(6), -1);
    else if (hit.id === 'start') startHeist();
  });
}

function handlePlay(presses, clicks, dt) {
  const world = app.world;
  presses.forEach((code) => {
    if (code === 'KeyP' || code === 'Escape') app.paused = !app.paused;
    if (code === 'KeyN') world.showNotes = !world.showNotes;
    const tool = TOOLS.find((t) => `Digit${t.key}` === code);
    if (tool) app.tool = tool.id;
  });
  if (app.paused) return;
  app.aim = mapAim();
  clicks.forEach((c) => {
    if (c.button === 2) {
      const i = TOOLS.findIndex((t) => t.id === app.tool);
      app.tool = TOOLS[(i + 1) % TOOLS.length].id;
    } else if (app.aim) {
      useTool(world, app.tool, app.aim);
    }
  });
  updateHeist(world, { dir: moveDirection(), sprint: isHeld('ShiftLeft', 'ShiftRight'), interact: isHeld('KeyE') }, dt);
  playEffects(world.sfx.splice(0));
  updateMusic(world.alarm, world.lockdown, dt);
  if (world.caughtBy) {
    playEffects(['caught']);
    app.screen = 'caught';
  } else if (world.escaped) {
    app.score = scoreHeist(world);
    app.screen = 'results';
  }
}

function step(dt) {
  app.t += dt;
  const presses = takePresses();
  const clicks = takeClicks();
  if (presses.length || clicks.length) startAudio();
  const confirm = presses.includes('Enter') || presses.includes('Space') || clicks.length > 0;
  if (app.screen === 'title') {
    if (confirm) app.screen = 'plan';
  } else if (app.screen === 'plan') {
    handlePlan(presses, clicks);
  } else if (app.screen === 'play') {
    handlePlay(presses, clicks, dt);
  } else if (app.screen === 'caught') {
    if (presses.includes('KeyR')) app.screen = 'plan';
    else if (presses.includes('Enter') || presses.includes('Space')) startHeist();
  } else if (app.screen === 'results') {
    if (confirm) {
      app.totals.push({ site: app.world.level.site, total: app.score.total });
      const next = app.world.levelIndex + 1;
      if (next < LEVELS.length) {
        app.plan = { ...app.plan, levelIndex: next, entry: 1 };
        app.screen = 'plan';
      } else {
        app.screen = 'finale';
      }
    }
  } else if (app.screen === 'finale' && confirm) {
    app.totals = [];
    app.plan = { levelIndex: 0, entry: 1, kit: { coin: 3, smoke: 1, emp: 1 } };
    app.screen = 'title';
  }
}

function draw() {
  if (app.screen === 'title') return drawTitle(ctx, app.t);
  if (app.screen === 'plan') return drawPlan(ctx, app.plan, app.t);
  if (app.screen === 'results') return drawResults(ctx, app.world, app.score, app.t);
  if (app.screen === 'finale') return drawFinale(ctx, app.totals, app.t);
  const world = app.world;
  drawHeist(ctx, world, app.t, app.screen === 'play' ? app.aim : null, app.tool);
  drawHud(ctx, world, app.t, app.tool);
  drawLegend(ctx);
  drawBanner(ctx, world);
  if (app.screen === 'caught') drawCaught(ctx, world, app.t);
  if (app.paused) {
    ctx.fillStyle = 'rgba(7,26,51,0.7)';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H - LEGEND_H);
    ctx.fillStyle = '#e2f4ff';
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED · P TO RESUME', VIEW_W / 2, VIEW_H / 2);
  }
}

bindInput(canvas);
window.__nightplan = app; // read by tools/shots.mjs --playtest
const shot = new URLSearchParams(location.search).get('shot');
if (shot && stageShot(app, shot)) {
  app.t = 0.3; // a moment when the blinking prompts are lit
  draw();
  window.__shotReady = true;
} else {
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
