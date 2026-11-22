// render.js — everything the eye receives: the guildhall's floors and
// lamplight, the wardens' gaze drawn as cones that die against cover, the
// burglar, the rings of noise, the HUD with its eye and its alarm line,
// the field-notes legend, the annotation callouts the game draws about
// itself, and the title, caught and getaway-report screens.

import {
  ROOMS, WALLS, COVERS, GRASS, CREAKY, LAMPS, DAIS, HATCH, PATROLS,
  rayDistance, getLosBlockers,
} from './guildhall.js';
import { CONE_HALF, alarmLevel } from './wardens.js';
import { countValuables } from './burglar.js';

const CONE_DRAW_RANGE = 238;

// Small deterministic hash so floor speckle never shimmers between frames.
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, 1280, 720);
  ctx.fillStyle = '#070a0f';
  ctx.fillRect(0, 0, 1280, 720);
  drawFloors(ctx, game);
  drawPatrolLines(ctx);
  drawLampPools(ctx);
  drawDaisAndItems(ctx, game);
  drawHatch(ctx, game);
  drawGrassBases(ctx);
  drawCovers(ctx);
  drawCones(ctx, game);
  drawRings(ctx, game);
  drawPebble(ctx, game);
  for (const w of game.wardens) drawWarden(ctx, game, w);
  drawBurglar(ctx, game);
  drawGrassBlades(ctx, game);
  drawVignette(ctx, game);
  if (game.state !== 'title') drawHud(ctx, game);
  if (game.showNotes) drawFieldNotes(ctx);
  drawCallouts(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);
  if (game.state === 'caught') drawCaught(ctx, game);
  if (game.state === 'won') drawGetaway(ctx, game);
  if (game.paused) drawPaused(ctx);
}

// ------------------------------------------------------------------ floors

function drawFloors(ctx, game) {
  for (const room of ROOMS) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(room.x, room.y, room.w, room.h);
    ctx.clip();
    if (room.floor === 'checker') drawChecker(ctx, room);
    else if (room.floor === 'wood') drawWood(ctx, room);
    else if (room.floor === 'carpet') drawCarpet(ctx, room);
    else drawStone(ctx, room);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(room.name.toUpperCase(), room.x + 8, room.y + 14);
  }
  // creaky patches: paler, nail-studded boards over the wood
  for (const c of CREAKY) {
    ctx.fillStyle = 'rgba(214,178,116,0.20)';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(120,88,44,0.55)';
    ctx.lineWidth = 1;
    for (let y = c.y + 10; y < c.y + c.h; y += 12) {
      ctx.beginPath(); ctx.moveTo(c.x + 3, y); ctx.lineTo(c.x + c.w - 3, y); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(60,42,20,0.8)';
    for (let x = c.x + 10; x < c.x + c.w; x += 26) {
      ctx.beginPath(); ctx.arc(x, c.y + 6, 1.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x, c.y + c.h - 6, 1.6, 0, 7); ctx.fill();
    }
  }
  // walls: dark slate with a lit top edge
  ctx.fillStyle = '#2b3444';
  for (const w of WALLS) ctx.fillRect(w.x, w.y, w.w, w.h);
  ctx.fillStyle = 'rgba(140,165,200,0.35)';
  for (const w of WALLS) ctx.fillRect(w.x, w.y, w.w, 2);
}

function drawChecker(ctx, room) {
  const t = 34;
  ctx.fillStyle = '#39404f';
  ctx.fillRect(room.x, room.y, room.w, room.h);
  ctx.fillStyle = '#313947';
  for (let y = room.y, row = 0; y < room.y + room.h; y += t, row++) {
    for (let x = room.x + (row % 2) * t, col = 0; x < room.x + room.w; x += t * 2, col++) {
      ctx.fillRect(x, y, t, t);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = room.x; x <= room.x + room.w; x += t) { ctx.moveTo(x, room.y); ctx.lineTo(x, room.y + room.h); }
  for (let y = room.y; y <= room.y + room.h; y += t) { ctx.moveTo(room.x, y); ctx.lineTo(room.x + room.w, y); }
  ctx.stroke();
}

function drawWood(ctx, room) {
  ctx.fillStyle = '#4a3823';
  ctx.fillRect(room.x, room.y, room.w, room.h);
  const t = 22;
  for (let y = room.y, row = 0; y < room.y + room.h; y += t, row++) {
    ctx.fillStyle = row % 2 ? '#513d27' : '#46351f';
    ctx.fillRect(room.x, y, room.w, t - 1);
    ctx.strokeStyle = 'rgba(30,20,10,0.35)';
    ctx.beginPath();
    for (let x = room.x + ((row * 67) % 150); x < room.x + room.w; x += 150) {
      ctx.moveTo(x, y + 4); ctx.lineTo(x + 60 + hash(x, y) * 60, y + 4 + hash(y, x) * 12);
    }
    ctx.stroke();
  }
}

function drawCarpet(ctx, room) {
  ctx.fillStyle = '#47202f';
  ctx.fillRect(room.x, room.y, room.w, room.h);
  ctx.strokeStyle = '#7a3c50';
  ctx.lineWidth = 3;
  ctx.strokeRect(room.x + 10, room.y + 10, room.w - 20, room.h - 20);
  ctx.strokeStyle = 'rgba(232,194,104,0.10)';
  ctx.lineWidth = 1;
  for (let y = room.y + 34; y < room.y + room.h - 20; y += 34) {
    for (let x = room.x + 34; x < room.x + room.w - 20; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y);
      ctx.closePath(); ctx.stroke();
    }
  }
}

function drawStone(ctx, room) {
  const t = 46;
  ctx.fillStyle = '#333a42';
  ctx.fillRect(room.x, room.y, room.w, room.h);
  ctx.fillStyle = '#39414b';
  for (let y = room.y, row = 0; y < room.y + room.h; y += t, row++) {
    for (let x = room.x + (row % 2) * (t / 2); x < room.x + room.w; x += t) ctx.fillRect(x, y, t - 2, t - 2);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 130; i++) {
    const x = room.x + hash(i, room.x) * room.w;
    const y = room.y + hash(room.y, i) * room.h;
    ctx.fillRect(x, y, 2, 2);
  }
}

// ------------------------------------------------------- light and routes

function drawPatrolLines(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(240,230,200,0.14)';
  ctx.lineWidth = 2;
  ctx.setLineDash([1, 8]);
  ctx.lineCap = 'round';
  for (const p of PATROLS) {
    ctx.beginPath();
    p.route.forEach((wp, i) => (i === 0 ? ctx.moveTo(wp.x, wp.y) : ctx.lineTo(wp.x, wp.y)));
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(240,230,200,0.25)';
  for (const p of PATROLS) {
    for (const wp of p.route) {
      ctx.beginPath(); ctx.arc(wp.x, wp.y, 2.4, 0, 7); ctx.fill();
    }
  }
}

function drawLampPools(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const lamp of LAMPS) {
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, lamp.r);
    g.addColorStop(0, 'rgba(255,206,110,0.34)');
    g.addColorStop(0.62, 'rgba(255,190,90,0.16)');
    g.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, lamp.r, 0, 7); ctx.fill();
  }
  ctx.restore();
  for (const lamp of LAMPS) {
    ctx.fillStyle = '#0f1319';
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 6, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ffe6a3';
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 2.6, 0, 7); ctx.fill();
  }
}

// ------------------------------------------------------------- the prizes

function drawDaisAndItems(ctx, game) {
  // the vault dais: a stepped platform with a gilt edge
  ctx.fillStyle = '#5d4a2f';
  ctx.fillRect(DAIS.x - 6, DAIS.y - 6, DAIS.w + 12, DAIS.h + 12);
  ctx.fillStyle = '#6d5738';
  ctx.fillRect(DAIS.x, DAIS.y, DAIS.w, DAIS.h);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.strokeRect(DAIS.x, DAIS.y, DAIS.w, DAIS.h);

  for (const item of game.items) {
    if (item.taken) continue;
    const pulse = 0.75 + 0.25 * Math.sin(game.time * 3 + item.x);
    const g = ctx.createRadialGradient(item.x, item.y, 2, item.x, item.y, 26);
    g.addColorStop(0, `rgba(255,220,130,${0.35 * pulse})`);
    g.addColorStop(1, 'rgba(255,220,130,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(item.x, item.y, 26, 0, 7); ctx.fill();
    if (item.id === 'chronometer') {
      ctx.fillStyle = '#e8c268';
      ctx.beginPath(); ctx.arc(item.x, item.y, 11, 0, 7); ctx.fill();
      ctx.fillStyle = '#2a2118';
      ctx.beginPath(); ctx.arc(item.x, item.y, 8.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 1.6;
      const a = game.time * 0.7;
      ctx.beginPath(); ctx.moveTo(item.x, item.y); ctx.lineTo(item.x + Math.cos(a) * 6, item.y + Math.sin(a) * 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(item.x, item.y); ctx.lineTo(item.x + Math.cos(a * 3.7) * 4.4, item.y + Math.sin(a * 3.7) * 4.4); ctx.stroke();
    } else if (item.id === 'astrolabe') {
      ctx.strokeStyle = '#e8c268';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(item.x, item.y, 9, 0, 7); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(item.x - 9, item.y); ctx.lineTo(item.x + 9, item.y);
      ctx.moveTo(item.x, item.y - 9); ctx.lineTo(item.x, item.y + 9);
      ctx.stroke();
      ctx.fillStyle = '#ff6b5e';
      ctx.beginPath(); ctx.arc(item.x, item.y, 2.6, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = '#e8c268';
      ctx.beginPath(); ctx.arc(item.x, item.y, 7.5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(item.x, item.y - 11, 4.5, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.fillStyle = '#2a2118';
      ctx.beginPath(); ctx.arc(item.x, item.y, 2.2, 0, 7); ctx.fill();
    }
  }
}

function drawHatch(ctx, game) {
  const open = game.player.held.chronometer;
  ctx.fillStyle = '#1a222c';
  ctx.fillRect(HATCH.x, HATCH.y, HATCH.w, HATCH.h);
  ctx.strokeStyle = 'rgba(190,205,220,0.35)';
  ctx.lineWidth = 1;
  for (let y = HATCH.y + 9; y < HATCH.y + HATCH.h - 4; y += 9) {
    ctx.beginPath(); ctx.moveTo(HATCH.x + 5, y); ctx.lineTo(HATCH.x + HATCH.w - 5, y); ctx.stroke();
  }
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = open ? '#39e6a3' : '#5a6675';
  ctx.strokeRect(HATCH.x, HATCH.y, HATCH.w, HATCH.h);
  if (open) {
    ctx.save();
    ctx.shadowColor = '#39e6a3';
    ctx.shadowBlur = 12;
    ctx.strokeRect(HATCH.x, HATCH.y, HATCH.w, HATCH.h);
    ctx.restore();
  }
  ctx.font = '700 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = open ? '#39e6a3' : '#7c8a99';
  ctx.fillText(open ? 'EXIT — OPEN' : 'HATCH — LOCKED', HATCH.x + HATCH.w / 2, HATCH.y - 7);
}

// ------------------------------------------------------------------ cover

function drawGrassBases(ctx) {
  for (const g of GRASS) {
    ctx.fillStyle = '#223d24';
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = '#314f31';
    ctx.lineWidth = 2;
    ctx.strokeRect(g.x, g.y, g.w, g.h);
  }
}

function drawGrassBlades(ctx, game) {
  ctx.strokeStyle = 'rgba(96,178,102,0.75)';
  ctx.lineWidth = 1.6;
  for (const g of GRASS) {
    ctx.beginPath();
    for (let i = 0; i < 46; i++) {
      const x = g.x + 4 + hash(i, g.x) * (g.w - 8);
      const y = g.y + 4 + hash(g.y, i) * (g.h - 8);
      const sway = Math.sin(game.time * 1.4 + i) * 2;
      ctx.moveTo(x, y + 5);
      ctx.quadraticCurveTo(x + sway, y - 3, x + sway * 1.6, y - 8 - hash(i, y) * 5);
    }
    ctx.stroke();
  }
}

function drawCovers(ctx) {
  for (const c of COVERS) {
    if (c.kind === 'crate') {
      ctx.fillStyle = '#6b4e2c';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = '#8a6a3c';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      ctx.beginPath();
      ctx.moveTo(c.x + 2, c.y + 2); ctx.lineTo(c.x + c.w - 2, c.y + c.h - 2);
      ctx.moveTo(c.x + c.w - 2, c.y + 2); ctx.lineTo(c.x + 2, c.y + c.h - 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#3d2c1c';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = '#6d5230';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      ctx.beginPath(); ctx.moveTo(c.x + c.w / 2, c.y + 3); ctx.lineTo(c.x + c.w / 2, c.y + c.h - 3); ctx.stroke();
      ctx.fillStyle = '#c9a227';
      ctx.beginPath(); ctx.arc(c.x + c.w / 2 - 5, c.y + c.h / 2, 1.8, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(c.x + c.w / 2 + 5, c.y + c.h / 2, 1.8, 0, 7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(c.x, c.y + c.h, c.w, 4);
  }
}

// ----------------------------------------------------------------- vision

function drawCones(ctx, game) {
  const blockers = getLosBlockers();
  for (const w of game.wardens) {
    const chasing = w.state === 'chase';
    const suspicious = w.suspicion >= 0.35;
    const fill = chasing ? 'rgba(255,72,50,0.22)' : suspicious ? 'rgba(255,146,52,0.19)' : 'rgba(255,196,86,0.15)';
    const inner = chasing ? 'rgba(255,72,50,0.16)' : suspicious ? 'rgba(255,146,52,0.13)' : 'rgba(255,206,110,0.11)';
    for (const [range, style] of [[CONE_DRAW_RANGE, fill], [CONE_DRAW_RANGE * 0.55, inner]]) {
      ctx.fillStyle = style;
      ctx.beginPath();
      ctx.moveTo(w.x, w.y);
      const steps = 26;
      for (let i = 0; i <= steps; i++) {
        const ang = w.dir - CONE_HALF + (2 * CONE_HALF * i) / steps;
        const d = rayDistance(w.x, w.y, ang, range, blockers);
        ctx.lineTo(w.x + Math.cos(ang) * d, w.y + Math.sin(ang) * d);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawRings(ctx, game) {
  for (const ring of game.rings) {
    const age = (game.time - ring.born) / 0.9;
    if (age < 0 || age > 1) continue;
    const r = ring.max * (0.15 + 0.85 * age);
    ctx.strokeStyle = ring.kind === 'noise' ? `rgba(255,240,200,${0.5 * (1 - age)})` : `rgba(160,220,255,${0.35 * (1 - age)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ring.x, ring.y, r, 0, 7); ctx.stroke();
  }
}

function drawPebble(ctx, game) {
  const p = game.pebble;
  if (!p) return;
  const t = Math.min(1, p.t / p.dur);
  const x = p.x + (p.tx - p.x) * t;
  const y = p.y + (p.ty - p.y) * t - Math.sin(t * Math.PI) * 34;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(p.x + (p.tx - p.x) * t, p.y + (p.ty - p.y) * t + 8, 5, 2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#c7d0da';
  ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7); ctx.fill();
}

// ----------------------------------------------------------------- actors

function drawWarden(ctx, game, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(w.x, w.y + 10, 12, 4.5, 0, 0, 7); ctx.fill();
  // lantern glow carried ahead of the body
  const lx = w.x + Math.cos(w.dir) * 17, ly = w.y + Math.sin(w.dir) * 17;
  const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 20);
  g.addColorStop(0, 'rgba(255,214,130,0.5)');
  g.addColorStop(1, 'rgba(255,214,130,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(lx, ly, 20, 0, 7); ctx.fill();
  // coat and head
  ctx.fillStyle = '#5a2027';
  ctx.beginPath(); ctx.arc(w.x, w.y, 13, 0, 7); ctx.fill();
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(w.x, w.y, 13, 0, 7); ctx.stroke();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath(); ctx.arc(w.x + Math.cos(w.dir) * 3.5, w.y + Math.sin(w.dir) * 3.5, 5.4, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffe6a3';
  ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, 7); ctx.fill();
  // suspicion arc: a ring that fills amber, then red, around the head
  if (w.suspicion > 0.02 && w.state !== 'chase') {
    ctx.strokeStyle = w.suspicion >= 0.35 ? '#ff9a3d' : 'rgba(255,200,90,0.7)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 19, -Math.PI / 2, -Math.PI / 2 + w.suspicion * Math.PI * 2);
    ctx.stroke();
  }
  ctx.font = '800 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  if (w.state === 'chase') {
    ctx.fillStyle = '#ff5a4d';
    ctx.fillText('!', w.x, w.y - 22);
  } else if (w.state === 'investigate' || w.state === 'look' || w.suspicion >= 0.35) {
    ctx.fillStyle = '#ffb84d';
    ctx.fillText('?', w.x, w.y - 22);
  }
  if (w.bubbleT > 0 && w.bubble) {
    ctx.font = '600 11.5px system-ui, sans-serif';
    const tw = ctx.measureText(w.bubble).width + 14;
    const bx = w.x - tw / 2, by = w.y - 52;
    ctx.fillStyle = 'rgba(244,240,228,0.95)';
    ctx.beginPath(); ctx.roundRect(bx, by, tw, 19, 5); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w.x - 4, by + 19); ctx.lineTo(w.x + 4, by + 19); ctx.lineTo(w.x, by + 25);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#232a33';
    ctx.fillText(w.bubble, w.x, by + 13.5);
  }
}

function drawBurglar(ctx, game) {
  const b = game.player;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(b.x, b.y + 9, 11, 4, 0, 0, 7); ctx.fill();
  if (b.exposure.name === 'LIT') {
    ctx.strokeStyle = 'rgba(255,220,130,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(b.x, b.y, 16.5, 0, 7); ctx.stroke();
  }
  ctx.fillStyle = '#141e29';
  ctx.beginPath(); ctx.arc(b.x, b.y, 12, 0, 7); ctx.fill();
  ctx.strokeStyle = '#4fe3c1';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(b.x, b.y, 12, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  // hood point trailing the facing direction
  ctx.fillStyle = '#1d2c3c';
  ctx.beginPath();
  ctx.arc(b.x + Math.cos(b.dir) * 3, b.y + Math.sin(b.dir) * 3, 6.4, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath(); ctx.arc(b.x + Math.cos(b.dir) * 6, b.y + Math.sin(b.dir) * 6, 3, 0, 7); ctx.fill();
  if (b.sneaking) {
    ctx.font = '600 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(160,230,210,0.8)';
    ctx.fillText('SNEAK', b.x, b.y + 24);
  }
}

function drawVignette(ctx, game) {
  const chase = game.wardens.some((w) => w.state === 'chase');
  const g = ctx.createRadialGradient(640, 378, 430, 640, 378, 880);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, chase ? 'rgba(120,10,4,0.5)' : 'rgba(0,0,0,0.44)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);
}

// -------------------------------------------------------------------- HUD

const STATUS_TEXT = {
  quiet: ['● ALL QUIET', '#8fd0a8'],
  stirring: ['● SOMETHING STIRS…', '#ffd34d'],
  suspicious: ['● A WARDEN IS SUSPICIOUS', '#ffb84d'],
  spotted: ['● SPOTTED! BREAK LINE OF SIGHT', '#ff6b5e'],
};

function drawHud(ctx, game) {
  ctx.fillStyle = 'rgba(6,10,16,0.9)';
  ctx.fillRect(0, 0, 1280, 60);
  ctx.fillRect(0, 688, 1280, 32);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(0, 60, 1280, 1.6);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8c268';
  ctx.font = '700 23px Georgia, "Times New Roman", serif';
  ctx.fillText('THE GILDED HOUR', 24, 30);
  ctx.fillStyle = '#8fa6bb';
  ctx.font = '600 10.5px system-ui, sans-serif';
  ctx.fillText('JOB: THE PERPETUAL CHRONOMETER', 25, 49);

  const objective = game.player.held.chronometer
    ? 'ESCAPE THROUGH THE SERVICE HATCH, UNSEEN'
    : 'STEAL THE PERPETUAL CHRONOMETER';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4e9c9';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText(objective, 640, 25);
  const level = game.statusOverride ? game.statusLevel || 'suspicious' : alarmLevel(game);
  const [statusText, statusColor] = game.statusOverride
    ? [`● ${game.statusOverride}`, STATUS_TEXT[level][1]]
    : STATUS_TEXT[level];
  ctx.fillStyle = statusColor;
  ctx.font = '600 12.5px system-ui, sans-serif';
  ctx.fillText(statusText, 640, 47);

  // right-hand cluster: eye, pebbles, valuables, time
  drawEyeStat(ctx, game);
  drawDotStat(ctx, 1086, 'PEBBLES', game.pebblesLeft, 4);
  drawTextStat(ctx, 1174, `${countValuables(game.player)}/3`, 'VALUABLES');
  drawTextStat(ctx, 1256, fmtTime(game.elapsed), 'TIME');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9db2c6';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('WASD / ARROWS move · SHIFT sneak · MOUSE aim, CLICK throw a pebble · H field notes · M mute · ESC pause', 640, 708);

  if (game.hintT > 0 && game.hint) {
    ctx.font = '600 13px system-ui, sans-serif';
    const tw = ctx.measureText(game.hint).width + 26;
    ctx.fillStyle = 'rgba(8,12,18,0.88)';
    ctx.beginPath(); ctx.roundRect(640 - tw / 2, 640, tw, 26, 6); ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffe1a8';
    ctx.fillText(game.hint, 640, 657);
  }
}

function drawEyeStat(ctx, game) {
  const cx = 972, cy = 24;
  const name = game.player.exposure.name;
  const iris = name === 'LIT' ? '#ffd34d' : name === 'DIM' ? '#7fb2d9' : '#4fe3c1';
  ctx.strokeStyle = '#dfe9f2';
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.ellipse(cx, cy, 17, 10, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = iris;
  ctx.beginPath(); ctx.arc(cx, cy, 5.4, 0, 7); ctx.fill();
  ctx.fillStyle = '#0a0e14';
  ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, 7); ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = iris;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText(name, cx + 23, cy + 4);
  ctx.fillStyle = '#8fa6bb';
  ctx.font = '600 9px system-ui, sans-serif';
  ctx.fillText('VISIBILITY', cx + 23, cy + 17);
}

function drawDotStat(ctx, cx, label, filled, total) {
  for (let i = 0; i < total; i++) {
    ctx.beginPath();
    ctx.arc(cx - 21 + i * 14, 22, 4.4, 0, 7);
    if (i < filled) { ctx.fillStyle = '#e8eef4'; ctx.fill(); }
    else { ctx.strokeStyle = '#5a6675'; ctx.lineWidth = 1.4; ctx.stroke(); }
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8fa6bb';
  ctx.font = '600 9px system-ui, sans-serif';
  ctx.fillText(label, cx, 41);
}

function drawTextStat(ctx, rightX, big, label) {
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f4e9c9';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillText(big, rightX, 28);
  ctx.fillStyle = '#8fa6bb';
  ctx.font = '600 9px system-ui, sans-serif';
  ctx.fillText(label, rightX, 41);
}

// ------------------------------------------------------------- field notes

function drawFieldNotes(ctx) {
  const x = 24, y = 150, w = 300, h = 252;
  ctx.fillStyle = 'rgba(8,12,18,0.88)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = '#3d4c61';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8c268';
  ctx.font = '700 14px Georgia, serif';
  ctx.fillText('FIELD NOTES', x + 16, y + 26);
  const rows = [
    ['warden', 'Warden + vision cone (what they see)'],
    ['blind', 'Blind spot behind cover: safe'],
    ['lamp', 'Lamplight: you are seen from afar'],
    ['grass', 'Tall grass: hidden unless close'],
    ['creak', 'Creaky boards: loud even sneaking'],
    ['ring', 'Rings: the reach of a noise'],
    ['hatch', 'Exit hatch: opens once you hold the prize'],
  ];
  ctx.font = '12.5px system-ui, sans-serif';
  rows.forEach(([icon, text], i) => {
    const ry = y + 52 + i * 28;
    drawNoteIcon(ctx, icon, x + 26, ry - 4);
    ctx.fillStyle = '#d7e3ee';
    ctx.fillText(text, x + 48, ry);
  });
}

function drawNoteIcon(ctx, kind, cx, cy) {
  ctx.save();
  if (kind === 'warden') {
    ctx.fillStyle = 'rgba(255,196,86,0.5)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 13, cy - 6); ctx.lineTo(cx + 13, cy + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a2027';
    ctx.beginPath(); ctx.arc(cx, cy, 4.6, 0, 7); ctx.fill();
  } else if (kind === 'blind') {
    ctx.fillStyle = '#6b4e2c';
    ctx.fillRect(cx - 8, cy - 7, 16, 14);
    ctx.strokeStyle = '#39e6a3';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = -6; i < 8; i += 5) { ctx.moveTo(cx + i, cy + 7); ctx.lineTo(cx + i + 6, cy - 7); }
    ctx.stroke();
  } else if (kind === 'lamp') {
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 11);
    g.addColorStop(0, 'rgba(255,220,140,0.95)');
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.fill();
  } else if (kind === 'grass') {
    ctx.strokeStyle = '#60b266';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = -7; i <= 7; i += 4) { ctx.moveTo(cx + i, cy + 7); ctx.quadraticCurveTo(cx + i + 1, cy, cx + i + 2, cy - 7); }
    ctx.stroke();
  } else if (kind === 'creak') {
    ctx.fillStyle = '#8a6a3c';
    ctx.fillRect(cx - 9, cy - 6, 18, 12);
    ctx.strokeStyle = '#5d4423';
    ctx.beginPath(); ctx.moveTo(cx - 9, cy); ctx.lineTo(cx + 9, cy); ctx.stroke();
  } else if (kind === 'ring') {
    ctx.strokeStyle = '#ffeec4';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 8.4, 0, 7); ctx.stroke();
  } else if (kind === 'hatch') {
    ctx.strokeStyle = '#39e6a3';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(cx - 7, cy - 7, 14, 14);
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 2); ctx.lineTo(cx + 7, cy - 2);
    ctx.moveTo(cx - 7, cy + 3); ctx.lineTo(cx + 7, cy + 3);
    ctx.stroke();
  }
  ctx.restore();
}

// --------------------------------------------------------------- callouts

function drawCallouts(ctx, game) {
  ctx.font = '700 12.5px system-ui, sans-serif';
  for (const c of game.callouts) {
    ctx.strokeStyle = 'rgba(232,194,104,0.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(c.tx, c.ty); ctx.lineTo(c.x, c.y); ctx.stroke();
    ctx.fillStyle = '#e8c268';
    ctx.beginPath(); ctx.arc(c.tx, c.ty, 3.2, 0, 7); ctx.fill();
    const tw = ctx.measureText(c.text).width + 20;
    ctx.fillStyle = 'rgba(9,13,19,0.93)';
    ctx.beginPath(); ctx.roundRect(c.x - tw / 2, c.y - 13, tw, 26, 5); ctx.fill();
    ctx.strokeStyle = '#e8c268';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.fillText(c.text, c.x, c.y + 4.5);
  }
}

// ---------------------------------------------------------------- screens

function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(4,6,10,0.68)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8c268';
  ctx.font = '700 56px Georgia, "Times New Roman", serif';
  ctx.fillText('THE GILDED HOUR', 640, 218);
  ctx.fillRect(490, 240, 300, 2);
  ctx.fillStyle = '#d7e3ee';
  ctx.font = '16px system-ui, sans-serif';
  const lines = [
    'The guildhall sleeps, but its wardens do not.',
    'The Perpetual Chronometer ticks on the vault dais. Take it, pocket',
    'whatever else glitters, and slip out through the service hatch.',
    'Unseen, if you can. Heard, if you are careless.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 640, 282 + i * 24));
  ctx.fillStyle = '#8fa6bb';
  ctx.font = '13.5px system-ui, sans-serif';
  ctx.fillText('WASD / ARROWS move · SHIFT sneak · MOUSE aim, CLICK throw a pebble', 640, 402);
  ctx.fillText('Lamplight betrays you. Shadow, grass and blind spots are your friends.', 640, 426);
  const blink = 0.55 + 0.45 * Math.sin(game.time * 2.4);
  ctx.fillStyle = `rgba(79,227,193,${blink})`;
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', 640, 486);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(4,6,10,0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4e9c9';
  ctx.font = '700 40px Georgia, serif';
  ctx.fillText('PAUSED', 640, 350);
  ctx.fillStyle = '#8fa6bb';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Esc to resume · the wardens wait for no one', 640, 384);
}

function drawCaught(ctx, game) {
  ctx.fillStyle = 'rgba(34,5,4,0.66)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff7a6b';
  ctx.font = '700 52px Georgia, serif';
  ctx.fillText('CAUGHT', 640, 300);
  ctx.fillStyle = '#f4e9c9';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`Warden ${game.caughtBy} has you by the collar.`, 640, 344);
  ctx.fillStyle = '#8fa6bb';
  ctx.font = '13.5px system-ui, sans-serif';
  ctx.fillText('The Chronometer goes back on its dais. The night, however, is young.', 640, 376);
  ctx.fillStyle = '#4fe3c1';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText('PRESS R TO TRY AGAIN', 640, 424);
}

function drawGetaway(ctx, game) {
  ctx.fillStyle = 'rgba(4,8,9,0.82)';
  ctx.fillRect(0, 0, 1280, 720);
  // the route map, left
  const mx = 66, my = 150, mw = 600, mh = 294;
  ctx.fillStyle = '#0b1017';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#33465c';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(mx, my, mw, mh);
  const sx = (wx) => mx + ((wx - 16) / 1248) * mw;
  const sy = (wy) => my + ((wy - 72) / 612) * mh;
  for (const room of ROOMS) {
    ctx.fillStyle = '#131b25';
    ctx.fillRect(sx(room.x), sy(room.y), (room.w / 1248) * mw, (room.h / 612) * mh);
    ctx.strokeStyle = '#2b3c50';
    ctx.strokeRect(sx(room.x), sy(room.y), (room.w / 1248) * mw, (room.h / 612) * mh);
  }
  ctx.fillStyle = '#39e6a3';
  ctx.fillRect(sx(HATCH.x), sy(HATCH.y), (HATCH.w / 1248) * mw, (HATCH.h / 612) * mh);
  ctx.fillStyle = '#e8c268';
  ctx.beginPath(); ctx.arc(sx(DAIS.x + DAIS.w / 2), sy(DAIS.y + DAIS.h / 2), 3.4, 0, 7); ctx.fill();
  if (game.trace.length > 1) {
    ctx.strokeStyle = '#4fe3c1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    game.trace.forEach((p, i) => (i === 0 ? ctx.moveTo(sx(p.x), sy(p.y)) : ctx.lineTo(sx(p.x), sy(p.y))));
    ctx.stroke();
    ctx.fillStyle = '#4fe3c1';
    ctx.beginPath(); ctx.arc(sx(game.trace[0].x), sy(game.trace[0].y), 3, 0, 7); ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8fa6bb';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('THE ROUTE YOU TOOK THROUGH THE HALL', mx + mw / 2, my + mh + 24);

  // the report, right
  const grade = game.grade || { stamp: 'GHOST', line: 'No warden ever laid eyes on you.' };
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f4e9c9';
  ctx.font = '700 27px Georgia, serif';
  ctx.fillText('OUT THROUGH THE HATCH', 716, 168);
  ctx.save();
  ctx.translate(1010, 226);
  ctx.rotate(-0.16);
  ctx.strokeStyle = '#39e6a3';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-108, -30, 216, 60, 8); ctx.stroke();
  ctx.fillStyle = '#39e6a3';
  ctx.font = '800 29px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(grade.stamp, 0, 10);
  ctx.restore();
  const rows = [
    ['Time inside', fmtTime(game.elapsed)],
    ['Times spotted', String(game.spotted)],
    ['Valuables', `${countValuables(game.player)}/3`],
    ['Pebbles left', String(game.pebblesLeft)],
  ];
  ctx.font = '14.5px system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    const y = 316 + i * 32;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8fa6bb';
    ctx.fillText(label, 716, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f4e9c9';
    ctx.font = '700 14.5px system-ui, sans-serif';
    ctx.fillText(value, 1212, y);
    ctx.font = '14.5px system-ui, sans-serif';
  });
  ctx.textAlign = 'left';
  ctx.fillStyle = '#d7e3ee';
  ctx.font = 'italic 14px Georgia, serif';
  ctx.fillText(grade.line, 716, 472);
  ctx.fillStyle = '#4fe3c1';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillText('PRESS R TO RUN IT AGAIN', 716, 516);
}
