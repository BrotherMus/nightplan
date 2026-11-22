// Tools bought on the plan screen and thrown with the mouse: coin, smoke puck, EMP tag.
import { TOOLS } from './config.js';
import { hearNoise } from './guards.js';
import { distanceToBeam } from './lasers.js';
import { logEvent } from './heistlog.js';

export const THROW_RANGE = 7;

export function toolById(id) {
  return TOOLS.find((t) => t.id === id);
}

export function throwTarget(world, aim) {
  const { thief } = world;
  const dx = aim.x - thief.x;
  const dy = aim.y - thief.y;
  const d = Math.hypot(dx, dy);
  if (d <= THROW_RANGE) return { x: aim.x, y: aim.y };
  return { x: thief.x + (dx / d) * THROW_RANGE, y: thief.y + (dy / d) * THROW_RANGE };
}

export function makeNoise(world, x, y, r, kind) {
  world.noises.push({ x, y, r, t: 0, life: kind === 'coin' ? 1.1 : 0.6, kind });
  world.guards.forEach((g) => hearNoise(g, { x, y, r }));
}

export function useTool(world, id, aim) {
  if (!world.kit[id]) {
    world.banner = { text: `NO ${toolById(id).name} LEFT`, t: 1.2 };
    return false;
  }
  const at = throwTarget(world, aim);
  if (id === 'emp') {
    const cam = world.cameras.find((c) => Math.hypot(c.x - at.x, c.y - at.y) < 1.8);
    const laser = world.lasers.find((l) => distanceToBeam(l, at.x, at.y) < 1.2);
    if (!cam && !laser) {
      world.banner = { text: 'EMP: AIM AT A CAMERA OR LASER', t: 1.2 };
      return false;
    }
    if (cam) {
      cam.disabled = 9;
      cam.aware = 0;
    }
    if (laser) laser.disabled = 9;
    world.sfx.push('emp');
  } else if (id === 'smoke') {
    world.smokes.push({ x: at.x, y: at.y, r: 1.8, t: 7 });
    world.sfx.push('smoke');
  } else if (id === 'coin') {
    makeNoise(world, at.x, at.y, 5.5, 'coin');
    world.sfx.push('coin');
  }
  world.kit[id] -= 1;
  world.toolsUsed += 1;
  logEvent(world, id, `${toolById(id).name} USED`, at.x, at.y);
  return true;
}

export function updateEffects(world, dt) {
  world.smokes.forEach((s) => { s.t -= dt; });
  world.smokes = world.smokes.filter((s) => s.t > 0);
  world.noises.forEach((n) => { n.t += dt; });
  world.noises = world.noises.filter((n) => n.t < n.life);
}
