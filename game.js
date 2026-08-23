// ============================================================
// GAS: THE TRUTH
// FILE 2: game.js
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

let world = {
    width: 2600,
    height: 1800
};

// ============================================================
// INPUT
// ============================================================

window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === "r") {
        reload();
    }

    if (e.key.toLowerCase() === "e") {
        interact();
    }

    if (gameOver && e.key.toLowerCase() === "enter") {
        startGame();
    }
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", () => {
    mouse.down = true;
});

window.addEventListener("mouseup", () => {
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
    message.textContent = text;
    message.style.opacity = "1";

    clearTimeout(showMessage.timer);

    showMessage.timer = setTimeout(() => {
        message.style.opacity = "0";
    }, 1800);
}

// ============================================================
// START GAME
// ============================================================

function startGame() {
    startScreen.style.display = "none";

    running = true;
    gameOver = false;
    victory = false;

    score = 0;
    ammo = maxAmmo;
    reserveAmmo = 48;

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

    showMessage("INVESTIGATION STARTED");

    requestAnimationFrame(gameLoop);
}

// ============================================================
// WORLD
// ============================================================

function createWorld() {

    // Buildings / walls
    walls.push(
        {x:300, y:250, w:500, h:40},
        {x:300, y:250, w:40, h:350},
        {x:760, y:250, w:40, h:350},

        {x:1100, y:200, w:600, h:40},
        {x:1100, y:200, w:40, h:400},
        {x:1660, y:200, w:40, h:400},

        {x:400, y:1000, w:700, h:40},
        {x:400, y:1000, w:40, h:400},
        {x:1060, y:1000, w:40, h:400},

        {x:1450, y:1050, w:600, h:40},
        {x:1450, y:1050, w:40, h:400},
        {x:2010, y:1050, w:40, h:400}
    );

    // Regular enemies
    for (let i = 0; i < 10; i++) {
        let p = randomSpawnPoint();

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
        let p = randomSpawnPoint();

        evidence.push({
            x: p.x,
            y: p.y,
            radius: 13,
            collected: false
        });
    }

    // Weapon pickups
    for (let i = 0; i < 5; i++) {
        let p = randomSpawnPoint();

        pickups.push({
            x: p.x,
            y: p.y,
            radius: 12,
            type: i % 2 === 0 ? "ammo" : "health"
        });
    }
}

function randomSpawnPoint() {
    let p;

    do {
        p = {
            x: random(100, world.width - 100),
            y: random(100, world.height - 100)
        };
    } while (
        Math.hypot(
            p.x - world.width / 2,
            p.y - world.height / 2
        ) < 300
    );

    return p;
}

// ============================================================
// PLAYER
// ============================================================

function updatePlayer() {

    let dx = 0;
    let dy = 0;

    if (keys["w"]) dy--;
    if (keys["s"]) dy++;
    if (keys["a"]) dx--;
    if (keys["d"]) dx++;

    if (dx !== 0 || dy !== 0) {
        let length = Math.hypot(dx, dy);

        dx /= length;
        dy /= length;

        let oldX = player.x;
        let oldY = player.y;

        player.x += dx * player.speed;
        player.y += dy * player.speed;

        player.x = clamp(player.x, player.radius, world.width - player.radius);
        player.y = clamp(player.y, player.radius, world.height - player.radius);

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
// SHOOTING
// ============================================================

function shoot() {

    if (!running || gameOver || victory) return;
    if (reloadTimer > 0) return;
    if (fireCooldown > 0) return;

    if (ammo <= 0) {
        showMessage("OUT OF AMMO — PRESS R");
        fireCooldown = 20;
        return;
    }

    let target = screenToWorld(mouse.x, mouse.y);

    let angle = Math.atan2(
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

function reload() {

    if (!running || gameOver || victory) return;
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

    let needed = maxAmmo - ammo;
    let amount = Math.min(needed, reserveAmmo);

    ammo += amount;
    reserveAmmo -= amount;

    showMessage("RELOADED");
}

// ============================================================
// BULLETS
// ============================================================

function updateBullets() {

    for (let i = bullets.length - 1; i >= 0; i--) {

        let b = bullets[i];

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

        for (let j = enemies.length - 1; j >= 0; j--) {

            let e = enemies[j];

            if (distance(b, e) < b.radius + e.radius) {

                e.health -= b.damage;

                createParticles(b.x, b.y, 5);

                bullets.splice(i, 1);

                if (e.health <= 0) {
                    createParticles(e.x, e.y, 20);
                    score += 100;
                    enemies.splice(j, 1);

                    if (Math.random() < 0.3) {
                        pickups.push({
                            x: e.x,
                            y: e.y,
                            radius: 12,
                            type: "ammo"
                        });
                    }
                }

                break;
            }
        }

        if (bossActive && boss) {

            if (distance(b, boss) < b.radius + boss.radius) {

                boss.health -= b.damage;

                createParticles(b.x, b.y, 7);

                bullets.splice(i, 1);

                if (boss.health <= 0) {
                    defeatBoss();
                }
            }
        }
    }
}

// ============================================================
// ENEMY AI
// ============================================================

function updateEnemies() {

    for (let e of enemies) {

        let dx = player.x - e.x;
        let dy = player.y - e.y;

        let d = Math.hypot(dx, dy);

        if (d > 130) {

            dx /= d;
            dy /= d;

            let oldX = e.x;
            let oldY = e.y;

            e.x += dx * e.speed;
            e.y += dy * e.speed;

            if (collidesWithWall(e)) {
                e.x = oldX;
                e.y = oldY;
            }
        }

        e.cooldown--;

        if (e.cooldown <= 0 && d < 650) {
            enemyShoot(e);
            e.cooldown = random(70, 130);
        }
    }
}

function enemyShoot(e) {

    let angle = Math.atan2(
        player.y - e.y,
        player.x - e.x
    );

    enemyBullets.push({
        x: e.x,
        y: e.y,
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

    for (let i = enemyBullets.length - 1; i >= 0; i--) {

        let b = enemyBullets[i];

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

            continue;
        }
    }
}

// ============================================================
// DAMAGE
// ============================================================

function damagePlayer(amount) {

    if (player.invincible > 0) return;

    player.health -= amount;
    player.invincible = 35;

    createParticles(player.x, player.y, 10);

    if (player.health <= 0) {
        player.health = 0;
        endGame(false);
    }
}

// ============================================================
// PICKUPS / INTERACTION
// ============================================================

function interact() {

    if (!running || gameOver || victory) return;

    let nearestEvidence = null;
    let nearestDistance = Infinity;

    for (let item of evidence) {

        if (item.collected) continue;

        let d = distance(player, item);

        if (d < 65 && d < nearestDistance) {
            nearestEvidence = item;
            nearestDistance = d;
        }
    }

    if (nearestEvidence) {

        nearestEvidence.collected = true;

        score += 250;

        showMessage(
            "EVIDENCE COLLECTED: " +
            evidence.filter(x => x.collected).length +
            "/6"
        );

        if (evidence.every(x => x.collected)) {
            activateBoss();
        }

        return;
    }

    for (let i = pickups.length - 1; i >= 0; i--) {

        let item = pickups[i];

        if (distance(player, item) < 60) {

            if (item.type === "ammo") {
                reserveAmmo += 24;
                showMessage("AMMO +24");
            }

            if (item.type === "health") {
                player.health = Math.min(
                    player.maxHealth,
                    player.health + 30
                );

                showMessage("HEALTH RESTORED");
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

    showMessage("THE GASLORD HAS ARRIVED");
}

function updateBoss() {

    if (!bossActive || !boss) return;

    let dx = player.x - boss.x;
    let dy = player.y - boss.y;

    let d = Math.hypot(dx, dy);

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

    if (d < boss.radius + player.radius + 10) {
        damagePlayer(15);
    }
}

function bossShoot() {

    let baseAngle = Math.atan2(
        player.y - boss.y,
        player.x - boss.x
    );

    for (let i = -2; i <= 2; i++) {

        let angle = baseAngle + i * 0.15;

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

    bossActive = false;

    createParticles(boss.x, boss.y, 60);

    score += 5000;

    showMessage("THE GASLORD HAS BEEN DEFEATED");

    setTimeout(() => {
        endGame(true);
    }, 1200);
}

// ============================================================
// COLLISION
// ============================================================

function collidesWithWall(obj) {

    for (let wall of walls) {

        let closestX = clamp(
            obj.x,
            wall.x,
            wall.x + wall.w
        );

        let closestY = clamp(
            obj.y,
            wall.y,
            wall.y + wall.h
        );

        let dx = obj.x - closestX;
        let dy = obj.y - closestY;

        if (
            dx * dx +
            dy * dy <
            obj.radius * obj.radius
        ) {
            return true;
        }
    }

    return false;
}

function bulletHitsWall(b) {

    for (let wall of walls) {

        if (
            b.x > wall.x &&
            b.x < wall.x + wall.w &&
            b.y > wall.y &&
            b.y < wall.y + wall.h
        ) {
            return true;
        }
    }

    return false;
}

// ============================================================
// PARTICLES
// ============================================================

function createParticles(x, y, amount) {

    for (let i = 0; i < amount; i++) {

        let angle = random(0, Math.PI * 2);
        let speed = random(1, 5);

        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: random(20, 45),
            size: random(2, 5)
        });
    }
}

function updateParticles() {

    for (let i = particles.length - 1; i >= 0; i--) {

        let p = particles[i];

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

    camera.x = player.x - W / 2;
    camera.y = player.y - H / 2;

    camera.x = clamp(
        camera.x,
        0,
        world.width - W
    );

    camera.y = clamp(
        camera.y,
        0,
        world.height - H
    );
}

function screenToWorld(x, y) {

    return {
        x: x + camera.x,
        y: y + camera.y
    };
}

// ============================================================
// DRAW WORLD
// ============================================================

function drawWorld() {

    ctx.fillStyle = "#111820";
    ctx.fillRect(
        0,
        0,
        world.width,
        world.height
    );

    // Floor grid
    ctx.strokeStyle = "#18232d";
    ctx.lineWidth = 1;

    for (let x = 0; x < world.width; x += 80) {

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, world.height);
        ctx.stroke();
    }

    for (let y = 0; y < world.height; y += 80) {

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(world.width, y);
        ctx.stroke();
    }

    // Walls
    for (let wall of walls) {

        ctx.fillStyle = "#29333e";
        ctx.fillRect(
            wall.x,
            wall.y,
            wall.w,
            wall.h
        );

        ctx.strokeStyle = "#53606d";
        ctx.strokeRect(
            wall.x,
            wall.y,
            wall.w,
            wall.h
        );
    }

    // Gas station decorations
    drawStation();
}

function drawStation() {

    // Main station sign
    ctx.fillStyle = "#202a35";
    ctx.fillRect(80, 80, 230, 110);

    ctx.strokeStyle = "#77818c";
    ctx.strokeRect(80, 80, 230, 110);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 26px Arial";
    ctx.fillText("BIG GAS", 115, 125);

    ctx.font = "16px Arial";
    ctx.fillText("WE DEFINITELY", 105, 155);
    ctx.fillText("AREN'T HIDING ANYTHING", 90, 175);

    // Gas pumps
    for (let i = 0; i < 4; i++) {

        let x = 850 + i * 95;

        ctx.fillStyle = "#303943";
        ctx.fillRect(x, 500, 55, 90);

        ctx.fillStyle = "#8d99a6";
        ctx.fillRect(x + 10, 510, 35, 20);

        ctx.fillStyle = "#555";
        ctx.fillRect(x + 22, 530, 10, 40);
    }
}

// ============================================================
// DRAW PLAYER
// ============================================================

function drawPlayer() {

    if (
        player.invincible > 0 &&
        Math.floor(player.invincible / 4) % 2 === 0
    ) {
        return;
    }

    ctx.save();

    ctx.translate(player.x, player.y);

    let target = screenToWorld(mouse.x, mouse.y);

    let angle = Math.atan2(
        target.y - player.y,
        target.x - player.x
    );

    ctx.rotate(angle);

    // Body
    ctx.fillStyle = "#4aa3ff";
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Weapon
    ctx.fillStyle = "#111";
    ctx.fillRect(8, -5, 27, 10);

    ctx.restore();
}

// ============================================================
// DRAW ENEMIES
// ============================================================

function drawEnemies() {

    for (let e of enemies) {

        ctx.fillStyle =
            e.type === "FBI"
                ? "#5274a8"
                : "#d18b32";

        ctx.beginPath();
        ctx.arc(
            e.x,
            e.y,
            e.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Hea
