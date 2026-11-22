// Why a catch was fair: every guard keeps a six-second record of how aware it was,
// and the caught page reads it back as evidence and a tip for the next attempt.
import { isShadow } from './map.js';

const WINDOW = 6;
const SAMPLE = 0.1;

export function recordWatch(g, world, dist) {
  g.watchClock = (g.watchClock || 0) - (world.dt || SAMPLE);
  if (g.watchClock > 0) return;
  g.watchClock = SAMPLE;
  g.watch.push({ t: world.time, aware: g.aware, sees: g.sees, dist });
  while (g.watch.length && g.watch[0].t < world.time - WINDOW) g.watch.shift();
}

function nearestShadow(map, from) {
  let best = null;
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (!isShadow(map, x + 0.5, y + 0.5)) continue;
      const d = Math.hypot(x + 0.5 - from.x, y + 0.5 - from.y);
      if (!best || d < best.d) best = { x: x + 0.5, y: y + 0.5, d };
    }
  }
  return best;
}

function direction(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'EAST' : 'WEST';
  return dy > 0 ? 'SOUTH' : 'NORTH';
}

// Evidence for the caught page: how long the guard watched, when it warned, and what would have worked.
export function explainCatch(world) {
  const by = world.caughtBy;
  if (!by || by.police) {
    return { police: true, lines: ['THE LOCKDOWN RAN 25 s', 'EVERY GUARD WAS RADIOED TO YOU', 'THE VAN WAS STILL OUT OF REACH'], samples: [], tip: 'A GHOST RUN NEVER STARTS THE CLOCK' };
  }
  const samples = by.watch || [];
  const seenFor = samples.filter((s) => s.sees).length * SAMPLE;
  const warn = samples.find((s) => s.aware >= 0.35);
  const spot = samples.find((s) => s.aware >= 1);
  const lit = !world.thief.inShadow;
  const lines = [
    `IN ${by.name}'S CONE FOR ${seenFor.toFixed(1)} s`,
    warn && spot ? `WARNED YOU: ? AT ${(warn.t - world.time).toFixed(1)} s, ! AT ${(spot.t - world.time).toFixed(1)} s` : 'HE WAS ALREADY CHASING YOU',
    `${lit ? 'IN THE LIGHT' : 'IN SHADOW, BUT TOO CLOSE'} · ${Math.hypot(by.x - world.thief.x, by.y - world.thief.y).toFixed(1)} TILES`,
  ];
  const shade = nearestShadow(world.map, world.thief);
  let tip = 'A RATTLE COIN WOULD HAVE TURNED HIM AWAY';
  if (world.kit.smoke > 0) tip = 'YOU STILL HAD A SMOKE PUCK: IT BLOCKS EVERY CONE';
  else if (shade && shade.d < 5) tip = `SHADOW ${Math.round(shade.d)} TILES ${direction(shade.x - world.thief.x, shade.y - world.thief.y)} HIDES YOU 4x LONGER`;
  return { police: false, lines, samples, tip, shade, start: world.time - WINDOW, end: world.time };
}
