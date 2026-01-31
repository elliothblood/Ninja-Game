const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");

const keys = new Set();
const virtualKeys = new Set();
let score = 0;
let lives = 4;
const maxLives = 6;
let message = "";
let messageUntil = 0;
let status = "playing";
let frameTick = 0;
let throwInterval = null;
let touchAimUp = false;

const player = {
  x: 120,
  y: 0,
  w: 28,
  h: 52,
  vx: 0,
  vy: 0,
  speed: 3.4,
  jump: 11,
  onGround: false,
  facing: 1,
  cooldown: 0,
  invuln: 0,
};

const gravity = 0.55;
const friction = 0.8;

const platforms = [
  { x: 0, y: canvas.height - 40, w: canvas.width, h: 40 },
  { x: canvas.width - 170, y: canvas.height - 120, w: 150, h: 14 },
  { x: 80, y: 420, w: 200, h: 16 },
  { x: 330, y: 360, w: 200, h: 16 },
  { x: 580, y: 300, w: 220, h: 16 },
  { x: 120, y: 260, w: 160, h: 16 },
  { x: 350, y: 220, w: 160, h: 16, moveRange: 80, moveSpeed: 0.8 },
  { x: 640, y: 180, w: 160, h: 16, moveRange: 70, moveSpeed: 0.7 },
  { x: 40, y: 330, w: 140, h: 14 },
  { x: 240, y: 300, w: 120, h: 14 },
  { x: 520, y: 250, w: 140, h: 14, moveRange: 60, moveSpeed: 0.9 },
  { x: 20, y: 210, w: 120, h: 14 },
  { x: 220, y: 170, w: 120, h: 14 },
  { x: 440, y: 140, w: 120, h: 14 },
  { x: 680, y: 120, w: 120, h: 14 },
  { x: 80, y: 90, w: 120, h: 12 },
  { x: 280, y: 80, w: 140, h: 12 },
  { x: 520, y: 70, w: 140, h: 12 },
  { x: 680, y: 60, w: 120, h: 12 },
];

const traps = [
  { x: 220, y: canvas.height - 56, w: 60, h: 16 },
  { x: 380, y: 344, w: 50, h: 16 },
  { x: 610, y: 284, w: 50, h: 16 },
  { x: 160, y: 244, w: 40, h: 16 },
  { x: 470, y: 134, w: 50, h: 16 },
  { x: 700, y: 104, w: 50, h: 16 },
];

let projectiles = [];
let enemies = [];
let waveCount = 3;
let waveNumber = 1;
let powerups = [];
let starSizeBoost = 0;
let fireRateBoost = 0;
let bonusLifeTimer = 0;
let ghostSpawnCooldown = 0;
let regenTimer = 600;
let regenBoostTimer = 0;

const spawnPoint = { x: 120, y: canvas.height - 92 };
const movingPlatforms = platforms.filter((p) => p.moveRange);
movingPlatforms.forEach((p) => {
  p.baseX = p.x;
  p.dir = 1;
  p.dx = 0;
});

const staticPlatforms = platforms.filter((p) => !p.moveRange && p.y < canvas.height - 50);
staticPlatforms.forEach((p) => {
  p.baseX = p.x;
});

function updatePlatforms() {
  movingPlatforms.forEach((p) => {
    const prevX = p.x;
    p.x += p.dir * p.moveSpeed;
    if (p.x > p.baseX + p.moveRange) {
      p.x = p.baseX + p.moveRange;
      p.dir = -1;
    } else if (p.x < p.baseX - p.moveRange) {
      p.x = p.baseX - p.moveRange;
      p.dir = 1;
    }
    p.dx = p.x - prevX;
  });
}

function repositionMovingPlatforms() {
  movingPlatforms.forEach((p) => {
    const shift = (Math.random() * 2 - 1) * p.moveRange;
    p.baseX = Math.max(20, Math.min(canvas.width - p.w - 20, p.baseX + shift));
    p.x = p.baseX;
    p.dir = Math.random() < 0.5 ? -1 : 1;
    p.dx = 0;
  });
}

function repositionAllPlatforms() {
  movingPlatforms.forEach((p) => {
    const shift = (Math.random() * 2 - 1) * p.moveRange;
    p.baseX = Math.max(20, Math.min(canvas.width - p.w - 20, p.baseX + shift));
    p.x = p.baseX;
    p.dir = Math.random() < 0.5 ? -1 : 1;
    p.dx = 0;
  });

  staticPlatforms.forEach((p) => {
    const shift = (Math.random() * 2 - 1) * 70;
    p.x = Math.max(20, Math.min(canvas.width - p.w - 20, p.x + shift));
  });
}

function spawnEnemies(keepGhosts = true) {
  if (keepGhosts) {
    moveTrapsForNextWave();
    repositionAllPlatforms();
  }
  enemies = keepGhosts ? enemies.filter((e) => e.type === "ghost") : [];
  if (waveNumber % 3 === 0) {
    enemies.push({
      x: canvas.width / 2 - 24,
      y: 0,
      w: 48,
      h: 68,
      vx: 0.5,
      vy: 0,
      dir: 1,
      onGround: false,
      jumpCooldown: 0,
      type: "boss",
      hp: 8,
      shotCooldown: 40,
    });
  } else {
    const baseXs = [200, 420, 640, 300, 520, 740, 120, 560, 380];
    for (let i = 0; i < waveCount; i += 1) {
      const x = baseXs[i % baseXs.length] + (Math.random() * 80 - 40);
      const roll = Math.random();
      let type = "yellow";
      if (roll < 0.16) type = "blue";
      else if (roll < 0.28) type = "red";
      else if (roll < 0.42) type = "green";
      else if (roll < 0.52) type = "pink";
      const hp = type === "blue" ? 2 : 1;
      enemies.push({
        x: Math.max(40, Math.min(canvas.width - 60, x)),
        y: 0,
        w: 26,
        h: 40,
        vx: 1.1 + Math.random() * 0.8,
        vy: 0,
        dir: Math.random() < 0.5 ? -1 : 1,
        onGround: false,
        jumpCooldown: Math.random() * 40,
        type,
        hp,
        shotCooldown: 40 + Math.random() * 60,
      });
    }
  }
}
function isWaveEnemy(enemy) {
  return enemy && enemy.type !== "ghost";
}

function spawnGhost() {
  const edge = Math.random() < 0.5 ? -40 : canvas.width + 40;
  const y = 80 + Math.random() * (canvas.height - 200);
  enemies.push({
    x: edge,
    y,
    w: 28,
    h: 36,
    vx: 0,
    vy: 0,
    dir: edge < canvas.width / 2 ? 1 : -1,
    onGround: false,
    jumpCooldown: 0,
    type: "ghost",
    hp: 2,
    drift: Math.random() * Math.PI * 2,
  });
}

function updateHud() {
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
  waveEl.textContent = `Wave: ${waveNumber}`;
}

function moveTrapsForNextWave() {
  traps.forEach((t) => {
    const candidates = platforms.filter((p) => p.y < canvas.height - 40);
    let attempts = 0;
    let nextX = t.x;
    let nextY = t.y;
    while (attempts < 6) {
      const platform = candidates[Math.floor(Math.random() * candidates.length)];
      const minX = platform.x + 8;
      const maxX = platform.x + platform.w - t.w - 8;
      nextX = Math.max(12, Math.min(canvas.width - t.w - 12, minX + Math.random() * (maxX - minX)));
      nextY = platform.y - t.h + 2;
      const movedEnough = Math.abs(nextX - t.x) > 30 || Math.abs(nextY - t.y) > 6;
      let overlaps = false;
      for (let i = 0; i < traps.length; i += 1) {
        const other = traps[i];
        if (other === t) continue;
        if (rectsOverlap({ x: nextX, y: nextY, w: t.w, h: t.h }, other)) {
          overlaps = true;
          break;
        }
      }
      if (movedEnough && !overlaps) break;
      attempts += 1;
    }
    t.x = nextX;
    t.y = nextY;
  });
}

function announce(text, duration) {
  message = text;
  messageUntil = performance.now() + duration;
}

function handlePlayerDeath(messageText) {
  lives -= 1;
  updateHud();
  player.x = spawnPoint.x;
  player.y = spawnPoint.y;
  player.vx = 0;
  player.vy = 0;
  player.invuln = 45;
  moveTrapsForNextWave();
  repositionAllPlatforms();
  announce(messageText, 1200);
}

function reset() {
  score = 0;
  lives = 4;
  waveCount = 3;
  waveNumber = 1;
  status = "playing";
  player.x = spawnPoint.x;
  player.y = spawnPoint.y;
  player.vx = 0;
  player.vy = 0;
  player.invuln = 0;
  projectiles = [];
  powerups = [];
  starSizeBoost = 0;
  fireRateBoost = 0;
  bonusLifeTimer = 0;
  regenTimer = 600;
  regenBoostTimer = 0;
  spawnEnemies(false);
  updateHud();
  announce("Explore the dungeon", 1200);
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function applyPhysics() {
  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  player.onGround = false;
  platforms.forEach((p) => {
    const next = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectsOverlap(next, p) && player.vy >= 0) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
      if (p.dx) {
        player.x += p.dx;
      }
    }
  });

  if (player.onGround) {
    player.vx *= friction;
  }

  player.x = Math.max(10, Math.min(canvas.width - player.w - 10, player.x));
  if (player.y > canvas.height + 200) {
    handlePlayerDeath("Watch your step!");
  }
}

function handleInput() {
  player.isMoving = false;
  const leftPressed = keys.has("ArrowLeft") || keys.has("a") || keys.has("A") || virtualKeys.has("ArrowLeft");
  const rightPressed = keys.has("ArrowRight") || keys.has("d") || keys.has("D") || virtualKeys.has("ArrowRight");
  const jumpPressed = keys.has("ArrowUp") || keys.has("w") || keys.has("W") || virtualKeys.has("ArrowUp");

  if (leftPressed) {
    player.vx = -player.speed;
    player.facing = -1;
    player.isMoving = true;
  }
  if (rightPressed) {
    player.vx = player.speed;
    player.facing = 1;
    player.isMoving = true;
  }
  if (jumpPressed && player.onGround) {
    player.vy = -player.jump;
    player.onGround = false;
  }
}

function isAimUp() {
  return (
    keys.has("ArrowUp") ||
    keys.has("w") ||
    keys.has("W") ||
    keys.has("e") ||
    keys.has("E") ||
    touchAimUp
  );
}

function throwStar(directionY = 0) {
  if (player.cooldown > 0) return;
  const sizeBoost = starSizeBoost > 0 ? 3 : 0;
  const speedBoost = fireRateBoost > 0 ? 1.5 : 0;
  const baseSpeed = 6.5 + speedBoost;
  const verticalSpeed = -0.5 + directionY * baseSpeed;
  const horizontalSpeed = directionY !== 0 ? 0 : player.facing * baseSpeed;
  projectiles.push({
    x: player.x + player.w / 2 + player.facing * 10,
    y: player.y + player.h / 2,
    r: 6 + sizeBoost,
    vx: horizontalSpeed,
    vy: verticalSpeed,
    life: 90,
    rot: 0,
  });
  player.cooldown = fireRateBoost > 0 ? 9 : 16;
}

function updateProjectiles() {
  projectiles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    p.rot += 0.3;
  });
  projectiles = projectiles.filter((p) => p.life > 0);
}

function spawnPowerup() {
  const roll = Math.random();
  let type = "size";
  if (roll < 0.2) type = "rate";
  else if (roll < 0.6) type = "life";
  else if (roll < 0.75) type = "regen";
  const viablePlatforms = platforms.filter((p) => p.y < canvas.height - 60);
  const platform = viablePlatforms[Math.floor(Math.random() * viablePlatforms.length)];
  const x = platform.x + 12 + Math.random() * (platform.w - 24);
  powerups.push({
    x,
    y: platform.y - 28,
    w: 20,
    h: 20,
    type,
    life: 600,
  });
}

function updatePowerups() {
  powerups.forEach((p) => {
    p.life -= 1;
  });
  powerups = powerups.filter((p) => p.life > 0);
}

function applyPowerup(type) {
  if (type === "size") {
    starSizeBoost = 480;
    announce("Star size up!", 1000);
  } else if (type === "rate") {
    fireRateBoost = 480;
    announce("Faster throws!", 1000);
  } else if (type === "regen") {
    regenBoostTimer = 900;
    announce("Rapid healing!", 1000);
  } else if (type === "life") {
    lives = Math.min(maxLives, lives + 1);
    bonusLifeTimer = 300;
    updateHud();
    announce("Extra life!", 1000);
  }
}

function updateEnemies() {
  enemies.forEach((e) => {
    if (e.type === "ghost") {
      const targetX = player.x + player.w / 2;
      const targetY = player.y + player.h / 2;
      const dx = targetX - (e.x + e.w / 2);
      const dy = targetY - (e.y + e.h / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 0.7;
      e.x += (dx / dist) * speed;
      e.y += (dy / dist) * speed;
      e.drift += 0.05;
      e.y += Math.sin(e.drift) * 0.2;
      return;
    }

    if (e.jumpCooldown > 0) {
      e.jumpCooldown -= 1;
    }
    if (e.shotCooldown > 0) {
      e.shotCooldown -= 1;
    }

    // Basic roam AI: walk, bounce off walls, and occasionally jump.
    if (e.type === "green") {
      const playerCenter = player.x + player.w / 2;
      const enemyCenter = e.x + e.w / 2;
      let seekDir = playerCenter < enemyCenter ? -1 : 1;
      const trapAhead = traps.some((t) => {
        const sameLevel = Math.abs(e.y + e.h - t.y) < 8;
        const inFront =
          (seekDir === 1 && t.x > enemyCenter && t.x < enemyCenter + 90) ||
          (seekDir === -1 && t.x + t.w < enemyCenter && t.x + t.w > enemyCenter - 90);
        return sameLevel && inFront;
      });
      if (trapAhead && e.onGround && e.jumpCooldown <= 0) {
        e.vy = -9.5;
        e.jumpCooldown = 30;
      }
      const standingPlatform = platforms.find(
        (p) => e.x + e.w > p.x && e.x < p.x + p.w && Math.abs(e.y + e.h - p.y) < 6
      );
      const playerBelow = player.y > e.y + e.h + 20;
      if (standingPlatform && playerBelow) {
        const leftEdge = standingPlatform.x - 6;
        const rightEdge = standingPlatform.x + standingPlatform.w + 6;
        const targetX = enemyCenter < playerCenter ? rightEdge : leftEdge;
        seekDir = targetX < enemyCenter ? -1 : 1;
      }
      const targetPlatform = platforms.find((p) => {
        const isAboveEnemy = e.y + e.h < p.y + 6;
        const isPlayerAbove = player.y + player.h < p.y - 6;
        const overlapsX = enemyCenter > p.x && enemyCenter < p.x + p.w;
        const notGround = p.y < canvas.height - 60;
        return isAboveEnemy && isPlayerAbove && overlapsX && notGround;
      });
      if (targetPlatform) {
        const leftEdge = targetPlatform.x - 16;
        const rightEdge = targetPlatform.x + targetPlatform.w + 16;
        seekDir = playerCenter < enemyCenter ? -1 : 1;
        const targetX = playerCenter < enemyCenter ? leftEdge : rightEdge;
        if (Math.abs(enemyCenter - targetX) < 8) {
          if (e.onGround && e.jumpCooldown <= 0) {
            e.vy = -9.2;
            e.jumpCooldown = 35;
          }
        } else {
          seekDir = targetX < enemyCenter ? -1 : 1;
        }
      } else if (e.onGround && !playerBelow && Math.random() < 0.015 && e.jumpCooldown <= 0) {
        e.vy = -8.8;
        e.jumpCooldown = 45;
      }
      e.dir = seekDir;
    } else if (e.type === "yellow") {
      const playerCenter = player.x + player.w / 2;
      const enemyCenter = e.x + e.w / 2;
      let seekDir = playerCenter < enemyCenter ? -1 : 1;
      let targetPlatform = null;
      let closestGap = Number.POSITIVE_INFINITY;
      platforms.forEach((p) => {
        const playerAbove = player.y + player.h < p.y - 6;
        const enemyBelow = e.y > p.y + 6;
        const notGround = p.y < canvas.height - 60;
        const minX = Math.min(playerCenter, enemyCenter);
        const maxX = Math.max(playerCenter, enemyCenter);
        const between = p.x < maxX && p.x + p.w > minX;
        if (playerAbove && enemyBelow && notGround && between) {
          const gap = e.y - p.y;
          if (gap < closestGap) {
            closestGap = gap;
            targetPlatform = p;
          }
        }
      });
      if (targetPlatform) {
        const leftEdge = targetPlatform.x - 16;
        const rightEdge = targetPlatform.x + targetPlatform.w + 16;
        const targetX = playerCenter < enemyCenter ? leftEdge : rightEdge;
        if (Math.abs(enemyCenter - targetX) < 10) {
          if (e.onGround && e.jumpCooldown <= 0 && Math.random() < 0.5) {
            e.vy = -7.5;
            e.jumpCooldown = 70;
          }
        } else {
          seekDir = targetX < enemyCenter ? -1 : 1;
        }
      }
      e.dir = seekDir;
    } else if (e.type === "boss") {
      e.dir = player.x + player.w / 2 < e.x + e.w / 2 ? -1 : 1;
    }
    e.x += e.vx * e.dir;
    if (e.x < 20 || e.x + e.w > canvas.width - 20) {
      e.dir *= -1;
    }
    if (Math.random() < 0.01) {
      e.dir *= -1;
    }

    e.vy += gravity * 0.9;
    e.y += e.vy;
    e.onGround = false;

    platforms.forEach((p) => {
      const next = { x: e.x, y: e.y, w: e.w, h: e.h };
      if (rectsOverlap(next, p) && e.vy >= 0) {
        e.y = p.y - e.h;
        e.vy = 0;
        e.onGround = true;
      }
    });

    if (e.onGround && e.jumpCooldown <= 0 && Math.random() < (e.type === "boss" ? 0.01 : 0.02)) {
      e.vy = -8 - Math.random() * 3;
      e.jumpCooldown = 40 + Math.random() * 40;
    }

    if (e.type === "red" && e.shotCooldown <= 0) {
      const shotChance = Math.min(0.08, 0.03 + waveNumber * 0.002);
      if (Math.random() < shotChance) {
        const targetX = player.x + player.w / 2;
        const targetY = player.y + player.h / 2;
        const dx = targetX - (e.x + e.w / 2);
        const dy = targetY - (e.y + e.h / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const shotSpeed = 5;
        projectiles.push({
          x: e.x + e.w / 2,
          y: e.y + e.h / 2,
          r: 6,
          vx: (dx / dist) * shotSpeed,
          vy: (dy / dist) * shotSpeed,
          life: 120,
          rot: 0,
          hostile: true,
        });
        const baseCooldown = 90 + Math.random() * 60;
        e.shotCooldown = Math.max(40, baseCooldown - waveNumber * 3);
      }
    }

    if (e.type === "boss" && e.shotCooldown <= 0) {
      const targetX = player.x + player.w / 2;
      const targetY = player.y + player.h / 2;
      const dx = targetX - (e.x + e.w / 2);
      const dy = targetY - (e.y + e.h / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const shotSpeed = 5.5;
      projectiles.push({
        x: e.x + e.w / 2,
        y: e.y + e.h / 2,
        r: 7,
        vx: (dx / dist) * shotSpeed,
        vy: (dy / dist) * shotSpeed,
        life: 140,
        rot: 0,
        hostile: true,
      });
      e.shotCooldown = 55 + Math.random() * 30;
    }
  });
}

function checkHits() {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const p = projectiles[i];
    if (p.hostile) continue;
    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const e = enemies[j];
      if (rectsOverlap({ x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }, e)) {
        projectiles.splice(i, 1);
        e.hp -= 1;
        if (e.hp <= 0) {
          enemies.splice(j, 1);
          if (e.type === "boss") score += 600;
          else if (e.type === "ghost") score += 180;
          else if (e.type === "blue") score += 200;
          else if (e.type === "pink") score += 140;
          else score += 120;
          if (e.type === "pink") {
            lives = Math.min(maxLives, lives + 1);
            updateHud();
            announce("Healing burst!", 900);
          }
        }
        updateHud();
        return;
      }
    }
  }

  enemies.forEach((e) => {
    if (rectsOverlap(player, e)) {
      handlePlayerDeath("Ambushed!");
    }
  });

  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const p = projectiles[i];
    if (!p.hostile) continue;
    if (rectsOverlap({ x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }, player)) {
      projectiles.splice(i, 1);
      handlePlayerDeath("Hit by shuriken!");
    }
  }

  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    const p = powerups[i];
    if (rectsOverlap(player, p)) {
      powerups.splice(i, 1);
      applyPowerup(p.type);
    }
  }

  if (player.invuln <= 0) {
    for (let i = 0; i < traps.length; i += 1) {
      const t = traps[i];
      if (rectsOverlap(player, t)) {
        handlePlayerDeath("Trap sprung!");
        break;
      }
    }
  }
}

function drawDungeon() {
  ctx.save();
  ctx.fillStyle = "#121320";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1f2131";
  ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.strokeStyle = "#2d3147";
  ctx.lineWidth = 2;
  for (let x = 40; x < canvas.width - 40; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, canvas.height - 20);
    ctx.stroke();
  }
  for (let y = 40; y < canvas.height - 40; y += 40) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(canvas.width - 20, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlatforms() {
  ctx.save();
  ctx.fillStyle = "#30354b";
  platforms.forEach((p) => {
    ctx.fillRect(p.x, p.y, p.w, p.h);
  });
  ctx.restore();
}

function drawTraps() {
  ctx.save();
  ctx.fillStyle = "#5c2a2a";
  traps.forEach((t) => {
    ctx.fillRect(t.x, t.y + t.h - 6, t.w, 6);
    ctx.fillStyle = "#b23a48";
    for (let x = t.x; x < t.x + t.w; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, t.y + t.h - 6);
      ctx.lineTo(x + 5, t.y);
      ctx.lineTo(x + 10, t.y + t.h - 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#5c2a2a";
  });
  ctx.restore();
}

function drawPlayer() {
  const stride = player.isMoving ? Math.sin(frameTick * 0.25) * 6 : 0;
  const armSwing = player.isMoving ? Math.cos(frameTick * 0.25) * 6 : 0;
  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  ctx.scale(player.facing, 1);
  ctx.strokeStyle = "#f4f1ea";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(0, -16, 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 16);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(-12, 8 + armSwing);
  ctx.moveTo(0, 2);
  ctx.lineTo(12, 8 - armSwing);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.lineTo(-8, 32 - stride);
  ctx.moveTo(0, 16);
  ctx.lineTo(8, 32 + stride);
  ctx.stroke();

  ctx.fillStyle = "#e63946";
  ctx.fillRect(-8, -18, 16, 6);
  ctx.restore();
}

function drawEnemies() {
  enemies.forEach((e) => {
    if (e.type === "ghost") {
      ctx.save();
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      ctx.strokeStyle = "rgba(165, 240, 255, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -4, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(-8, 16);
      ctx.moveTo(0, 6);
      ctx.lineTo(8, 16);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const stride = Math.sin((frameTick + e.x) * 0.2) * (e.type === "boss" ? 7 : 5);
    const armSwing = Math.cos((frameTick + e.x) * 0.2) * (e.type === "boss" ? 7 : 5);
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
    if (e.type === "blue") ctx.strokeStyle = "#63b7ff";
    else if (e.type === "red") ctx.strokeStyle = "#ff6b6b";
    else if (e.type === "green") ctx.strokeStyle = "#74d680";
    else if (e.type === "pink") ctx.strokeStyle = "#f472b6";
    else if (e.type === "boss") ctx.strokeStyle = "#f97316";
    else ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = e.type === "boss" ? 4 : 3;
    ctx.beginPath();
    ctx.arc(0, e.type === "boss" ? -18 : -10, e.type === "boss" ? 11 : 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, e.type === "boss" ? -6 : -2);
    ctx.lineTo(0, e.type === "boss" ? 24 : 16);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, e.type === "boss" ? 8 : 4);
    ctx.lineTo(-14, (e.type === "boss" ? 16 : 10) + armSwing);
    ctx.moveTo(0, e.type === "boss" ? 8 : 4);
    ctx.lineTo(14, (e.type === "boss" ? 16 : 10) - armSwing);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, e.type === "boss" ? 24 : 16);
    ctx.lineTo(-12, (e.type === "boss" ? 40 : 28) - stride);
    ctx.moveTo(0, e.type === "boss" ? 24 : 16);
    ctx.lineTo(12, (e.type === "boss" ? 40 : 28) + stride);
    ctx.stroke();

    ctx.restore();
  });
}

function drawStars() {
  projectiles.forEach((p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.strokeStyle = p.hostile ? "#ff6b6b" : "#f1c453";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -10);
      ctx.rotate(Math.PI / 2);
    }
    ctx.stroke();
    ctx.restore();
  });
}

function drawPowerups() {
  powerups.forEach((p) => {
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    if (p.type === "size") ctx.fillStyle = "#6ddccf";
    else if (p.type === "rate") ctx.fillStyle = "#f4a261";
    else if (p.type === "regen") ctx.fillStyle = "#a78bfa";
    else ctx.fillStyle = "#a3e635";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b1b1b";
    ctx.font = "bold 12px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(
      p.type === "size" ? "+" : p.type === "rate" ? ">>" : p.type === "regen" ? "++" : "♥",
      0,
      4
    );
    ctx.restore();
  });
}

function drawOverlay() {
  if (!message || performance.now() > messageUntil) return;
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, canvas.height / 2 - 36, canvas.width, 72);
  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 24px Courier New";
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 8);
  ctx.restore();
}

function update() {
  if (status !== "playing") return;
  frameTick += 1;
  if (player.invuln > 0) player.invuln -= 1;
  if (player.cooldown > 0) {
    player.cooldown -= 1;
  }
  if (ghostSpawnCooldown > 0) {
    ghostSpawnCooldown -= 1;
  } else if (Math.random() < 0.012) {
    const ghostCount = enemies.filter((e) => e.type === "ghost").length;
    const hasFighters = enemies.some((e) => isWaveEnemy(e));
    if (ghostCount < 10 && hasFighters) {
      spawnGhost();
      ghostSpawnCooldown = 220;
      announce("A ghost appears!", 900);
    }
  }
  updatePlatforms();
  handleInput();
  applyPhysics();
  updateProjectiles();
  updateEnemies();
  updatePowerups();
  checkHits();

  if (Math.random() < 0.002 && powerups.length < 3) {
    spawnPowerup();
  }

  if (starSizeBoost > 0) starSizeBoost -= 1;
  if (fireRateBoost > 0) fireRateBoost -= 1;
  if (bonusLifeTimer > 0) bonusLifeTimer -= 1;
  if (regenBoostTimer > 0) regenBoostTimer -= 1;

  if (regenTimer > 0) {
    regenTimer -= 1;
  } else {
    if (lives < maxLives) {
      lives += 1;
      updateHud();
    }
    regenTimer = regenBoostTimer > 0 ? 240 : 600;
  }

  const remainingFighters = enemies.filter((e) => isWaveEnemy(e)).length;
  if (remainingFighters === 0) {
    ghostSpawnCooldown = 240;
    waveCount += 1;
    waveNumber += 1;
    lives = 4;
    updateHud();
    spawnEnemies(true);
    announce("More ninjas incoming", 1200);
  }

  if (lives <= 0) {
    status = "gameover";
    announce("Game over! Press R", 9999);
  }
}

function render() {
  drawDungeon();
  drawPlatforms();
  drawTraps();
  drawPowerups();
  drawEnemies();
  drawStars();
  drawPlayer();
  drawOverlay();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === " ") {
    throwStar(isAimUp() ? -1 : 0);
  }
  if (e.key === "e" || e.key === "E") {
    throwStar(-1);
  }
  if (e.key.toLowerCase() === "r") {
    reset();
  }
  keys.add(e.key);
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key);
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    if (throwInterval) {
      stopThrowing();
      startThrowing();
    }
  }
});

function stopThrowing() {
  if (throwInterval) {
    clearInterval(throwInterval);
    throwInterval = null;
  }
}

function startThrowing() {
  const direction = isAimUp() ? -1 : 0;
  throwStar(direction);
  if (!throwInterval) {
    throwInterval = setInterval(() => throwStar(direction), 120);
  }
}

const touchControls = document.querySelector(".touch-controls");
if (touchControls) {
  const actionMap = {
    left: "ArrowLeft",
    right: "ArrowRight",
    jump: "ArrowUp",
  };

  const handlePress = (action) => {
    if (action === "throw") {
      startThrowing();
      return;
    }
    if (action === "throw-up") {
      touchAimUp = true;
      startThrowing();
      return;
    }
    if (action === "fullscreen") {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
      return;
    }
    if (action === "restart") {
      reset();
      return;
    }
    const key = actionMap[action];
    if (key) virtualKeys.add(key);
  };

  const handleRelease = (action) => {
    if (action === "throw") {
      stopThrowing();
      return;
    }
    if (action === "throw-up") {
      stopThrowing();
      touchAimUp = false;
      return;
    }
    const key = actionMap[action];
    if (key) virtualKeys.delete(key);
  };

  touchControls.querySelectorAll("[data-action]").forEach((button) => {
    const action = button.getAttribute("data-action");
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      handlePress(action);
    });
    button.addEventListener("pointerup", (e) => {
      e.preventDefault();
      handleRelease(action);
    });
    button.addEventListener("pointerleave", () => handleRelease(action));
    button.addEventListener("pointercancel", () => handleRelease(action));
  });
}

window.addEventListener("blur", () => {
  virtualKeys.clear();
  stopThrowing();
  touchAimUp = false;
});

spawnEnemies(false);
updateHud();
announce("Explore the dungeon", 1200);
requestAnimationFrame(loop);
