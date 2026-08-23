// ============================================================
// GAS: THE TRUTH
// game.js - COMPLETE FIXED VERSION
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const stats = document.getElementById("stats");
const message = document.getElementById("message");
const startScreen = document.getElementById("start");

let W = 0;
let H = 0;

function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
resize();

// ============================================================
// GAME STATE
// ============================================================

let running = false;
let gameOver = false;
let victory = false;

let keys = {};

let mouse = {
    x: W / 2,
    y: H / 2,
    down: false
};

let player;

let bullets = [];
let enemyBullets = [];
let enemies = [];
let pickups = [];
let evidence = [];
let particles = [];
let walls = [];

let score = 0;

let ammo = 12;
let maxAmmo = 12;
let reserveAmmo = 48;

let reloadTimer = 0;
let fireCooldown = 0;

let boss = null;
let bossActive = false;

let camera = {
    x: 0,
    y: 0
};

const world = {
    width: 2600,
    height: 1800
};

// ============================================================
// INPUT
// ============================================================

window.addEventListener("keydown", function(e) {

    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === "r") {
        reload();
    }

    if (e.key.toLowerCase() === "e") {
        interact();
    }

    if (
        e.key === " " ||
        e.key.startsWith("Arrow")
    ) {
        e.preventDefault();
    }
});

window.addEventListener("keyup", function(e) {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", function(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", function() {
    mouse.down = true;
});

window.addEventListener("mouseup", function() {
    mouse.down = false;
});

// ============================================================
// HELPERS
// ============================================================

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function showMessage(text) {

    if (!message) return;

    message.textContent = text;
    message.style.opacity = "1";

    clearTimeout(showMessage.timer);

    showMessage.timer = setTimeout(function() {
        message.style.opacity = "0";
    }, 1800);
}

// ============================================================
// START GAME
// ============================================================

function startGame() {

    if (!startScreen) return;

    startScreen.style.display = "none";

    running = true;
    gameOver = false;
    victory = false;

    score = 0;

    ammo = maxAmmo;
    reserveAmmo = 48;

    reloadTimer = 0;
    fireCooldown = 0;

    bullets = [];
    enemyBullets = [];
    enemies = [];
    pickups = [];
    evidence = [];
    particles = [];
    walls = [];

    boss = null;
    bossActive = false;

    player = {
        x: world.width / 2,
        y: world.height / 2,
        radius: 18,
        speed: 4,
        health: 100,
        maxHealth: 100,
        invincible: 0
    };

    createWorld();

    updateCamera();
    updateHUD();

    showMessage("INVESTIGATION STARTED");

    requestAnimationFrame(gameLoop);
}

// Make it globally accessible too.
window.startGame = startGame;

// ============================================================
// START BUTTON FIX
// ============================================================

const startButton = document.querySelector("#start button");

if (startButton) {

    startButton.addEventListener("click", function(e) {

        e.preventDefault();

        startGame();

    });
}

// ============================================================
// WORLD CREATION
// ============================================================

function createWorld() {

    // Top-left building
    walls.push(
        { x: 300, y: 250, w: 500, h: 40 },
        { x: 300, y: 250, w: 40, h: 350 },
        { x: 760, y: 250, w: 40, h: 350 }
    );

    // Top-right building
    walls.push(
        { x: 1100, y: 200, w: 600, h: 40 },
        { x: 1100, y: 200, w: 40, h: 400 },
        { x: 1660, y: 200, w: 40, h: 400 }
    );

    // Bottom-left building
    walls.push(
        { x: 400, y: 1000, w: 700, h: 40 },
        { x: 400, y: 1000, w: 40, h: 400 },
        { x: 1060, y: 1000, w: 40, h: 400 }
    );

    // Bottom-right building
    walls.push(
        { x: 1450, y: 1050, w: 600, h: 40 },
        { x: 1450, y: 1050, w: 40, h: 400 },
        { x: 2010, y: 1050, w: 40, h: 400 }
    );

    // Enemies
    for (let i = 0; i < 10; i++) {

        const p = randomSpawnPoint();

        enemies.push({
            x: p.x,
            y: p.y,
            radius: 17,
            health: 40,
            maxHealth: 40,
            speed: random(1.1, 1.7),
            cooldown: random(40, 100),
            type: i % 3 === 0 ? "FBI" : "BIG GAS"
        });
    }

    // Evidence
    for (let i = 0; i < 6; i++) {

        const p = randomSpawnPoint();

        evidence.push({
            x: p.x,
            y: p.y,
            radius: 13,
            collected: false
        });
    }

    // Pickups
    for (let i = 0; i < 6; i++) {

        const p = randomSpawnPoint();

        pickups.push({
            x: p.x,
            y: p.y,
            radius: 12,
            type: i % 2 === 0 ? "ammo" : "health"
        });
    }
}

// ============================================================
// RANDOM SPAWN
// ============================================================

function randomSpawnPoint() {

    let p;

    let attempts = 0;

    do {

        p = {
            x: random(100, world.width - 100),
            y: random(100, world.height - 100)
        };

        attempts++;

        if (attempts > 100) {
            return {
                x: 200,
                y: 200
            };
        }

    } while (
        Math.hypot(
            p.x - world.width / 2,
            p.y - world.height / 2
        ) < 300
    );

    return p;
}

// ============================================================
// PLAYER UPDATE
// ============================================================

function updatePlayer() {

    if (!player) return;

    let dx = 0;
    let dy = 0;

    if (keys["w"]) dy -= 1;
    if (keys["s"]) dy += 1;
    if (keys["a"]) dx -= 1;
    if (keys["d"]) dx += 1;

    if (dx !== 0 || dy !== 0) {

        const length = Math.hypot(dx, dy);

        dx /= length;
        dy /= length;

        const oldX = player.x;
        const oldY = player.y;

        player.x += dx * player.speed;
        player.y += dy * player.speed;

        player.x = clamp(
            player.x,
            player.radius,
            world.width - player.radius
        );

        player.y = clamp(
            player.y,
            player.radius,
            world.height - player.radius
        );

        if (collidesWithWall(player)) {

            player.x = oldX;
            player.y = oldY;
        }
    }

    if (player.invincible > 0) {
        player.invincible--;
    }

    if (fireCooldown > 0) {
        fireCooldown--;
    }

    if (reloadTimer > 0) {

        reloadTimer--;

        if (reloadTimer === 0) {
            finishReload();
        }
    }

    if (mouse.down) {
        shoot();
    }
}

// ============================================================
// SHOOT
// ============================================================

function shoot() {

    if (!running) return;
    if (gameOver || victory) return;
    if (reloadTimer > 0) return;
    if (fireCooldown > 0) return;

    if (ammo <= 0) {

        showMessage("OUT OF AMMO — PRESS R");

        fireCooldown = 20;

        return;
    }

    const target = screenToWorld(
        mouse.x,
        mouse.y
    );

    const angle = Math.atan2(
        target.y - player.y,
        target.x - player.x
    );

    bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 11,
        vy: Math.sin(angle) * 11,
        radius: 5,
        life: 100,
        damage: 20
    });

    ammo--;

    fireCooldown = 9;
}

// ============================================================
// RELOAD
// ============================================================

function reload() {

    if (!running) return;
    if (gameOver || victory) return;
    if (reloadTimer > 0) return;
    if (ammo >= maxAmmo) return;

    if (reserveAmmo <= 0) {

        showMessage("NO RESERVE AMMO");

        return;
    }

    reloadTimer = 50;

    showMessage("RELOADING...");
}

function finishReload() {

    const needed = maxAmmo - ammo;

    const amount = Math.min(
        needed,
        reserveAmmo
    );

    ammo += amount;
    reserveAmmo -= amount;

    showMessage("RELOADED");
}

// ============================================================
// PLAYER BULLETS
// ============================================================

function updateBullets() {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const b = bullets[i];

        b.x += b.vx;
        b.y += b.vy;

        b.life--;

        if (
            b.life <= 0 ||
            b.x < 0 ||
            b.y < 0 ||
            b.x > world.width ||
            b.y > world.height ||
            bulletHitsWall(b)
        ) {

            bullets.splice(i, 1);

            continue;
        }

        let hit = false;

        // Regular enemies
        for (
            let j = enemies.length - 1;
            j >= 0;
            j--
        ) {

            const enemy = enemies[j];

            if (
                distance(b, enemy) <
                b.radius + enemy.radius
            ) {

                enemy.health -= b.damage;

                createParticles(
                    b.x,
                    b.y,
                    5
                );

                bullets.splice(i, 1);

                hit = true;

                if (enemy.health <= 0) {

                    createParticles(
                        enemy.x,
                        enemy.y,
                        20
                    );

                    score += 100;

                    const deadX = enemy.x;
                    const deadY = enemy.y;

                    enemies.splice(j, 1);

                    if (Math.random() < 0.35) {

                        pickups.push({
                            x: deadX,
                            y: deadY,
                            radius: 12,
                            type: "ammo"
                        });
                    }
                }

                break;
            }
        }

        if (hit) continue;

        // Boss
        if (
            bossActive &&
            boss &&
            distance(b, boss) <
            b.radius + boss.radius
        ) {

            boss.health -= b.damage;

            createParticles(
                b.x,
                b.y,
                7
            );

            bullets.splice(i, 1);

            if (boss.health <= 0) {
                defeatBoss();
            }
        }
    }
}

// ============================================================
// ENEMIES
// ============================================================

function updateEnemies() {

    for (const enemy of enemies) {

        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;

        const d = Math.hypot(dx, dy);

        if (d > 130) {

            dx /= d;
            dy /= d;

            const oldX = enemy.x;
            const oldY = enemy.y;

            enemy.x += dx * enemy.speed;
            enemy.y += dy * enemy.speed;

            if (collidesWithWall(enemy)) {

                enemy.x = oldX;
                enemy.y = oldY;
            }
        }

        enemy.cooldown--;

        if (
            enemy.cooldown <= 0 &&
            d < 650
        ) {

            enemyShoot(enemy);

            enemy.cooldown = random(
                70,
                130
            );
        }
    }
}

function enemyShoot(enemy) {

    const angle = Math.atan2(
        player.y - enemy.y,
        player.x - enemy.x
    );

    enemyBullets.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        radius: 6,
        life: 180
    });
}

// ============================================================
// ENEMY BULLETS
// ============================================================

function updateEnemyBullets() {

    for (
        let i = enemyBullets.length - 1;
        i >= 0;
        i--
    ) {

        const b = enemyBullets[i];

        b.x += b.vx;
        b.y += b.vy;

        b.life--;

        if (
            b.life <= 0 ||
            b.x < 0 ||
            b.y < 0 ||
            b.x > world.width ||
            b.y > world.height ||
            bulletHitsWall(b)
        ) {

            enemyBullets.splice(i, 1);

            continue;
        }

        if (
            distance(b, player) <
            b.radius + player.radius
        ) {

            enemyBullets.splice(i, 1);

            damagePlayer(10);
        }
    }
}

// ============================================================
// DAMAGE PLAYER
// ============================================================

function damagePlayer(amount) {

    if (player.invincible > 0) return;

    player.health -= amount;

    player.invincible = 35;

    createParticles(
        player.x,
        player.y,
        10
    );

    if (player.health <= 0) {

        player.health = 0;

        endGame(false);
    }
}

// ============================================================
// INTERACT
// ============================================================

function interact() {

    if (!running) return;
    if (gameOver || victory) return;

    let nearest = null;
    let nearestDistance = Infinity;

    for (const item of evidence) {

        if (item.collected) continue;

        const d = distance(
            player,
            item
        );

        if (
            d < 65 &&
            d < nearestDistance
        ) {

            nearest = item;
            nearestDistance = d;
        }
    }

    if (nearest) {

        nearest.collected = true;

        score += 250;

        const count =
            evidence.filter(
                x => x.collected
            ).length;

        showMessage(
            "EVIDENCE COLLECTED: " +
            count +
            "/6"
        );

        if (
            evidence.every(
                x => x.collected
            )
        ) {

            activateBoss();
        }

        return;
    }

    for (
        let i = pickups.length - 1;
        i >= 0;
        i--
    ) {

        const item = pickups[i];

        if (
            distance(player, item) < 60
        ) {

            if (item.type === "ammo") {

                reserveAmmo += 24;

                showMessage(
                    "AMMO +24"
                );
            }

            if (item.type === "health") {

                player.health =
                    Math.min(
                        player.maxHealth,
                        player.health + 30
                    );

                showMessage(
                    "HEALTH RESTORED"
                );
            }

            pickups.splice(i, 1);

            return;
        }
    }
}

// ============================================================
// BOSS
// ============================================================

function activateBoss() {

    bossActive = true;

    boss = {
        x: world.width - 350,
        y: world.height - 300,
        radius: 55,
        health: 500,
        maxHealth: 500,
        speed: 1.2,
        cooldown: 50
    };

    showMessage(
        "THE GASLORD HAS ARRIVED"
    );
}

function updateBoss() {

    if (!bossActive || !boss) return;

    let dx = player.x - boss.x;
    let dy = player.y - boss.y;

    const d = Math.hypot(dx, dy);

    if (d > 230) {

        dx /= d;
        dy /= d;

        boss.x += dx * boss.speed;
        boss.y += dy * boss.speed;
    }

    boss.cooldown--;

    if (boss.cooldown <= 0) {

        bossShoot();

        boss.cooldown = 45;
    }

    if (
        d <
        boss.radius +
        player.radius +
        10
    ) {

        damagePlayer(15);
    }
}

function bossShoot() {

    const baseAngle = Math.atan2(
        player.y - boss.y,
        player.x - boss.x
    );

    for (let i = -2; i <= 2; i++) {

        const angle =
            baseAngle +
            i * 0.15;

        enemyBullets.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(angle) * 5,
            vy: Math.sin(angle) * 5,
            radius: 7,
            life: 180
        });
    }
}

function defeatBoss() {

    if (!bossActive) return;

    bossActive = false;

    createParticles(
        boss.x,
        boss.y,
        60
    );

    score += 5000;

    showMessage(
        "THE GASLORD HAS BEEN DEFEATED"
    );

    setTimeout(function() {
        endGame(true);
    }, 1200);
}

// ============================================================
// WALL COLLISION
// ============================================================

function collidesWithWall(obj) {

    for (const wall of walls) {

        const closestX = clamp(
            obj.x,
            wall.x,
            wall.x + wall.w
        );

        const closestY = clamp(
            obj.y,
            wall.y,
            wall.y + wall.h
        );

        const dx =
            obj.x - closestX;

        const dy =
            obj.y - closestY;

        if (
            dx * dx +
            dy * dy <
            obj.radius *
            obj.radius
        ) {

            return true;
        }
    }

    return false;
}

function bulletHitsWall(bullet) {

    for (const wall of walls) {

        if (
            bullet.x > wall.x &&
            bullet.x <
                wall.x + wall.w &&
            bullet.y > wall.y &&
            bullet.y <
                wall.y + wall.h
        ) {

            return true;
        }
    }

    return false;
}

// ============================================================
// PARTICLES
// ============================================================

function createParticles(
    x,
    y,
    amount
) {

    for (let i = 0; i < amount; i++) {

        const angle =
            random(0, Math.PI * 2);

        const speed =
            random(1, 5);

        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: random(20, 45),
            size: random(2, 5)
        });
    }
}

function updateParticles() {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        p.vx *= 0.96;
        p.vy *= 0.96;

        p.life--;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// ============================================================
// CAMERA
// ============================================================

function updateCamera() {

    if (!player) return;

    camera.x =
        player.x -
        W / 2;

    camera.y =
        player.y -
        H / 2;

    camera.x = clamp(
        camera.x,
        0,
        Math.max(0, world.width - W)
    );

    camera.y = clamp(
        camera.y,
        0,
        Math.max(0, world.height - H)
    );
}

