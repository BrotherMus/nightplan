// Laser tripwires: beams that cycle on and off. Cross in the dark gap, or EMP the emitter.
import { raiseAlarm } from './alarm.js';
import { sendGuard } from './guards.js';
import { logEvent } from './heistlog.js';

export function createLaser(def) {
  return { ...def, clock: def.offset || 0, disabled: 0, cooldown: 0 };
}

export function laserLive(laser) {
  if (laser.disabled > 0) return false;
  return laser.clock % (laser.on + laser.off) < laser.on;
}

// Seconds until the beam next changes state, for the countdown ring on the emitter.
export function laserTimeLeft(laser) {
  const t = laser.clock % (laser.on + laser.off);
  return t < laser.on ? laser.on - t : laser.on + laser.off - t;
}

export function distanceToBeam(laser, x, y) {
  const dx = laser.x2 - laser.x1;
  const dy = laser.y2 - laser.y1;
  const t = Math.max(0, Math.min(1, ((x - laser.x1) * dx + (y - laser.y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (laser.x1 + dx * t), y - (laser.y1 + dy * t));
}

export function updateLaser(laser, world, dt) {
  laser.clock += dt;
  laser.cooldown = Math.max(0, laser.cooldown - dt);
  if (laser.disabled > 0) {
    laser.disabled -= dt;
    return;
  }
  const { thief } = world;
  const near = distanceToBeam(laser, thief.x, thief.y) < 0.6;
  if (near && !laser.thiefNear && !laserLive(laser) && !thief.inVent) logEvent(world, 'laser', 'SLIPPED THE LASER GAP');
  laser.thiefNear = near;
  if (!laserLive(laser) || thief.inVent || laser.cooldown > 0) return;
  if (distanceToBeam(laser, thief.x, thief.y) > 0.3) return;
  laser.cooldown = 2.5;
  raiseAlarm(world, 35, 'LASER TRIPPED');
  world.sfx.push('camera');
  const nearest = [...world.guards].sort((a, b) => Math.hypot(a.x - thief.x, a.y - thief.y) - Math.hypot(b.x - thief.x, b.y - thief.y));
  nearest.slice(0, 2).forEach((g) => sendGuard(g, world.map, thief, false));
}
