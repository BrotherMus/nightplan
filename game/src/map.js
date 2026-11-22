// Turns a text floor plan into a queryable map: who can walk where, what blocks sight.
const SOLID = '#c';

export function parseFloorPlan(level) {
  const grid = level.rows.map((row) => row.split(''));
  const map = { w: grid[0].length, h: grid.length, grid, entries: {}, exit: null, target: null, cash: [] };
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const c = grid[y][x];
      if (c >= '1' && c <= '3') {
        map.entries[c] = { x: x + 0.5, y: y + 0.5 };
        grid[y][x] = '.';
      } else if (c === 'E') {
        map.exit = { x: x + 0.5, y: y + 0.5 };
      } else if (c === 'G') {
        map.target = { x: x + 0.5, y: y + 0.5, taken: false };
        grid[y][x] = '.';
      } else if (c === '$') {
        map.cash.push({ x: x + 0.5, y: y + 0.5, taken: false, value: 150 });
        grid[y][x] = '.';
      }
    }
  }
  return map;
}

export function tileAt(map, x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return '#';
  return map.grid[ty][tx];
}

export function thiefCanEnter(map, x, y) {
  const c = tileAt(map, x, y);
  return !SOLID.includes(c) && c !== 'L';
}

export function guardCanEnter(map, x, y) {
  const c = tileAt(map, x, y);
  return !SOLID.includes(c) && c !== 'v'; // guards carry keys, so locked doors are open to them
}

export function blocksSight(map, x, y) {
  const c = tileAt(map, x, y);
  return c === '#' || c === 'c' || c === 'L' || c === 'v';
}

export function isShadow(map, x, y) {
  return tileAt(map, x, y) === ',';
}

export function isVent(map, x, y) {
  return tileAt(map, x, y) === 'v';
}

export function unlockDoor(map, x, y) {
  map.grid[Math.floor(y)][Math.floor(x)] = 'D';
}
