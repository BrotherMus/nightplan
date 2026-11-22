// The night's record: every lock, tool, loot grab and alarm, stamped with a time and a place,
// so the getaway sheet can pin each one on the plans.
import { INK } from './config.js';

export function logEvent(world, kind, text, x = world.thief.x, y = world.thief.y) {
  if (!world.log) return;
  world.log.push({ t: world.time, kind, text, x, y });
}

export function eventColor(kind) {
  return {
    pick: INK.cameraCone, crack: INK.loot, grab: INK.loot, coin: INK.text, smoke: INK.dim,
    emp: INK.vent, vent: INK.vent, laser: INK.laser, alarm: INK.alarm, van: INK.safe,
  }[kind] || INK.text;
}

export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
