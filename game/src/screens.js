// Full-screen pages: title, the plan (entry + tool shop), caught, getaway payout, finale.
import { VIEW_W, VIEW_H, INK, TOOLS, BUDGET, TILE, HUD_H } from './config.js';
import { LEVELS } from './levels.js';
import { parseFloorPlan } from './map.js';
import { createGuard } from './guards.js';
import { drawPaper, drawFloorPlan, drawRoomLabels, drawPatrolRoutes, drawExitAndEntries, drawLoot, drawTrail, sx, sy } from './render.js';

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
  text(ctx, `GUARDS ${level.guards.length} · CAMERAS ${level.cameras.length} · PAR ${level.par}s`, 1058, 595, 15, INK.text);
  ctx.fillStyle = 'rgba(63,224,140,0.18)';
  ctx.fillRect(870, 640, 380, 60);
  ctx.strokeStyle = INK.safe;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(870, 640, 380, 60);
  text(ctx, 'START THE JOB  [ENTER]', 1060, 671, 22, INK.safe);
}

export function drawCaught(ctx, world, t) {
  const by = world.caughtBy;
  ctx.fillStyle = 'rgba(40,0,10,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (!by.police) {
    ctx.strokeStyle = INK.alarm;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(sx(by.x), sy(by.y));
    ctx.lineTo(sx(world.thief.x), sy(world.thief.y));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  panel(ctx, 300, 230, 680, 320, INK.alarm);
  text(ctx, 'CAUGHT', VIEW_W / 2, 300, 84, INK.alarm);
  const why = by.police
    ? 'THE LOCKDOWN RAN OUT BEFORE YOU REACHED THE VAN'
    : `${by.name} HELD YOU IN SIGHT ${world.thief.inShadow ? 'AT ARM\'S LENGTH' : 'IN THE LIGHT'} AND CLOSED IN`;
  text(ctx, why, VIEW_W / 2, 380, 18, INK.text);
  text(ctx, `ALARM ${Math.round(world.alarm)}% · TIME ${Math.floor(world.time)}s · TAKE LOST ${money(world.take)}`, VIEW_W / 2, 420, 16, INK.dim);
  if (Math.sin(t * 4) > -0.3) text(ctx, 'ENTER: TRY THE SAME PLAN    R: REDRAW THE PLAN', VIEW_W / 2, 496, 20, INK.safe);
}

export function drawResults(ctx, world, score, t) {
  drawPaper(ctx);
  drawFloorPlan(ctx, world.map);
  drawRoomLabels(ctx, world.level);
  drawExitAndEntries(ctx, world.map, world.level, world.entry);
  drawTrail(ctx, world.thief.trail);
  text(ctx, 'YOUR ROUTE', sx(world.thief.trail[0].x) + 70, sy(world.thief.trail[0].y), 14, INK.loot);
  ctx.fillStyle = 'rgba(7,26,51,0.3)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawTrail(ctx, world.thief.trail);
  text(ctx, 'THE ROUTE YOU TOOK, DRAWN ON THE PLANS', 14, 32, 20, INK.loot, 'left');
  const left = 800;
  const right = 1250;
  const mid = (left + right) / 2;
  panel(ctx, left - 20, 84, right - left + 40, 640, INK.safe);
  text(ctx, score.ghost ? 'CLEAN GETAWAY' : 'GETAWAY', mid, 136, 44, INK.safe);
  text(ctx, `${world.level.site} · ${Math.floor(world.time)}s`, mid, 180, 15, INK.dim);
  score.lines.forEach((l, i) => {
    const y = 236 + i * 46;
    text(ctx, l.label, left, y, 16, INK.text, 'left');
    text(ctx, money(l.value), right, y, 20, l.value < 0 ? INK.alarm : INK.loot, 'right');
  });
  ctx.strokeStyle = INK.wall;
  ctx.beginPath();
  ctx.moveTo(left, 476);
  ctx.lineTo(right, 476);
  ctx.stroke();
  text(ctx, 'CREW TAKE', left, 520, 24, INK.text, 'left');
  text(ctx, money(score.total), right, 520, 34, INK.loot, 'right');
  text(ctx, `${'★'.repeat(score.stars)}${'☆'.repeat(3 - score.stars)}`, mid, 590, 48, INK.loot);
  if (Math.sin(t * 4) > -0.3) {
    const last = world.levelIndex >= LEVELS.length - 1;
    text(ctx, last ? 'ENTER: CLOSE THE BOOKS' : 'ENTER: PLAN THE NEXT JOB', mid, 670, 18, INK.safe);
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
