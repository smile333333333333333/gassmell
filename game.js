const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const stats = document.getElementById("stats");
const message = document.getElementById("message");

let W = 0;
let H = 0;

function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
resize();

// =====================================================
// GAME STATE
// =====================================================

let running = false;
let gameOver = false;

const world = {
    width: 2600,
    height: 1800
};

let player = null;

let keys = {};

let mouse = {
    x: 0,
    y: 0,
    down: false
};

let bullets = [];
let enemyBullets = [];
let enemies = [];
let evidence = [];
let pickups = [];
let particles = [];
let walls = [];

let score = 0;

let ammo = 12;
const maxAmmo = 12;
let reserveAmmo = 48;

let reloadTimer = 0;
let fireCooldown = 0;

let boss = null;
let bossActive = false;

let camera = {
    x: 0,
    y: 0
};

// =====================================================
// INPUT
// =====================================================

window.addEventListener("keydown", function(e) {

    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === "r") {
        reload();
    }

    if (e.key.toLowerCase() === "e") {
        interact();
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

// =====================================================
// HELPERS
// =====================================================

function random(min, max) {

    return Math.random() * (max - min) + min;

}

function clamp(value, min, max) {

    return Math.max(min, Math.min(max, value));

}

function distance(a, b) {

    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );

}

function messageText(text) {

    message.textContent = text;
    message.style.opacity = "1";

    clearTimeout(messageText.timer);

    messageText.timer = setTimeout(function() {

        message.style.opacity = "0";

    }, 1800);

}

// =====================================================
// START GAME
// =====================================================

function startGame() {

    console.log("GAS: GAME STARTED");

    const start = document.getElementById("start");

    if (start) {
        start.style.display = "none";
    }

    running = true;
    gameOver = false;

    score = 0;

    ammo = maxAmmo;
    reserveAmmo = 48;

    reloadTimer = 0;
    fireCooldown = 0;

    bullets = [];
    enemyBullets = [];
    enemies = [];
    evidence = [];
    pickups = [];
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

    messageText(
        "INVESTIGATION STARTED"
    );

    requestAnimationFrame(gameLoop);

}

// Make absolutely sure the HTML can find it.
window.startGame = startGame;

// =====================================================
// WORLD
// =====================================================

function createWorld() {

    walls = [

        // Top-left building
        {
            x: 300,
            y: 250,
            w: 500,
            h: 40
        },

        {
            x: 300,
            y: 250,
            w: 40,
            h: 350
        },

        {
            x: 760,
            y: 250,
            w: 40,
            h: 350
        },

        // Top-right building
        {
            x: 1100,
            y: 200,
            w: 600,
            h: 40
        },

        {
            x: 1100,
            y: 200,
            w: 40,
            h: 400
        },

        {
            x: 1660,
            y: 200,
            w: 40,
            h: 400
        },

        // Bottom-left building
        {
            x: 400,
            y: 1000,
            w: 700,
            h: 40
        },

        {
            x: 400,
            y: 1000,
            w: 40,
            h: 400
        },

        {
            x: 1060,
            y: 1000,
            w: 40,
            h: 400
        },

        // Bottom-right building
        {
            x: 1450,
            y: 1050,
            w: 600,
            h: 40
        },

        {
            x: 1450,
            y: 1050,
            w: 40,
            h: 400
        },

        {
            x: 2010,
            y: 1050,
            w: 40,
            h: 400
        }

    ];

    // Create enemies
    for (let i = 0; i < 12; i++) {

        const p = spawnPoint();

        enemies.push({

            x: p.x,
            y: p.y,

            radius: 17,

            health: 40,
            maxHealth: 40,

            speed: random(1, 1.6),

            cooldown: random(50, 120),

            type:
                i % 3 === 0
                    ? "FBI"
                    : "BIG GAS"

        });

    }

    // Create evidence
    for (let i = 0; i < 6; i++) {

        const p = spawnPoint();

        evidence.push({

            x: p.x,
            y: p.y,

            radius: 14,

            collected: false

        });

    }

    // Create pickups
    for (let i = 0; i < 8; i++) {

        const p = spawnPoint();

        pickups.push({

            x: p.x,
            y: p.y,

            radius: 13,

            type:
                i % 2 === 0
                    ? "ammo"
                    : "health"

        });

    }

}

// =====================================================
// SPAWN POINT
// =====================================================

function spawnPoint() {

    let p;

    let attempts = 0;

    do {

        p = {

            x: random(
                100,
                world.width - 100
            ),

            y: random(
                100,
                world.height - 100
            )

        };

        attempts++;

    } while (

        Math.hypot(

            p.x - world.width / 2,
            p.y - world.height / 2

        ) < 300

        && attempts < 100

    );

    return p;

}

// =====================================================
// PLAYER
// =====================================================

function updatePlayer() {

    if (!player) return;

    let dx = 0;
    let dy = 0;

    if (keys["w"]) dy -= 1;
    if (keys["s"]) dy += 1;
    if (keys["a"]) dx -= 1;
    if (keys["d"]) dx += 1;

    if (dx !== 0 || dy !== 0) {

        const length =
            Math.hypot(dx, dy);

        dx /= length;
        dy /= length;

        const oldX = player.x;
        const oldY = player.y;

        player.x +=
            dx * player.speed;

        player.y +=
            dy * player.speed;

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

        if (
            wallCollision(player)
        ) {

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

// =====================================================
// SHOOTING
// =====================================================

function shoot() {

    if (!running) return;

    if (gameOver) return;

    if (reloadTimer > 0) return;

    if (fireCooldown > 0) return;

    if (ammo <= 0) {

        messageText(
            "OUT OF AMMO — PRESS R"
        );

        fireCooldown = 20;

        return;

    }

    const target =
        screenToWorld(
            mouse.x,
            mouse.y
        );

    const angle =
        Math.atan2(

            target.y - player.y,
            target.x - player.x

        );

    bullets.push({

        x: player.x,
        y: player.y,

        vx:
            Math.cos(angle) * 11,

        vy:
            Math.sin(angle) * 11,

        radius: 5,

        life: 100,

        damage: 20

    });

    ammo--;

    fireCooldown = 9;

}

// =====================================================
// RELOAD
// =====================================================

function reload() {

    if (!running) return;

    if (reloadTimer > 0) return;

    if (ammo >= maxAmmo) return;

    if (reserveAmmo <= 0) {

        messageText(
            "NO RESERVE AMMO"
        );

        return;

    }

    reloadTimer = 50;

    messageText(
        "RELOADING..."
    );

}

function finishReload() {

    const needed =
        maxAmmo - ammo;

    const amount =
        Math.min(
            needed,
            reserveAmmo
        );

    ammo += amount;

    reserveAmmo -= amount;

    messageText(
        "RELOADED"
    );

}

// =====================================================
// BULLETS
// =====================================================

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

            bulletWallCollision(b)

        ) {

            bullets.splice(i, 1);

            continue;

        }

        let hit = false;

        // Enemy collision
        for (
            let j = enemies.length - 1;
            j >= 0;
            j--
        ) {

            const enemy =
                enemies[j];

            if (

                distance(b, enemy) <

                b.radius +
                enemy.radius

            ) {

                enemy.health -=
                    b.damage;

                particles(
                    b.x,
                    b.y,
                    6
                );

                bullets.splice(i, 1);

                hit = true;

                if (
                    enemy.health <= 0
                ) {

                    particles(
                        enemy.x,
                        enemy.y,
                        20
                    );

                    score += 100;

                    const deadX =
                        enemy.x;

                    const deadY =
                        enemy.y;

                    enemies.splice(
                        j,
                        1
                    );

                    if (
                        Math.random() < 0.35
                    ) {

                        pickups.push({

                            x: deadX,
                            y: deadY,

                            radius: 13,

                            type: "ammo"

                        });

                    }

                }

                break;

            }

        }

        if (hit) continue;

        // Boss collision
        if (

            bossActive &&
            boss &&

            distance(b, boss) <

            b.radius +
            boss.radius

        ) {

            boss.health -=
                b.damage;

            particles(
                b.x,
                b.y,
                7
            );

            bullets.splice(i, 1);

            if (
                boss.health <= 0
            ) {

                defeatBoss();

            }

        }

    }

}

// =====================================================
// ENEMIES
// =====================================================

function updateEnemies() {

    for (const enemy of enemies) {

        let dx =
            player.x -
            enemy.x;

        let dy =
            player.y -
            enemy.y;

        const d =
            Math.hypot(dx, dy);

        if (d > 150) {

            dx /= d;
            dy /= d;

            const oldX =
                enemy.x;

            const oldY =
                enemy.y;

            enemy.x +=
                dx * enemy.speed;

            enemy.y +=
                dy * enemy.speed;

            if (
                wallCollision(enemy)
            ) {

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

            enemy.cooldown =
                random(70, 130);

        }

    }

}

// =====================================================
// ENEMY SHOOT
// =====================================================

function enemyShoot(enemy) {

    const angle =
        Math.atan2(

            player.y - enemy.y,
            player.x - enemy.x

        );

    enemyBullets.push({

        x: enemy.x,
        y: enemy.y,

        vx:
            Math.cos(angle) * 5,

        vy:
            Math.sin(angle) * 5,

        radius: 6,

        life: 180

    });

}

// =====================================================
// ENEMY BULLETS
// =====================================================

function updateEnemyBullets() {

    for (
        let i = enemyBullets.length - 1;
        i >= 0;
        i--
    ) {

        const b =
            enemyBullets[i];

        b.x += b.vx;
        b.y += b.vy;

        b.life--;

        if (

            b.life <= 0 ||

            b.x < 0 ||
            b.y < 0 ||

            b.x > world.width ||
            b.y > world.height ||

            bulletWallCollision(b)

        ) {

            enemyBullets.splice(
                i,
                1
            );

            continue;

        }

        if (

            distance(
                b,
                player
            ) <

            b.radius +
            player.radius

        ) {

            enemyBullets.splice(
                i,
                1
            );

            damagePlayer(10);

        }

    }

}

// =====================================================
// PLAYER DAMAGE
// =====================================================

function damagePlayer(amount) {

    if (
        player.invincible > 0
    ) return;

    player.health -= amount;

    player.invincible = 35;

    particles(
        player.x,
        player.y,
        10
    );

    if (
        player.health <= 0
    ) {

        player.health = 0;

        endGame(false);

    }

}

// =====================================================
// INTERACT
// =====================================================

function interact() {

    if (!running) return;

    if (gameOver) return;

    // Evidence
    for (const item of evidence) {

        if (item.collected) {
            continue;
        }

        if (
            distance(
                player,
                item
            ) < 65
        ) {

            item.collected = true;

            score += 250;

            const collected =
                evidence.filter(
                    e => e.collected
                ).length;

            messageText(

                "EVIDENCE " +
                collected +
                "/6 COLLECTED"

            );

            if (
                collected === 6
            ) {

                activateBoss();

            }

            return;

        }

    }

    // Pickups
    for (
        let i = pickups.length - 1;
        i >= 0;
        i--
    ) {

        const item =
            pickups[i];

        if (
            distance(
                player,
                item
            ) < 60
        ) {

            if (
                item.type === "ammo"
            ) {

                reserveAmmo += 24;

                messageText(
                    "AMMO +24"
                );

            } else {

                player.health =
                    Math.min(

                        player.maxHealth,

                        player.health + 30

                    );

                messageText(
                    "HEALTH RESTORED"
                );

            }

            pickups.splice(
                i,
                1
            );

            return;

        }

    }

}

// =====================================================
// BOSS
// =====================================================

function activateBoss() {

    bossActive = true;

    boss = {

        x:
            world.width - 350,

        y:
            world.height - 300,

        radius: 55,

        health: 500,

        maxHealth: 500,

        speed: 1.2,

        cooldown: 40

    };

    messageText(
        "THE GASLORD HAS ARRIVED"
    );

}

function updateBoss() {

    if (
        !bossActive ||
        !boss
    ) return;

    let dx =
        player.x -
        boss.x;

    let dy =
        player.y -
        boss.y;

    const d =
        Math.hypot(dx, dy);

    if (d > 230) {

        dx /= d;
        dy /= d;

        boss.x +=
            dx * boss.speed;

        boss.y +=
            dy * boss.speed;

    }

    boss.cooldown--;

    if (
        boss.cooldown <= 0
    ) {

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

    const baseAngle =
        Math.atan2(

            player.y - boss.y,
            player.x - boss.x

        );

    for (
        let i = -2;
        i <= 2;
        i++
    ) {

        const angle =
            baseAngle +
            i * 0.15;

        enemyBullets.push({

            x: boss.x,
            y: boss.y,

            vx:
                Math.cos(angle) * 5,

            vy:
                Math.sin(angle) * 5,

            radius: 7,

            life: 180

        });

    }

}

function defeatBoss() {

    bossActive = false;

    particles(
        boss.x,
        boss.y,
        60
    );

    score += 5000;

    messageText(
        "THE GASLORD HAS BEEN DEFEATED!"
    );

    setTimeout(
        function() {
            endGame(true);
        },
        1200
    );

}

// =====================================================
// WALL COLLISION
// =====================================================

function wallCollision(obj) {

    for (const wall of walls) {

        const closestX =
            clamp(
                obj.x,
                wall.x,
                wall.x + wall.w
            );

        const closestY =
            clamp(
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

function bulletWallCollision(bullet) {

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

// =====================================================
// PARTICLES
// =====================================================

function particles(
    x,
    y,
