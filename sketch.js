// A2 / A3 Starter Runner (Expanded Multi-Level Version)
// Based on the simplified shapes-only runner
// Added:
// - level intro screen
// - level completion flow
// - stop spawning at target score
// - let remaining obstacles clear
// - level complete screen fades into binary choice screen
// - choice advances to next level
// - final game complete screen

// --------------------------------------------------
// Game constants
// --------------------------------------------------
const CANVAS_W = 700;
const CANVAS_H = 300;
const GROUND_Y = 230;
const GRAVITY = 1.0;
const JUMP_VELOCITY = -14;

// Default fallback values in case a level is missing data
const DEFAULT_TARGET_SCORE = 80;
const DEFAULT_SPAWN_FRAMES = 90;
const DEFAULT_OBSTACLE_SPEED = 6;

// Timing / transition constants
const LEVEL_INTRO_DURATION = 90; // about 1.5 sec
const LEVEL_COMPLETE_DURATION = 70; // hold before fading
const CHOICE_FADE_SPEED = 6; // fade amount per frame

// --------------------------------------------------
// External level data
// IMPORTANT:
// LEVELS should exist in another file, for example:
//
// const LEVELS = [
//   { name: "Level 1", targetScore: 80, spawnRate: 90, speed: 6 },
//   { name: "Level 2", targetScore: 90, spawnRate: 75, speed: 7 },
//   { name: "Level 3", targetScore: 100, spawnRate: 65, speed: 8 }
// ];
// --------------------------------------------------

// --------------------------------------------------
// Game state
// --------------------------------------------------
let state = "start";
// possible states:
// "start"
// "levelIntro"
// "play"
// "levelComplete"
// "choice"
// "lose"
// "gameComplete"

let player;
let obstacles = [];

let score = 0; // score for current level
let totalScore = 0; // optional total score across all levels
let currentLevel = 0;
let lastChoice = null; // "up" or "down"

// Level flow flags
let stopSpawning = false;
let introTimer = 0;
let completeTimer = 0;
let fadeAlpha = 0;

// Active level settings
let activeTargetScore = DEFAULT_TARGET_SCORE;
let activeSpawnFrames = DEFAULT_SPAWN_FRAMES;
let activeObstacleSpeed = DEFAULT_OBSTACLE_SPEED;

// --------------------------------------------------
// p5 setup
// --------------------------------------------------
function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  resetEntireGame();
}

// --------------------------------------------------
// Full game reset
// --------------------------------------------------
function resetEntireGame() {
  player = {
    x: 90,
    y: GROUND_Y,
    w: 40,
    h: 40,
    vy: 0,
    onGround: true,
  };

  obstacles = [];
  score = 0;
  totalScore = 0;
  currentLevel = 0;
  lastChoice = null;

  stopSpawning = false;
  introTimer = 0;
  completeTimer = 0;
  fadeAlpha = 0;

  loadCurrentLevelSettings();
}

// --------------------------------------------------
// Per-level reset
// --------------------------------------------------
function resetLevelObjects() {
  player.x = 90;
  player.y = GROUND_Y;
  player.w = 40;
  player.h = 40;
  player.vy = 0;
  player.onGround = true;

  obstacles = [];
  score = 0;
  stopSpawning = false;
  completeTimer = 0;
  fadeAlpha = 0;
}

// --------------------------------------------------
// Pull settings from LEVELS
// Assumes LEVELS exists elsewhere
// --------------------------------------------------
function loadCurrentLevelSettings() {
  const level = LEVELS[currentLevel] || {};

  activeTargetScore = level.targetScore ?? DEFAULT_TARGET_SCORE;
  activeSpawnFrames = level.spawnRate ?? DEFAULT_SPAWN_FRAMES;
  activeObstacleSpeed = level.speed ?? DEFAULT_OBSTACLE_SPEED;
}

// --------------------------------------------------
// Start current level
// --------------------------------------------------
function beginLevel(levelIndex) {
  currentLevel = levelIndex;
  loadCurrentLevelSettings();
  resetLevelObjects();

  introTimer = LEVEL_INTRO_DURATION;
  state = "levelIntro";
}

// --------------------------------------------------
// Go to next level after choice
// --------------------------------------------------
function advanceToNextLevel() {
  currentLevel++;

  if (currentLevel >= LEVELS.length) {
    state = "gameComplete";
    return;
  }

  beginLevel(currentLevel);
}

// --------------------------------------------------
// Main draw loop
// --------------------------------------------------
function draw() {
  background(245);
  drawGround();

  if (state === "start") {
    drawStartScreen();
    return;
  }

  if (state === "levelIntro") {
    drawPlayer();
    drawLevelIntroScreen();

    introTimer--;
    if (introTimer <= 0) {
      state = "play";
    }
    return;
  }

  if (state === "play") {
    updatePlayer();
    updateObstacles();
    checkCollisions();
    checkLevelProgress();

    drawHUD();
    drawPlayer();
    drawObstacles();
    return;
  }

  if (state === "levelComplete") {
    drawPlayer();
    drawObstacles();
    drawLevelCompleteScreen();

    completeTimer--;
    if (completeTimer <= 0) {
      state = "choice";
      fadeAlpha = 0;
    }
    return;
  }

  if (state === "choice") {
    drawPlayer();
    drawChoiceScreen();
    return;
  }

  if (state === "lose") {
    drawPlayer();
    drawObstacles();
    drawLoseScreen();
    return;
  }

  if (state === "gameComplete") {
    drawPlayer();
    drawGameCompleteScreen();
    return;
  }
}

// --------------------------------------------------
// Drawing helpers
// --------------------------------------------------
function drawGround() {
  stroke(40);
  strokeWeight(2);
  line(0, GROUND_Y + player.h, width, GROUND_Y + player.h);

  strokeWeight(3);
  for (let x = 0; x < width; x += 50) {
    line(x, GROUND_Y + player.h + 20, x + 25, GROUND_Y + player.h + 20);
  }
}

function drawPlayer() {
  noStroke();
  fill(30, 120, 255);
  rect(player.x, player.y, player.w, player.h, 8);
}

function drawObstacles() {
  noStroke();
  fill(30);

  for (const o of obstacles) {
    rect(o.x, o.y, o.w, o.h, 6);
  }
}

function drawHUD() {
  noStroke();
  fill(0);
  textAlign(LEFT, TOP);
  textSize(14);

  text(`Level: ${currentLevel + 1}`, 12, 12);
  text(`Score: ${score}`, 12, 30);
  text(`Target: ${activeTargetScore}`, 12, 48);
}

function drawStartScreen() {
  noStroke();
  fill(0);
  textAlign(CENTER, CENTER);

  textSize(28);
  text("Runner Prototype", width / 2, height / 2 - 40);

  textSize(15);
  text("Press SPACE to jump", width / 2, height / 2);
  text("Press ENTER to start", width / 2, height / 2 + 24);

  drawPlayer();
}

function drawLevelIntroScreen() {
  const level = LEVELS[currentLevel] || {};
  const levelName = level.name || `Level ${currentLevel + 1}`;

  fill(0, 0, 0, 170);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  fill(255);

  textSize(30);
  text(levelName, width / 2, height / 2 - 14);

  textSize(15);
  text(`Target Score: ${activeTargetScore}`, width / 2, height / 2 + 22);
}

function drawLevelCompleteScreen() {
  fill(0, 0, 0, 170);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  fill(255);

  textSize(28);
  text("LEVEL COMPLETE", width / 2, height / 2 - 14);

  textSize(15);
  text(`Level ${currentLevel + 1} Cleared`, width / 2, height / 2 + 18);
}

function drawChoiceScreen() {
  // fade in dark overlay
  fadeAlpha = min(fadeAlpha + CHOICE_FADE_SPEED, 190);

  fill(0, 0, 0, fadeAlpha);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  fill(255);

  textSize(26);
  text("Choose Your Path", width / 2, 70);

  textSize(14);
  text("Press W / UP for UP", width / 2, 100);
  text("Press S / DOWN for DOWN", width / 2, 120);

  // Up button
  fill(70, 140, 255);
  rect(width / 2 - 180, 145, 140, 85, 12);
  fill(255);
  textSize(24);
  text("UP", width / 2 - 110, 188);

  // Down button
  fill(255, 110, 110);
  rect(width / 2 + 40, 145, 140, 85, 12);
  fill(255);
  text("DOWN", width / 2 + 110, 188);

  textSize(13);
  text(
    "Your choice can be used later for narrative or level variation.",
    width / 2,
    265,
  );
}

function drawLoseScreen() {
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  fill(255);

  textSize(28);
  text("GAME OVER", width / 2, height / 2 - 20);

  textSize(15);
  text(`Level Reached: ${currentLevel + 1}`, width / 2, height / 2 + 10);
  text("Press R to restart", width / 2, height / 2 + 34);
}

function drawGameCompleteScreen() {
  fill(0, 0, 0, 170);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  fill(255);

  textSize(30);
  text("YOU FINISHED ALL LEVELS!", width / 2, height / 2 - 22);

  textSize(15);
  text(`Total Score: ${totalScore}`, width / 2, height / 2 + 10);
  text("Press R to restart the full game", width / 2, height / 2 + 36);
}

// --------------------------------------------------
// Updates
// --------------------------------------------------
function updatePlayer() {
  player.vy += GRAVITY;
  player.y += player.vy;

  const groundTop = GROUND_Y;

  if (player.y >= groundTop) {
    player.y = groundTop;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }
}

function updateObstacles() {
  // Spawn new obstacles only while spawning is allowed
  if (!stopSpawning && frameCount % activeSpawnFrames === 0) {
    spawnObstacle();
  }

  // Move obstacles
  for (const o of obstacles) {
    o.x -= activeObstacleSpeed;
  }

  // Score passed obstacles
  for (const o of obstacles) {
    if (!o.passed && o.x + o.w < player.x) {
      o.passed = true;
      score += 10;
      totalScore += 10;
    }
  }

  // Remove off-screen obstacles
  obstacles = obstacles.filter((o) => o.x + o.w > 0);
}

function spawnObstacle() {
  const w = random(15, 25);
  const h = random(20, 35);

  obstacles.push({
    x: width + 20,
    y: GROUND_Y + player.h - h,
    w,
    h,
    passed: false,
  });
}

// --------------------------------------------------
// Level progression
// --------------------------------------------------
function checkLevelProgress() {
  // Step 1: once target score is reached, stop new spawns
  if (!stopSpawning && score >= activeTargetScore) {
    stopSpawning = true;
  }

  // Step 2: wait until remaining obstacles have cleared
  if (stopSpawning && obstacles.length === 0) {
    state = "levelComplete";
    completeTimer = LEVEL_COMPLETE_DURATION;
  }
}

// --------------------------------------------------
// Collision detection
// --------------------------------------------------
function checkCollisions() {
  for (const o of obstacles) {
    if (
      rectsOverlap(player.x, player.y, player.w, player.h, o.x, o.y, o.w, o.h)
    ) {
      state = "lose";
      return;
    }
  }
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// --------------------------------------------------
// Input
// --------------------------------------------------
function keyPressed() {
  if (state === "start") {
    if (keyCode === ENTER) {
      beginLevel(0);
    }

    if (key === " " && player.onGround) {
      player.vy = JUMP_VELOCITY;
    }
    return;
  }

  if (state === "levelIntro") {
    // optional skip
    if (keyCode === ENTER) {
      state = "play";
    }
    return;
  }

  if (state === "play") {
    if (key === " " && player.onGround) {
      player.vy = JUMP_VELOCITY;
    }
    return;
  }

  if (state === "choice") {
    if (key === "w" || key === "W" || keyCode === UP_ARROW) {
      lastChoice = "up";
      advanceToNextLevel();
      return;
    }

    if (key === "s" || key === "S" || keyCode === DOWN_ARROW) {
      lastChoice = "down";
      advanceToNextLevel();
      return;
    }
  }

  if (state === "lose" || state === "gameComplete") {
    if (key === "r" || key === "R") {
      resetEntireGame();
      state = "start";
    }
  }
}
