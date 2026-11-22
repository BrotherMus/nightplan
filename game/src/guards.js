// Guards: patrol a route, notice the thief over time, investigate noise, chase, search, give up.
import { GUARD } from './config.js';
import { guardCanEnter } from './map.js';
import { findPath } from './pathfind.js';
import { seesPoint, angleDiff } from './vision.js';
import { raiseAlarm } from './alarm.js';
import { recordWatch } from './catchreport.js';

export function createGuard(def) {
  const [sx, sy] = def.route[0];
  return {
    name: def.name, x: sx + 0.5, y: sy + 0.5, facing: 0,
    route: def.route.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 })), waypoint: 0, path: null,
    state: 'patrol', aware: 0, target: null, pause: 0, lookTimer: 0, lostTimer: 0, repath: 0, sees: false,
    watch: [], watchClock: 0,
  };
}

function turnToward(g, angle, rate, dt) {
  const d = angleDiff(angle, g.facing);
  const maxTurn = rate * dt;
  g.facing += Math.max(-maxTurn, Math.min(maxTurn, d));
}

function walkPath(g, speed, dt) {
  if (!g.path || !g.path.length) return true;
  const next = g.path[0];
  const dx = next.x - g.x;
  const dy = next.y - g.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  turnToward(g, Math.atan2(dy, dx), 7, dt);
  if (dist <= step) {
    g.x = next.x;
    g.y = next.y;
    g.path.shift();
  } else {
    g.x += (dx / dist) * step;
    g.y += (dy / dist) * step;
  }
  return g.path.length === 0;
}

function headTo(g, map, point) {
  g.path = findPath(map, g, point, guardCanEnter) || [];
}

// How fast a guard's awareness fills: close, lit and fast-moving thieves are noticed first.
function noticeRate(g, thief, dist, world) {
  let rate = 1.7 * (1 - (0.6 * dist) / GUARD.range);
  if (thief.inShadow && dist > 1.6) rate *= 0.22;
  if (thief.sprinting) rate *= 1.5;
  if (world.lockdown > 0) rate *= 2;
  return rate;
}

export function hearNoise(g, noise) {
  if (g.state === 'alert') return;
  if (Math.hypot(noise.x - g.x, noise.y - g.y) > noise.r * GUARD.hearing) return;
  g.state = 'suspicious';
  g.target = { x: noise.x, y: noise.y };
  g.path = null;
  g.pause = 0.6;
  g.aware = Math.max(g.aware, 0.35);
}

export function updateGuard(g, world, dt) {
  const { map, thief, smokes } = world;
  const dist = Math.hypot(thief.x - g.x, thief.y - g.y);
  g.sees = !thief.inVent && seesPoint(g, g.facing, GUARD.range, GUARD.halfAngle, map, thief.x, thief.y, smokes);

  if (g.sees) {
    g.aware = Math.min(1, g.aware + noticeRate(g, thief, dist, world) * dt);
    g.lastSeen = { x: thief.x, y: thief.y };
    if (g.aware >= 0.35 && (g.state === 'patrol' || g.state === 'search')) {
      g.state = 'suspicious';
      g.target = g.lastSeen;
      g.path = null;
      g.pause = 0.7;
    }
    if (g.aware >= 1 && g.state !== 'alert') {
      g.state = 'alert';
      g.lostTimer = 0;
      raiseAlarm(world, 30, `${g.name} SPOTTED YOU`);
      world.sfx.push('spotted');
    }
  } else if (g.state !== 'alert') {
    g.aware = Math.max(0, g.aware - 0.22 * dt);
  }
  recordWatch(g, world, dist);

  if (g.state === 'patrol') {
    if (!g.path || !g.path.length) {
      g.waypoint = (g.waypoint + 1) % g.route.length;
      headTo(g, map, g.route[g.waypoint]);
    }
    walkPath(g, GUARD.patrolSpeed, dt);
  } else if (g.state === 'suspicious') {
    if (g.pause > 0) {
      g.pause -= dt;
      turnToward(g, Math.atan2(g.target.y - g.y, g.target.x - g.x), 5, dt);
    } else {
      if (!g.path) headTo(g, map, g.target);
      if (walkPath(g, GUARD.patrolSpeed * 1.15, dt)) {
        g.state = 'search';
        g.lookTimer = 4;
        g.lookBase = g.facing;
      }
    }
  } else if (g.state === 'alert') {
    world.alarmPressure = true;
    if (g.sees) {
      g.lostTimer = 0;
      g.repath -= dt;
      if (g.repath <= 0) {
        headTo(g, map, thief);
        g.repath = 0.3;
      }
      if (dist < GUARD.catchDistance) world.caughtBy = g;
    } else {
      g.lostTimer += dt;
      if (g.lostTimer < 0.1 && g.lastSeen) headTo(g, map, g.lastSeen);
    }
    const arrived = walkPath(g, GUARD.chaseSpeed, dt);
    if (g.sees && dist < 1.2) turnToward(g, Math.atan2(thief.y - g.y, thief.x - g.x), 9, dt);
    if (!g.sees && (arrived || g.lostTimer > 6)) {
      g.state = 'search';
      g.lookTimer = 5;
      g.lookBase = g.facing;
      g.aware = 0.6;
    }
  } else if (g.state === 'search') {
    g.lookTimer -= dt;
    g.facing = g.lookBase + Math.sin(g.lookTimer * 2.2) * 1.3;
    if (g.lookTimer <= 0) {
      g.state = 'patrol';
      g.path = null;
      g.aware = Math.min(g.aware, 0.2);
    }
  }
}

// Lockdown or a camera radio call: send a guard running to a point.
export function sendGuard(g, map, point, urgent) {
  if (g.state === 'alert' && g.sees) return;
  g.state = urgent ? 'alert' : 'suspicious';
  g.lastSeen = { x: point.x, y: point.y };
  g.target = g.lastSeen;
  g.lostTimer = 0.2;
  g.pause = 0;
  headTo(g, map, point);
}
