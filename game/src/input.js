// Keyboard and mouse: held keys, presses this frame, and the mouse in canvas pixels.
const held = new Set();
const pressed = [];
const clicks = [];
const mouse = { x: -1, y: -1, inside: false };

export function bindInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (!held.has(e.code)) pressed.push(e.code);
    held.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
  };
  canvas.addEventListener('mousemove', (e) => Object.assign(mouse, toCanvas(e), { inside: true }));
  canvas.addEventListener('mouseleave', () => { mouse.inside = false; });
  canvas.addEventListener('mousedown', (e) => {
    clicks.push({ ...toCanvas(e), button: e.button });
    e.preventDefault();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function isHeld(...codes) {
  return codes.some((c) => held.has(c));
}

export function takePresses() {
  return pressed.splice(0, pressed.length);
}

export function takeClicks() {
  return clicks.splice(0, clicks.length);
}

export function mousePos() {
  return mouse;
}

export function moveDirection() {
  const x = (isHeld('KeyD', 'ArrowRight') ? 1 : 0) - (isHeld('KeyA', 'ArrowLeft') ? 1 : 0);
  const y = (isHeld('KeyS', 'ArrowDown') ? 1 : 0) - (isHeld('KeyW', 'ArrowUp') ? 1 : 0);
  return { x, y };
}
