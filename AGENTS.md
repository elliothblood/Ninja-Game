# AGENTS.md

## Project Summary
- Single-page HTML/CSS/JS canvas platformer (no build tools).
- Deployed via GitHub Pages (repo: `https://github.com/elliothblood/Ninja-Game`).
- Files: `index.html`, `styles.css`, `game.js`.

## Controls
- Desktop:
  - Move: WASD / Arrow keys
  - Jump: W / Up
  - Throw: Space (hold Up to aim upward)
  - Shoot Up: E (fires upward without Space)
  - Restart: R
- Mobile:
  - On-screen buttons: Left/Right, Jump, Throw, Shoot Up, Restart, Fullscreen
  - Touch controls have text selection disabled; extra row added for visibility.

## Game Logic Highlights (game.js)
- Player starts with 4 lives; max lives is 6.
- Passive healing: +1 life every 10s (600 frames). Regen powerup speeds it to 4s (240 frames) for 900 frames.
- Powerups: size, rate, life, regen. Life powerups are more common than size/rate.
- Waves: advance when all non-ghost enemies are cleared. Ghosts persist across waves but do not block progression.
- Traps and all platforms reposition at each wave transition.
- Traps and all platforms also reposition on player death.
- Traps cannot overlap when repositioning.
- Moving platforms: some platforms move horizontally each frame; all platforms shift after waves.
- Canvas size increased to 900x520 to “zoom out” and give more room.

## Enemies
- Types: yellow, blue (hp=2), red, green, pink (heals player on death), purple (small/fast/dodges), ghost (floats/2 hp), boss (every 3rd wave).
- Red and boss shots always aim at the player’s current position.
- Red fire rate increases with wave number (higher chance + shorter cooldown).
- Green ninjas are smarter: route around platforms, jump toward edges, avoid traps, drop down to player when below.
- Yellow ninjas also route around platforms (less aggressive than green).
- Pink ninjas heal player by 1 on death (capped at max lives).
- Purple ninjas:
  - Half-size of regular ninjas (currently 13x20 vs 26x40).
  - Faster base speed than other ninjas.
  - Dodge nearby player projectiles; if shot is above, they dash sideways instead of jumping.
  - Color currently `#be123c` (reddish purple; user requested “more red” multiple times).
- Ghosts:
  - Spawn occasionally while wave enemies exist.
  - Move directly toward player and float through platforms.
  - HP=2, slow speed; max ghosts on screen = 10.

## Spawn Safety
- On reset and after death, the player spawns at a safe location that avoids overlapping enemies, ghosts, traps, or projectiles.

## Rendering/Animation
- Enemy walk animation uses `frameTick`. Game over freezes animation (`frameTick` only advances while playing).

## Recent Requests/State
- User iterated many times on purple ninja size and color. Current size is half of standard; color is `#be123c`.
- User wants other agents to update this AGENTS.md with any future changes.

## Next-steps Suggestions (if asked)
- If player spawn still unsafe, add minimum distance checks vs enemies/traps.
- Consider distinct visual marker for purple ninjas if color changes continue.

