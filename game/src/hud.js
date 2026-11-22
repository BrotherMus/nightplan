// The heads-up display: objective, alarm meter, take and tools on top; legend and controls below.
import { VIEW_W, VIEW_H, HUD_H, LEGEND_H, INK, TOOLS } from './config.js';

const money = (v) => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US')}`;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function drawAlarmMeter(ctx, world, t) {
  const x = 610;
  const y = 14;
  const w = 300;
  const h = 36;
  const level = world.alarm / 100;
  ctx.fillStyle = INK.text;
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALARM', x - 10, y + h / 2);
  ctx.fillStyle = '#04122a';
  ctx.fillRect(x, y, w, h);
  const color = world.lockdown > 0 ? (Math.sin(t * 12) > 0 ? INK.alarm : '#ff9aa9') : level > 0.66 ? INK.alarm : level > 0.33 ? INK.cameraCone : INK.loot;
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, (w - 4) * level, h - 4);
  ctx.strokeStyle = INK.wall;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  for (let i = 1; i < 10; i++) {
    ctx.strokeStyle = 'rgba(10,35,66,0.8)';
    ctx.beginPath();
    ctx.moveTo(x + (w * i) / 10, y + 2);
    ctx.lineTo(x + (w * i) / 10, y + h - 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.textAlign = 'center';
  const label = world.lockdown > 0 ? `LOCKDOWN ${clock(world.lockdown)}` : `${Math.round(world.alarm)}%`;
  ctx.strokeStyle = '#04122a';
  ctx.lineWidth = 4;
  ctx.strokeText(label, x + w / 2, y + h / 2 + 1);
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

export function drawHud(ctx, world, t, selectedTool) {
  ctx.fillStyle = INK.paperDeep;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.strokeStyle = INK.wall;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H - 1);
  ctx.lineTo(VIEW_W, HUD_H - 1);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK.dim;
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.fillText(`${world.level.sheet} · ${world.level.site}`, 14, 16);
  ctx.fillStyle = world.thief.carrying ? INK.safe : INK.loot;
  ctx.font = 'bold 20px "Courier New", monospace';
  const objective = world.thief.carrying ? 'GETAWAY: CARRY IT TO THE VAN' : `OBJECTIVE: STEAL ${world.level.target}`;
  ctx.fillText(objective, 14, 42);
  drawAlarmMeter(ctx, world, t);
  ctx.textAlign = 'left';
  ctx.fillStyle = INK.loot;
  ctx.font = 'bold 17px "Courier New", monospace';
  ctx.fillText(`TAKE ${money(world.take)}`, 924, 22);
  ctx.fillStyle = INK.text;
  ctx.fillText(`TIME ${clock(world.time)}`, 924, 45);
  TOOLS.forEach((tool, i) => {
    const x = 1084 + i * 64;
    const active = tool.id === selectedTool;
    ctx.fillStyle = active ? 'rgba(255,210,58,0.2)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, 8, 58, 48);
    ctx.strokeStyle = active ? INK.loot : INK.dim;
    ctx.lineWidth = active ? 2.5 : 1;
    ctx.strokeRect(x, 8, 58, 48);
    ctx.fillStyle = active ? INK.loot : INK.text;
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${tool.key} ${tool.name.split(' ')[0]}`, x + 29, 22);
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`x${world.kit[tool.id]}`, x + 29, 43);
  });
}

const LEGEND = [
  { kind: 'dot', color: INK.thief, text: 'THIEF' },
  { kind: 'cone', color: INK.guardCone, text: 'GUARD CONE' },
  { kind: 'cone', color: INK.cameraCone, text: 'CAMERA CONE' },
  { kind: 'hatch', color: INK.safe, text: 'SHADOW = SAFE' },
  { kind: 'diamond', color: INK.loot, text: 'LOOT' },
  { kind: 'box', color: INK.vent, text: 'VENT' },
  { kind: 'bar', color: INK.cameraCone, text: 'LOCK' },
];

export function drawLegend(ctx) {
  const y0 = VIEW_H - LEGEND_H;
  ctx.fillStyle = INK.paperDeep;
  ctx.fillRect(0, y0, VIEW_W, LEGEND_H);
  ctx.strokeStyle = INK.wall;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y0 + 1);
  ctx.lineTo(VIEW_W, y0 + 1);
  ctx.stroke();
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let x = 14;
  const cy = y0 + 18;
  LEGEND.forEach((item) => {
    ctx.fillStyle = item.color;
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2;
    if (item.kind === 'dot') {
      ctx.beginPath();
      ctx.arc(x + 7, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'cone') {
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, cy);
      ctx.lineTo(x + 18, cy - 8);
      ctx.lineTo(x + 18, cy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (item.kind === 'hatch') {
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, cy - 7, 16, 14);
      ctx.globalAlpha = 1;
    } else if (item.kind === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(x + 8, cy - 8);
      ctx.lineTo(x + 15, cy);
      ctx.lineTo(x + 8, cy + 8);
      ctx.lineTo(x + 1, cy);
      ctx.fill();
    } else if (item.kind === 'box') {
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(x + 1, cy - 7, 14, 14);
      ctx.setLineDash([]);
    } else {
      ctx.fillRect(x, cy - 2, 18, 4);
    }
    ctx.fillStyle = INK.text;
    ctx.fillText(item.text, x + 24, cy);
    x += 24 + ctx.measureText(item.text).width + 22;
  });
  ctx.fillStyle = INK.dim;
  ctx.fillText('WASD MOVE · SHIFT SPRINT (LOUD) · HOLD E PICK/CRACK/GRAB · 1-3 TOOL · CLICK THROW · N NOTES · P PAUSE', 14, y0 + 42);
}

export function drawBanner(ctx, world) {
  if (!world.banner) return;
  const text = world.banner.text;
  ctx.font = 'bold 26px "Courier New", monospace';
  const w = ctx.measureText(text).width + 40;
  const x = VIEW_W / 2;
  const y = HUD_H + 36;
  ctx.globalAlpha = Math.min(1, world.banner.t * 2);
  ctx.fillStyle = world.banner.danger ? 'rgba(120,10,30,0.92)' : 'rgba(7,26,51,0.92)';
  ctx.fillRect(x - w / 2, y - 22, w, 44);
  ctx.strokeStyle = world.banner.danger ? INK.alarm : INK.wall;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w / 2, y - 22, w, 44);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.globalAlpha = 1;
}
