// main.js — the boot and the beating heart: wires the burglar, the
// wardens and the hall together, runs the state machine (title, play,
// caught, the getaway report), throws the pebbles, and stages the fixed
// scenes the screenshots are taken from when the page is opened with a
// ?shot= address.

import { ITEMS, HATCH, PLAY, dist, pointInRect } from './guildhall.js';
import { createWardens, updateWardens, hearNoise, chasingWarden } from './wardens.js';
import { createBurglar, updateBurglar } from './burglar.js';
import { drawGame } from './render.js';
import { sfx, ensureAudio, setMuted, isMuted } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const keys = new Set();
const mouse = { x: 0, y: 0 };

function newGame() {
  return {
    state: 'title',           // title | play | caught | won
    paused: false,
    frozen: false,            // staged scenes hold their pose
    time: 0,
    elapsed: 0,
    player: createBurglar(),
    wardens: createWardens(),
    items: ITEMS.map((it) => ({ ...it, taken: false })),
    pebblesLeft: 4,
    pebble: null,             // {x, y, tx, ty, t, dur} while one is in the air
    rings: [],
    noises: [],
    callouts: [],
    showNotes: false,
    spotted: 0,
    caughtBy: '',
    grade: null,
    trace: [],
    traceT: 0,
    hint: '',
    hintT: 0,
    statusOverride: null,
    statusLevel: null,
    sfx,
  };
}

let game = newGame();

function gradeRun(g) {
  if (g.spotted === 0) return { stamp: 'GHOST', line: 'No warden ever laid eyes on you.' };
  if (g.spotted === 1) return { stamp: 'SHADE', line: 'Seen once, for a heartbeat — and still gone.' };
  return { stamp: 'RUMBLE', line: 'Half the hall saw you. You are out, and that is what counts.' };
}

function startRun() {
  const fresh = newGame();
  fresh.state = 'play';
  fresh.showNotes = game.showNotes;
  game = fresh;
  ensureAudio();
}

// ------------------------------------------------------------------ update

function update(dt) {
  game.time += dt;
  if (game.state !== 'play' || game.paused || game.frozen) return;
  game.elapsed += dt;

  const input = {
    x: (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0),
    y: (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0),
    sneak: keys.has('shift'),
  };
  game.noises.length = 0;
  updateBurglar(game, input, dt);

  // a pebble in flight lands, clatters, and calls the watch
  if (game.pebble) {
    const p = game.pebble;
    p.t += dt;
    if (p.t >= p.dur) {
      game.noises.push({ x: p.tx, y: p.ty, r: 135 });
      game.rings.push({ x: p.tx, y: p.ty, max: 135, born: game.time, kind: 'noise' });
      sfx('pebble');
      game.pebble = null;
    }
  }
  for (const n of game.noises) hearNoise(game.wardens, n.x, n.y, n.r);
  game.noises.length = 0;

  updateWardens(game, dt);
  for (const w of game.wardens) {
    if (w.justSpotted) {
      game.spotted += 1;
      sfx('spot');
    } else if (w.justSuspicious) {
      sfx('suspicion');
    }
  }

  // taking things
  for (const item of game.items) {
    if (!item.taken && dist(game.player.x, game.player.y, item.x, item.y) < 26) {
      item.taken = true;
      game.player.held[item.id] = true;
      sfx('pickup');
      setHint(item.prize
        ? 'The Chronometer is yours. Now — the hatch, and quietly.'
        : `${item.name} pocketed. Greed is a virtue, in moderation.`);
    }
  }

  // the hatch
  if (pointInRect(game.player.x, game.player.y, HATCH, -4)) {
    if (game.player.held.chronometer) {
      game.state = 'won';
      game.grade = gradeRun(game);
      sfx('win');
    } else if (game.hintT <= 0) {
      setHint('Locked fast. The hatch answers only to the Chronometer’s weight.');
      sfx('locked');
    }
  }

  // a chase that closes the distance ends the night
  const hunter = chasingWarden(game);
  if (hunter && dist(hunter.x, hunter.y, game.player.x, game.player.y) < 22) {
    game.state = 'caught';
    game.caughtBy = hunter.name;
    sfx('caught');
  }

  game.traceT -= dt;
  if (game.traceT <= 0) {
    game.trace.push({ x: game.player.x, y: game.player.y });
    game.traceT = 0.35;
  }
  if (game.hintT > 0) game.hintT -= dt;
  game.rings = game.rings.filter((r) => game.time - r.born < 0.95);
}

function setHint(text) {
  game.hint = text;
  game.hintT = 3.2;
}

function throwPebble(tx, ty) {
  if (game.state !== 'play' || game.paused || game.frozen) return;
  if (game.pebblesLeft <= 0 || game.pebble) return;
  const b = game.player;
  const d = dist(b.x, b.y, tx, ty);
  if (d < 24) return;
  const reach = Math.min(d, 430);
  const ang = Math.atan2(ty - b.y, tx - b.x);
  game.pebble = {
    x: b.x, y: b.y,
    tx: b.x + Math.cos(ang) * reach,
    ty: b.y + Math.sin(ang) * reach,
    t: 0, dur: 0.24 + reach / 1600,
  };
  game.pebblesLeft -= 1;
  ensureAudio();
}

// ------------------------------------------------------------------- input

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === 'enter' && game.state === 'title') startRun();
  if (k === 'h' && game.state === 'play') game.showNotes = !game.showNotes;
  if (k === 'm') { setMuted(!isMuted()); }
  if (k === 'escape' && game.state === 'play') game.paused = !game.paused;
  if (k === 'r' && game.state !== 'title') startRun();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}
canvas.addEventListener('mousemove', (e) => Object.assign(mouse, canvasPoint(e)));
canvas.addEventListener('mousedown', (e) => {
  ensureAudio();
  if (game.state === 'title') { startRun(); return; }
  const p = canvasPoint(e);
  throwPebble(p.x, p.y);
});

// -------------------------------------------------------------------- loop

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  update(dt);
  drawGame(ctx, game);
  requestAnimationFrame(frame);
}

// ------------------------------------------------- staged screenshot scenes

function pose(w, x, y, dir, state, suspicion = 0) {
  w.x = x; w.y = y; w.dir = dir; w.state = state; w.suspicion = suspicion;
  return w;
}

function stageShot(n) {
  const g = newGame();
  g.state = 'play';
  g.frozen = true;
  g.time = 12;
  const [osric, hallam, berta, wick, prudence] = g.wardens;
  if (n === 1) {
    // the cover: the whole hall at work — a warden lit in the vault, one
    // leaving his round for a pebble, and the burglar tucked in the blind
    // spot behind the corridor crates with the prize already in hand
    g.player.x = 1160; g.player.y = 585; g.player.dir = Math.PI;
    g.player.held.chronometer = true; g.player.held.astrolabe = true;
    g.items.find((i) => i.id === 'chronometer').taken = true;
    g.items.find((i) => i.id === 'astrolabe').taken = true;
    g.player.exposure = { name: 'SHADOW', factor: 0.8, range: 100 };
    pose(osric, 600, 150, Math.PI / 2, 'patrol', 0.1);
    pose(hallam, 648, 424, -Math.PI / 2, 'patrol', 0);
    pose(berta, 1080, 165, 0, 'pause', 0);
    pose(wick, 336, 216, 0.74, 'investigate', 0.45);
    wick.bubble = 'Hm?'; wick.bubbleT = 99;
    wick.target = { x: 382, y: 258 };
    pose(prudence, 1000, 585, 0.08, 'patrol', 0.55);
    g.rings.push({ x: 382, y: 258, max: 135, born: 11.6, kind: 'noise' });
    g.elapsed = 71;
    g.pebblesLeft = 2;
    g.showNotes = true;
    g.statusOverride = 'A WARDEN IS SUSPICIOUS';
    g.statusLevel = 'suspicious';
    g.callouts = [
      { x: 892, y: 118, tx: 606, ty: 148, text: 'LAMPLIGHT: seen from across the room' },
      { x: 478, y: 330, tx: 382, ty: 258, text: 'A PEBBLE CLATTERS — off to look' },
      { x: 700, y: 652, tx: 1152, ty: 588, text: 'YOU: tucked where the cone dies at the crates' },
    ];
  } else if (n === 2) {
    // spotted: run down in the lamplight of the grand hall
    g.player.x = 648; g.player.y = 430; g.player.dir = -Math.PI / 2;
    g.player.held.chronometer = true;
    g.items.find((i) => i.id === 'chronometer').taken = true;
    g.player.exposure = { name: 'LIT', factor: 1.35, range: 265 };
    pose(osric, 600, 330, Math.PI / 2, 'patrol', 0.2);
    pose(hallam, 756, 472, Math.atan2(430 - 472, 648 - 756), 'chase', 1);
    hallam.bubble = 'There!'; hallam.bubbleT = 99;
    pose(berta, 1080, 200, Math.PI, 'patrol', 0);
    pose(wick, 200, 180, 0.4, 'patrol', 0);
    pose(prudence, 1150, 480, -Math.PI / 2, 'patrol', 0.3);
    g.elapsed = 47;
    g.pebblesLeft = 3;
    g.spotted = 1;
    g.statusOverride = 'SPOTTED BY WARDEN HALLAM';
    g.statusLevel = 'spotted';
    g.callouts = [
      { x: 640, y: 118, tx: 648, ty: 414, text: 'SPOTTED! Break line of sight — duck behind cover' },
    ];
  } else if (n === 3) {
    // the pebble does its work: a warden turns away, the burglar drifts
    // through the tall grass behind him
    g.player.x = 752; g.player.y = 431; g.player.dir = 0; g.player.sneaking = true;
    g.player.inGrass = true;
    g.player.held.astrolabe = true;
    g.items.find((i) => i.id === 'astrolabe').taken = true;
    g.player.exposure = { name: 'DIM', factor: 1.0, range: 175 };
    pose(osric, 600, 150, Math.PI / 2, 'patrol', 0);
    pose(hallam, 606, 470, 2.76, 'investigate', 0.4);
    hallam.bubble = 'Hm?'; hallam.bubbleT = 99;
    hallam.target = { x: 500, y: 512 };
    pose(berta, 1080, 165, 0, 'pause', 0);
    pose(wick, 200, 180, 0.4, 'patrol', 0);
    pose(prudence, 1150, 560, Math.PI, 'patrol', 0);
    g.rings.push({ x: 500, y: 512, max: 135, born: 11.55, kind: 'noise' });
    g.elapsed = 96;
    g.pebblesLeft = 3;
    g.statusOverride = 'A WARDEN IS CURIOUS';
    g.statusLevel = 'suspicious';
    g.callouts = [
      { x: 296, y: 614, tx: 500, ty: 512, text: 'PEBBLE: a clatter pulls the warden off his round' },
      { x: 1010, y: 352, tx: 756, ty: 428, text: 'TALL GRASS: hidden — unless he comes close' },
    ];
  } else if (n === 4) {
    // the getaway report of a flawless night
    g.state = 'won';
    g.player.held.chronometer = true; g.player.held.astrolabe = true; g.player.held.watch = true;
    g.elapsed = 114;
    g.spotted = 0;
    g.pebblesLeft = 1;
    g.grade = gradeRun(g);
    g.trace = [
      [80, 630], [150, 520], [190, 432], [202, 350], [202, 252], [150, 160], [120, 130],
      [202, 252], [202, 350], [300, 404], [420, 408], [540, 428], [598, 330], [598, 288],
      [600, 182], [598, 288], [598, 330], [700, 428], [862, 410], [916, 412], [1028, 340],
      [1028, 288], [1090, 200], [1157, 137], [1028, 288], [1075, 420], [1148, 556], [1197, 633],
    ].map(([x, y]) => ({ x, y }));
  }
  game = g;
}

const shotParam = new URLSearchParams(window.location.search).get('shot');
if (shotParam) {
  stageShot(Number(shotParam));
  drawGame(ctx, game);
}
requestAnimationFrame(frame);
