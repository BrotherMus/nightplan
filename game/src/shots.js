// Staged moments for screenshots (?shot=cover|alarm|plan|getaway): real game state, posed by hand.
import { createHeist, scoreHeist } from './heist.js';
import { findPath } from './pathfind.js';
import { thiefCanEnter } from './map.js';

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
  const world = createHeist(1, { entry: 3, kit: { coin: 1, smoke: 1, emp: 1 }, spent: 560 });
  const map = world.map;
  map.target.taken = true;
  world.thief.carrying = true;
  world.thief.x = 12.6;
  world.thief.y = 12.5;
  world.thief.facing = Math.PI * 0.95;
  world.thief.trail = routeThrough(map, [map.entries[3], { x: 24.5, y: 6.5 }, { x: 19.5, y: 12.5 }, { x: 27.5, y: 11.5 }, { x: 12.6, y: 12.5 }]);
  pose(world, 'PIM', 5.5, 13.5, -0.25, 'alert', 1);
  pose(world, 'RUDD', 20.5, 12.5, Math.PI, 'alert', 1);
  pose(world, 'SOLVEIG', 12.5, 7.5, 1.45, 'alert', 1);
  pose(world, 'ODA', 15.5, 3.5, 1.9, 'search', 0.6);
  world.smokes.push({ x: 16.6, y: 12.4, r: 1.8, t: 5 });
  world.cameras[1].disabled = 6.2;
  world.cameras[0].angle = Math.PI / 2 + 0.5;
  world.cameras[2].angle = Math.PI / 2 - 0.4;
  world.alarm = 100;
  world.lockdown = 14.2;
  world.take = 3750;
  world.cashTaken = 150;
  world.alarmsRaised = 2;
  world.time = 131;
  world.kit.smoke = 0;
  world.kit.emp = 0;
  world.banner = { text: 'LOCKDOWN: REACH THE VAN', t: 2, danger: true };
  app.world = world;
  app.tool = 'coin';
  app.aim = null;
  app.screen = 'play';
}

function stagePlan(app) {
  app.plan = { levelIndex: 0, entry: 2, kit: { coin: 3, smoke: 1, emp: 1 } };
  app.screen = 'plan';
}

function stageGetaway(app) {
  const world = createHeist(0, { entry: 1, kit: { coin: 1, smoke: 0, emp: 1 }, spent: 560 });
  const map = world.map;
  world.thief.trail = routeThrough(map, [map.entries[1], { x: 3.5, y: 7.5 }, { x: 11.5, y: 10.5 }, { x: 11.5, y: 12.5 },
    { x: 27.5, y: 12.5 }, { x: 27.5, y: 7.5 }, map.target, { x: 29.5, y: 9.5 }, { x: 27.5, y: 13.5 }, map.exit]);
  map.target.taken = true;
  map.cash[0].taken = true;
  map.cash[2].taken = true;
  world.cashTaken = 300;
  world.take = world.level.targetValue + 300;
  world.time = 124;
  world.escaped = true;
  app.world = world;
  app.score = scoreHeist(world);
  app.screen = 'results';
}

export const SHOTS = { cover: stageCover, alarm: stageAlarm, plan: stagePlan, getaway: stageGetaway };

export function stageShot(app, name) {
  const stage = SHOTS[name];
  if (!stage) return false;
  stage(app);
  return true;
}
