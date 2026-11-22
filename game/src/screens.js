// Full-screen pages: title, the plan (entry + tool shop), caught, getaway payout, finale.
import { VIEW_W, VIEW_H, INK, TOOLS, BUDGET, TILE, HUD_H } from './config.js';
import { LEVELS } from './levels.js';
import { parseFloorPlan } from './map.js';
import { createGuard } from './guards.js';
import { drawPaper, drawFloorPlan, drawRoomLabels, drawPatrolRoutes, drawExitAndEntries, drawLoot, drawLasers, drawTrail, sx, sy } from './render.js';
import { createLaser } from './lasers.js';
import { explainCatch } from './catchreport.js';
import { eventColor, clock } from './heistlog.js';

const money = (v) => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US')}`;

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px "Courier New", monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function panel(ctx, x, y, w, h, edge = INK.wall) {
  ctx.fillStyle = 'rgba(7,26,51,0.94)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

export function drawTitle(ctx, t) {
  drawPaper(ctx);
  ctx.save();
  ctx.globalAlpha = 0.35;
  const map = parseFloorPlan(LEVELS[0]);
  drawFloorPlan(ctx, map);
  ctx.restore();
  panel(ctx, 190, 150, 900, 480);
  text(ctx, 'NIGHTPLAN', VIEW_W / 2, 240, 96, INK.text);
  text(ctx, 'A HEIST DRAWN ON THE ARCHITECT\'S OWN BLUEPRINTS', VIEW_W / 2, 310, 22, INK.loot);
  const lines = [
    'PLAN THE ENTRY · BUY YOUR TOOLS · READ THE CONES',
    'CRACK THE TARGET · REACH THE VAN BEFORE LOCKDOWN',
  ];
  lines.forEach((l, i) => text(ctx, l, VIEW_W / 2, 380 + i * 34, 20, INK.dim));
  if (Math.sin(t * 4) > -0.3) text(ctx, 'CLICK OR PRESS ENTER TO PLAN THE FIRST JOB', VIEW_W / 2, 520, 24, INK.safe);
  text(ctx, 'WASD MOVE · SHIFT SPRINT · HOLD E WORK · 1-3 + CLICK THROW TOOLS', VIEW_W / 2, 585, 16, INK.dim);
}

// The plan screen keeps its clickable buttons so main.js can hit-test them.
export function planButtons(plan) {
  const buttons = [];
  [1, 2, 3].forEach((k, i) => buttons.push({ id: `entry${k}`, x: 870, y: 150 + i * 46, w: 380, h: 38 }));
  TOOLS.forEach((tool, i) => {
    buttons.push({ id: `minus-${tool.id}`, x: 1130, y: 352 + i * 66, w: 34, h: 34 });
    buttons.push({ id: `plus-${tool.id}`, x: 1210, y: 352 + i * 66, w: 34, h: 34 });
  });
  buttons.push({ id: 'start', x: 870, y: 640, w: 380, h: 60 });
  return buttons;
}

export function planCost(kit) {
  return TOOLS.reduce((s, tool) => s + tool.cost * kit[tool.id], 0);
}

export function drawPlan(ctx, plan, t) {
  const level = LEVELS[plan.levelIndex];
  const map = parseFloorPlan(level);
  drawPaper(ctx);
  ctx.save();
  const scale = 0.65;
  ctx.translate(14, 96);
  ctx.scale(scale, scale);
  ctx.translate(0, -HUD_H);
  drawFloorPlan(ctx, map);
  drawRoomLabels(ctx, level);
  drawPatrolRoutes(ctx, level.guards.map(createGuard), 0.75);
  drawExitAndEntries(ctx, map, level, plan.entry);
  drawLoot(ctx, map, t);
  drawLasers(ctx, (level.lasers || []).map(createLaser));
  level.cameras.forEach((c) => {
    ctx.fillStyle = 'rgba(255,154,31,0.22)';
    ctx.beginPath();
    ctx.moveTo(sx(c.x), sy(c.y));
    ctx.arc(sx(c.x), sy(c.y), TILE * 4, c.angle - c.sweep - 0.36, c.angle + c.sweep + 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INK.cameraCone;
    ctx.fillRect(sx(c.x) - 8, sy(c.y) - 6, 16, 12);
  });
  const e = map.entries[plan.entry];
  ctx.strokeStyle = INK.text;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx(e.x), sy(e.y), 24 + Math.sin(t * 5) * 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  text(ctx, `${level.sheet} · ${level.site}`, 14, 30, 22, INK.text, 'left');
  text(ctx, `TARGET: ${level.target} (${money(level.targetValue)})`, 14, 56, 16, INK.loot, 'left');
  const notes = [
    ['RED DOTS', 'GUARD PATROL ROUTES: LEARN THEIR LOOPS', INK.guardCone],
    ['ORANGE FANS', 'CAMERA SWEEPS: EMP TAG BLINDS ONE FOR 9 s', INK.cameraCone],
    ['GREEN HATCH', 'SHADOW: GUARDS NOTICE YOU 4x SLOWER', INK.safe],
    ['TWO WAYS IN', 'PICK THE VAULT LOCK UNDER WATCH, OR CRAWL THE VENT', INK.vent],
    ['GOLD', 'THE TARGET AND CASH BUNDLES: CARRY THEM TO THE VAN', INK.loot],
    ['MAGENTA', 'LASERS SWITCH ON AND OFF: CROSS IN THE GAP', INK.laser],
  ];
  notes.forEach(([k, v, c], i) => {
    text(ctx, k, 14, 570 + i * 30, 15, c, 'left');
    text(ctx, v, 170, 570 + i * 30, 15, INK.text, 'left', 'normal');
  });

  panel(ctx, 852, 70, 412, 650);
  text(ctx, 'THE PLAN', 1058, 104, 30, INK.text);
  text(ctx, 'CHOOSE AN ENTRY', 870, 136, 14, INK.dim, 'left');
  planButtons(plan).forEach((b) => {
    if (b.id.startsWith('entry')) {
      const k = Number(b.id.slice(5));
      const on = plan.entry === k;
      ctx.fillStyle = on ? 'rgba(226,244,255,0.16)' : 'rgba(255,255,255,0.03)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = on ? INK.text : INK.dim;
      ctx.lineWidth = on ? 2 : 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      text(ctx, `${k}  ${level.entries[k]}`, b.x + 14, b.y + b.h / 2, 18, on ? INK.text : INK.dim, 'left');
    }
  });
  const spent = planCost(plan.kit);
  text(ctx, `TOOLS · BUDGET ${money(BUDGET - spent)} LEFT`, 870, 316, 14, INK.dim, 'left');
  TOOLS.forEach((tool, i) => {
    const y = 352 + i * 66;
    text(ctx, `${tool.name}  ${money(tool.cost)}`, 870, y + 8, 16, INK.text, 'left');
    text(ctx, tool.blurb, 870, y + 30, 11, INK.dim, 'left', 'normal');
    ctx.strokeStyle = INK.wall;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1130, y, 34, 34);
    ctx.strokeRect(1210, y, 34, 34);
    text(ctx, '-', 1147, y + 17, 22, INK.text);
    text(ctx, '+', 1227, y + 17, 22, INK.text);
    text(ctx, String(plan.kit[tool.id]), 1187, y + 17, 22, INK.loot);
  });
  text(ctx, 'EVERY DOLLAR SPENT COMES OUT OF THE TAKE', 1058, 560, 13, INK.cameraCone);
  const lasers = (level.lasers || []).length;
  text(ctx, `GUARDS ${level.guards.length} · CAMERAS ${level.cameras.length} · LASERS ${lasers} · PAR ${level.par}s`, 1058, 595, 15, INK.text);
  ctx.fillStyle = 'rgba(63,224,140,0.18)';
  ctx.fillRect(870, 640, 380, 60);
  ctx.strokeStyle = INK.safe;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(870, 640, 380, 60);
  text(ctx, 'START THE JOB  [ENTER]', 1060, 671, 22, INK.safe);
}

function wrapLines(ctx, str, width, size) {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  const out = [''];
  str.split(' ').forEach((w) => {
    const next = out[out.length - 1] ? `${out[out.length - 1]} ${w}` : w;
    if (ctx.measureText(next).width > width && out[out.length - 1]) out.push(w);
    else out[out.length - 1] = next;
  });
  return out;
}

// The guard's awareness over the last six seconds: shaded where it could see you, with the ? and ! lines.
function drawAwarenessGraph(ctx, report, x, y, w, h) {
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK.dim;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  const px = (tt) => x + ((tt - report.start) / (report.end - report.start)) * w;
  const py = (a) => y + h - a * (h - 10);
  report.samples.forEach((s) => {
    if (!s.sees) return;
    ctx.fillStyle = 'rgba(255,64,64,0.22)';
    ctx.fillRect(px(s.t), y, w / 60 + 1, h);
  });
  [[0.35, '?', INK.loot], [1, '!', INK.alarm]].forEach(([a, mark, c]) => {
    ctx.strokeStyle = c;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x, py(a));
    ctx.lineTo(x + w, py(a));
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, mark, x - 12, py(a), 16, c);
  });
  ctx.strokeStyle = INK.text;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  report.samples.forEach((s, i) => (i ? ctx.lineTo(px(s.t), py(s.aware)) : ctx.moveTo(px(s.t), py(s.aware))));
  ctx.stroke();
  text(ctx, '-6 s', x, y + h + 14, 11, INK.dim, 'left', 'normal');
  text(ctx, 'CAUGHT', x + w, y + h + 14, 11, INK.alarm, 'right');
  text(ctx, 'RED = IN HIS CONE', x + w / 2, y + h + 14, 11, INK.guardCone, 'center', 'normal');
}

// The caught page: the frozen frame stays visible, with the evidence that the catch was fair.
export function drawCaught(ctx, world, t) {
  const by = world.caughtBy;
  const report = explainCatch(world);
  ctx.fillStyle = 'rgba(60,0,15,0.28)';
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  const th = world.thief;
  if (!by.police) {
    ctx.strokeStyle = INK.alarm;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(sx(by.x), sy(by.y));
    ctx.lineTo(sx(th.x), sy(th.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(sx(by.x), sy(by.y), 24 + Math.sin(t * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (report.shade && report.shade.d < 5) {
    ctx.strokeStyle = INK.safe;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(sx(th.x), sy(th.y));
    ctx.lineTo(sx(report.shade.x), sy(report.shade.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeRect(sx(report.shade.x) - 20, sy(report.shade.y) - 20, 40, 40);
    text(ctx, 'HIDE HERE', sx(report.shade.x), sy(report.shade.y) - 30, 13, INK.safe);
  }
  const left = 852;
  const right = 1244;
  const mid = (left + right) / 2;
  panel(ctx, left - 22, HUD_H + 10, right - left + 44, VIEW_H - HUD_H - 20, INK.alarm);
  text(ctx, 'CAUGHT', mid, 128, 66, INK.alarm);
  text(ctx, by.police ? 'BY THE POLICE · THE CLOCK RAN OUT' : `BY ${by.name} · A FAIR CALL`, mid, 176, 17, INK.text);
  report.lines.forEach((line, i) => {
    const y = 222 + i * 34;
    text(ctx, '✓', left, y, 18, INK.safe, 'left');
    text(ctx, line, left + 24, y, 14, INK.text, 'left');
  });
  if (!report.police) {
    text(ctx, 'HIS AWARENESS, LAST 6 SECONDS', left, 336, 13, INK.dim, 'left');
    drawAwarenessGraph(ctx, report, left + 16, 352, right - left - 16, 130);
  }
  text(ctx, 'WHAT WOULD HAVE WORKED', left, 532, 13, INK.dim, 'left');
  wrapLines(ctx, report.tip, right - left, 16).forEach((line, i) => text(ctx, line, left, 560 + i * 24, 16, INK.safe, 'left'));
  text(ctx, `ALARM ${Math.round(world.alarm)}% · ${clock(world.time)} IN · ${money(world.take)} DROPPED`, mid, 636, 14, INK.dim);
  if (Math.sin(t * 4) > -0.3) {
    text(ctx, 'ENTER: TRY THE SAME PLAN', mid, 682, 18, INK.text);
    text(ctx, 'R: REDRAW THE PLAN', mid, 712, 15, INK.dim);
  }
}

// Numbered pins on the plans, one per logged moment of the night.
function drawEventPins(ctx, log) {
  log.forEach((e, i) => {
    ctx.fillStyle = INK.paperDeep;
    ctx.strokeStyle = eventColor(e.kind);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx(e.x), sy(e.y), 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    text(ctx, String(i + 1), sx(e.x), sy(e.y) + 1, 18, eventColor(e.kind));
  });
}

// The getaway sheet: the whole floor with the route and every moment pinned on it, the payout,
// and the plan checked against how the night went.
export function drawResults(ctx, world, score, t) {
  drawPaper(ctx);
  const log = world.log || [];
  ctx.save();
  ctx.translate(14, 78);
  ctx.scale(0.62, 0.62);
  ctx.translate(0, -HUD_H);
  drawFloorPlan(ctx, world.map);
  drawRoomLabels(ctx, world.level);
  drawLasers(ctx, world.lasers);
  drawExitAndEntries(ctx, world.map, world.level, world.entry);
  drawLoot(ctx, world.map, t);
  drawTrail(ctx, world.thief.trail, INK.loot, 6);
  drawEventPins(ctx, log);
  ctx.restore();
  text(ctx, 'THE ROUTE YOU TOOK, EVERY MOMENT PINNED ON THE PLANS', 14, 36, 20, INK.loot, 'left');
  text(ctx, `${world.level.sheet} · ${world.level.site}`, 14, 60, 14, INK.dim, 'left');

  text(ctx, 'THE NIGHT, PIN BY PIN', 14, 524, 14, INK.dim, 'left');
  log.slice(0, 16).forEach((e, i) => {
    const x = 14 + Math.floor(i / 8) * 400;
    const y = 552 + (i % 8) * 27;
    text(ctx, String(i + 1).padStart(2, ' '), x + 10, y, 15, eventColor(e.kind));
    text(ctx, clock(e.t), x + 34, y, 14, INK.dim, 'left', 'normal');
    text(ctx, e.text, x + 90, y, 14, e.kind === 'alarm' ? INK.alarm : INK.text, 'left');
  });

  const left = 852;
  const right = 1244;
  const mid = (left + right) / 2;
  panel(ctx, left - 22, 20, right - left + 44, 760, INK.safe);
  text(ctx, score.ghost ? 'CLEAN GETAWAY' : 'GETAWAY', mid, 66, 40, INK.safe);
  text(ctx, `${world.level.target} IS IN THE VAN`, mid, 104, 13, INK.dim);
  score.lines.forEach((l, i) => {
    const y = 146 + i * 36;
    text(ctx, l.label, left, y, 15, INK.text, 'left');
    text(ctx, money(l.value), right, y, 19, l.value < 0 ? INK.alarm : INK.loot, 'right');
  });
  ctx.strokeStyle = INK.wall;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, 328);
  ctx.lineTo(right, 328);
  ctx.stroke();
  text(ctx, 'CREW TAKE', left, 362, 22, INK.text, 'left');
  text(ctx, money(score.total), right, 362, 32, INK.loot, 'right');
  text(ctx, `${'★'.repeat(score.stars)}${'☆'.repeat(3 - score.stars)}`, mid, 414, 44, INK.loot);

  text(ctx, 'THE PLAN, CHECKED', left, 470, 13, INK.dim, 'left');
  const bought = Object.values(world.bought || {}).reduce((s, n) => s + n, 0);
  const checks = [
    [`ENTRY: ${world.level.entries[world.entry]}`, true],
    [`TOOLS: BOUGHT ${bought} · USED ${world.toolsUsed}`, world.toolsUsed >= bought],
    [score.ghost ? 'ALARMS: NONE, A GHOST RUN' : `ALARMS: ${world.alarmsRaised}`, score.ghost],
    [`TIME ${clock(world.time)} · PAR ${clock(world.level.par)}`, world.time <= world.level.par],
    [`CASH BUNDLES: ${world.map.cash.filter((c) => c.taken).length} OF ${world.map.cash.length}`, world.cashTaken >= 300],
  ];
  checks.forEach(([label, ok], i) => {
    const y = 504 + i * 34;
    text(ctx, ok ? '✓' : '✗', left, y, 18, ok ? INK.safe : INK.alarm, 'left');
    text(ctx, label, left + 26, y, 14, INK.text, 'left');
  });
  if (Math.sin(t * 4) > -0.3) {
    const last = world.levelIndex >= LEVELS.length - 1;
    text(ctx, last ? 'ENTER: CLOSE THE BOOKS' : 'ENTER: PLAN THE NEXT JOB', mid, 732, 18, INK.safe);
  }
}

export function drawFinale(ctx, totals, t) {
  drawPaper(ctx);
  panel(ctx, 240, 160, 800, 460, INK.loot);
  text(ctx, 'THE BOOKS ARE CLOSED', VIEW_W / 2, 230, 50, INK.loot);
  totals.forEach((row, i) => {
    text(ctx, row.site, 300, 310 + i * 48, 20, INK.text, 'left');
    text(ctx, money(row.total), 980, 310 + i * 48, 22, INK.loot, 'right');
  });
  const sum = totals.reduce((s, r) => s + r.total, 0);
  text(ctx, `CREW TOTAL ${money(sum)}`, VIEW_W / 2, 480, 34, INK.text);
  if (Math.sin(t * 4) > -0.3) text(ctx, 'ENTER: START A NEW NIGHT', VIEW_W / 2, 560, 22, INK.safe);
}
