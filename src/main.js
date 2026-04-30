import "./styles.css";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  wave: document.querySelector("#wave"),
  lives: document.querySelector("#lives"),
  ki: document.querySelector("#ki"),
  status: document.querySelector("#status"),
  details: document.querySelector("#tower-details"),
  picker: document.querySelector("#hero-picker"),
  towerMenu: document.querySelector("#tower-menu"),
  towerMenuTitle: document.querySelector("#tower-menu-title"),
  upgradeTower: document.querySelector("#upgrade-tower"),
  showStats: document.querySelector("#show-stats"),
  closeMenu: document.querySelector("#close-menu"),
  startWave: document.querySelector("#start-wave"),
  pause: document.querySelector("#pause"),
  choices: [...document.querySelectorAll(".tower-choice")]
};

const W = canvas.width;
const H = canvas.height;
const assetBase = import.meta.env.BASE_URL;
const assets = await loadAssets({
  map: `${assetBase}assets/map.png`,
  hero: `${assetBase}assets/hero.png`,
  towerHeavy: `${assetBase}assets/tower-heavy.png`,
  towerMystic: `${assetBase}assets/tower-mystic.png`,
  towerSpeed: `${assetBase}assets/tower-speed.png`,
  towerGuardian: `${assetBase}assets/tower-guardian.png`,
  enemy: `${assetBase}assets/enemy.png`,
  enemyFast: `${assetBase}assets/enemy-fast.png`,
  enemyTank: `${assetBase}assets/enemy-tank.png`,
  boss: `${assetBase}assets/boss.png`
});

const path = [
  { x: -70, y: 414 },
  { x: 118, y: 417 },
  { x: 230, y: 400 },
  { x: 313, y: 359 },
  { x: 362, y: 303 },
  { x: 462, y: 267 },
  { x: 572, y: 284 },
  { x: 641, y: 338 },
  { x: 728, y: 351 },
  { x: 812, y: 320 },
  { x: 890, y: 269 },
  { x: 1004, y: 279 },
  { x: 1114, y: 337 },
  { x: 1214, y: 389 },
  { x: 1350, y: 389 }
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
  pulse: {
    name: "Blue Brawler",
    shortName: "Blue",
    cost: 60,
    range: 168,
    cooldown: 0.72,
    damage: 24,
    color: "#6be6ff",
    attack: "orb",
    role: "Balanced",
    sprite: "hero",
    size: 92
  },
  nova: {
    name: "Gold Striker",
    shortName: "Gold",
    cost: 95,
    range: 128,
    cooldown: 1.05,
    damage: 58,
    color: "#ffd166",
    attack: "splash",
    role: "Splash",
    splash: 64,
    sprite: "towerHeavy",
    size: 96
  },
  mystic: {
    name: "Mystic Beam",
    shortName: "Mystic",
    cost: 85,
    range: 225,
    cooldown: 1.22,
    damage: 36,
    color: "#c097ff",
    attack: "beam",
    role: "Long range",
    pierce: true,
    sprite: "towerMystic",
    size: 88
  },
  speed: {
    name: "Speed Spark",
    shortName: "Speed",
    cost: 55,
    range: 138,
    cooldown: 0.38,
    damage: 13,
    color: "#77ff8a",
    attack: "rapid",
    role: "Fast",
    sprite: "towerSpeed",
    size: 86
  },
  guardian: {
    name: "Guard Wave",
    shortName: "Guard",
    cost: 80,
    range: 155,
    cooldown: 0.95,
    damage: 18,
    color: "#86d7ff",
    attack: "wave",
    role: "Close slow",
    slow: 0.6,
    sprite: "towerGuardian",
    size: 102
  }
};

const enemyTypes = {
  raider: { sprite: "enemy", hp: 90, speed: 96, reward: 22, size: 72, damage: 1 },
  runner: { sprite: "enemyFast", hp: 58, speed: 152, reward: 18, size: 66, damage: 1 },
  tank: { sprite: "enemyTank", hp: 210, speed: 58, reward: 42, size: 88, damage: 2 },
  boss: { sprite: "boss", hp: 470, speed: 54, reward: 105, size: 116, damage: 4, boss: true }
};

let state = resetGame();
let selectedTower = "pulse";
let selectedPad = null;
let selectedBuiltPad = null;
let last = performance.now();

hideContextPanels();
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
    const tower = towerTypes[selectedTower];
    if (selectedPad) {
      buildTower(selectedPad, selectedTower);
    } else {
      setStatus(`${tower.name}: ${tower.role}, ${tower.cost} coins. Tap a glowing pad to place it.`);
      showDetails(tower);
    }
  });
});

ui.upgradeTower.addEventListener("click", () => {
  if (selectedBuiltPad?.tower) upgradeTower(selectedBuiltPad);
});

ui.showStats.addEventListener("click", () => {
  if (selectedBuiltPad?.tower) showDetails(selectedBuiltPad.tower, true);
});

ui.closeMenu.addEventListener("click", hideContextPanels);

canvas.addEventListener("pointerdown", (event) => {
  const point = canvasPoint(event);
  const pad = buildPads.find((candidate) => dist(candidate, point) < 44);
  if (!pad) {
    hideContextPanels();
    return;
  }

  if (pad.tower) {
    openTowerMenu(pad, point);
    return;
  }

  openHeroPicker(pad, point);
});

requestAnimationFrame(loop);

function resetGame() {
  buildPads.forEach((pad) => {
    pad.tower = null;
  });
  return {
    wave: 1,
    lives: 20,
    ki: 280,
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

function buildTower(pad, towerKey) {
  const spec = towerTypes[towerKey];
  if (!pad || pad.tower) return;
  if (state.ki < spec.cost) {
    setStatus(`Need ${spec.cost} coins for ${spec.name}. You have ${state.ki}.`);
    showDetails(spec);
    return;
  }

  state.ki -= spec.cost;
  pad.tower = {
    ...spec,
    type: towerKey,
    x: pad.x,
    y: pad.y,
    level: 1,
    timer: 0,
    targetId: null
  };
  setStatus(`${spec.name} placed for ${spec.cost} coins. Tap the fighter to upgrade or view stats.`);
  hideContextPanels();
  updateHud();
}

function upgradeTower(pad) {
  const tower = pad?.tower;
  if (!tower) return;
  const price = upgradeCost(tower);
  if (tower.level >= 3) {
    setStatus(`${tower.name} is already max level.`);
    showDetails(tower, true);
    return;
  }
  if (state.ki < price) {
    setStatus(`Need ${price} coins to upgrade ${tower.name}. You have ${state.ki}.`);
    showDetails(tower, true);
    return;
  }
  state.ki -= price;
  tower.level += 1;
  tower.damage *= 1.34;
  tower.range += tower.attack === "beam" ? 26 : 18;
  tower.cooldown *= 0.92;
  tower.cost += price;
  setStatus(`${tower.name} upgraded to level ${tower.level} for ${price} coins.`);
  openTowerMenu(pad, { x: tower.x, y: tower.y });
  updateHud();
}

function startWave() {
  if (state.activeWave || state.defeat || state.victory) return;
  const count = 7 + state.wave * 3;
  const bossWave = state.wave % 4 === 0;
  state.spawns = Array.from({ length: count }, (_, i) => ({
    delay: i * Math.max(0.35, 0.78 - state.wave * 0.04),
    type: pickEnemyType(i, count, bossWave)
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
    state.ki += 70 + state.wave * 14;
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
    const spec = enemyTypes[spawn.type];
    const scale = 1 + state.wave * 0.11;
    state.enemies.push({
      id: crypto.randomUUID(),
      type: spawn.type,
      boss: Boolean(spec.boss),
      progress: 0,
      hp: spec.hp * scale,
      maxHp: spec.hp * scale,
      speed: spec.speed + (spec.boss ? 0 : state.wave * 4),
      slowTime: 0,
      reward: spec.reward + state.wave * 2,
      damage: spec.damage,
      size: spec.size,
      sprite: spec.sprite,
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
    state.lives -= escaped.reduce((sum, enemy) => sum + enemy.damage, 0);
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
      y: tower.y - 36,
      startX: tower.x,
      startY: tower.y - 36,
      targetId: target.id,
      damage: tower.damage,
      color: tower.color,
      splash: tower.splash ?? 0,
      slow: tower.slow ?? 0,
      pierce: tower.pierce ?? false,
      attack: tower.attack,
      radius: 0,
      hitIds: new Set(),
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
    if (shot.attack === "beam") {
      shot.x = target.x;
      shot.y = target.y;
      if (shot.life >= 0.08) {
        hitTarget(shot, target);
        shot.done = true;
      }
      continue;
    }
    if (shot.attack === "wave") {
      shot.radius += 280 * dt;
      for (const enemy of state.enemies.filter((candidate) => dist(candidate, shot) <= shot.radius)) {
        if (shot.hitIds.has(enemy.id)) continue;
        shot.hitIds.add(enemy.id);
        hitTarget(shot, enemy);
      }
      if (shot.radius > 96 || shot.life > 0.45) shot.done = true;
      continue;
    }
    const angle = Math.atan2(target.y - shot.y, target.x - shot.x);
    const speed = shot.attack === "rapid" ? 860 : 650;
    shot.x += Math.cos(angle) * speed * dt;
    shot.y += Math.sin(angle) * speed * dt;
    if (dist(shot, target) < (target.boss ? 46 : 30) && !shot.hitIds.has(target.id)) {
      shot.hitIds.add(target.id);
      hitTarget(shot, target);
      shot.done = !shot.pierce;
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
    ctx.strokeStyle = `${tower.color}99`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, tower.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    const bob = Math.sin(performance.now() / 280 + tower.x) * 3;
    drawSprite(assets[tower.sprite], tower.x - tower.size / 2, tower.y - tower.size + 22 + bob, tower.size, tower.size);

    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.fillStyle = tower.color;
    ctx.beginPath();
    ctx.arc(0, -tower.size + 26 + bob, 9 + Math.sin(performance.now() / 160) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(17, 14, 12, 0.86)";
    ctx.strokeStyle = tower.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-19, 13, 38, 22, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff8ea";
    ctx.font = "700 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`L${tower.level}`, 0, 29);
    if (tower.level < 3) {
      const price = upgradeCost(tower);
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(30, 22, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#39240d";
      ctx.font = "900 10px system-ui";
      ctx.fillText(price, 30, 26);
    }
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
    const size = enemy.size;
    drawSprite(assets[enemy.sprite], enemy.x - size / 2, enemy.y - size + 24, size, size);
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
    if (shot.attack === "beam") {
      const target = state.enemies.find((enemy) => enemy.id === shot.targetId);
      if (target) {
        ctx.strokeStyle = shot.color;
        ctx.lineWidth = 6;
        ctx.globalAlpha = 0.88;
        ctx.beginPath();
        ctx.moveTo(shot.startX, shot.startY);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fff8ea";
        ctx.stroke();
      }
    } else if (shot.attack === "wave") {
      ctx.strokeStyle = shot.color;
      ctx.lineWidth = 5;
      ctx.globalAlpha = Math.max(0, 1 - shot.life * 2.2);
      ctx.beginPath();
      ctx.arc(shot.startX, shot.startY, shot.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shot.attack === "splash") {
      ctx.fillStyle = shot.color;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 10 + Math.sin(shot.life * 24) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff8ea";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (shot.attack === "rapid") {
      ctx.fillStyle = shot.color;
      ctx.beginPath();
      ctx.ellipse(shot.x, shot.y, 8, 3, shot.life * 16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = shot.color;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
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

function pickEnemyType(index, count, bossWave) {
  if (bossWave && index === count - 1) return "boss";
  if (state.wave >= 3 && index % 5 === 3) return "tank";
  if (state.wave >= 2 && index % 3 === 1) return "runner";
  return "raider";
}

function upgradeCost(tower) {
  return Math.round(tower.cost * (0.52 + tower.level * 0.18));
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
  ui.ki.textContent = `Coins ${state.ki}`;
  ui.choices.forEach((button) => {
    const tower = towerTypes[button.dataset.tower];
    button.textContent = `${tower.shortName} ${tower.cost}c`;
    button.title = `${tower.name}: build ${tower.cost} coins, upgrade ${baseUpgradeCost(tower)} coins, power ${tower.damage}, range ${tower.range}, speed ${attacksPerSecond(tower)}/s`;
  });
  if (!ui.details.hidden) renderTowerDetails(towerTypes[selectedTower]);
}

function setStatus(message) {
  ui.status.textContent = message;
}

function openHeroPicker(pad) {
  selectedPad = pad;
  selectedBuiltPad = null;
  ui.towerMenu.hidden = true;
  ui.details.hidden = true;
  ui.picker.hidden = false;
  const cheapest = Math.min(...Object.values(towerTypes).map((tower) => tower.cost));
  setStatus(
    state.ki >= cheapest
      ? "Choose a fighter for this pad."
      : `You need at least ${cheapest} coins to build. Current coins: ${state.ki}.`
  );
  updateHud();
}

function openTowerMenu(pad) {
  selectedPad = null;
  selectedBuiltPad = pad;
  const tower = pad.tower;
  const price = tower.level >= 3 ? "Max" : `${upgradeCost(tower)}c`;
  ui.picker.hidden = true;
  ui.details.hidden = true;
  ui.towerMenu.hidden = false;
  ui.towerMenuTitle.textContent = `${tower.name} L${tower.level}`;
  ui.upgradeTower.textContent = tower.level >= 3 ? "Max Level" : `Upgrade ${price}`;
  ui.upgradeTower.disabled = tower.level >= 3 || state.ki < upgradeCost(tower);
  setStatus(`Tap Upgrade or Stats. Coins: ${state.ki}.`);
}

function hideContextPanels() {
  selectedPad = null;
  selectedBuiltPad = null;
  ui.picker.hidden = true;
  ui.towerMenu.hidden = true;
  ui.details.hidden = true;
}

function showDetails(tower, built = false) {
  renderTowerDetails(tower, built);
  ui.details.hidden = false;
}

function renderTowerDetails(tower = towerTypes[selectedTower], built = false) {
  const nextUpgrade = built && tower.level < 3 ? upgradeCost(tower) : baseUpgradeCost(tower);
  const dps = Math.round(tower.damage * Number(attacksPerSecond(tower)));
  ui.details.innerHTML = `
    <div class="detail-title">${tower.name}${built ? ` L${tower.level}` : ""} - ${tower.role}</div>
    <div class="detail-grid">
      <div class="detail-stat"><span>Your Coins</span><b>${state.ki}</b></div>
      <div class="detail-stat"><span>Build Cost</span><b>${tower.cost} coins</b></div>
      <div class="detail-stat"><span>Upgrade Cost</span><b>${tower.level >= 3 ? "Max" : `${nextUpgrade} coins`}</b></div>
      <div class="detail-stat"><span>Power</span><b>${Math.round(tower.damage)}</b></div>
      <div class="detail-stat"><span>Range</span><b>${Math.round(tower.range)}</b></div>
      <div class="detail-stat"><span>Attack Speed</span><b>${attacksPerSecond(tower)}/s</b></div>
      <div class="detail-stat"><span>DPS</span><b>${dps}</b></div>
      <div class="detail-stat"><span>Attack</span><b>${tower.attack}</b></div>
    </div>
  `;
}

function baseUpgradeCost(tower) {
  return Math.round(tower.cost * 0.7);
}

function attacksPerSecond(tower) {
  return (1 / tower.cooldown).toFixed(2);
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
