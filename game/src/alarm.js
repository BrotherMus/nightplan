// The alarm meter: spotted moments push it up, quiet time lets it settle, 100 starts a lockdown.
import { LOCKDOWN_SECONDS } from './config.js';
import { sendGuard } from './guards.js';
import { logEvent } from './heistlog.js';

export function raiseAlarm(world, amount, reason) {
  world.alarm = Math.min(100, world.alarm + amount);
  world.alarmsRaised += 1;
  world.banner = { text: reason, t: 2.2, danger: true };
  logEvent(world, 'alarm', reason);
}

export function updateAlarm(world, dt) {
  if (world.lockdown > 0) {
    world.lockdown -= dt;
    world.radioTimer -= dt;
    if (world.radioTimer <= 0) {
      world.radioTimer = 2.5;
      world.guards.forEach((g) => sendGuard(g, world.map, world.thief, true));
    }
    if (world.lockdown <= 0) world.caughtBy = { name: 'THE POLICE', police: true };
    return;
  }
  if (world.alarm >= 100) {
    world.lockdown = LOCKDOWN_SECONDS;
    world.radioTimer = 0;
    world.banner = { text: 'LOCKDOWN: REACH THE VAN', t: 3, danger: true };
    world.sfx.push('lockdown');
    return;
  }
  const watched = world.alarmPressure || world.cameras.some((c) => c.sees);
  if (!watched) world.alarm = Math.max(world.alarmFloor, world.alarm - 2.2 * dt);
  // Every trip leaves a mark: the meter never settles below a fifth of its peak.
  world.alarmFloor = Math.max(world.alarmFloor, world.alarm * 0.2);
}
