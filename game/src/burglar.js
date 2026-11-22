// burglar.js — the player: a burglar in soft shoes. Walking boldly is
// quick but every step lands as a ring of noise the wardens can hear;
// sneaking is silent — except across the loose boards, which creak for
// anyone. This file also works out how lamplight falls on the burglar,
// which is what decides how far a warden's gaze carries against them.

import {
  PLAYER_START, moveCircle, exposureAt, inGrass, onCreaky,
} from './guildhall.js';

export const BURGLAR_RADIUS = 12;
export const RUN_SPEED = 165;
export const SNEAK_SPEED = 85;
export const STEP_NOISE = 95;       // how far a bold footstep carries
export const CREAK_NOISE = 78;      // how far a creaking board carries

export function createBurglar() {
  return {
    x: PLAYER_START.x, y: PLAYER_START.y, r: BURGLAR_RADIUS,
    dir: -Math.PI / 2,
    moving: false,
    sneaking: false,
    exposure: exposureAt(PLAYER_START.x, PLAYER_START.y),
    inGrass: false,
    stepT: 0,
    held: { chronometer: false, astrolabe: false, watch: false },
  };
}

/** Valuables carried, of the three there are to take (prize included). */
export function countValuables(b) {
  return (b.held.chronometer ? 1 : 0) + (b.held.astrolabe ? 1 : 0) + (b.held.watch ? 1 : 0);
}

/**
 * Advance the burglar one frame. `input` is {x, y} in -1..1 plus a sneak
 * flag. Footsteps are pushed into game.noises (which the wardens hear)
 * and game.rings (which the player sees), and game.sfx is pinged for the
 * soft sounds of the trade.
 */
export function updateBurglar(game, input, dt) {
  const b = game.player;
  b.sneaking = !!input.sneak;
  const len = Math.hypot(input.x, input.y);
  b.moving = len > 0.01;
  if (b.moving) {
    const speed = b.sneaking ? SNEAK_SPEED : RUN_SPEED;
    const dx = (input.x / Math.max(1, len)) * speed * dt;
    const dy = (input.y / Math.max(1, len)) * speed * dt;
    b.dir = Math.atan2(input.y, input.x);
    moveCircle(b, dx, dy, b.r);

    b.stepT -= dt;
    if (b.stepT <= 0) {
      b.stepT = b.sneaking ? 0.46 : 0.36;
      takeStep(game);
    }
  } else {
    b.stepT = 0.08; // the next step comes quickly once you set off
  }
  b.exposure = exposureAt(b.x, b.y);
  b.inGrass = inGrass(b.x, b.y);
}

function takeStep(game) {
  const b = game.player;
  if (!b.sneaking) {
    // a bold step: heard across the room, and shown as a widening ring
    game.noises.push({ x: b.x, y: b.y, r: STEP_NOISE });
    game.rings.push({ x: b.x, y: b.y, max: STEP_NOISE, born: game.time, kind: 'noise' });
    game.sfx('step');
  } else if (onCreaky(b.x, b.y)) {
    // soft shoes count for nothing on a loose board
    game.noises.push({ x: b.x, y: b.y, r: CREAK_NOISE });
    game.rings.push({ x: b.x, y: b.y, max: CREAK_NOISE, born: game.time, kind: 'noise' });
    game.sfx('creak');
  } else {
    // a true sneak step: a ripple only the player can see
    game.rings.push({ x: b.x, y: b.y, max: 24, born: game.time, kind: 'ripple' });
  }
}
