// guildhall.js — the floor plan of the clockmaker's guildhall and the
// geometry every other system leans on: rooms and their floorings, walls,
// cover, grass, creaky boards, lamp pools, patrol routes, and the maths
// for line of sight, ray casting and circle movement against rectangles.

export const WORLD = { w: 1280, h: 720 };
export const PLAY = { x: 16, y: 72, w: 1248, h: 612 };

// Rooms, west to east, north to south. `floor` picks the drawn texture and
// the walking feel: wood carries the creaky patches, carpet swallows sound.
export const ROOMS = [
  { name: 'Horologists’ Workshop', x: 28, y: 84, w: 364, h: 208, floor: 'wood' },
  { name: 'The Vault', x: 404, y: 84, w: 392, h: 208, floor: 'carpet' },
  { name: 'Gallery of Curiosities', x: 808, y: 84, w: 444, h: 208, floor: 'checker' },
  { name: 'Vestibule', x: 28, y: 304, w: 364, h: 368, floor: 'wood' },
  { name: 'Grand Hall', x: 404, y: 304, w: 488, h: 244, floor: 'checker' },
  { name: 'Service Corridor', x: 904, y: 304, w: 348, h: 368, floor: 'stone' },
  { name: 'Pantry Stores', x: 404, y: 560, w: 488, h: 112, floor: 'wood' },
];

// Wall rectangles, twelve pixels thick, with gaps wherever a doorway sits.
export const WALLS = [
  // outer shell
  { x: 16, y: 72, w: 1248, h: 12 }, { x: 16, y: 672, w: 1248, h: 12 },
  { x: 16, y: 72, w: 12, h: 612 }, { x: 1252, y: 72, w: 12, h: 612 },
  // spine between workshop/vestibule and vault/hall/stores (door gaps at
  // y 170–218, y 384–432 and y 584–624)
  { x: 392, y: 84, w: 12, h: 86 }, { x: 392, y: 218, w: 12, h: 74 },
  { x: 392, y: 304, w: 12, h: 80 }, { x: 392, y: 432, w: 12, h: 152 },
  { x: 392, y: 624, w: 12, h: 48 },
  // spine between vault and gallery (door gap y 170–218)
  { x: 796, y: 84, w: 12, h: 86 }, { x: 796, y: 218, w: 12, h: 74 },
  // spine between hall/stores and the corridor (door gaps y 388–436, y 592–632)
  { x: 892, y: 304, w: 12, h: 84 }, { x: 892, y: 436, w: 12, h: 124 },
  { x: 892, y: 560, w: 12, h: 32 }, { x: 892, y: 632, w: 12, h: 40 },
  // cross wall under the top rooms (door gaps x 178–226, x 554–642, x 988–1068)
  { x: 28, y: 292, w: 150, h: 12 }, { x: 226, y: 292, w: 166, h: 12 },
  { x: 404, y: 292, w: 150, h: 12 }, { x: 642, y: 292, w: 154, h: 12 },
  { x: 808, y: 292, w: 180, h: 12 }, { x: 1068, y: 292, w: 184, h: 12 },
  // cross wall under the grand hall (door gap x 594–682)
  { x: 404, y: 548, w: 190, h: 12 }, { x: 682, y: 548, w: 210, h: 12 },
];

// Tall cover: crates and cabinets. A body cannot cross them and a vision
// cone dies against them, which is what makes the blind spot behind one.
export const COVERS = [
  { x: 215, y: 195, w: 38, h: 38, kind: 'crate' }, { x: 257, y: 195, w: 38, h: 38, kind: 'crate' },
  { x: 300, y: 86, w: 64, h: 24, kind: 'cabinet' },
  { x: 415, y: 86, w: 64, h: 24, kind: 'cabinet' }, { x: 715, y: 86, w: 64, h: 24, kind: 'cabinet' },
  { x: 505, y: 180, w: 34, h: 34, kind: 'crate' }, { x: 661, y: 180, w: 34, h: 34, kind: 'crate' },
  { x: 1000, y: 86, w: 70, h: 24, kind: 'cabinet' },
  { x: 852, y: 222, w: 38, h: 38, kind: 'crate' }, { x: 894, y: 222, w: 38, h: 38, kind: 'crate' },
  { x: 430, y: 318, w: 70, h: 26, kind: 'cabinet' },
  { x: 520, y: 400, w: 38, h: 38, kind: 'crate' }, { x: 562, y: 400, w: 38, h: 38, kind: 'crate' },
  { x: 520, y: 442, w: 38, h: 38, kind: 'crate' },
  { x: 40, y: 318, w: 70, h: 26, kind: 'cabinet' },
  { x: 298, y: 556, w: 38, h: 38, kind: 'crate' }, { x: 298, y: 598, w: 38, h: 38, kind: 'crate' },
  { x: 500, y: 600, w: 38, h: 38, kind: 'crate' }, { x: 544, y: 600, w: 38, h: 38, kind: 'crate' },
  { x: 700, y: 592, w: 38, h: 38, kind: 'crate' },
  { x: 940, y: 318, w: 60, h: 26, kind: 'cabinet' },
  { x: 1060, y: 548, w: 38, h: 38, kind: 'crate' }, { x: 1102, y: 548, w: 38, h: 38, kind: 'crate' },
  { x: 1060, y: 590, w: 38, h: 38, kind: 'crate' },
];

// Planters of tall grass. They block nothing and stop no gaze, but a
// crouched burglar inside one is a rumour unless a warden comes close.
export const GRASS = [
  { x: 1085, y: 205, w: 115, h: 48 },
  { x: 700, y: 408, w: 105, h: 46 },
  { x: 786, y: 600, w: 92, h: 48 },
  { x: 1075, y: 318, w: 115, h: 44 },
];

// Loose boards. Treading them sings out, even at a sneak.
export const CREAKY = [
  { x: 150, y: 420, w: 180, h: 60 },
  { x: 560, y: 576, w: 150, h: 44 },
];

// Lamp pools: the geography of being seen. Inside the bright heart of a
// pool you are LIT and visible across a room; at its rim you are DIM;
// everywhere else the hall's gloom keeps you in SHADOW.
export const LAMPS = [
  { x: 315, y: 125, r: 115 }, { x: 600, y: 118, r: 115 }, { x: 1080, y: 165, r: 115 },
  { x: 648, y: 424, r: 115 }, { x: 210, y: 480, r: 115 }, { x: 648, y: 618, r: 115 },
  { x: 1080, y: 472, r: 115 },
];

// The prize and the two optional valuables. `held` key names match the
// burglar's pockets.
export const DAIS = { x: 556, y: 150, w: 88, h: 64 };
export const ITEMS = [
  { id: 'chronometer', name: 'The Perpetual Chronometer', x: 600, y: 182, prize: true },
  { id: 'astrolabe', name: 'The Jeweled Astrolabe', x: 120, y: 130, prize: false },
  { id: 'watch', name: 'The Gold Pocket-Watch', x: 1157, y: 137, prize: false },
];

// The service hatch: the only way out, and it only unlocks for a burglar
// carrying the Chronometer.
export const HATCH = { x: 1170, y: 606, w: 54, h: 54 };

// Warden rounds, walked as loops. `pause` is the seconds a warden lingers
// at a waypoint, sweeping the room, before walking on.
export const PATROLS = [
  { name: 'Osric', route: [{ x: 470, y: 130, pause: 1.2 }, { x: 730, y: 130, pause: 0.8 }, { x: 730, y: 245, pause: 1.2 }, { x: 470, y: 245, pause: 0.8 }] },
  { name: 'Hallam', route: [{ x: 470, y: 360, pause: 1.0 }, { x: 830, y: 360, pause: 0.6 }, { x: 830, y: 500, pause: 1.0 }, { x: 470, y: 500, pause: 0.6 }] },
  { name: 'Berta', route: [{ x: 950, y: 150, pause: 0.8 }, { x: 1215, y: 150, pause: 1.0 }, { x: 1215, y: 268, pause: 0.6 }, { x: 950, y: 268, pause: 0.8 }] },
  { name: 'Wick', route: [{ x: 100, y: 140, pause: 0.8 }, { x: 340, y: 140, pause: 1.0 }, { x: 340, y: 250, pause: 0.6 }, { x: 100, y: 250, pause: 0.8 }] },
  { name: 'Prudence', route: [{ x: 1000, y: 645, pause: 0.6 }, { x: 1200, y: 645, pause: 1.2 }, { x: 1200, y: 385, pause: 0.6 }, { x: 1000, y: 385, pause: 0.8 }] },
];

export const PLAYER_START = { x: 80, y: 630 };

// ------------------------------------------------------------------ maths

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function pointInRect(x, y, r, pad = 0) {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
}

export function circleHitsRect(x, y, rad, r) {
  const cx = Math.max(r.x, Math.min(x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(y, r.y + r.h));
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) < rad * rad;
}

function segSeg(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  return (
    segSeg(x1, y1, x2, y2, r.x, r.y, r.x + r.w, r.y) ||
    segSeg(x1, y1, x2, y2, r.x + r.w, r.y, r.x + r.w, r.y + r.h) ||
    segSeg(x1, y1, x2, y2, r.x + r.w, r.y + r.h, r.x, r.y + r.h) ||
    segSeg(x1, y1, x2, y2, r.x, r.y + r.h, r.x, r.y)
  );
}

/** True when a wall or tall cover stands anywhere along the sight line. */
export function segmentBlocked(x1, y1, x2, y2, rects) {
  for (const r of rects) if (segmentHitsRect(x1, y1, x2, y2, r)) return true;
  return false;
}

/** Distance from (x, y) along `ang` to the nearest rect, capped at maxD. */
export function rayDistance(x, y, ang, maxD, rects) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let best = maxD;
  for (const r of rects) {
    let tmin = 0, tmax = best;
    if (Math.abs(dx) < 1e-9) {
      if (x < r.x || x > r.x + r.w) continue;
    } else {
      let t1 = (r.x - x) / dx, t2 = (r.x + r.w - x) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (Math.abs(dy) < 1e-9) {
      if (y < r.y || y > r.y + r.h) continue;
    } else {
      let t1 = (r.y - y) / dy, t2 = (r.y + r.h - y) / dy;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (tmin < best && tmin >= 0) best = tmin;
  }
  return best;
}

let _solids = null;
/** Everything a body cannot walk through: walls plus tall cover. */
export function getSolids() {
  if (!_solids) _solids = WALLS.concat(COVERS);
  return _solids;
}

let _blockers = null;
/** Everything a gaze cannot cross: the same walls and tall cover. */
export function getLosBlockers() {
  if (!_blockers) _blockers = WALLS.concat(COVERS);
  return _blockers;
}

/**
 * Slide a circle by (dx, dy), one axis at a time, so it glides along
 * furniture instead of sticking to it. Mutates and returns `body`.
 */
export function moveCircle(body, dx, dy, rad) {
  const solids = getSolids();
  if (dx !== 0) {
    const nx = body.x + dx;
    let hit = false;
    for (const r of solids) if (circleHitsRect(nx, body.y, rad, r)) { hit = true; break; }
    if (!hit) body.x = nx;
  }
  if (dy !== 0) {
    const ny = body.y + dy;
    let hit = false;
    for (const r of solids) if (circleHitsRect(body.x, ny, rad, r)) { hit = true; break; }
    if (!hit) body.y = ny;
  }
  return body;
}

// ------------------------------------------------------- light and hiding

/**
 * How exposed a spot is to lamplight. Returns the band name, a suspicion
 * multiplier `factor`, and the distance at which a warden's gaze carries
 * against someone standing there.
 */
export function exposureAt(x, y) {
  let band = 'SHADOW', factor = 0.8, range = 100;
  for (const lamp of LAMPS) {
    const d = dist(x, y, lamp.x, lamp.y);
    if (d < lamp.r * 0.62) return { name: 'LIT', factor: 1.35, range: 265 };
    if (d < lamp.r) { band = 'DIM'; factor = 1.0; range = 175; }
  }
  return { name: band, factor, range };
}

export function inGrass(x, y) {
  for (const g of GRASS) if (pointInRect(x, y, g)) return true;
  return false;
}

export function onCreaky(x, y) {
  for (const c of CREAKY) if (pointInRect(x, y, c)) return true;
  return false;
}
