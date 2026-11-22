// Draws the heist as an architect's blueprint: walls in line-work, cones in danger colours.
import { TILE, HUD_H, INK, VIEW_W, VIEW_H, CAMERA, GUARD } from './config.js';
import { tileAt } from './map.js';
import { castCone } from './vision.js';
import { toolById, throwTarget } from './tools.js';
import { nearbyJob } from './heist.js';
import { laserLive, laserTimeLeft } from './lasers.js';

export const sx = (x) => x * TILE;
export const sy = (y) => HUD_H + y * TILE;

export function drawPaper(ctx) {
  ctx.fillStyle = INK.paper;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let x = 0; x <= VIEW_W; x += TILE / 2) {
    ctx.strokeStyle = x % (TILE * 4) === 0 ? INK.gridMajor : INK.grid;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, VIEW_H);
    ctx.stroke();
  }
  for (let y = HUD_H; y <= VIEW_H; y += TILE / 2) {
    ctx.strokeStyle = (y - HUD_H) % (TILE * 4) === 0 ? INK.gridMajor : INK.grid;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(VIEW_W, y + 0.5);
    ctx.stroke();
  }
}

function hatch(ctx, x, y, color) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, TILE, TILE);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let i = -TILE; i < TILE; i += 8) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + TILE);
    ctx.lineTo(x + i + TILE, y);
    ctx.stroke();
  }
  ctx.restore();
}

function isWallish(c) {
  return c === '#';
}

function drawDoor(ctx, map, tx, ty, locked) {
  const x = sx(tx);
  const y = sy(ty);
  const horizontalWall = isWallish(tileAt(map, tx - 1, ty)) || isWallish(tileAt(map, tx + 1, ty));
  ctx.strokeStyle = locked ? INK.cameraCone : INK.wall;
  ctx.lineWidth = locked ? 4 : 2;
  ctx.beginPath();
  if (locked) {
    if (horizontalWall) {
      ctx.moveTo(x, y + TILE / 2);
      ctx.lineTo(x + TILE, y + TILE / 2);
    } else {
      ctx.moveTo(x + TILE / 2, y);
      ctx.lineTo(x + TILE / 2, y + TILE);
    }
    ctx.stroke();
    // padlock
    ctx.fillStyle = INK.paperDeep;
    ctx.fillRect(x + 12, y + 15, 16, 13);
    ctx.strokeStyle = INK.cameraCone;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 12, y + 15, 16, 13);
    ctx.beginPath();
    ctx.arc(x + 20, y + 15, 5, Math.PI, 0);
    ctx.stroke();
    return;
  }
  // Architect's door: a leaf and its swing arc.
  if (horizontalWall) {
    ctx.moveTo(x + 2, y + TILE / 2);
    ctx.lineTo(x + 2, y + TILE / 2 - TILE + 6);
    ctx.stroke();
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(x + 2, y + TILE / 2, TILE - 6, -Math.PI / 2, 0);
  } else {
    ctx.moveTo(x + TILE / 2, y + 2);
    ctx.lineTo(x + TILE / 2 + TILE - 6, y + 2);
    ctx.stroke();
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(x + TILE / 2, y + 2, TILE - 6, 0, Math.PI / 2);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawFloorPlan(ctx, map) {
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const c = map.grid[ty][tx];
      const x = sx(tx);
      const y = sy(ty);
      if (c === ',') {
        ctx.fillStyle = 'rgba(63,224,140,0.13)';
        ctx.fillRect(x, y, TILE, TILE);
        hatch(ctx, x, y, 'rgba(63,224,140,0.35)');
      } else if (c === '#') {
        ctx.fillStyle = INK.wallFill;
        ctx.fillRect(x, y, TILE, TILE);
        hatch(ctx, x, y, 'rgba(158,220,255,0.16)');
      } else if (c === 'v') {
        ctx.fillStyle = '#0d3a3a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = INK.vent;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.setLineDash([]);
        for (let i = 10; i < TILE - 6; i += 7) {
          ctx.beginPath();
          ctx.moveTo(x + 8, y + i);
          ctx.lineTo(x + TILE - 8, y + i);
          ctx.stroke();
        }
      } else if (c === 'c') {
        ctx.fillStyle = '#123359';
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = INK.dim;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.moveTo(x + TILE - 4, y + 4);
        ctx.lineTo(x + 4, y + TILE - 4);
        ctx.stroke();
      }
    }
  }
  // Wall outlines: only the edges that face a room.
  ctx.strokeStyle = INK.wall;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      if (map.grid[ty][tx] !== '#') continue;
      const x = sx(tx);
      const y = sy(ty);
      if (ty > 0 && map.grid[ty - 1][tx] !== '#') { ctx.moveTo(x, y); ctx.lineTo(x + TILE, y); }
      if (ty < map.h - 1 && map.grid[ty + 1][tx] !== '#') { ctx.moveTo(x, y + TILE); ctx.lineTo(x + TILE, y + TILE); }
      if (tx > 0 && map.grid[ty][tx - 1] !== '#') { ctx.moveTo(x, y); ctx.lineTo(x, y + TILE); }
      if (tx < map.w - 1 && map.grid[ty][tx + 1] !== '#') { ctx.moveTo(x + TILE, y); ctx.lineTo(x + TILE, y + TILE); }
    }
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const c = map.grid[ty][tx];
      if (c === 'D' || c === 'L') drawDoor(ctx, map, tx, ty, c === 'L');
    }
  }
}

export function drawRoomLabels(ctx, level) {
  ctx.font = '600 13px "Courier New", monospace';
  ctx.fillStyle = 'rgba(190,230,255,0.55)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  level.rooms.forEach((r) => ctx.fillText(r.text, sx(r.x), sy(r.y)));
}

export function drawPatrolRoutes(ctx, guards, alpha = 0.4) {
  ctx.save();
  ctx.setLineDash([2, 6]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255,90,90,${alpha})`;
  guards.forEach((g) => {
    ctx.beginPath();
    g.route.forEach((p, i) => (i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y))));
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();
}

export function drawExitAndEntries(ctx, map, level, entry) {
  const e = map.exit;
  const x = sx(e.x);
  const y = sy(e.y);
  ctx.fillStyle = 'rgba(63,224,140,0.25)';
  ctx.fillRect(x - 18, y - 13, 40, 26);
  ctx.strokeStyle = INK.safe;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 18, y - 13, 40, 26);
  ctx.strokeRect(x + 10, y - 9, 10, 18);
  ctx.fillStyle = INK.safe;
  ctx.beginPath();
  ctx.arc(x - 9, y + 14, 4, 0, Math.PI * 2);
  ctx.arc(x + 13, y + 14, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('VAN', x + 26, y + 4);
  Object.entries(map.entries).forEach(([k, p]) => {
    const active = String(entry) === k;
    ctx.strokeStyle = active ? INK.text : 'rgba(226,244,255,0.4)';
    ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath();
    ctx.arc(sx(p.x), sy(p.y), 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(k, sx(p.x), sy(p.y) + 1);
  });
}

export function drawLoot(ctx, map, t) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  map.cash.forEach((c) => {
    if (c.taken) return;
    ctx.fillStyle = 'rgba(255,210,58,0.18)';
    ctx.beginPath();
    ctx.arc(sx(c.x), sy(c.y), 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK.loot;
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('$', sx(c.x), sy(c.y) + 1);
  });
  const g = map.target;
  if (!g || g.taken) return;
  const pulse = 1 + Math.sin(t * 4) * 0.12;
  const x = sx(g.x);
  const y = sy(g.y);
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 46 * pulse);
  glow.addColorStop(0, 'rgba(255,210,58,0.55)');
  glow.addColorStop(1, 'rgba(255,210,58,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 46 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK.loot;
  ctx.strokeStyle = '#fff6cf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 15 * pulse);
  ctx.lineTo(x + 12 * pulse, y);
  ctx.lineTo(x, y + 15 * pulse);
  ctx.lineTo(x - 12 * pulse, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function fillCone(ctx, pts, fill, edge) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y))));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawCones(ctx, world) {
  const { map, smokes } = world;
  world.cameras.forEach((c) => {
    if (c.disabled > 0) return;
    const pts = castCone(map, c.x, c.y, c.angle, CAMERA.halfAngle, CAMERA.range, smokes);
    fillCone(ctx, pts, c.sees ? 'rgba(255,154,31,0.38)' : 'rgba(255,154,31,0.17)', 'rgba(255,170,60,0.85)');
  });
  world.guards.forEach((g) => {
    const pts = castCone(map, g.x, g.y, g.facing, GUARD.halfAngle, GUARD.range, smokes);
    const hot = g.state === 'alert' ? 0.36 : g.state === 'suspicious' ? 0.26 : 0.16;
    fillCone(ctx, pts, `rgba(255,64,64,${hot})`, 'rgba(255,90,90,0.9)');
  });
}

// Tripwires: a bright magenta beam while live, a faint dotted line in its dark gap,
// and a ring on each emitter counting down to the next switch.
export function drawLasers(ctx, lasers) {
  lasers.forEach((l) => {
    const live = laserLive(l);
    const x1 = sx(l.x1);
    const y1 = sy(l.y1);
    const x2 = sx(l.x2);
    const y2 = sy(l.y2);
    ctx.save();
    if (live) {
      ctx.strokeStyle = 'rgba(255,43,214,0.35)';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = INK.laser;
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = l.disabled > 0 ? 'rgba(111,240,208,0.6)' : 'rgba(255,43,214,0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 7]);
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    [[x1, y1], [x2, y2]].forEach(([x, y]) => {
      ctx.fillStyle = l.disabled > 0 ? INK.vent : INK.laser;
      ctx.fillRect(x - 5, y - 5, 10, 10);
    });
    const cycle = l.disabled > 0 ? l.disabled / 9 : laserTimeLeft(l) / (live ? l.on : l.off);
    ctx.strokeStyle = l.disabled > 0 ? INK.vent : INK.laser;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x1, y1, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cycle);
    ctx.stroke();
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = l.disabled > 0 ? `EMP ${Math.ceil(l.disabled)}s` : live ? `LASER ${laserTimeLeft(l).toFixed(1)}s` : `GAP ${laserTimeLeft(l).toFixed(1)}s`;
    const horizontal = Math.abs(l.x2 - l.x1) > Math.abs(l.y2 - l.y1);
    ctx.fillText(label, horizontal ? (x1 + x2) / 2 : x1 + 34, horizontal ? y1 - 12 : (y1 + y2) / 2);
    ctx.restore();
  });
}

export function drawEffects(ctx, world) {
  world.smokes.forEach((s) => {
    const a = Math.min(1, s.t / 1.5);
    for (let i = 0; i < 7; i++) {
      const ang = i * 0.9 + s.t * 0.3;
      ctx.fillStyle = `rgba(210,225,240,${0.22 * a})`;
      ctx.beginPath();
      ctx.arc(sx(s.x + Math.cos(ang) * 0.7), sy(s.y + Math.sin(ang) * 0.7), s.r * TILE * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  world.noises.forEach((n) => {
    const k = n.t / n.life;
    ctx.strokeStyle = n.kind === 'coin' ? `rgba(255,210,58,${1 - k})` : `rgba(226,244,255,${0.8 * (1 - k)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx(n.x), sy(n.y), n.r * TILE * k, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function awarenessArc(ctx, x, y, r, amount, color) {
  if (amount <= 0.01) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * amount);
  ctx.stroke();
}

export function drawCameras(ctx, world) {
  world.cameras.forEach((c) => {
    const x = sx(c.x);
    const y = sy(c.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(c.angle);
    ctx.fillStyle = c.disabled > 0 ? '#2a4d7a' : '#3a2a12';
    ctx.strokeStyle = c.disabled > 0 ? INK.vent : INK.cameraCone;
    ctx.lineWidth = 2;
    ctx.fillRect(-10, -7, 20, 14);
    ctx.strokeRect(-10, -7, 20, 14);
    ctx.fillStyle = c.disabled > 0 ? INK.vent : INK.cameraCone;
    ctx.fillRect(10, -4, 6, 8);
    ctx.restore();
    awarenessArc(ctx, x, y, 17, c.aware, INK.cameraCone);
    if (c.disabled > 0) {
      ctx.fillStyle = INK.vent;
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`EMP ${Math.ceil(c.disabled)}s`, x, y + 24);
    }
  });
}

export function drawGuards(ctx, world, t) {
  world.guards.forEach((g) => {
    const x = sx(g.x);
    const y = sy(g.y);
    ctx.fillStyle = '#5a1020';
    ctx.strokeStyle = INK.guardCone;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK.guardCone;
    ctx.beginPath();
    ctx.arc(x + Math.cos(g.facing) * 9, y + Math.sin(g.facing) * 9, 5, 0, Math.PI * 2);
    ctx.fill();
    awarenessArc(ctx, x, y, 19, g.aware, g.aware >= 1 ? INK.alarm : INK.loot);
    if (g.sees) {
      // The sight line: while a guard is noticing you, you can see exactly who and from where.
      ctx.save();
      ctx.strokeStyle = g.aware >= 1 ? INK.alarm : INK.loot;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(sx(world.thief.x), sy(world.thief.y));
      ctx.stroke();
      ctx.restore();
    }
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,180,180,0.9)';
    ctx.fillText(g.name, x, y + 30);
    const mark = g.state === 'alert' ? '!' : g.state === 'suspicious' ? '?' : g.state === 'search' ? '...' : '';
    if (mark) {
      ctx.font = 'bold 26px "Courier New", monospace';
      ctx.fillStyle = g.state === 'alert' ? INK.alarm : INK.loot;
      ctx.fillText(mark, x, y - 26 + Math.sin(t * 10) * 2);
    }
  });
}

export function drawThief(ctx, world, t) {
  const th = world.thief;
  const x = sx(th.x);
  const y = sy(th.y);
  if (th.inShadow || th.inVent) {
    ctx.strokeStyle = INK.safe;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x, y, 20 + Math.sin(t * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = th.inVent ? 'rgba(255,255,255,0.45)' : INK.thief;
  ctx.strokeStyle = '#00d0ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0a2342';
  ctx.beginPath();
  ctx.arc(x + Math.cos(th.facing) * 5, y + Math.sin(th.facing) * 5, 3.5, 0, Math.PI * 2);
  ctx.fill();
  if (th.carrying) {
    ctx.fillStyle = INK.loot;
    ctx.beginPath();
    ctx.arc(x - Math.cos(th.facing) * 11, y - Math.sin(th.facing) * 11, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawWork(ctx, world) {
  const job = world.hold || nearbyJob(world);
  if (!job) return;
  const x = sx(job.x);
  const y = sy(job.y);
  const p = world.hold ? world.hold.progress / world.hold.time : 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = INK.loot;
  ctx.beginPath();
  ctx.arc(x, y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
  ctx.stroke();
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = INK.text;
  ctx.fillText(world.hold ? `${job.label}…` : `HOLD E: ${job.label}`, x, y - 34);
}

export function drawAim(ctx, world, aim, toolId) {
  if (!aim) return;
  const at = throwTarget(world, aim);
  const tool = toolById(toolId);
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(226,244,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx(world.thief.x), sy(world.thief.y));
  ctx.lineTo(sx(at.x), sy(at.y));
  ctx.stroke();
  ctx.setLineDash([]);
  const r = toolId === 'coin' ? 5.5 : toolId === 'smoke' ? 1.8 : 1.8;
  ctx.strokeStyle = toolId === 'emp' ? INK.vent : toolId === 'smoke' ? '#d2e1f0' : INK.loot;
  ctx.beginPath();
  ctx.arc(sx(at.x), sy(at.y), r * TILE, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.textAlign = 'center';
  ctx.fillText(`${tool.name} x${world.kit[toolId]}`, sx(at.x), sy(at.y) - 10);
  ctx.restore();
}

function callout(ctx, fromX, fromY, toX, toY, text, color) {
  ctx.font = 'bold 13px "Courier New", monospace';
  const w = ctx.measureText(text).width + 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.fillStyle = 'rgba(7,26,51,0.92)';
  ctx.fillRect(toX - w / 2, toY - 11, w, 22);
  ctx.strokeRect(toX - w / 2, toY - 11, w, 22);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, toX, toY + 1);
}

function roomOf(level, p) {
  let best = level.rooms[0];
  let bestD = Infinity;
  level.rooms.forEach((r) => {
    const d = Math.hypot(r.x + 2 - p.x, r.y + 2 - p.y);
    if (d < bestD) { bestD = d; best = r; }
  });
  return best.text;
}

// Planner's notes: labels on the thief, the nearest guard, a camera, the target and the van.
export function drawCallouts(ctx, world) {
  if (!world.showNotes) return;
  const th = world.thief;
  const clampX = (v) => Math.max(110, Math.min(1170, v));
  const clampY = (v) => Math.max(HUD_H + 18, Math.min(sy(16.4), v));
  callout(ctx, sx(th.x), sy(th.y) + 12, clampX(sx(th.x)), clampY(sy(th.y) + 52),
    `THIEF: CROSSING ${roomOf(world.level, th)}`, INK.text);
  const g = [...world.guards].sort((a, b) => Math.hypot(a.x - th.x, a.y - th.y) - Math.hypot(b.x - th.x, b.y - th.y))[0];
  const gState = { patrol: 'ON PATROL', suspicious: 'HEARD SOMETHING', alert: 'CHASING', search: 'SEARCHING' }[g.state];
  callout(ctx, sx(g.x), sy(g.y) - 14, clampX(sx(g.x)), clampY(sy(g.y) - 50), `GUARD ${g.name}: ${gState}`, '#ff8a8a');
  const cam = world.cameras[0];
  callout(ctx, sx(cam.x), sy(cam.y) + 10, clampX(sx(cam.x) + 70), clampY(sy(cam.y) + 34),
    cam.disabled > 0 ? 'CAMERA: EMP BLIND' : 'CAMERA SWEEP', INK.cameraCone);
  const tg = world.map.target;
  if (tg && !tg.taken) {
    callout(ctx, sx(tg.x), sy(tg.y) + 16, clampX(sx(tg.x) - 40), clampY(sy(tg.y) + 100),
      `LOOT: ${world.level.target} $${world.level.targetValue.toLocaleString('en-US')}`, INK.loot);
  }
  const ex = world.map.exit;
  callout(ctx, sx(ex.x) + 20, sy(ex.y) - 10, clampX(sx(ex.x) + 40), clampY(sy(ex.y) - 40), 'GETAWAY VAN', INK.safe);
}

export function drawLockdownTint(ctx, world, t) {
  if (world.lockdown <= 0 && world.alarm < 70) return;
  const a = world.lockdown > 0 ? 0.18 + Math.sin(t * 8) * 0.08 : 0.08;
  const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 250, VIEW_W / 2, VIEW_H / 2, 760);
  grad.addColorStop(0, 'rgba(255,45,85,0)');
  grad.addColorStop(1, `rgba(255,45,85,${a})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
}

export function drawTrail(ctx, trail, color = INK.loot) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  trail.forEach((p, i) => (i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y))));
  ctx.stroke();
  ctx.restore();
}

// The whole heist frame, back to front.
export function drawHeist(ctx, world, t, aim, toolId) {
  drawPaper(ctx);
  drawFloorPlan(ctx, world.map);
  drawRoomLabels(ctx, world.level);
  if (world.showNotes) drawPatrolRoutes(ctx, world.guards);
  drawExitAndEntries(ctx, world.map, world.level, world.entry);
  drawCones(ctx, world);
  drawLasers(ctx, world.lasers);
  drawLoot(ctx, world.map, t);
  drawEffects(ctx, world);
  drawCameras(ctx, world);
  drawGuards(ctx, world, t);
  drawThief(ctx, world, t);
  drawWork(ctx, world);
  drawAim(ctx, world, aim, toolId);
  drawCallouts(ctx, world);
  drawLockdownTint(ctx, world, t);
}
