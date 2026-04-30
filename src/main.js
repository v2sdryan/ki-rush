import "./styles.css";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  wave: document.querySelector("#wave"),
  lives: document.querySelector("#lives"),
  ki: document.querySelector("#ki"),
  status: document.querySelector("#status"),
  startWave: document.querySelector("#start-wave"),
  pause: document.querySelector("#pause"),
  choices: [...document.querySelectorAll(".tower-choice")]
};

const W = canvas.width;
const H = canvas.height;
const assets = await loadAssets({
  map: "/assets/map.png",
  hero: "/assets/hero.png",
  enemy: "/assets/enemy.png",
  boss: "/assets/boss.png"
});

const path = [
  { x: -60, y: 500 },
  { x: 135, y: 507 },
  { x: 260, y: 435 },
  { x: 360, y: 304 },
  { x: 500, y: 303 },
  { x: 620, y: 402 },
  { x: 766, y: 388 },
  { x: 900, y: 284 },
  { x: 1052, y: 304 },
  { x: 1180, y: 395 },
  { x: 1340, y: 388 }
];

const buildPads = [
  { x: 205, y: 380 },
  { x: 346, y: 198 },
  { x: 522, y: 490 },
  { x: 717, y: 260 },
  { x: 827, y: 548 },
  { x: 1034, y: 224 },
  { x: 1082, y: 507 }
].map((pad, id) => ({ ...pad, id, tower: null }));

const towerTypes = {
  pulse: { name: "Pulse", cost: 60, range: 168, cooldown: 0.72, damage: 24, color: "#6be6ff" },
  nova: { name: "Nova", cost: 95, range: 128, cooldown: 1.05, damage: 58, color: "#ffd166", splash: 64 },
  slow: { name: "Frost", cost: 75, range: 150, cooldown: 0.95, damage: 12, color: "#a6fff2", slow: 0.55 }
};

let state = resetGame();
let selectedTower = "pulse";
let last = performance.now();

ui.startWave.addEventListener("click", startWave);
ui.pause.addEventListener("click", () => {
  state.paused = !state.paused;
  ui.pause.textContent = state.paused ? "Resume" : "Pause";
  setStatus(state.paused ? "Paused. Take a breath, then resume the defense." : "Back in motion.");
});

ui.choices.forEach((button) => {
  button.addEventListener("click", () => {
    selectedTower = button.dataset.tower;
    ui.choices.forEach((choice) => choice.classList.toggle("active", choice === button));
    setStatus(`${towerTypes[selectedTower].name} tower selected.`);
  });
});

canvas.addEventListener("pointerdown", (event) => {
  const point = canvasPoint(event);
  const pad = buildPads.find((candidate) => dist(candidate, point) < 44);
  if (!pad) return;

  if (pad.tower) {
    const price = Math.round(pad.tower.cost * 0.65);
    if (state.ki < price || pad.tower.level >= 3) {
      setStatus(pad.tower.level >= 3 ? "That tower is already max level." : `Need ${price} ki to upgrade.`);
      return;
    }
    state.ki -= price;
    pad.tower.level += 1;
    pad.tower.damage *= 1.34;
    pad.tower.range += 18;
    pad.tower.cost += price;
    setStatus(`${pad.tower.name} tower upgraded to level ${pad.tower.level}.`);
    updateHud();
    return;
  }

  const spec = towerTypes[selectedTower];
  if (state.ki < spec.cost) {
    setStatus(`Need ${spec.cost} ki for a ${spec.name} tower.`);
    return;
  }

  state.ki -= spec.cost;
  pad.tower = {
    ...spec,
    type: selectedTower,
    x: pad.x,
    y: pad.y,
    level: 1,
    timer: 0,
    targetId: null
  };
  setStatus(`${spec.name} tower online. Click it later to upgrade.`);
  updateHud();
});

requestAnimationFrame(loop);

function resetGame() {
  buildPads.forEach((pad) => {
    pad.tower = null;
  });
  return {
    wave: 1,
    lives: 20,
    ki: 140,
    enemies: [],
    shots: [],
    particles: [],
    spawns: [],
    activeWave: false,
    paused: false,
    victory: false,
    defeat: false
  };
}

function startWave() {
  if (state.activeWave || state.defeat || state.victory) return;
  const count = 7 + state.wave * 3;
  const bossWave = state.wave % 4 === 0;
  state.spawns = Array.from({ length: count }, (_, i) => ({
    delay: i * Math.max(0.35, 0.78 - state.wave * 0.04),
    boss: bossWave && i === count - 1
  }));
  state.activeWave = true;
  ui.startWave.disabled = true;
  setStatus(bossWave ? "Boss signature detected at the end of this wave." : "Wave incoming.");
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!state.paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (state.defeat || state.victory) return;
  spawnEnemies(dt);
  updateEnemies(dt);
  updateTowers(dt);
  updateShots(dt);
  updateParticles(dt);
  if (state.activeWave && state.spawns.length === 0 && state.enemies.length === 0) {
    state.activeWave = false;
    ui.startWave.disabled = false;
    state.ki += 60 + state.wave * 12;
    state.wave += 1;
    if (state.wave > 8) {
      state.victory = true;
      setStatus("Victory. The valley is safe.");
    } else {
      setStatus("Wave cleared. Build or upgrade before the next rush.");
    }
    updateHud();
  }
}

function spawnEnemies(dt) {
  state.spawns.forEach((spawn) => {
    spawn.delay -= dt;
  });
  while (state.spawns[0]?.delay <= 0) {
    const spawn = state.spawns.shift();
    const scale = 1 + state.wave * 0.11;
    state.enemies.push({
      id: crypto.randomUUID(),
      boss: spawn.boss,
      progress: 0,
      hp: (spawn.boss ? 420 : 90) * scale,
      maxHp: (spawn.boss ? 420 : 90) * scale,
      speed: (spawn.boss ? 58 : 92 + state.wave * 5),
      slowTime: 0,
      reward: spawn.boss ? 95 : 20 + state.wave * 2,
      x: path[0].x,
      y: path[0].y
    });
  }
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    const speedFactor = enemy.slowTime > 0 ? 0.48 : 1;
    enemy.slowTime = Math.max(0, enemy.slowTime - dt);
    enemy.progress += enemy.speed * speedFactor * dt;
    const pos = pointOnPath(enemy.progress);
    enemy.x = pos.x;
    enemy.y = pos.y;
  }

  const escaped = state.enemies.filter((enemy) => enemy.progress >= totalPathLength());
  if (escaped.length) {
    state.lives -= escaped.reduce((sum, enemy) => sum + (enemy.boss ? 4 : 1), 0);
    state.enemies = state.enemies.filter((enemy) => enemy.progress < totalPathLength());
    setStatus("Enemies broke through. Tighten the defense.");
    if (state.lives <= 0) {
      state.lives = 0;
      state.defeat = true;
      setStatus("Defeat. Refresh to try a new defense plan.");
    }
    updateHud();
  }
}

function updateTowers(dt) {
  for (const pad of buildPads) {
    if (!pad.tower) continue;
    const tower = pad.tower;
    tower.timer -= dt;
    const target = state.enemies
      .filter((enemy) => dist(enemy, tower) <= tower.range)
      .sort((a, b) => b.progress - a.progress)[0];
    tower.targetId = target?.id ?? null;
    if (!target || tower.timer > 0) continue;

    tower.timer = tower.cooldown / (1 + (tower.level - 1) * 0.14);
    state.shots.push({
      x: tower.x,
      y: tower.y - 22,
      targetId: target.id,
      damage: tower.damage,
      color: tower.color,
      splash: tower.splash ?? 0,
      slow: tower.slow ?? 0,
      life: 0
    });
  }
}

function updateShots(dt) {
  for (const shot of state.shots) {
    shot.life += dt;
    const target = state.enemies.find((enemy) => enemy.id === shot.targetId);
    if (!target) {
      shot.done = true;
      continue;
    }
    const angle = Math.atan2(target.y - shot.y, target.x - shot.x);
    shot.x += Math.cos(angle) * 650 * dt;
    shot.y += Math.sin(angle) * 650 * dt;
    if (dist(shot, target) < (target.boss ? 46 : 30)) {
      hitTarget(shot, target);
      shot.done = true;
    }
    if (shot.life > 1.5) shot.done = true;
  }
  state.shots = state.shots.filter((shot) => !shot.done);
}

function hitTarget(shot, target) {
  const victims = shot.splash
    ? state.enemies.filter((enemy) => dist(enemy, target) <= shot.splash)
    : [target];
  for (const enemy of victims) {
    enemy.hp -= shot.damage;
    if (shot.slow) enemy.slowTime = Math.max(enemy.slowTime, 1.6);
    burst(enemy.x, enemy.y, shot.color, shot.splash ? 16 : 8);
  }
  const defeated = state.enemies.filter((enemy) => enemy.hp <= 0);
  if (defeated.length) {
    state.ki += defeated.reduce((sum, enemy) => sum + enemy.reward, 0);
    state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
    updateHud();
  }
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function draw() {
  drawCoverImage(assets.map, 0, 0, W, H);
  drawPathGlow();
  drawPads();
  drawTowers();
  drawHero();
  drawEnemies();
  drawShots();
  drawParticles();
  drawEndState();
}

function drawCoverImage(img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawPathGlow() {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255, 226, 128, 0.25)";
  ctx.lineWidth = 62;
  ctx.beginPath();
  path.forEach((point, index) => (index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
  ctx.stroke();
  ctx.restore();
}

function drawPads() {
  for (const pad of buildPads) {
    ctx.save();
    ctx.translate(pad.x, pad.y);
    ctx.strokeStyle = pad.tower ? "rgba(255, 226, 128, 0.88)" : "rgba(115, 232, 255, 0.82)";
    ctx.fillStyle = pad.tower ? "rgba(255, 191, 73, 0.15)" : "rgba(64, 211, 255, 0.12)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawTowers() {
  for (const pad of buildPads) {
    if (!pad.tower) continue;
    const tower = pad.tower;
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.fillStyle = "rgba(26, 23, 20, 0.86)";
    ctx.strokeStyle = tower.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-22, -26, 44, 52, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = tower.color;
    ctx.beginPath();
    ctx.arc(0, -32, 13 + Math.sin(performance.now() / 160) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8ea";
    ctx.font = "700 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`L${tower.level}`, 0, 18);
    ctx.restore();
  }
}

function drawHero() {
  drawSprite(assets.hero, 28, 444, 135, 135);
  ctx.save();
  ctx.strokeStyle = "rgba(107, 230, 255, 0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(92, 514, 70 + Math.sin(performance.now() / 240) * 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of [...state.enemies].sort((a, b) => a.y - b.y)) {
    const size = enemy.boss ? 112 : 72;
    drawSprite(enemy.boss ? assets.boss : assets.enemy, enemy.x - size / 2, enemy.y - size + 24, size, size);
    drawHealth(enemy, size);
  }
}

function drawHealth(enemy, size) {
  const width = enemy.boss ? 78 : 48;
  const x = enemy.x - width / 2;
  const y = enemy.y - size + 12;
  ctx.fillStyle = "rgba(17, 14, 12, 0.8)";
  ctx.fillRect(x, y, width, 7);
  ctx.fillStyle = enemy.boss ? "#ff5d73" : "#7df58e";
  ctx.fillRect(x, y, width * Math.max(0, enemy.hp / enemy.maxHp), 7);
}

function drawShots() {
  for (const shot of state.shots) {
    ctx.save();
    ctx.shadowColor = shot.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = shot.color;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.splash ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / 0.55);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawEndState() {
  if (!state.victory && !state.defeat) return;
  ctx.save();
  ctx.fillStyle = "rgba(10, 8, 7, 0.64)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = state.victory ? "#ffd166" : "#ff7385";
  ctx.font = "900 58px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(state.victory ? "VALLEY DEFENDED" : "BASE DESTROYED", W / 2, H / 2);
  ctx.fillStyle = "#fff8ea";
  ctx.font = "700 20px system-ui";
  ctx.fillText("Refresh to play again.", W / 2, H / 2 + 42);
  ctx.restore();
}

function drawSprite(img, x, y, w, h) {
  ctx.drawImage(img, x, y, w, h);
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 160;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      color,
      life: 0.32 + Math.random() * 0.28
    });
  }
}

function pointOnPath(distance) {
  let remaining = distance;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    const length = dist(a, b);
    if (remaining <= length) {
      const t = remaining / length;
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    }
    remaining -= length;
  }
  return path[path.length - 1];
}

function totalPathLength() {
  return path.slice(0, -1).reduce((sum, point, index) => sum + dist(point, path[index + 1]), 0);
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H
  };
}

function updateHud() {
  ui.wave.textContent = `Wave ${state.wave}`;
  ui.lives.textContent = `Lives ${state.lives}`;
  ui.ki.textContent = `Ki ${state.ki}`;
}

function setStatus(message) {
  ui.status.textContent = message;
}

function loadAssets(sources) {
  return Object.fromEntries(
    Object.entries(sources).map(([name, src]) => [
      name,
      Object.assign(new Image(), {
        src
      })
    ])
  );
}

await Promise.all(
  Object.values(assets).map(
    (img) =>
      new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      })
  )
);

updateHud();
