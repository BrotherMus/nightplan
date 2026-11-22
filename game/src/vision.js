// Sight lines: what a guard or camera can see, and the cone polygon drawn for it.
import { blocksSight } from './map.js';

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function insideSmoke(smokes, x, y) {
  for (const s of smokes) if ((x - s.x) ** 2 + (y - s.y) ** 2 < s.r * s.r) return true;
  return false;
}

export function hasLineOfSight(map, ax, ay, bx, by, smokes = []) {
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.ceil(dist / 0.1);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (blocksSight(map, x, y) || insideSmoke(smokes, x, y)) return false;
  }
  return true;
}

export function seesPoint(viewer, angle, range, halfAngle, map, x, y, smokes) {
  const dx = x - viewer.x;
  const dy = y - viewer.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist > 0.45 && Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > halfAngle) return false;
  return hasLineOfSight(map, viewer.x, viewer.y, x, y, smokes);
}

// Rays marched out to the first wall or smoke cloud, for drawing a cone clipped by the room.
export function castCone(map, x, y, angle, halfAngle, range, smokes = []) {
  const rays = 40;
  const points = [{ x, y }];
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    let d = 0;
    while (d < range) {
      const nx = x + cx * (d + 0.08);
      const ny = y + cy * (d + 0.08);
      if (blocksSight(map, nx, ny) || insideSmoke(smokes, nx, ny)) break;
      d += 0.08;
    }
    points.push({ x: x + cx * d, y: y + cy * d });
  }
  return points;
}
