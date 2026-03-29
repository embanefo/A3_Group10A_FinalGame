/*
  SpikeManager.js
  ─────────────────────────────────────────────
  Manages the full list of Spike objects:
  spawning, moving, culling, and drawing.

  ── Spike types ───────────────────────────────
  "ground" — rises from the floor. Jump or use a
             platform to avoid.
  "air"    — hangs from AIR_SPIKE_Y downward.
             Safe on the ground; dangerous on a
             platform. Player must jump over or
             drop off the platform in time.
  "bird"   — (Level 2) small, fast, horizontal
             movement. Spawns at height with gap
             for slide mechanic.
  "plane"  — (Level 2) large, slower, diagonal
             motion (top-right → bottom-left).

  ── Tuning knobs ──────────────────────────────
  AIR_CHANCE         — probability a new spike is
                       an air spike (0.0 – 1.0)
  spawnRate formula  — controls how quickly new
                       spikes appear as intensity rises
  speed is passed IN from sketch.js so platforms
  and spikes always scroll at the same rate.

  ── Level System ───────────────────────────────
  Level 1: ground + air spikes only
  Level 2: birds + planes (1.3× spawn rate)
           Use setLevel(2) to switch modes
*/

const AIR_CHANCE = 0.35; // 35% of spawns are air spikes

class SpikeManager {
  constructor() {
    this.spikes = [];
    this.currentSpeed = 7; // exposed so PlatformManager can read it
    this.level = 1; // Level support (1 = default, 2 = increased difficulty)
  }

  // ── Set level (1 or 2) ───────────────────────
  setLevel(level) {
    this.level = level;
  }

  // ── Clear on game reset ──────────────────────
  reset() {
    this.spikes = [];
    this.currentSpeed = 7;
  }

  // ── Move + spawn each frame ──────────────────
  // speed — computed in sketch.js and shared with PlatformManager
  update(
    speed,
    intensity,
    maxIntensity,
    stopSpawning = false,
    spawnFrames = null,
  ) {
    this.currentSpeed = speed;

    if (!stopSpawning) {
      // LEVEL 2: Increase spawn rate (1.3× more often)
      let spawnRateBase =
        spawnFrames != null
          ? spawnFrames
          : 100 - map(intensity, 0, maxIntensity, 0, 30);

      if (this.level === 2) spawnRateBase *= 0.77; // 1/1.3 ≈ 0.77

      if (frameCount % floor(max(1, spawnRateBase)) === 0) this._spawn();
    }

    for (const s of this.spikes) {
      // Existing obstacles: horizontal movement
      if (s.type === "ground" || s.type === "air") {
        s.x -= speed;
      }
      // LEVEL 2: Birds move horizontally (fast) using vx
      else if (s.type === "bird") {
        s.x += s.vx; // vx is negative, so moves left faster
      }
      // LEVEL 2: Planes move diagonally
      else if (s.type === "plane") {
        s.x += s.vx; // diagonal x
        s.y += s.vy; // diagonal y
      }
    }

    // Cull spikes that have scrolled off the left edge
    this.spikes = this.spikes.filter((s) => s.x + s.w > 0);
  }

  // ── Spawn a ground or air spike ──────────────
  _spawn() {
    if (this.level === 1) {
      // Level 1: only ground and air spikes
      if (random() < AIR_CHANCE) {
        this._spawnAir();
      } else {
        this._spawnGround();
      }
    }
    // ── LEVEL 2: New obstacle types ──────────────
    else if (this.level === 2) {
      // Level 2: prefer birds and planes over regular spikes
      const r = random();
      if (r < 0.6) {
        // 60% birds
        this._spawnBird();
      } else if (r < 0.95) {
        // 35% planes
        this._spawnPlane();
      } else {
        // 5% air spikes for variety
        this._spawnAir();
      }
    }
  }

  // Ground spike — rises from the floor
  _spawnGround() {
    const groundBase = GROUND + 40; // 40 = player height
    const h = random(40, 55);
    const w = random(28, 40);
    this.spikes.push(new Spike(width + 20, groundBase - h, w, h, "ground"));

    // 30% chance of a shorter second spike right behind the first
    if (random() < 0.3) {
      const h2 = h - random(10, 15);
      this.spikes.push(
        new Spike(width + 20 + w, groundBase - h2, w, h2, "ground"),
      );
    }
  }

  // Air spike — hangs down from AIR_SPIKE_Y
  // AIR_SPIKE_Y is defined in sketch.js as a global so it stays
  // in sync with PLATFORM_Y (same file that defines platform height).
  _spawnAir() {
    const h = random(50, 70);
    const w = random(28, 40);
    this.spikes.push(new Spike(width + 20, AIR_SPIKE_Y, w, h, "air"));
  }

  // ── LEVEL 2: Bird ────────────────────────────
  // Small, fast, moves horizontally
  // Spawns at varying Y heights ABOVE the player,
  // leaving enough gap for a slide mechanic
  _spawnBird() {
    const w = 20;
    const h = 15;
    // Spawn in upper half, well above platform (min 100px gap)
    const minY = 50;
    const maxY = PLATFORM_Y - 100; // leave gap for slide
    const y = random(minY, maxY);
    const bird = new Spike(width + 20, y, w, h, "bird");
    // Birds move 1.3× faster than normal obstacles
    bird.vx = -(this.currentSpeed * 1.3);
    this.spikes.push(bird);
  }

  // ── LEVEL 2: Plane ──────────────────────────
  // Large, slower, moves diagonally top-right to bottom-left
  _spawnPlane() {
    const w = 50;
    const h = 30;
    const y = random(30, height / 2);
    const plane = new Spike(width + 50, y, w, h, "plane");
    // Plane velocity: diagonal motion (slower than birds)
    plane.vx = -(this.currentSpeed * 0.7);
    plane.vy = this.currentSpeed * 0.5; // moves down-left
    this.spikes.push(plane);
  }

  // ── Draw all spikes ──────────────────────────
  draw(intensity, maxIntensity) {
    for (const s of this.spikes) s.draw(intensity, maxIntensity);
  }
}
