// wardens.js — the night wardens of the guildhall: how they walk their
// rounds, what their lantern gaze can reach, what their ears pick up, and
// how suspicion climbs from a glance to a chase — and drains away again
// when the burglar breaks the line of sight, so a near miss is a story
// you survive rather than a run you lose.

import {
  PATROLS, dist, moveCircle, segmentBlocked, getLosBlockers,
} from './guildhall.js';

export const CONE_HALF = 0.62;      // half-angle of a warden's gaze, radians
export const WARDEN_RADIUS = 13;
const PATROL_SPEED = 62;
const INVESTIGATE_SPEED = 98;
const CHASE_SPEED = 148;
const TURN_RATE = 3.4;              // radians per second a warden can swing round
const DECAY = 0.4;                  // suspicion lost per second while unseen
const SUSPICIOUS_AT = 0.35;         // the glance that becomes a second look

export function createWardens() {
  return PATROLS.map((p, i) => {
    const start = p.route[0];
    const next = p.route[1 % p.route.length];
    return {
      name: p.name,
      route: p.route,
      x: start.x, y: start.y,
      dir: Math.atan2(next.y - start.y, next.x - start.x),
      wp: 1 % p.route.length,
      state: 'patrol',              // patrol | pause | investigate | look | chase | return
      pauseT: 0,
      lookT: 0,
      scanDir: i % 2 === 0 ? 1 : -1,
      suspicion: 0,
      target: null,                 // where an investigation is headed
      lastSeen: null,               // where the burglar was last truly seen
      seenAge: 99,                  // seconds since the burglar was last in view
      bubble: '',
      bubbleT: 0,
      justSpotted: false,           // set on the frame a chase begins; main.js consumes it
      justSuspicious: false,        // set on the frame suspicion first stirs
    };
  });
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(w, want, dt) {
  const d = angleDiff(want, w.dir);
  const step = TURN_RATE * dt;
  w.dir += Math.abs(d) < step ? d : Math.sign(d) * step;
}

/** Walk toward a point at `speed`; returns the distance remaining. */
function walkToward(w, tx, ty, speed, dt) {
  const d = dist(w.x, w.y, tx, ty);
  if (d < 1) return 0;
  const step = Math.min(d, speed * dt);
  const ang = Math.atan2(ty - w.y, tx - w.x);
  turnToward(w, ang, dt);
  moveCircle(w, Math.cos(ang) * step, Math.sin(ang) * step, WARDEN_RADIUS);
  return dist(w.x, w.y, tx, ty);
}

/**
 * Can this warden see the burglar right now? The gaze carries furthest
 * against a figure standing in lamplight and barely reaches into shadow;
 * tall grass halves it again and hides anyone who is not close; and no
 * gaze at all passes through a wall or a cabinet.
 */
export function canSee(w, player) {
  const d = dist(w.x, w.y, player.x, player.y);
  let range = player.exposure.range;
  if (player.inGrass) {
    if (d > 64) return false;
    range *= 0.5;
  }
  if (player.sneaking && player.exposure.name === 'SHADOW') range *= 0.85;
  const pointBlank = d < 28;
  if (d > range && !pointBlank) return false;
  if (!pointBlank) {
    const ang = Math.atan2(player.y - w.y, player.x - w.x);
    if (Math.abs(angleDiff(ang, w.dir)) > CONE_HALF) return false;
  }
  return !segmentBlocked(w.x, w.y, player.x, player.y, getLosBlockers());
}

function say(w, text, seconds = 1.6) {
  w.bubble = text;
  w.bubbleT = seconds;
}

/**
 * A noise reaches a warden's ears. Walls muffle: a sound on the far side
 * of one carries less than half as far. A warden who hears something
 * leaves the round to look — unless already chasing, when ears no longer
 * matter.
 */
export function hearNoise(wardens, x, y, radius) {
  for (const w of wardens) {
    if (w.state === 'chase') continue;
    const muffled = segmentBlocked(w.x, w.y, x, y, getLosBlockers());
    const reach = muffled ? radius * 0.45 : radius;
    if (dist(w.x, w.y, x, y) <= reach) {
      w.state = 'investigate';
      w.target = { x, y };
      w.suspicion = Math.max(w.suspicion, 0.45);
      say(w, 'Hm?');
    }
  }
}

function nearestWaypoint(w) {
  let best = 0, bd = Infinity;
  w.route.forEach((p, i) => {
    const d = dist(w.x, w.y, p.x, p.y);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

export function updateWardens(game, dt) {
  const player = game.player;
  for (const w of game.wardens) {
    w.justSpotted = false;
    w.justSuspicious = false;
    if (w.bubbleT > 0) w.bubbleT -= dt;

    // ---- seeing, and what it does to suspicion
    const sees = canSee(w, player);
    if (sees) {
      w.seenAge = 0;
      w.lastSeen = { x: player.x, y: player.y };
      const d = dist(w.x, w.y, player.x, player.y);
      const closeness = 1.2 - 0.8 * Math.min(1, d / Math.max(1, player.exposure.range));
      const before = w.suspicion;
      w.suspicion = Math.min(1, w.suspicion + dt * closeness * player.exposure.factor);
      if (before < SUSPICIOUS_AT && w.suspicion >= SUSPICIOUS_AT && w.state !== 'chase') {
        w.justSuspicious = true;
        if (w.state === 'patrol' || w.state === 'pause' || w.state === 'return') {
          w.state = 'investigate';
          w.target = { x: player.x, y: player.y };
          say(w, 'Hm?');
        }
      }
      if (w.suspicion >= 1 && w.state !== 'chase') {
        w.state = 'chase';
        w.justSpotted = true;
        say(w, 'There!', 1.2);
      }
    } else {
      w.seenAge += dt;
      if (w.state !== 'chase') w.suspicion = Math.max(0, w.suspicion - dt * DECAY);
      if (w.state === 'chase' && w.seenAge > 2.2) {
        // lost them: go and glare at the last place they stood
        w.state = 'investigate';
        w.target = w.lastSeen ? { ...w.lastSeen } : null;
        w.suspicion = 0.75;
      }
    }

    // ---- moving, by state of mind
    switch (w.state) {
      case 'patrol': {
        const p = w.route[w.wp];
        if (walkToward(w, p.x, p.y, PATROL_SPEED, dt) < 6) {
          w.state = 'pause';
          w.pauseT = p.pause;
        }
        break;
      }
      case 'pause': {
        w.pauseT -= dt;
        const p = w.route[w.wp];
        turnToward(w, Math.atan2(p.y - w.y, p.x - w.x), dt);
        if (w.pauseT <= 0) {
          w.wp = (w.wp + 1) % w.route.length;
          w.state = 'patrol';
        }
        break;
      }
      case 'investigate': {
        if (!w.target) { w.state = 'return'; break; }
        if (walkToward(w, w.target.x, w.target.y, INVESTIGATE_SPEED, dt) < 8) {
          w.state = 'look';
          w.lookT = 1.6;
        }
        break;
      }
      case 'look': {
        w.lookT -= dt;
        w.dir += w.scanDir * dt * 1.5;
        if (w.lookT <= 0) {
          if (w.suspicion < 0.2) say(w, 'Bah. Shadows.', 1.4);
          w.state = 'return';
        }
        break;
      }
      case 'chase': {
        const t = w.seenAge < 0.4 || !w.lastSeen ? player : w.lastSeen;
        walkToward(w, t.x, t.y, CHASE_SPEED, dt);
        break;
      }
      case 'return': {
        const i = nearestWaypoint(w);
        const p = w.route[i];
        if (walkToward(w, p.x, p.y, PATROL_SPEED + 14, dt) < 8) {
          w.wp = (i + 1) % w.route.length;
          w.state = 'patrol';
        }
        break;
      }
    }
  }
}

/** The warden currently running the burglar down, if any. */
export function chasingWarden(game) {
  return game.wardens.find((w) => w.state === 'chase') || null;
}

/** Worst state of mind across the watch, for the hall's alarm line. */
export function alarmLevel(game) {
  let level = 'quiet';
  for (const w of game.wardens) {
    if (w.state === 'chase') return 'spotted';
    if (w.state === 'investigate' || w.state === 'look' || w.suspicion >= SUSPICIOUS_AT) level = 'suspicious';
    else if (w.suspicion > 0.05 && level === 'quiet') level = 'stirring';
  }
  return level;
}
