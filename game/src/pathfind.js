// Breadth-first search over tiles: guards use it to patrol, investigate and chase.
const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function findPath(map, from, to, canEnter) {
  const sx = Math.floor(from.x);
  const sy = Math.floor(from.y);
  const gx = Math.floor(to.x);
  const gy = Math.floor(to.y);
  if (!canEnter(map, gx + 0.5, gy + 0.5)) return null;
  const key = (x, y) => y * map.w + x;
  const cameFrom = new Map([[key(sx, sy), -1]]);
  const queue = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === gx && y === gy) return tracePath(cameFrom, key(x, y), map.w);
    for (const [dx, dy] of STEPS) {
      const nx = x + dx;
      const ny = y + dy;
      const k = key(nx, ny);
      if (cameFrom.has(k) || !canEnter(map, nx + 0.5, ny + 0.5)) continue;
      cameFrom.set(k, key(x, y));
      queue.push([nx, ny]);
    }
  }
  return null;
}

function tracePath(cameFrom, end, width) {
  const path = [];
  for (let k = end; k !== -1; k = cameFrom.get(k)) path.push({ x: (k % width) + 0.5, y: Math.floor(k / width) + 0.5 });
  path.reverse();
  path.shift(); // drop the tile we stand on
  return path;
}
