const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");

const keys = new Set();
const virtualKeys = new Set();
let score = 0;
let lives = 3;
let message = "";
let messageUntil = 0;
let status = "playing";
let frameTick = 0;
let throwInterval = null;

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
  { x: 80, y: 420, w: 200, h: 16 },
  { x: 330, y: 360, w: 200, h: 16 },
  { x: 580, y: 300, w: 220, h: 16 },
  { x: 120, y: 260, w: 160, h: 16 },
  { x: 350, y: 220, w: 160, h: 16 },
  { x: 640, y: 180, w: 160, h: 16 },
  { x: 40, y: 330, w: 140, h: 14 },
  { x: 240, y: 300, w: 120, h: 14 },
  { x: 520, y: 250, w: 140, h: 14 },
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

const spawnPoint = { x: 120, y: canvas.height - 92 };

function spawnEnemies() {
  enemies = [];
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
      if (roll < 0.18) type = "blue";
      else if (roll < 0.32) type = "red";
      else if (roll < 0.48) type = "green";
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

function updateHud() {
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
  waveEl.textContent = `Wave: ${waveNumber}`;
}

function announce(text, duration) {
  message = text;
  messageUntil = performance.now() + duration;
}

function reset() {
  score = 0;
  lives = 3;
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
  spawnEnemies();
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
    }
  });

  if (player.onGround) {
    player.vx *= friction;
  }

  player.x = Math.max(10, Math.min(canvas.width - player.w - 10, player.x));
  if (player.y > canvas.height + 200) {
    lives -= 1;
    updateHud();
    player.x = spawnPoint.x;
    player.y = spawnPoint.y;
    player.vx = 0;
    player.vy = 0;
    player.invuln = 45;
    announce("Watch your step!", 1200);
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

function throwStar() {
  if (player.cooldown > 0) return;
  const sizeBoost = starSizeBoost > 0 ? 3 : 0;
  const speedBoost = fireRateBoost > 0 ? 1.5 : 0;
  projectiles.push({
    x: player.x + player.w / 2 + player.facing * 10,
    y: player.y + player.h / 2,
    r: 6 + sizeBoost,
    vx: player.facing * (6.5 + speedBoost),
    vy: -0.5,
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
  if (roll < 0.34) type = "rate";
  else if (roll < 0.67) type = "life";
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
  } else if (type === "life") {
    lives = Math.min(5, lives + 1);
    bonusLifeTimer = 300;
    updateHud();
    announce("Extra life!", 1000);
  }
}

function updateEnemies() {
  enemies.forEach((e) => {
    if (e.jumpCooldown > 0) {
      e.jumpCooldown -= 1;
    }
    if (e.shotCooldown > 0) {
      e.shotCooldown -= 1;
    }

    // Basic roam AI: walk, bounce off walls, and occasionally jump.
    if (e.type === "green" || e.type === "boss") {
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

    if (e.type === "red" && e.shotCooldown <= 0 && Math.random() < 0.03) {
      projectiles.push({
        x: e.x + e.w / 2,
        y: e.y + e.h / 2,
        r: 6,
        vx: (player.x > e.x ? 1 : -1) * 5,
        vy: -0.2,
        life: 120,
        rot: 0,
        hostile: true,
      });
      e.shotCooldown = 90 + Math.random() * 60;
    }

    if (e.type === "boss" && e.shotCooldown <= 0) {
      projectiles.push({
        x: e.x + e.w / 2,
        y: e.y + e.h / 2,
        r: 7,
        vx: (player.x > e.x ? 1 : -1) * 5.5,
        vy: -0.2,
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
          else score += e.type === "blue" ? 200 : 120;
        }
        updateHud();
        return;
      }
    }
  }

  enemies.forEach((e) => {
    if (rectsOverlap(player, e)) {
      lives -= 1;
      updateHud();
      player.x = spawnPoint.x;
      player.y = spawnPoint.y;
      player.vx = 0;
      player.vy = 0;
      player.invuln = 45;
      announce("Ambushed!", 1200);
    }
  });

  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const p = projectiles[i];
    if (!p.hostile) continue;
    if (rectsOverlap({ x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }, player)) {
      projectiles.splice(i, 1);
      lives -= 1;
      updateHud();
      player.invuln = 45;
      announce("Hit by shuriken!", 1200);
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
        lives -= 1;
        updateHud();
        player.x = spawnPoint.x;
        player.y = spawnPoint.y;
        player.vx = 0;
        player.vy = 0;
        player.invuln = 45;
        announce("Trap sprung!", 1200);
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
    const stride = Math.sin((frameTick + e.x) * 0.2) * (e.type === "boss" ? 7 : 5);
    const armSwing = Math.cos((frameTick + e.x) * 0.2) * (e.type === "boss" ? 7 : 5);
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
    if (e.type === "blue") ctx.strokeStyle = "#63b7ff";
    else if (e.type === "red") ctx.strokeStyle = "#ff6b6b";
    else if (e.type === "green") ctx.strokeStyle = "#74d680";
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
    else ctx.fillStyle = "#a3e635";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b1b1b";
    ctx.font = "bold 12px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(p.type === "size" ? "+" : p.type === "rate" ? ">>" : "♥", 0, 4);
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
  frameTick += 1;
  if (status !== "playing") return;
  if (player.invuln > 0) player.invuln -= 1;
  if (player.cooldown > 0) {
    player.cooldown -= 1;
  }
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

  if (enemies.length === 0) {
    waveCount += 1;
    waveNumber += 1;
    lives = 3;
    updateHud();
    spawnEnemies();
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
    throwStar();
  }
  if (e.key.toLowerCase() === "r") {
    reset();
  }
  keys.add(e.key);
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key);
});

function stopThrowing() {
  if (throwInterval) {
    clearInterval(throwInterval);
    throwInterval = null;
  }
}

function startThrowing() {
  throwStar();
  if (!throwInterval) {
    throwInterval = setInterval(throwStar, 120);
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
});

spawnEnemies();
updateHud();
announce("Explore the dungeon", 1200);
requestAnimationFrame(loop);
