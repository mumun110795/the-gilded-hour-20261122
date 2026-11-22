# the-gilded-hour-20261122

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/mumun110795/the-gilded-hour-20261122/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/mumun110795/the-gilded-hour-20261122/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**The Gilded Hour** — a top-down stealth game in a single moonlit guildhall, built from static files with no build step and no network: open `game/index.html` in a desktop browser and play.

You are a burglar. The Perpetual Chronometer ticks on the vault dais — steal it, pocket the Jeweled Astrolabe and the Gold Pocket-Watch if you dare, and slip out through the service hatch, which only unlocks while you carry the prize. Five wardens walk their rounds with lantern cones that die against walls and furniture. Lamplight makes you visible across a room; shadow, tall grass and the blind spot behind a crate are your friends. Bold footsteps carry. Loose boards creak even at a sneak. A thrown pebble, though — a pebble can pull a warden clean off his round. Get away unseen for the GHOST grade.

Controls: **WASD / arrows** move · **Shift** sneak · **mouse + click** aim and throw a pebble · **H** field notes · **M** mute · **Esc** pause · **R** restart.

## Run it

```sh
python3 -m http.server -d game 8080   # or any static file server rooted at game/
# open http://localhost:8080 in desktop Chrome — fully offline, no build step

mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # hand-in: writes game/, screenshots/ and dossier.json to out/
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=vdsf53gd&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
