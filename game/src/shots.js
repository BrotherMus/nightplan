// Staged moments for screenshots (?shot=cover|alarm|plan|getaway): real game state, posed by hand.
import { createHeist, scoreHeist, updateHeist } from './heist.js';
import { findPath } from './pathfind.js';
import { thiefCanEnter, unlockDoor } from './map.js';

function pose(world, name, x, y, facing, state, aware) {
  const g = world.guards.find((q) => q.name === name);
  Object.assign(g, { x, y, facing, state, aware });
  return g;
}

function routeThrough(map, points) {
  const trail = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const leg = findPath(map, trail[trail.length - 1], points[i], thiefCanEnter) || [];
    trail.push(...leg);
  }
  return trail;
}

function stageCover(app) {
  const world = createHeist(0, { entry: 1, kit: { coin: 3, smoke: 1, emp: 1 }, spent: 560 });
  world.thief.x = 12.4;
  world.thief.y = 6.6;
  world.thief.facing = 0.15;
  world.thief.trail = routeThrough(world.map, [world.map.entries[1], { x: 8.5, y: 3.5 }, { x: 12.4, y: 6.6 }]);
  pose(world, 'IVO', 21.5, 5.5, 3.0, 'suspicious', 0.55);
  pose(world, 'TOBIAS', 3.5, 8.5, -0.25, 'patrol', 0);
  pose(world, 'MAREN', 23.5, 12.5, Math.PI, 'patrol', 0.1);
  world.cameras[0].angle = Math.PI / 2 - 0.35;
  world.cameras[1].angle = (Math.PI * 3) / 4 + 0.2;
  world.cameras[2].angle = Math.PI / 2 + 0.6;
  world.cameras[0].aware = 0.3;
  world.map.cash[0].taken = true;
  world.take = 150;
  world.cashTaken = 150;
  world.alarm = 38;
  world.time = 47;
  world.kit.coin = 2;
  world.noises.push({ x: 21.5, y: 9.4, r: 5.5, t: 0.45, life: 1.1, kind: 'coin' });
  world.banner = null;
  app.world = world;
  app.tool = 'smoke';
  app.aim = { x: 18.2, y: 5.3 };
  app.screen = 'play';
}

function stageAlarm(app) {
  const world = createHeist(2, { entry: 3, kit: { coin: 1, smoke: 1, emp: 1 }, spent: 560 });
  const map = world.map;
  map.target.taken = true;
  world.thief.carrying = true;
  world.thief.x = 12.4;
  world.thief.y = 7.6;
  world.thief.facing = Math.PI;
  world.thief.trail = routeThrough(map, [map.entries[3], { x: 26.5, y: 9.5 }, { x: 26.5, y: 11.5 }, map.target, { x: 26.5, y: 11.5 }, { x: 12.4, y: 7.6 }]);
  pose(world, 'KESTREL', 19.5, 7.5, Math.PI, 'alert', 1);
  pose(world, 'WREN', 26.5, 9.5, Math.PI * 0.97, 'alert', 1);
  pose(world, 'ODILE', 4.5, 12.5, -1.3, 'suspicious', 0.5);
  pose(world, 'BRANNOCK', 11.5, 3.5, 1.7, 'search', 0.6);
  world.smokes.push({ x: 16.4, y: 7.8, r: 1.8, t: 5 });
  world.lasers[0].clock = 1.0;
  world.lasers[1].disabled = 5.2;
  world.lasers[2].clock = 3.0;
  world.lasers[3].clock = 0.5;
  world.cameras[0].angle = Math.PI / 2 + 0.5;
  world.cameras[1].angle = Math.PI / 2 - 0.7;
  world.cameras[2].angle = (Math.PI * 3) / 4 - 0.3;
  world.alarm = 100;
  world.lockdown = 11.4;
  world.take = 5350;
  world.cashTaken = 150;
  world.alarmsRaised = 3;
  world.time = 162;
  world.kit.smoke = 0;
  world.kit.emp = 0;
  world.banner = { text: 'LOCKDOWN: REACH THE VAN', t: 2, danger: true };
  app.world = world;
  app.tool = 'coin';
  app.aim = null;
  app.screen = 'play';
}

function stagePlan(app) {
  app.plan = { levelIndex: 2, entry: 3, kit: { coin: 3, smoke: 1, emp: 1 } };
  app.screen = 'plan';
}

// A real catch, simulated frame by frame: the thief freezes in the long hall's light as KESTREL walks
// the patrol toward them, so his awareness climbs through ? and ! before he closes in.
function stageCaught(app) {
  const world = createHeist(2, { entry: 1, kit: { coin: 2, smoke: 0, emp: 1 }, spent: 340 });
  world.time = 71;
  world.alarm = 18;
  world.map.target.taken = false;
  world.thief.x = 11.6;
  world.thief.y = 8.4;
  world.thief.trail = routeThrough(world.map, [world.map.entries[1], { x: 3.5, y: 6.5 }, { x: 11.6, y: 8.4 }]);
  const k = pose(world, 'KESTREL', 19.5, 7.5, Math.PI, 'patrol', 0);
  k.waypoint = 3; // next stop: the west end of the hall
  k.path = null;
  pose(world, 'BRANNOCK', 12.5, 3.5, 0, 'patrol', 0);
  pose(world, 'ODILE', 6.5, 13.5, 0, 'patrol', 0);
  world.log = [];
  for (let i = 0; i < 900 && !world.caughtBy; i++) {
    const walking = i < 30;
    updateHeist(world, { dir: { x: walking ? 1 : 0, y: 0 }, sprint: false, interact: false }, 1 / 60);
  }
  world.banner = null;
  app.world = world;
  app.tool = 'coin';
  app.aim = null;
  app.screen = 'caught';
}

// Copperline, played through: in by the coal chute, EMP on the strongroom camera, lock picked,
// bonds cracked, out through the laser gap and the vent, two cash bundles, then the van.
function stageGetaway(app) {
  const world = createHeist(1, { entry: 3, kit: { coin: 1, smoke: 0, emp: 1 }, spent: 300 });
  const map = world.map;
  unlockDoor(map, 26.5, 8.5);
  world.thief.trail = routeThrough(map, [map.entries[3], { x: 26.5, y: 7.5 }, { x: 26.5, y: 9.5 }, map.target,
    { x: 22.5, y: 12.5 }, { x: 18.5, y: 12.5 }, { x: 11.5, y: 13.5 }, { x: 3.5, y: 10.5 }, { x: 3.5, y: 7.5 },
    { x: 3.5, y: 10.5 }, map.exit]);
  world.log = [
    { t: 6, kind: 'emp', text: 'EMP TAG ON THE STRONGROOM CAMERA', x: 24.5, y: 9.15 },
    { t: 14, kind: 'pick', text: 'PICKED THE LOCK', x: 26.5, y: 8.5 },
    { t: 31, kind: 'crack', text: `CRACKED ${world.level.target}`, x: map.target.x, y: map.target.y },
    { t: 38, kind: 'laser', text: 'SLIPPED THE LASER GAP', x: 21.5, y: 12.5 },
    { t: 41, kind: 'vent', text: 'INTO THE VENT', x: 19.5, y: 12.5 },
    { t: 55, kind: 'coin', text: 'RATTLE COIN TURNED PIM', x: 15.5, y: 10.5 },
    { t: 62, kind: 'grab', text: 'BAGGED $150', x: 11.5, y: 13.5 },
    { t: 79, kind: 'grab', text: 'BAGGED $150', x: 3.5, y: 7.5 },
    { t: 94, kind: 'van', text: 'IN THE VAN', x: map.exit.x + 0.4, y: map.exit.y },
  ];
  map.target.taken = true;
  map.cash[1].taken = true;
  map.cash[2].taken = true;
  world.kit = { coin: 0, smoke: 0, emp: 0 };
  world.toolsUsed = 2;
  world.cashTaken = 300;
  world.take = world.level.targetValue + 300;
  world.time = 94;
  world.escaped = true;
  app.world = world;
  app.score = scoreHeist(world);
  app.screen = 'results';
}

export const SHOTS = { cover: stageCover, alarm: stageAlarm, caught: stageCaught, plan: stagePlan, getaway: stageGetaway };

export function stageShot(app, name) {
  const stage = SHOTS[name];
  if (!stage) return false;
  stage(app);
  return true;
}
