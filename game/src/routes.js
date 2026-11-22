// The planner's two lines through the floor: one through the vault lock, one through the vents.
// Drawn while the notes are open so every room shows more than one way across.
import { INK } from './config.js';
import { tileAt, thiefCanEnter } from './map.js';
import { findPath } from './pathfind.js';

const viaLock = (map, x, y) => tileAt(map, x, y) !== 'v' && (tileAt(map, x, y) === 'L' || thiefCanEnter(map, x, y));
const viaVent = (map, x, y) => thiefCanEnter(map, x, y);

export function planRoutes(world) {
  const { map, thief } = world;
  const goal = thief.carrying || !map.target || map.target.taken ? map.exit : map.target;
  const lock = findPath(map, thief, goal, viaLock);
  const vent = findPath(map, thief, goal, viaVent);
  const routes = [];
  if (lock && lock.length) routes.push({ name: thief.carrying ? 'A: OUT THE DOORS' : 'A: PICK THE LOCK', color: INK.cameraCone, path: lock });
  const same = lock && vent && lock.length === vent.length && lock.every((p, i) => p.x === vent[i].x && p.y === vent[i].y);
  if (vent && vent.length && !same) routes.push({ name: thief.carrying ? 'B: BACK THROUGH THE VENT' : 'B: CRAWL THE VENT', color: INK.vent, path: vent });
  return routes;
}
