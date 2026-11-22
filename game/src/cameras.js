// Security cameras: sweep back and forth, fill an alarm gauge when they hold the thief, radio guards.
import { CAMERA } from './config.js';
import { seesPoint } from './vision.js';
import { raiseAlarm } from './alarm.js';
import { sendGuard } from './guards.js';

export function createCamera(def) {
  return { ...def, base: def.angle, aware: 0, disabled: 0, tripped: false, sees: false, phase: 0 };
}

export function updateCamera(cam, world, dt) {
  const { thief, map, smokes } = world;
  if (cam.disabled > 0) {
    cam.disabled -= dt;
    cam.sees = false;
    cam.aware = Math.max(0, cam.aware - dt);
    return;
  }
  cam.phase += dt;
  cam.angle = cam.base + Math.sin((cam.phase * Math.PI * 2) / cam.period) * cam.sweep;
  cam.sees = !thief.inVent && seesPoint(cam, cam.angle, CAMERA.range, CAMERA.halfAngle, map, thief.x, thief.y, smokes);
  if (cam.sees) {
    const hidden = thief.inShadow && Math.hypot(thief.x - cam.x, thief.y - cam.y) > 2;
    cam.aware = Math.min(1, cam.aware + (hidden ? 0.35 : 1.4) * dt);
    if (cam.aware >= 1) world.alarm = Math.min(100, world.alarm + 9 * dt);
    if (cam.aware >= 1 && !cam.tripped) {
      cam.tripped = true;
      raiseAlarm(world, 25, 'CAMERA HAS YOU ON TAPE');
      world.sfx.push('camera');
      const nearest = [...world.guards].sort((a, b) => Math.hypot(a.x - thief.x, a.y - thief.y) - Math.hypot(b.x - thief.x, b.y - thief.y));
      nearest.slice(0, 2).forEach((g) => sendGuard(g, map, thief, false));
    }
  } else {
    cam.aware = Math.max(0, cam.aware - 0.45 * dt);
    if (cam.aware < 0.2) cam.tripped = false;
  }
}
