

/* =====================================================
   CONFIGURATION
===================================================== */

const CONFIG = {
    laneWidth: 3,
    gravity: -25,
    jumpPower: 11,
    baseSpeed: 10,
    maxSpeed: 25,
    obstacleDistance: 30,
    coinDistance: 20
};

/*
   Masukkan URL Google Apps Script Web App
   setelah membuat backend Google Sheets.

   Contoh:
   const GOOGLE_SHEETS_API =
       "https://script.google.com/macros/s/XXXX/exec";
*/

const GOOGLE_SHEETS_API = "";

/* =====================================================
   GAME STATE
===================================================== */

let gameRunning = false;
let gamePaused = false;

let score = 0;
let coins = 0;
let level = 1;

let distance = 0;
let speed = CONFIG.baseSpeed;

let playerName = "Player";

let velocityY = 0;
let isGrounded = true;

let currentLane = 0;

let obstacles = [];
let collectibles = [];

let lastTime = 0;

/* =====================================================
   THREE.JS
===================================================== */

let scene;
let camera;
let renderer;

let snake;
let snakeHead;

const snakeSegments = [];

/* =====================================================
   INIT
===================================================== */

function init() {

    createScene();
    createCamera();
    createRenderer();
    createLights();

    createWorld();
    createSnake();

    setupControls();
    setupUI();

    animate();
}

/* =====================================================
   SCENE
===================================================== */

function createScene() {

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x071018);

    scene.fog = new THREE.Fog(
        0x071018,
        30,
        150
    );
}

/* =====================================================
   CAMERA
===================================================== */

function createCamera() {

    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        300
    );

    camera.position.set(
        0,
        5,
        10
    );

    camera.lookAt(
        0,
        1,
        -10
    );
}

/* =====================================================
   RENDERER
===================================================== */

function createRenderer() {

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 1.5)
    );

    document
        .getElementById("game-container")
        .appendChild(renderer.domElement);
}

/* =====================================================
   LIGHT
===================================================== */

function createLights() {

    const ambient = new THREE.AmbientLight(
        0xffffff,
        1.5
    );

    scene.add(ambient);

    const directional = new THREE.DirectionalLight(
        0xffffff,
        2
    );

    directional.position.set(
        10,
        20,
        10
    );

    scene.add(directional);
}

/* =====================================================
   WORLD
===================================================== */

function createWorld() {

    // Ground

    const groundGeometry =
        new THREE.BoxGeometry(
            12,
            0.5,
            200
        );

    const groundMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x15251b
        });

    const ground =
        new THREE.Mesh(
            groundGeometry,
            groundMaterial
        );

    ground.position.y = -0.25;

    ground.position.z = -80;

    scene.add(ground);

    // Lane markings

    for (let x of [-1.5, 1.5]) {

        const lineGeometry =
            new THREE.BoxGeometry(
                0.08,
                0.03,
                200
            );

        const lineMaterial =
            new THREE.MeshBasicMaterial({
                color: 0x4a4a4a
            });

        const line =
            new THREE.Mesh(
                lineGeometry,
                lineMaterial
            );

        line.position.x = x;

        line.position.y = 0.02;

        line.position.z = -80;

        scene.add(line);
    }
}

/* =====================================================
   SNAKE
===================================================== */

function createSnake() {

    snake = new THREE.Group();

    /* HEAD */

    const headGeometry =
        new THREE.SphereGeometry(
            0.65,
            12,
            12
        );

    const headMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x27e36f,
            roughness: 0.4
        });

    snakeHead =
        new THREE.Mesh(
            headGeometry,
            headMaterial
        );

    snakeHead.position.y = 0.65;

    snake.add(snakeHead);

    /* EYES */

    const eyeGeometry =
        new THREE.SphereGeometry(
            0.1,
            8,
            8
        );

    const eyeMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xffffff
        });

    const eye1 =
        new THREE.Mesh(
            eyeGeometry,
            eyeMaterial
        );

    const eye2 =
        new THREE.Mesh(
            eyeGeometry,
            eyeMaterial
        );

    eye1.position.set(
        -0.22,
        0.85,
        -0.48
    );

    eye2.position.set(
        0.22,
        0.85,
        -0.48
    );

    snake.add(
        eye1,
        eye2
    );

    /* BODY */

    for (let i = 0; i < 6; i++) {

        const geometry =
            new THREE.SphereGeometry(
                0.48 - i * 0.035,
                10,
                10
            );

        const material =
            new THREE.MeshStandardMaterial({
                color: 0x1fbd5b
            });

        const segment =
            new THREE.Mesh(
                geometry,
                material
            );

        segment.position.set(
            0,
            0.48,
            0.7 + i * 0.65
        );

        snake.add(segment);

        snakeSegments.push(segment);
    }

    snake.position.set(
        0,
        0,
        5
    );

    scene.add(snake);
}

/* =====================================================
   MOVE LEFT
===================================================== */

function moveLeft() {

    if (!gameRunning || gamePaused)
        return;

    currentLane--;

    currentLane =
        Math.max(-1, currentLane);

    moveToLane();
}

/* =====================================================
   MOVE RIGHT
===================================================== */

function moveRight() {

    if (!gameRunning || gamePaused)
        return;

    currentLane++;

    currentLane =
        Math.min(1, currentLane);

    moveToLane();
}

/* =====================================================
   LANE MOVEMENT
===================================================== */

function moveToLane() {

    const targetX =
        currentLane *
        CONFIG.laneWidth;

    snake.position.x +=
        (targetX - snake.position.x) * 0.25;
}

/* =====================================================
   JUMP
===================================================== */

function jump() {

    if (!gameRunning || gamePaused)
        return;

    if (!isGrounded)
        return;

    velocityY =
        CONFIG.jumpPower;

    isGrounded = false;
}

/* =====================================================
   PLAYER UPDATE
===================================================== */

function updatePlayer(delta) {

    velocityY +=
        CONFIG.gravity * delta;

    snake.position.y +=
        velocityY * delta;

    if (snake.position.y <= 0) {

        snake.position.y = 0;

        velocityY = 0;

        isGrounded = true;
    }

    // Snake animation

    const time = performance.now() * 0.005;

    snakeHead.rotation.z =
        Math.sin(time) * 0.04;

    // Body follows head

    snakeSegments.forEach(
        (segment, index) => {

            const targetZ =
                snake.position.z +
                0.7 +
                index * 0.65;

            segment.position.z +=
                (targetZ - segment.position.z) * 0.15;

            segment.position.x +=
                (snake.position.x -
                segment.position.x) * 0.15;
        }
    );
}

/* =====================================================
   OBSTACLE
===================================================== */

function spawnObstacle() {

    const geometry =
        new THREE.BoxGeometry(
            1.8,
            2,
            1.5
        );

    const material =
        new THREE.MeshStandardMaterial({
            color: 0xe84848
        });

    const obstacle =
        new THREE.Mesh(
            geometry,
            material
        );

    const lane =
        Math.floor(
            Math.random() * 3
        ) - 1;

    obstacle.position.x =
        lane * CONFIG.laneWidth;

    obstacle.position.y =
        1;

    obstacle.position.z =
        snake.position.z - 100;

    scene.add(obstacle);

    obstacles.push(obstacle);
}

/* =====================================================
   COIN
===================================================== */

function spawnCoin() {

    const geometry =
        new THREE.TorusGeometry(
            0.35,
            0.12,
            8,
            16
        );

    const material =
        new THREE.MeshStandardMaterial({
            color: 0xffd83d,
            emissive: 0x5a4200
        });

    const coin =
        new THREE.Mesh(
            geometry,
            material
        );

    const lane =
        Math.floor(
            Math.random() * 3
        ) - 1;

    coin.position.x =
        lane * CONFIG.laneWidth;

    coin.position.y =
        1;

    coin.position.z =
        snake.position.z - 80;

    scene.add(coin);

    collectibles.push(coin);
}

/* =====================================================
   OBJECT UPDATE
===================================================== */

function updateObjects(delta) {

    const movement =
        speed * delta;

    obstacles.forEach(
        obstacle => {

            obstacle.position.z += movement;

            obstacle.rotation.y +=
                delta;
        }
    );

    collectibles.forEach(
        coin => {

            coin.position.z += movement;

            coin.rotation.x +=
                delta * 4;

            coin.rotation.y +=
                delta * 5;
        }
    );

    obstacles =
        obstacles.filter(
            obstacle => {

                if (
                    obstacle.position.z >
                    snake.position.z + 10
                ) {

                    scene.remove(
                        obstacle
                    );

                    obstacle.geometry.dispose();
                    obstacle.material.dispose();

                    return false;
                }

                return true;
            }
        );

    collectibles =
        collectibles.filter(
            coin => {

                if (
                    coin.position.z >
                    snake.position.z + 10
                ) {

                    scene.remove(coin);

                    coin.geometry.dispose();
                    coin.material.dispose();

                    return false;
                }

                return true;
            }
        );
}

/* =====================================================
   COLLISION
===================================================== */

function checkCollisions() {

    const playerBox =
        new THREE.Box3()
            .setFromObject(snakeHead);

    /* OBSTACLES */

    for (const obstacle of obstacles) {

        const obstacleBox =
            new THREE.Box3()
                .setFromObject(obstacle);

        if (
            playerBox.intersectsBox(
                obstacleBox
            )
        ) {

            gameOver();

            return;
        }
    }

    /* COINS */

    collectibles =
        collectibles.filter(
            coin => {

                const coinBox =
                    new THREE.Box3()
                        .setFromObject(coin);

                if (
                    playerBox.intersectsBox(
                        coinBox
                    )
                ) {

                    coins += 1;

                    score += 100;

                    updateUI();

                    scene.remove(coin);

                    coin.geometry.dispose();
                    coin.material.dispose();

                    return false;
                }

                return true;
            }
        );
}

/* =====================================================
   SCORE
===================================================== */

function updateGameProgress(delta) {

    distance +=
        speed * delta;

    score =
        Math.floor(distance * 2) +
        coins * 100;

    level =
        Math.floor(distance / 150) + 1;

    speed =
        Math.min(
            CONFIG.baseSpeed +
            level * 1.2,
            CONFIG.maxSpeed
        );

    updateUI();
}

/* =====================================================
   UI
===================================================== */

function updateUI() {

    document.getElementById("score")
        .textContent = score;

    document.getElementById("coins")
        .textContent = coins;

    document.getElementById("level")
        .textContent = level;
}

/* =====================================================
   CAMERA
===================================================== */

function updateCamera() {

    const targetX =
        snake.position.x;

    camera.position.x +=
        (targetX - camera.position.x) *
        0.08;

    camera.position.y +=
        (5.2 - camera.position.y) *
        0.08;

    camera.position.z =
        snake.position.z + 10;

    camera.lookAt(
        snake.position.x,
        1,
        snake.position.z - 15
    );
}

/* =====================================================
   START GAME
===================================================== */

function startGame() {

    playerName =
        document.getElementById(
            "playerName"
        ).value.trim() ||
        "Player";

    score = 0;
    coins = 0;
    level = 1;
    distance = 0;

    speed =
        CONFIG.baseSpeed;

    currentLane = 0;

    snake.position.set(
        0,
        0,
        5
    );

    velocityY = 0;

    isGrounded = true;

    obstacles.forEach(
        object => scene.remove(object)
    );

    collectibles.forEach(
        object => scene.remove(object)
    );

    obstacles = [];
    collectibles = [];

    gameRunning = true;
    gamePaused = false;

    document
        .getElementById("menu")
        .classList.add("hidden");

    document
        .getElementById("gameOver")
        .classList.add("hidden");

    document
        .getElementById("pauseScreen")
        .classList.add("hidden");

    updateUI();
}

/* =====================================================
   GAME OVER
===================================================== */

function gameOver() {

    gameRunning = false;

    document.getElementById(
        "finalScore"
    ).textContent = score;

    document.getElementById(
        "finalCoins"
    ).textContent = coins;

    document.getElementById(
        "finalLevel"
    ).textContent = level;

    document
        .getElementById("gameOver")
        .classList.remove("hidden");

    saveHighScore();

    saveScoreOnline();
}

/* =====================================================
   LOCAL HIGH SCORE
===================================================== */

function saveHighScore() {

    const oldScore =
        Number(
            localStorage.getItem(
                "snakeJumpHighScore"
            ) || 0
        );

    if (score > oldScore) {

        localStorage.setItem(
            "snakeJumpHighScore",
            score
        );
    }
}

/* =====================================================
   GOOGLE SHEETS
===================================================== */

async function saveScoreOnline() {

    if (!GOOGLE_SHEETS_API)
        return;

    try {

        await fetch(
            GOOGLE_SHEETS_API,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body: JSON.stringify({
                    player_name: playerName,
                    score: score,
                    distance:
                        Math.floor(distance),
                    coins: coins,
                    level: level,
                    created_at:
                        new Date().toISOString()
                })
            }
        );

    } catch (error) {

        console.log(
            "Leaderboard offline"
        );
    }
}

/* =====================================================
   LEADERBOARD
===================================================== */

async function loadLeaderboard() {

    const list =
        document.getElementById(
            "leaderboardList"
        );

    if (!GOOGLE_SHEETS_API) {

        list.innerHTML =
            "<p>Leaderboard belum dikonfigurasi.</p>";

        return;
    }

    try {

        const response =
            await fetch(
                GOOGLE_SHEETS_API
            );

        const data =
            await response.json();

        list.innerHTML = "";

        data.forEach(
            (player, index) => {

                const row =
                    document.createElement(
                        "div"
                    );

                row.className = "rank";

                row.innerHTML = `
                    <span>
                        #${index + 1}
                        ${escapeHTML(
                            player.player_name
                        )}
                    </span>

                    <strong>
                        ${player.score}
                    </strong>
                `;

                list.appendChild(row);
            }
        );

    } catch (error) {

        list.innerHTML =
            "<p>Leaderboard offline.</p>";
    }
}

/* =====================================================
   XSS PROTECTION
===================================================== */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

/* =====================================================
   PAUSE
===================================================== */

function togglePause() {

    if (!gameRunning)
        return;

    gamePaused =
        !gamePaused;

    document
        .getElementById(
            "pauseScreen"
        )
        .classList.toggle(
            "hidden",
            !gamePaused
        );
}

/* =====================================================
   CONTROLS
===================================================== */

function setupControls() {

    window.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "ArrowLeft"
            ) {
                moveLeft();
            }

            if (
                event.key === "ArrowRight"
            ) {
                moveRight();
            }

            if (
                event.key === "ArrowUp" ||
                event.key === " "
            ) {

                event.preventDefault();

                jump();
            }

            if (
                event.key.toLowerCase() === "p"
            ) {
                togglePause();
            }
        }
    );

    document
        .getElementById("leftButton")
        .addEventListener(
            "touchstart",
            event => {

                event.preventDefault();

                moveLeft();
            }
        );

    document
        .getElementById("rightButton")
        .addEventListener(
            "touchstart",
            event => {

                event.preventDefault();

                moveRight();
            }
        );

    document
        .getElementById("jumpButton")
        .addEventListener(
            "touchstart",
            event => {

                event.preventDefault();

                jump();
            }
        );

    /* SWIPE */

    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener(
        "touchstart",
        event => {

            const touch =
                event.touches[0];

            touchStartX =
                touch.clientX;

            touchStartY =
                touch.clientY;
        },
        {
            passive: true
        }
    );

    window.addEventListener(
        "touchend",
        event => {

            const touch =
                event.changedTouches[0];

            const dx =
                touch.clientX -
                touchStartX;

            const dy =
                touch.clientY -
                touchStartY;

            if (Math.abs(dx) > 50) {

                if (dx > 0)
                    moveRight();
                else
                    moveLeft();
            }

            if (
                dy < -50 &&
                Math.abs(dy) >
                Math.abs(dx)
            ) {

                jump();
            }
        },
        {
            passive: true
        }
    );
}

/* =====================================================
   UI EVENTS
===================================================== */

function setupUI() {

    document
        .getElementById("playButton")
        .onclick = startGame;

    document
        .getElementById("restartButton")
        .onclick = startGame;

    document
        .getElementById("menuButton")
        .onclick = () => {

            document
                .getElementById(
                    "gameOver"
                )
                .classList.add(
                    "hidden"
                );

            document
                .getElementById(
                    "menu"
                )
                .classList.remove(
                    "hidden"
                );
        };

    document
        .getElementById("pauseButton")
        .onclick =
        togglePause;

    document
        .getElementById("resumeButton")
        .onclick =
        togglePause;

    document
        .getElementById(
            "pauseRestartButton"
        )
        .onclick =
        startGame;

    document
        .getElementById(
            "leaderboardButton"
        )
        .onclick = () => {

            document
                .getElementById(
                    "leaderboard"
                )
                .classList.remove(
                    "hidden"
                );

            loadLeaderboard();
        };

    document
        .getElementById(
            "closeLeaderboard"
        )
        .onclick = () => {

            document
                .getElementById(
                    "leaderboard"
                )
                .classList.add(
                    "hidden"
                );
        };
}

/* =====================================================
   SPAWN SYSTEM
===================================================== */

let obstacleTimer = 0;
let coinTimer = 0;

function spawnSystem(delta) {

    obstacleTimer += delta;
    coinTimer += delta;

    if (obstacleTimer > 1.7) {

        spawnObstacle();

        obstacleTimer = 0;
    }

    if (coinTimer > 1.0) {

        spawnCoin();

        coinTimer = 0;
    }
}

/* =====================================================
   GAME LOOP
===================================================== */

function animate(time = 0) {

    requestAnimationFrame(
        animate
    );

    const delta =
        Math.min(
            (time - lastTime) / 1000,
            0.05
        );

    lastTime = time;

    if (
        gameRunning &&
        !gamePaused
    ) {

        updatePlayer(delta);

        updateObjects(delta);

        updateGameProgress(delta);

        spawnSystem(delta);

        checkCollisions();

        updateCamera();
    }

    renderer.render(
        scene,
        camera
    );
}

/* =====================================================
   RESIZE
===================================================== */

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                1.5
            )
        );
    }
);

/* =====================================================
   START
===================================================== */

init();
```
