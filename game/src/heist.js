// One heist in progress: builds the world from a floor plan and a plan, and steps it each frame.
import { LEVELS } from './levels.js';
import { HOLD } from './config.js';
import { parseFloorPlan, tileAt, unlockDoor } from './map.js';
import { createThief, moveThief } from './thief.js';
import { createGuard, updateGuard } from './guards.js';
import { createCamera, updateCamera } from './cameras.js';
import { updateAlarm } from './alarm.js';
import { makeNoise, updateEffects } from './tools.js';
import { createLaser, updateLaser } from './lasers.js';
import { logEvent } from './heistlog.js';

export function createHeist(levelIndex, plan) {
  const level = LEVELS[levelIndex];
  const map = parseFloorPlan(level);
  const spawn = map.entries[plan.entry] || map.entries[1];
  return {
    level, levelIndex, map, entry: plan.entry,
    thief: createThief(spawn),
    guards: level.guards.map(createGuard),
    cameras: level.cameras.map(createCamera),
    lasers: (level.lasers || []).map(createLaser),
    kit: { ...plan.kit }, spent: plan.spent,
    alarm: 0, alarmFloor: 0, lockdown: 0, radioTimer: 0, alarmPressure: false,
    smokes: [], noises: [], sfx: [], banner: { text: `ENTER BY THE ${level.entries[plan.entry]}`, t: 2.5 },
    take: 0, cashTaken: 0, time: 0, hold: null, caughtBy: null, escaped: false,
    alarmsRaised: 0, toolsUsed: 0, showNotes: true, log: [], dt: 0, bought: { ...plan.kit },
  };
}

// What the thief could work on right now with E: a lock, the target or a cash bundle.
export function nearbyJob(world) {
  const { thief, map } = world;
  if (map.target && !map.target.taken && Math.hypot(map.target.x - thief.x, map.target.y - thief.y) < 1.0) {
    return { kind: 'crack', x: map.target.x, y: map.target.y, time: HOLD.crack, label: `CRACK ${world.level.target}` };
  }
  for (const c of map.cash) {
    if (!c.taken && Math.hypot(c.x - thief.x, c.y - thief.y) < 0.9) return { kind: 'grab', cash: c, x: c.x, y: c.y, time: HOLD.grab, label: 'BAG THE CASH' };
  }
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const tx = Math.floor(thief.x) + dx;
    const ty = Math.floor(thief.y) + dy;
    if (tileAt(map, tx, ty) === 'L' && Math.hypot(tx + 0.5 - thief.x, ty + 0.5 - thief.y) < 1.1) {
      return { kind: 'pick', x: tx + 0.5, y: ty + 0.5, time: HOLD.pick, label: 'PICK THE LOCK' };
    }
  }
  return null;
}

function workOnJob(world, holding, dt) {
  const job = holding ? nearbyJob(world) : null;
  if (!job) {
    world.hold = null;
    return;
  }
  if (!world.hold || world.hold.kind !== job.kind || world.hold.x !== job.x || world.hold.y !== job.y) {
    world.hold = { ...job, progress: 0, tick: 0 };
  }
  const h = world.hold;
  h.progress += dt;
  h.tick -= dt;
  if (h.tick <= 0 && h.kind !== 'grab') {
    h.tick = 0.8;
    makeNoise(world, h.x, h.y, h.kind === 'crack' ? 2.2 : 1.6, 'work');
    world.sfx.push('tick');
  }
  if (h.progress < h.time) return;
  if (h.kind === 'pick') {
    unlockDoor(world.map, h.x, h.y);
    logEvent(world, 'pick', 'PICKED THE LOCK', h.x, h.y);
    world.banner = { text: 'LOCK OPEN', t: 1.2 };
  } else if (h.kind === 'crack') {
    world.map.target.taken = true;
    world.thief.carrying = true;
    world.take += world.level.targetValue;
    logEvent(world, 'crack', `CRACKED ${world.level.target}`, h.x, h.y);
    world.banner = { text: `${world.level.target} BAGGED: GET TO THE VAN`, t: 2.5 };
  } else {
    h.cash.taken = true;
    world.take += h.cash.value;
    world.cashTaken += h.cash.value;
    logEvent(world, 'grab', `BAGGED $${h.cash.value}`, h.x, h.y);
  }
  world.sfx.push('loot');
  world.hold = null;
}

export function updateHeist(world, input, dt) {
  if (world.caughtBy || world.escaped) return;
  world.time += dt;
  world.dt = dt;
  const wasInVent = world.thief.inVent;
  world.alarmPressure = false;
  const holding = input.interact;
  const noise = holding && world.hold ? 0 : moveThief(world.thief, world.map, holding ? { x: 0, y: 0 } : input.dir, input.sprint, dt);
  if (noise > 0) makeNoise(world, world.thief.x, world.thief.y, noise, world.thief.sprinting ? 'sprint' : 'step');
  if (world.thief.inVent && !wasInVent) logEvent(world, 'vent', 'INTO THE VENT');
  workOnJob(world, holding, dt);
  world.guards.forEach((g) => updateGuard(g, world, dt));
  world.cameras.forEach((c) => updateCamera(c, world, dt));
  world.lasers.forEach((l) => updateLaser(l, world, dt));
  updateAlarm(world, dt);
  updateEffects(world, dt);
  if (world.banner) {
    world.banner.t -= dt;
    if (world.banner.t <= 0) world.banner = null;
  }
  const exit = world.map.exit;
  if (Math.hypot(exit.x - world.thief.x, exit.y - world.thief.y) < 0.9) {
    if (world.thief.carrying) {
      world.escaped = true;
      logEvent(world, 'van', 'IN THE VAN');
      world.sfx.push('escape');
    } else if (!world.banner) {
      world.banner = { text: 'THE VAN WAITS FOR THE TARGET', t: 1.5 };
    }
  }
}

// The payout sheet shown at the getaway: what planning earned and what mistakes cost.
export function scoreHeist(world) {
  const ghost = world.alarmsRaised === 0;
  const underPar = world.time <= world.level.par;
  const lines = [
    { label: world.level.target, value: world.level.targetValue },
    { label: 'CASH BUNDLES', value: world.cashTaken },
    { label: 'TOOLS BOUGHT', value: -world.spent },
    { label: ghost ? 'GHOST BONUS: NO ALARM' : `ALARMS RAISED x${world.alarmsRaised}`, value: ghost ? 800 : -120 * world.alarmsRaised },
    { label: underPar ? `UNDER PAR (${world.level.par}s)` : `OVER PAR (${world.level.par}s)`, value: underPar ? 400 : 0 },
  ];
  const total = lines.reduce((s, l) => s + l.value, 0);
  const stars = (ghost ? 1 : 0) + (underPar ? 1 : 0) + (world.cashTaken >= 300 ? 1 : 0);
  return { lines, total, stars, ghost };
}
