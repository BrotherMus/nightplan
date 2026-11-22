// The thief: movement with wall collision, sprinting, crawling through vents, footstep noise.
import { THIEF } from './config.js';
import { thiefCanEnter, isVent, isShadow } from './map.js';

export function createThief(spawn) {
  return {
    x: spawn.x, y: spawn.y, facing: 0,
    moving: false, sprinting: false, inVent: false, inShadow: false,
    carrying: false, stepTimer: 0, trail: [{ x: spawn.x, y: spawn.y }],
  };
}

function fits(map, x, y) {
  const r = THIEF.radius;
  return thiefCanEnter(map, x - r, y - r) && thiefCanEnter(map, x + r, y - r)
    && thiefCanEnter(map, x - r, y + r) && thiefCanEnter(map, x + r, y + r);
}

// Returns the radius of footstep noise made this frame (0 when silent).
export function moveThief(thief, map, dir, sprint, dt) {
  const len = Math.hypot(dir.x, dir.y);
  thief.inVent = isVent(map, thief.x, thief.y);
  thief.inShadow = isShadow(map, thief.x, thief.y);
  thief.moving = len > 0;
  thief.sprinting = thief.moving && sprint && !thief.inVent;
  if (!thief.moving) return 0;
  const speed = thief.inVent ? THIEF.crawl : thief.sprinting ? THIEF.sprint : THIEF.walk;
  const step = (speed * dt) / len;
  const nx = thief.x + dir.x * step;
  const ny = thief.y + dir.y * step;
  if (fits(map, nx, thief.y)) thief.x = nx;
  if (fits(map, thief.x, ny)) thief.y = ny;
  thief.facing = Math.atan2(dir.y, dir.x);
  const last = thief.trail[thief.trail.length - 1];
  if (Math.hypot(last.x - thief.x, last.y - thief.y) > 0.5) thief.trail.push({ x: thief.x, y: thief.y });
  thief.stepTimer -= dt;
  if (thief.stepTimer > 0 || thief.inVent) return 0;
  thief.stepTimer = thief.sprinting ? 0.28 : 0.45;
  return thief.sprinting ? THIEF.sprintNoise : THIEF.walkNoise;
}
