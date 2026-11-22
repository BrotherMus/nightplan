// Shared numbers and the blueprint palette for Nightplan.
export const TILE = 40;
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 64;
export const LEGEND_H = 56;
export const COLS = 32;
export const ROWS = 17;

// Architect's blueprint: cyan line-work on navy, with three loud colours that mean one thing each.
export const INK = {
  paper: '#0a2342',
  paperDeep: '#071a33',
  grid: 'rgba(130,200,255,0.07)',
  gridMajor: 'rgba(130,200,255,0.15)',
  wall: '#9edcff',
  wallFill: '#173f6b',
  text: '#e2f4ff',
  dim: '#7fb3dc',
  guardCone: '#ff4040', // danger: guards
  cameraCone: '#ff9a1f', // danger: cameras
  safe: '#3fe08c', // shadow you can hide in
  loot: '#ffd23a', // things worth stealing
  vent: '#6ff0d0',
  thief: '#ffffff',
  alarm: '#ff2d55',
};

export const THIEF = {
  walk: 3.1,
  sprint: 5.4,
  crawl: 1.5,
  radius: 0.28,
  walkNoise: 1.1,
  sprintNoise: 4.6,
};

export const GUARD = {
  patrolSpeed: 2.1,
  chaseSpeed: 4.3,
  range: 6.5,
  halfAngle: 0.6,
  catchDistance: 0.6,
  hearing: 1.0,
};

export const CAMERA = {
  range: 7.5,
  halfAngle: 0.36,
};

export const HOLD = {
  pick: 2.2, // seconds to pick a lock
  crack: 3.4, // seconds to crack the target
  grab: 0.5, // seconds to bag cash
};

export const LOCKDOWN_SECONDS = 25;
export const BUDGET = 900;

// Tools are bought on the plan screen; every dollar spent comes out of the take.
export const TOOLS = [
  { id: 'coin', key: '1', name: 'RATTLE COIN', cost: 40, blurb: 'Thrown noise. Guards walk to where it lands.' },
  { id: 'smoke', key: '2', name: 'SMOKE PUCK', cost: 180, blurb: 'A cloud no cone can see through, 7 s.' },
  { id: 'emp', key: '3', name: 'EMP TAG', cost: 260, blurb: 'Blinds one camera for 9 s.' },
];
