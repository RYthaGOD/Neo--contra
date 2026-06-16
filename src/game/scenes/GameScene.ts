import Phaser from 'phaser';
import { BulletPool } from '../entities/BulletPool';
import { Bullet } from '../entities/Bullet';
import { Enemy } from '../entities/Enemy';
import { WeaponPod, PowerUpItem } from '../entities/PowerUp';
import { DeFiDestroyer, FlashLoanFalcon, RugPullReaper, HashRateHydra, SatoshiSentinel, BossBase } from '../entities/Bosses';
import { sounds } from '../SoundManager';
import { LEVELS, LevelData } from '../LevelConfig';
import { WeaponType, WEAPONS, POWERUP_LETTERS } from '../../config/constants';

// Contra 8-directional aim table: [dx, dy] -> radians
const EIGHT_WAY: Record<string, number> = {
    '1,0':  0,
    '1,-1': -Math.PI / 4,
    '0,-1': -Math.PI / 2,
    '-1,-1': -3 * Math.PI / 4,
    '-1,0': Math.PI,
    '-1,1': 3 * Math.PI / 4,
    '0,1':  Math.PI / 2,
    '1,1':  Math.PI / 4,
};

type PlayerState = 'idle' | 'run' | 'jump' | 'prone';

export class GameScene extends Phaser.Scene {
    // --- Player ---
    public player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private playerState: PlayerState = 'idle';
    private facing = 1;          // 1=right, -1=left
    private aimDirX = 1;
    private aimDirY = 0;
    private invulnUntil = 0;       // ms timestamp; player is immune while time.now < this
    private invulnerable = false;  // barrier power-up (separate, timed shield)
    private vignette?: Phaser.GameObjects.Image; // red damage edge-vignette overlay
    private lastFire = 0;
    private jumpsUsed = 0;      // for double jump (resets on landing)
    private wasOnGround = true; // for landing-dust detection
    private playerDead = false; // death animation in progress
    private weapon: WeaponType = 'NORMAL';
    private weaponLevel = 1;    // grabbing the same weapon again upgrades it
    // Local lives counter — kept in sync with React but readable synchronously
    private lives = 3;
    private collisionsRegistered = false;

    // --- Bullets ---
    public bullets!: BulletPool;
    public enemyBullets!: BulletPool;

    // --- Groups ---
    private enemies!: Phaser.Physics.Arcade.Group;
    private pods!: Phaser.Physics.Arcade.Group;
    private pickups!: Phaser.Physics.Arcade.Group;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private hazards!: Phaser.Physics.Arcade.StaticGroup;
    private climbRewardAt?: { x: number; y: number };
    private boss?: BossBase;
    private bossTriggered = false;

    // --- Level ---
    private currentLevelIndex = 0;
    private levelData!: LevelData;

    // --- Mobile input bridge ---
    private mobileDir = { x: 0, y: 0 };
    private mobileJump = false;
    private mobileFire = false;
    private handlers: Record<string, (e: Event) => void> = {};

    // --- Keys ---
    private keys!: {
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        fire: Phaser.Input.Keyboard.Key;
        esc: Phaser.Input.Keyboard.Key;
        mute: Phaser.Input.Keyboard.Key;
        // WASD aliases
        a: Phaser.Input.Keyboard.Key;
        d: Phaser.Input.Keyboard.Key;
        w: Phaser.Input.Keyboard.Key;
        s: Phaser.Input.Keyboard.Key;
        z: Phaser.Input.Keyboard.Key; // alternate fire
    };

    // --- Spawn markers (camera-scroll based) ---
    private enemyWaveX = 0;
    private podWaveX = 0;
    // Authored set-piece beats, fired as the player passes an x threshold.
    private beats: { x: number; fired: boolean; run: () => void }[] = [];

    // --- Parallax background ---
    private bgObjects: Phaser.GameObjects.GameObject[] = [];
    private bgFar?: Phaser.GameObjects.TileSprite;
    private bgMid?: Phaser.GameObjects.TileSprite;
    private bgNear?: Phaser.GameObjects.TileSprite;
    private bgRain?: Phaser.GameObjects.TileSprite;

    constructor() { super('GameScene'); }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    create() {
        this.currentLevelIndex = 0;
        this.levelData = LEVELS[0];

        // A scene "start" can be a RESTART (after game over or a win). Phaser reuses
        // the scene instance but has already destroyed all of its GameObjects, so
        // these fields point at dead objects. Clear them; otherwise setupLevel()'s
        // `if (!this.x)` guards treat the stale refs as live and crash (e.g.
        // platforms.clear() on a destroyed StaticGroup).
        this.player = undefined as any;
        this.bullets = undefined as any;
        this.enemyBullets = undefined as any;
        this.enemies = undefined as any;
        this.pods = undefined as any;
        this.pickups = undefined as any;
        this.platforms = undefined as any;
        this.hazards = undefined as any;
        this.keys = undefined as any;
        this.boss = undefined;
        this.hudText = undefined;
        this.handlers = {};
        this.bgObjects = [];
        this.bgFar = this.bgMid = this.bgNear = this.bgRain = undefined;
        this.playerDead = false;
        this.jumpsUsed = 0;
        this.weaponLevel = 1;
        this.beats = [];

        // Fresh game — reset all shared state so a restart after death OR a win
        // begins cleanly (otherwise registry lives can still be 0 → instant death,
        // or isGameOver can still be true → update() bails and the game freezes).
        this.registry.get('react_resetGame')?.();
        this.registry.get('react_setScene')?.('game');
        this.registry.set('isGameOver', false);
        this.registry.set('isShopOpen', false);
        this.registry.set('lives', 3);
        this.registry.set('weapon', 'NORMAL');
        this.weapon = 'NORMAL';
        this.lives = 3;
        this.collisionsRegistered = false;

        // React → Phaser sync via registry change events (GameView writes these).
        // Keep named refs and remove them on shutdown so listeners don't stack up
        // across restarts of this scene.
        const onWeapon = (_parent: unknown, value: WeaponType) => { this.weapon = value || 'NORMAL'; };
        const onLives = (_parent: unknown, value: number) => { this.lives = value; };
        this.registry.events.on('changedata-weapon', onWeapon);
        this.registry.events.on('changedata-lives', onLives);
        this.events.once('shutdown', () => {
            this.registry.events.off('changedata-weapon', onWeapon);
            this.registry.events.off('changedata-lives', onLives);
        });

        this.setupLevel();
        this.cameras.main.fadeIn(450, 0, 0, 0);
    }

    // ─── Level Setup ────────────────────────────────────────────────────────

    private setupLevel() {
        this.bossTriggered = false;
        this.boss = undefined;

        const ld = this.levelData;
        const W = ld.worldWidth;
        const H = 600;

        // Resize world
        this.physics.world.setBounds(0, 0, W, H);
        this.cameras.main.setBounds(0, 0, W, H);
        this.cameras.main.setBackgroundColor(ld.backgroundColor);

        // Parallax background (behind everything)
        this.setupBackground();

        // Platforms
        this.buildPlatforms(ld);

        // Player
        if (!this.player) {
            this.player = this.physics.add.sprite(80, 440, 'player_idle') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            this.player.setCollideWorldBounds(true);
            this.player.setSize(14, 34).setOffset(6, 4);
            this.player.setDepth(10);
        } else {
            this.player.setPosition(80, 440);
            this.player.setActive(true).setVisible(true);
        }
        (this.player.body as Phaser.Physics.Arcade.Body).setMaxVelocityY(700);

        // Create groups once — keep same instances across levels so collision
        // registrations (added once below) remain valid.
        if (!this.bullets) {
            this.bullets = new BulletPool(this, 120);
        }
        if (!this.enemyBullets) {
            this.enemyBullets = new BulletPool(this, 80);
        }
        if (!this.enemies) {
            this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true });
        } else {
            this.enemies.clear(true, true);
        }
        if (!this.pods) {
            this.pods = this.physics.add.group({ runChildUpdate: true });
        } else {
            this.pods.clear(true, true);
        }
        if (!this.pickups) {
            this.pickups = this.physics.add.group({ runChildUpdate: true });
        } else {
            this.pickups.clear(true, true);
        }
        if (!this.hazards) {
            this.hazards = this.physics.add.staticGroup();
        } else {
            this.hazards.clear(true, true);
        }
        this.placeHazards();

        // Reward on the high climb ledge — weapon varies per level.
        if (this.climbRewardAt) {
            const rewards: WeaponType[] = ['S', 'L', 'F', 'M', 'L'];
            this.dropWeapon(this.climbRewardAt.x, this.climbRewardAt.y, rewards[(ld.id - 1) % rewards.length]);
        }

        // Camera follow with a horizontal deadzone so the player isn't pinned
        // dead-centre — movement feels less rigid (world is viewport-height, so
        // there is no vertical scroll to tune).
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
        this.cameras.main.setDeadzone(this.scale.width * 0.26, this.scale.height);

        // Input — only register once
        if (!this.keys) this.setupInput();

        // Collisions — only register once; group references stay stable between levels
        if (!this.collisionsRegistered) {
            this.setupCollisions();
            this.collisionsRegistered = true;
        }

        // HUD
        this.createLevelHud(ld.name);

        // Spawn markers reset
        this.enemyWaveX = 600;
        this.podWaveX = 500;
        this.buildBeats();

        // Spawn initial enemies
        this.spawnEnemyWave(400, 1200);

        // Brief spawn-in grace so the player isn't hit before they can react.
        // Deferred one tick: this.time.now is 0 during create(), so we set the
        // grace on the first frame when the clock holds the real game time.
        this.time.delayedCall(0, () => { this.invulnUntil = this.time.now + 1500; });

        // BGM
        sounds.playBGM(ld.bgm);
        sounds.unlock();
    }

    // ─── Platform Construction ───────────────────────────────────────────────

    private buildPlatforms(ld: LevelData) {
        if (!this.platforms) {
            this.platforms = this.physics.add.staticGroup();
        } else {
            this.platforms.clear(true, true);
        }

        const W = ld.worldWidth;
        const TILE = 32;
        const color = ld.platformColor;

        // Solid ground row
        const groundTiles = Math.ceil(W / TILE);
        for (let i = 0; i < groundTiles; i++) {
            this.platforms.create(i * TILE + TILE / 2, 576, 'platform')
                .setTint(color)
                .refreshBody();
        }

        // Floating platforms — deterministic from level id seed
        const seed = ld.id * 137;
        const rand = (n: number, s: number) => ((n * seed + s * 31) % 17) / 17;

        const platformCount = 12 + ld.id * 4;
        for (let i = 0; i < platformCount; i++) {
            const x = 300 + Math.floor(rand(i, 1) * (W - 700));
            const y = 180 + Math.floor(rand(i, 2) * 280);
            const len = 3 + Math.floor(rand(i, 3) * 5);
            for (let t = 0; t < len; t++) {
                this.platforms.create(x + t * TILE, y, 'platform')
                    .setTint(color)
                    .refreshBody();
            }
        }

        // Authored climb (every level): an ascending staircase to a high reward
        // ledge that needs the double jump. Positioned just before the gauntlet.
        {
            const stair = (sx: number, sy: number, len: number, tint: number) => {
                for (let t = 0; t < len; t++) {
                    this.platforms.create(sx + t * TILE, sy, 'platform').setTint(tint).refreshBody();
                }
            };
            const cx = Math.floor(W * 0.62);
            stair(cx, 470, 3, color);
            stair(cx + 180, 392, 3, color);
            stair(cx + 360, 314, 3, color);
            stair(cx + 540, 250, 4, 0x66ffcc); // high reward ledge
            this.climbRewardAt = { x: cx + 600, y: 236 };
        }

        // Elevated ground strip for boss arena (right third of level)
        const arenaStart = W - 700;
        const arenaGroundTiles = Math.ceil(700 / TILE);
        for (let i = 0; i < arenaGroundTiles; i++) {
            this.platforms.create(arenaStart + i * TILE + TILE / 2, 480, 'platform')
                .setTint(0x334455)
                .refreshBody();
        }
    }

    // ─── Input ───────────────────────────────────────────────────────────────

    private setupInput() {
        if (!this.input.keyboard) return;
        const kb = this.input.keyboard;
        this.keys = {
            left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            down:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
            fire:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            esc:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
            mute:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.M),
            // WASD / alternate controls
            a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            z: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
        };

        // Mobile bridge
        const cleanup = () => {
            Object.entries(this.handlers).forEach(([ev, fn]) => window.removeEventListener(ev, fn));
        };
        this.events.on('shutdown', cleanup);
        this.events.on('destroy', cleanup);

        this.handlers.game_jump = () => { this.mobileJump = true; };
        // Fire is a HELD state on mobile (down/up) so the player can hold to
        // auto-fire, matching keyboard hold-to-fire.
        this.handlers.game_fire_down = () => { this.mobileFire = true; };
        this.handlers.game_fire_up = () => { this.mobileFire = false; };
        this.handlers.game_move = (e: Event) => {
            const ce = e as CustomEvent;
            this.mobileDir = ce.detail;
        };
        // Pay-to-continue: React fires this after a successful revive purchase.
        this.handlers.game_revive = () => this.revivePlayer();
        Object.entries(this.handlers).forEach(([ev, fn]) => window.addEventListener(ev, fn));
    }

    // ─── Collision Setup ─────────────────────────────────────────────────────

    private setupCollisions() {
        // Player lands on platforms
        this.physics.add.collider(this.player, this.platforms);

        // Enemies land on platforms
        this.physics.add.collider(this.enemies, this.platforms);

        // Pickups land on platforms
        this.physics.add.collider(this.pickups, this.platforms);

        // Player bullets → enemies
        this.physics.add.overlap(this.bullets, this.enemies, (bulletGO, enemyGO) => {
            const b = bulletGO as import('../entities/Bullet').Bullet;
            const e = enemyGO as Enemy;
            if (!b.isEnemy && b.active && e.active) {
                this.hitSpark(b.x, b.y);
                e.takeDamage(b.damage);
                if (!b.pierce) b.kill();
            }
        });

        // Player bullets → pods
        this.physics.add.overlap(this.bullets, this.pods, (bulletGO, podGO) => {
            const b = bulletGO as import('../entities/Bullet').Bullet;
            const pod = podGO as WeaponPod;
            if (!b.isEnemy && b.active && pod.active) {
                pod.open();
                b.kill();
            }
        });

        // Player bullets → boss (handled in update for flexibility)

        // Enemy bullets → player. For overlap(group, sprite) Phaser calls the
        // callback sprite-FIRST, so pick whichever arg is the bullet (not the
        // player) — otherwise enemy bullets never register a hit.
        this.physics.add.overlap(this.enemyBullets, this.player, (a, c) => {
            const b = (a === this.player ? c : a) as import('../entities/Bullet').Bullet;
            if (b.isEnemy && b.active) {
                b.kill();
                this.handlePlayerHit();
            }
        });

        // Enemies → player (contact)
        this.physics.add.overlap(this.player, this.enemies, () => {
            this.handlePlayerHit();
        });

        // Pickups → player
        this.physics.add.overlap(this.player, this.pickups, (_playerGO, pickupGO) => {
            const item = pickupGO as PowerUpItem;
            if (!item.active) return;
            this.collectWeapon(item.weapon);
            item.destroy();
        });

        // Hazards → player (only while the jet is "hot")
        this.physics.add.overlap(this.player, this.hazards, (_p, hazGO) => {
            const h = hazGO as Phaser.GameObjects.Sprite;
            if (h.getData('hot')) this.handlePlayerHit();
        });
    }

    // ─── Main Update ─────────────────────────────────────────────────────────

    update(time: number) {
        if (!this.keys) return;
        if (this.registry.get('isGameOver')) return;
        if (this.registry.get('isShopOpen')) return;

        this.updatePlayer(time);
        this.updateBoss(time);
        this.updateScrollSpawns();
        this.cullBullets();
        this.updateBackground();
        this.updateHazards(time);
        this.syncRegistryToReact();
    }

    // ─── Hazards (timed fire jets) ────────────────────────────────────────────

    private placeHazards() {
        const ld = this.levelData;
        const W = ld.worldWidth;
        const groundTop = 560; // jets sit on the main ground
        // Escalating fire-jet density per level, spread through the mid-section
        // (with the odd clustered pair to force timing).
        const count = 3 + Math.floor(ld.difficultyMod * 2); // L1≈5 … L5≈8
        const start = W * 0.34, span = W * 0.44;
        const xs: number[] = [];
        for (let i = 0; i < count; i++) {
            const bx = Math.floor(start + span * (i / Math.max(1, count - 1)));
            xs.push(bx);
            if (i % 2 === 1) xs.push(bx + 60); // clustered pair
        }
        xs.forEach((x, i) => {
            const base = this.add.image(x, groundTop + 6, 'hazard_base').setOrigin(0.5, 0).setDepth(8);
            this.bgObjects.push(base); // cleaned up on level change with bg layer list
            const jet = this.hazards.create(x, groundTop, 'hazard') as Phaser.Physics.Arcade.Sprite;
            jet.setOrigin(0.5, 1).setDepth(9);
            jet.setData('phase', i * 0.7);
            (jet.body as Phaser.Physics.Arcade.StaticBody).setSize(14, 56).setOffset(3, 8);
            jet.refreshBody();
        });
    }

    private updateHazards(time: number) {
        if (!this.hazards) return;
        const kids = this.hazards.getChildren();
        for (let i = 0; i < kids.length; i++) {
            const jet = kids[i] as Phaser.GameObjects.Sprite;
            const phase = (jet.getData('phase') as number) || 0;
            // ~1.1s on, ~1.1s off cycle
            const on = Math.sin(time / 560 + phase) > -0.1;
            jet.setData('hot', on);
            jet.setVisible(on);
            if (on) jet.setScale(1, 0.85 + Math.sin(time / 60 + phase) * 0.15); // flicker
        }
    }

    // ─── Parallax Background ──────────────────────────────────────────────────

    private static readonly BG_PALETTES: Record<number, { skyTop: number; skyBottom: number; glow: number; signs: number[] }> = {
        1: { skyTop: 0x05010f, skyBottom: 0x0a2230, glow: 0xff6a00, signs: [0x00f3ff, 0xff2d95, 0xffae00] },
        2: { skyTop: 0x0a0518, skyBottom: 0x241038, glow: 0xffae00, signs: [0xffff33, 0x9d4dff, 0x00f3ff] },
        3: { skyTop: 0x02101a, skyBottom: 0x063038, glow: 0x00ffcc, signs: [0x00ffcc, 0x00f3ff, 0x7dffb0] },
        4: { skyTop: 0x140500, skyBottom: 0x351808, glow: 0xff4500, signs: [0xff4500, 0xffae00, 0xff2d95] },
        5: { skyTop: 0x000006, skyBottom: 0x10103a, glow: 0xbc13fe, signs: [0xbc13fe, 0x00f3ff, 0xffffff] },
    };
    private static readonly SIGN_LABELS = ['SECTOR 7', 'DANGER', 'ENERGY PLANT', 'RE-FUEL', 'BIO-HAZARD', 'REACTOR', 'HIGH VOLTAGE', 'SOLANA CORP'];

    private setupBackground() {
        // tear down any previous level's layers
        this.bgObjects.forEach(o => o.destroy());
        this.bgObjects = [];
        this.bgFar = this.bgMid = this.bgNear = undefined;

        const W = this.scale.width;   // viewport (layers are fixed to camera)
        const H = this.scale.height;
        const pal = GameScene.BG_PALETTES[this.levelData.id] ?? GameScene.BG_PALETTES[1];

        const mk = (key: string, depth: number, alpha = 1) => {
            const ts = this.add.tileSprite(0, 0, W, H, key).setOrigin(0, 0).setScrollFactor(0).setDepth(depth).setAlpha(alpha);
            this.bgObjects.push(ts);
            return ts;
        };

        // If an AI backdrop exists for this level, use it as the painted far layer
        // and let only the rain/foliage drift on top. Otherwise build the full
        // procedural parallax (sky → skyline → smoke → signs → foliage).
        const artKey = 'bg_level' + this.levelData.id;
        if (this.textures.exists(artKey)) {
            const img = this.add.image(W / 2, H / 2, artKey).setScrollFactor(0).setDepth(-100);
            const src = this.textures.get(artKey).getSourceImage() as { width: number; height: number };
            img.setScale(Math.max(W / src.width, H / src.height)); // cover the viewport
            // Dim + a stronger darken toward the play area so sprites/platforms pop
            // against the busy painted backdrop.
            const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x00030a, 0.30).setScrollFactor(0).setDepth(-99);
            const floorShade = this.add.rectangle(W / 2, H, W, H * 0.45, 0x000008, 0.35)
                .setOrigin(0.5, 1).setScrollFactor(0).setDepth(-98);
            this.bgObjects.push(img, dim, floorShade);
            this.bgNear = mk('bg_near', -40, 0.4);     // subtle foreground parallax
            this.bgRain = mk('bg_rain', -30, 0.4);     // weather
            return;
        }

        // ── Procedural background ──
        // Sky gradient + warm horizon glow (fixed to camera)
        const sky = this.add.graphics().setScrollFactor(0).setDepth(-100);
        sky.fillGradientStyle(pal.skyTop, pal.skyTop, pal.skyBottom, pal.skyBottom, 1);
        sky.fillRect(0, 0, W, H);
        sky.fillStyle(pal.glow, 0.25);
        sky.fillRect(0, H * 0.45, W, H * 0.25);
        sky.fillStyle(pal.glow, 0.12);
        sky.fillRect(0, H * 0.35, W, H * 0.15);
        this.bgObjects.push(sky);

        this.bgFar = mk('bg_far', -90, 0.9);
        this.bgMid = mk('bg_mid', -80, 0.95);
        this.bgNear = mk('bg_near', -40);
        this.bgRain = mk('bg_rain', -30, 0.5);

        // Smoke drifting from the two far smokestacks
        for (const sx of [W * 0.30, W * 0.72]) {
            const em = this.add.particles(sx, H * 0.30, 'bg_smoke', {
                speedY: { min: -18, max: -34 }, speedX: { min: -6, max: 10 },
                scale: { start: 0.5, end: 2.4 }, alpha: { start: 0.28, end: 0 },
                lifespan: 4200, frequency: 520, tint: pal.glow,
            }).setScrollFactor(0).setDepth(-85);
            this.bgObjects.push(em);
        }

        // Neon billboards scattered through the world (parallax via scrollFactor)
        const count = Math.min(8, Math.floor(this.levelData.worldWidth / 760));
        for (let i = 0; i < count; i++) {
            const label = GameScene.SIGN_LABELS[(this.levelData.id * 3 + i) % GameScene.SIGN_LABELS.length];
            const col = pal.signs[i % pal.signs.length];
            const wx = 500 + i * 760 + Phaser.Math.Between(-120, 120);
            const wy = Phaser.Math.Between(110, 300);
            this.bgObjects.push(...this.makeNeonSign(wx, wy, label, col));
        }
    }

    private makeNeonSign(x: number, y: number, label: string, color: number): Phaser.GameObjects.GameObject[] {
        const hex = '#' + color.toString(16).padStart(6, '0');
        const txt = this.add.text(0, 0, label, {
            fontFamily: '"Press Start 2P", monospace', fontSize: '11px', color: hex,
            stroke: '#000000', strokeThickness: 4, padding: { x: 8, y: 6 },
        }).setOrigin(0.5);
        const bg = this.add.rectangle(0, 0, txt.width + 16, txt.height + 12, 0x05070d, 0.82)
            .setStrokeStyle(2, color, 0.9).setOrigin(0.5);
        const c = this.add.container(x, y, [bg, txt]).setScrollFactor(0.45).setDepth(-35);
        // gentle neon flicker
        this.tweens.add({ targets: c, alpha: { from: 0.6, to: 1 }, duration: Phaser.Math.Between(900, 1600), yoyo: true, repeat: -1 });
        return [c];
    }

    private updateBackground() {
        const sx = this.cameras.main.scrollX;
        if (this.bgFar) this.bgFar.tilePositionX = sx * 0.15;
        if (this.bgMid) this.bgMid.tilePositionX = sx * 0.35;
        if (this.bgNear) this.bgNear.tilePositionX = sx * 0.7;
        if (this.bgRain) {
            this.bgRain.tilePositionY += 6;
            this.bgRain.tilePositionX += 1.5;
        }
    }

    // Drive bullet lifetime/bounds culling from the scene loop. Relying on the
    // group's runChildUpdate proved unreliable, so missed bullets were never
    // recycled and the pool saturated (player could no longer fire).
    private cullBullets() {
        const pools = [this.bullets, this.enemyBullets];
        for (const pool of pools) {
            if (!pool) continue;
            const children = pool.getChildren();
            for (let i = 0; i < children.length; i++) {
                const b = children[i] as Bullet;
                if (b.active) b.update();
            }
        }
    }

    // ─── Player Update ───────────────────────────────────────────────────────

    private updatePlayer(time: number) {
        if (this.playerDead) return; // death animation owns the player now
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const onGround = body.blocked.down;
        if (onGround) this.jumpsUsed = 0; // refill jumps on landing
        // landing dust when touching down after a fall
        if (onGround && !this.wasOnGround) this.spawnDust(this.player.x, this.player.y + 16);
        this.wasOnGround = onGround;

        // --- Horizontal Movement (arrows or WASD) ---
        let moveX = 0;
        if (this.keys.left.isDown || this.keys.a.isDown) moveX = -1;
        if (this.keys.right.isDown || this.keys.d.isDown) moveX = 1;
        if (Math.abs(this.mobileDir.x) > 0.15) moveX = Math.sign(this.mobileDir.x);

        const SPEED = 200;
        body.setVelocityX(moveX * SPEED);

        // --- Aim Direction (full 8-way) ---
        // Horizontal facing tracks movement unless overridden by aim
        if (moveX !== 0) this.facing = moveX;
        this.aimDirX = this.facing;
        this.aimDirY = 0;

        const aimUp = this.keys.up.isDown || this.keys.w.isDown || this.mobileDir.y < -0.6;
        const aimDownAir = (this.keys.down.isDown || this.keys.s.isDown || this.mobileDir.y > 0.6) && !onGround;
        // Holding up/down while NOT moving horizontally aims straight vertical;
        // combined with movement it aims diagonally. Without the moveX===0 case the
        // pure up/down directions were unreachable (only 6-way aim).
        if (aimUp) {
            this.aimDirY = -1;
            if (moveX === 0) this.aimDirX = 0;
        } else if (aimDownAir) {
            this.aimDirY = 1;
            if (moveX === 0) this.aimDirX = 0;
        }

        // --- Prone (Contra classic) ---
        const proneDown = ((this.keys.down.isDown || this.keys.s.isDown) && onGround) || (this.mobileDir.y > 0.6 && onGround);
        if (proneDown) {
            body.setVelocityX(0);
            this.playerState = 'prone';
            this.aimDirY = 0;
        } else if (!onGround) {
            this.playerState = 'jump';
        } else if (Math.abs(moveX) > 0) {
            this.playerState = 'run';
        } else {
            this.playerState = 'idle';
        }

        // Flip sprite with facing
        this.player.setFlipX(this.facing < 0);

        // --- Player Texture ---
        this.applyPlayerSprite(onGround, moveX);

        // --- Jump / Double-jump (Up or W) ---
        const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.up) ||
                            Phaser.Input.Keyboard.JustDown(this.keys.w) ||
                            this.mobileJump;
        this.mobileJump = false;
        if (jumpPressed && this.playerState !== 'prone' && this.jumpsUsed < 2) {
            // first jump is stronger; the mid-air jump a touch weaker
            body.setVelocityY(this.jumpsUsed === 0 ? -470 : -430);
            this.jumpsUsed++;
            sounds.playSFX('jump');
            this.playerState = 'jump';
            if (this.jumpsUsed === 2) {
                // little burst to telegraph the air-jump
                this.spawnExplosion(this.player.x, this.player.y + 16, 0x88ccff);
            }
        }

        // --- Fire (Space/Z key, or held mobile fire button) ---
        const fireHeld = this.keys.fire.isDown || this.keys.z.isDown || this.mobileFire;
        const cfg = WEAPONS[this.weapon];
        // Upgraded weapons fire faster.
        const interval = cfg.fireInterval * (this.weaponLevel >= 2 ? 0.6 : 1);
        if (fireHeld && (time - this.lastFire) >= interval) {
            this.shootPlayer();
            this.lastFire = time;
        }

        // --- ESC = toggle shop ---
        if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
            this.registry.get('react_toggleShop')?.(true);
        }

        // --- M = mute ---
        if (Phaser.Input.Keyboard.JustDown(this.keys.mute)) {
            sounds.toggleMute();
        }

        // Player bullets → boss. physics.overlap (the immediate world test) does
        // not guarantee callback arg order, so pick whichever arg is the bullet
        // (not the boss) — otherwise we'd call .kill() on the boss and throw.
        if (this.boss && this.boss.active) {
            this.physics.overlap(this.bullets, this.boss, (o1, o2) => {
                const b = (o1 === this.boss ? o2 : o1) as import('../entities/Bullet').Bullet;
                if (!b.isEnemy && b.active) {
                    this.boss!.takeDamage(b.damage);
                    if (!b.pierce) b.kill();
                }
            });
        }
    }

    private applyPlayerSprite(onGround: boolean, moveX: number) {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        switch (this.playerState) {
            case 'prone':
                this.player.setTexture('player_prone');
                body.setSize(34, 14).setOffset(4, 6); // wider, shorter
                break;
            case 'jump':
                this.player.setTexture('player_jump');
                body.setSize(14, 30).setOffset(6, 4);
                break;
            case 'run':
                this.player.setTexture(Math.floor(this.time.now / 100) % 2 === 0 ? 'player_run1' : 'player_run2');
                body.setSize(14, 34).setOffset(6, 4);
                break;
            default:
                this.player.setTexture('player_idle');
                body.setSize(14, 34).setOffset(6, 4);
                break;
        }
        void onGround; void moveX;
    }

    // ─── Shooting ────────────────────────────────────────────────────────────

    private shootPlayer() {
        if (this.weapon === 'B') {
            this.activateBarrier();
            return;
        }

        const angle = this.getAimAngle();
        const ox = Math.cos(angle) * 22;
        const oy = Math.sin(angle) * 16;

        const fire = (a: number) => this.bullets.fireBullet(this.player.x + ox, this.player.y + oy, a, this.weapon);

        const lvl2 = this.weaponLevel >= 2;
        if (this.weapon === 'S') {
            // 5-way, or a denser 7-way when upgraded
            const offs = lvl2 ? [-0.5, -0.32, -0.16, 0, 0.16, 0.32, 0.5] : [-0.35, -0.18, 0, 0.18, 0.35];
            offs.forEach(off => fire(angle + off));
        } else if (lvl2) {
            // upgraded single-shot weapons fire a tight twin stream
            fire(angle - 0.05);
            fire(angle + 0.05);
        } else {
            fire(angle);
        }

        // Muzzle flash at the gun tip
        const flash = this.add.sprite(this.player.x + ox, this.player.y + oy, 'muzzle')
            .setRotation(angle).setTint(WEAPONS[this.weapon].color).setDepth(11).setScale(0.9);
        this.tweens.add({ targets: flash, scale: 0.2, alpha: 0, duration: 90, onComplete: () => flash.destroy() });

        const sfxMap: Record<WeaponType, string> = {
            NORMAL: 'laser_fire', M: 'machine_fire', S: 'spread_fire',
            L: 'beam_fire', F: 'laser_fire', B: 'laser_fire', G: 'beam_fire',
        };
        sounds.playSFX(sfxMap[this.weapon]);
        this.addScore(10);
    }

    private getAimAngle(): number {
        const dx = this.aimDirX;
        const dy = this.aimDirY;
        const key = `${dx},${dy}`;
        return EIGHT_WAY[key] ?? (this.facing > 0 ? 0 : Math.PI);
    }

    private activateBarrier() {
        if (this.invulnerable) return;
        this.invulnerable = true;
        this.player.setAlpha(0.55).setTint(0x00ffff);
        this.time.delayedCall(9000, () => {
            this.invulnerable = false;
            this.player.setAlpha(1).clearTint();
            this.collectWeapon('NORMAL');
        });
    }

    // ─── Player Hit / Lives ───────────────────────────────────────────────────

    private handlePlayerHit() {
        if (this.playerDead || this.invulnerable || this.time.now < this.invulnUntil) return;

        // Decrement local counter first (synchronous — no React roundtrip)
        this.lives = Math.max(0, this.lives - 1);
        this.registry.get('react_updateLives')?.(-1); // sync to React UI
        sounds.playSFX('player_hit');
        this.cameras.main.shake(220, 0.01);
        this.damageFlash();   // red edge vignette instead of a blinding full-screen wash
        this.hitStop(60);     // brief freeze for impact
        if (window.navigator?.vibrate) window.navigator.vibrate(90);

        if (this.lives <= 0) {
            this.playerDeathSequence();
            return;
        }

        // Classic Contra: losing a life drops you back to the basic rifle.
        if (this.weapon !== 'NORMAL') this.collectWeapon('NORMAL');
        this.weaponLevel = 1;

        // Brief mercy invulnerability — TIME-based (not frame-counted) so it lasts
        // the same 1.2 s on a 60 Hz or 144 Hz display. The old frame-counted value
        // (180) was ~3 s at 60 Hz, long enough that the player seemed to take no
        // damage at all between hits.
        this.invulnUntil = this.time.now + 1200;
        this.player.setTint(0xff4444);
        this.time.delayedCall(400, () => {
            if (this.player.active) this.player.clearTint();
        });
        // Blink for the duration of the i-frames (≈1.2 s: 100 ms × 2 × (5+1)).
        this.tweens.add({
            targets: this.player, alpha: 0.3, duration: 100,
            yoyo: true, repeat: 5,
            onComplete: () => { if (this.player.active) this.player.setAlpha(1); },
        });
    }

    // Classic Contra death: launch the soldier up, spin, fade, then game over.
    private playerDeathSequence() {
        if (this.playerDead) return;
        this.playerDead = true; // handlePlayerHit() bails on this — blocks further hits
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(Phaser.Math.Between(-60, 60), -280);
        body.setAllowGravity(true);
        this.cameras.main.shake(320, 0.013);
        this.cameras.main.flash(180, 255, 80, 80);
        sounds.playSFX('boss_explode');
        this.spawnExplosion(this.player.x, this.player.y, 0xff5555);
        this.tweens.add({ targets: this.player, angle: 720, alpha: 0.15, duration: 950, ease: 'Cubic.easeIn' });
        this.time.delayedCall(1000, () => this.gameOver());
    }

    private gameOver() {
        sounds.stopBGM();
        this.registry.get('react_setGameOver')?.(true);
    }

    // Pay-to-continue: restore the player in place and resume the same run.
    private revivePlayer() {
        if (!this.player) return;
        this.playerDead = false;
        this.lives = 3;
        this.registry.set('lives', 3);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(true);
        body.setVelocity(0, 0);
        this.player.setActive(true).setVisible(true).setAlpha(1).setAngle(0).clearTint();
        // brief mercy invulnerability after reviving (time-based, ~1.5 s)
        this.invulnUntil = this.time.now + 1500;
        this.tweens.add({ targets: this.player, alpha: 0.35, duration: 120, yoyo: true, repeat: 6,
            onComplete: () => { if (this.player.active) this.player.setAlpha(1); } });
        this.cameras.main.flash(200, 80, 255, 120);
        sounds.playSFX('powerup');
        if (this.levelData) sounds.playBGM(this.levelData.bgm);
    }

    // ─── Weapons / Pickups ────────────────────────────────────────────────────

    private collectWeapon(w: WeaponType) {
        if (w === this.weapon && w !== 'NORMAL' && this.weaponLevel < 2) {
            // same weapon again → upgrade
            this.weaponLevel++;
            this.popLabel(this.player.x, this.player.y - 34, 'WEAPON UP!', '#00ffaa');
        } else {
            this.weapon = w;
            this.weaponLevel = 1;
        }
        this.registry.set('weapon', w);
        this.registry.get('react_updateWeapon')?.(w, this.weaponLevel);
        sounds.playSFX('powerup');
        // Visual flash
        this.cameras.main.flash(180, 255, 255, 100);
    }

    /** Floating label (e.g. "WEAPON UP!") at a world position. */
    private popLabel(x: number, y: number, text: string, color: string) {
        const t = this.add.text(x, y, text, {
            fontFamily: '"Press Start 2P", monospace', fontSize: '8px',
            color, stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(27);
        this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    }

    // ─── Boss ─────────────────────────────────────────────────────────────────

    private updateBoss(_time: number) {
        if (this.boss && this.boss.active) this.boss.update();
    }

    private triggerBossArena() {
        if (this.bossTriggered) return;
        this.bossTriggered = true;

        const bx = this.levelData.worldWidth - 260;
        const by = 380;

        // Lock the camera on the boss arena (the right edge of the level). The
        // player comes to rest against the right world wall, so frame the view so
        // the world's right edge is flush with the screen — keeping both the boss
        // and the player visible for the whole fight (previously the player ended
        // up off-screen to the right).
        const W = this.levelData.worldWidth;
        const camX = W - this.scale.width / 2;
        this.cameras.main.stopFollow();
        this.cameras.main.pan(camX, 300, 600, 'Sine.easeInOut');

        switch (this.levelData.id) {
            case 1: this.boss = new DeFiDestroyer(this, bx, by); break;
            case 2: this.boss = new FlashLoanFalcon(this, bx, by); break;
            case 3: this.boss = new RugPullReaper(this, bx, by); break;
            case 4: this.boss = new HashRateHydra(this, bx, by); break;
            default: this.boss = new SatoshiSentinel(this, bx, by); break;
        }

        this.cameras.main.flash(600, 255, 0, 0);
        this.cameras.main.shake(400, 0.006);
        this.bossReveal(this.levelData.id, this.boss.bossName);
        sounds.playBGM('boss_theme');
    }

    // Called by BossBase after death animation finishes
    public onBossDefeated() {
        sounds.playSFX('level_clear');
        this.cameras.main.flash(1000, 0, 255, 80);
        this.addScore(5000 * this.levelData.difficultyMod);

        const nextIdx = this.currentLevelIndex + 1;
        if (nextIdx >= LEVELS.length) {
            // All levels cleared — fade to the victory screen
            this.time.delayedCall(1000, () => {
                this.cameras.main.fadeOut(600, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('WinScene', { score: this.registry.get('score') });
                });
            });
        } else {
            this.time.delayedCall(1400, () => {
                this.currentLevelIndex = nextIdx;
                this.levelData = LEVELS[this.currentLevelIndex];
                this.enemies.clear(true, true);
                this.pods.clear(true, true);
                this.pickups.clear(true, true);
                if (this.bullets) this.bullets.getChildren().forEach(b => (b as any).kill?.());
                if (this.enemyBullets) this.enemyBullets.getChildren().forEach(b => (b as any).kill?.());
                this.setupLevel();
                this.cameras.main.startFollow(this.player, true, 0.12, 0.1);
            });
        }
    }

    // ─── Scroll-based Spawning ────────────────────────────────────────────────

    private updateScrollSpawns() {
        const camRight = this.cameras.main.scrollX + this.cameras.main.width;
        const W = this.levelData.worldWidth;

        // Enemy waves
        if (camRight > this.enemyWaveX && this.enemyWaveX < W - 800) {
            this.spawnEnemyWave(this.enemyWaveX, this.enemyWaveX + 600);
            this.enemyWaveX += Phaser.Math.Between(700, 950); // wider gaps = breathing room
        }

        // Authored set-piece beats
        for (const beat of this.beats) {
            if (!beat.fired && this.player.x > beat.x) {
                beat.fired = true;
                beat.run();
            }
        }

        // Boss trigger — player reaches right 85% of level
        if (!this.bossTriggered && this.player.x > W * 0.85) {
            this.triggerBossArena();
        }

        // Weapon pods (come early & often so you reach the fun guns quickly)
        if (camRight > this.podWaveX && this.podWaveX < W - 600) {
            this.spawnPod(this.podWaveX + 200);
            this.podWaveX += Phaser.Math.Between(550, 950);
        }
    }

    private spawnEnemyWave(xFrom: number, xTo: number) {
        // Cap simultaneous enemies so ambient waves never stack into an unfair
        // wall (they used to pile up to a dozen+ on screen). Set-pieces
        // (mini-boss, gauntlet) spawn directly and intentionally exceed this.
        const cap = 4 + Math.floor(this.levelData.difficultyMod * 1.5);
        const active = this.enemies.countActive(true);
        if (active >= cap) return;
        const want = 2 + Math.floor((this.levelData.difficultyMod - 1) * 2);
        const count = Math.min(want, cap - active);
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(xFrom, xTo);
            const r = Math.random();
            // mix in flying drones for aerial threat (very Contra)
            const type: 'turret' | 'drone' | 'jumper' | 'runner' =
                r < 0.12 ? 'turret' : r < 0.30 ? 'drone' : r < 0.50 ? 'jumper' : 'runner';
            // turrets sit on the ground, drones hover, others fall in from above
            const y = type === 'turret' ? 540 : type === 'drone' ? Phaser.Math.Between(120, 240) : 300;
            const enemy = new Enemy(this, x, y, type);
            this.enemies.add(enemy);
        }
    }

    private spawnPod(x: number) {
        const weapon = POWERUP_LETTERS[Math.floor(Math.random() * POWERUP_LETTERS.length)];
        const pod = new WeaponPod(this, x, 180, weapon);
        this.pods.add(pod);
    }

    // ─── Authored set-pieces ──────────────────────────────────────────────────

    // Per-level set-piece flavour text: [ambush, cannon, elite, gauntlet, gate].
    private static readonly BEAT_LABELS: Record<number, string[]> = {
        1: ['INCOMING DRONES', 'WALL CANNON', 'DEFI ENFORCER', 'HOLD THE LINE', 'BREACH THE GATE'],
        2: ['PACKET SWARM', 'FIREWALL CANNON', 'VALIDATOR', 'BRIDGE DEFENSE', 'CROSS THE CHAIN'],
        3: ['DRAIN DRONES', 'POOL TURRET', 'WHALE', 'LIQUIDITY CRISIS', 'THE DEEP END'],
        4: ['RIG DRONES', 'HASH CANNON', 'OVERCLOCKER', 'THERMAL THROTTLE', 'PEAK ASSAULT'],
        5: ['SENTINEL DRONES', 'GENESIS CANNON', 'PROTOCOL GUARD', 'FINAL STAND', 'THE SOURCE'],
    };

    private buildBeats() {
        const ld = this.levelData;
        const W = ld.worldWidth;
        const d = ld.difficultyMod;
        const L = GameScene.BEAT_LABELS[ld.id] ?? GameScene.BEAT_LABELS[1];
        // Escalating, hand-paced beats scaled across the level width. Every level
        // now gets: drone ambush → cannon gate → ELITE mini-boss → gauntlet → gate.
        this.beats = [
            { x: W * 0.20, fired: false, run: () => { this.banner(L[0]); this.spawnDrones(2 + Math.floor(d), W * 0.26); } },
            { x: W * 0.38, fired: false, run: () => { this.banner(L[1]); this.spawnCannon(W * 0.41); this.spawnEnemyWave(W * 0.36, W * 0.43); } },
            { x: W * 0.54, fired: false, run: () => { this.banner('⚡ ELITE: ' + L[2]); this.spawnMiniBoss(W * 0.585); } },
            { x: W * 0.70, fired: false, run: () => { this.banner(L[3]); this.spawnGauntlet(W * 0.74); } },
            { x: W * 0.80, fired: false, run: () => { this.banner(L[4]); this.spawnCannon(W * 0.83); this.spawnDrones(2, W * 0.80); } },
        ];
    }

    private spawnCannon(x: number) {
        const c = new Enemy(this, x, 522, 'cannon');
        this.enemies.add(c);
    }

    // Mid-stage mini-boss: an elite heavy cannon with a drone escort.
    private spawnMiniBoss(x: number) {
        const c = new Enemy(this, x, 512, 'cannon');
        c.makeElite(26 + Math.floor(this.levelData.difficultyMod * 8));
        this.enemies.add(c);
        this.spawnDrones(2, x - 90);
        this.cameras.main.shake(220, 0.006);
    }

    private spawnDrones(n: number, x: number) {
        for (let i = 0; i < n; i++) {
            const d = new Enemy(this, x + i * 70, Phaser.Math.Between(120, 220), 'drone');
            this.enemies.add(d);
        }
    }

    private spawnGauntlet(center: number) {
        // enemies converge from both sides
        for (let i = 0; i < 3; i++) {
            this.enemies.add(new Enemy(this, center - 300 - i * 60, 300, i === 1 ? 'jumper' : 'runner'));
            this.enemies.add(new Enemy(this, center + 300 + i * 60, 300, i === 1 ? 'jumper' : 'runner'));
        }
        this.spawnDrones(2, center);
    }

    /** Dramatic centered boss warning. */
    /** Dramatic boss intro card: portrait + name on a dark veil. The boss art is
     *  on a black background, so it blends seamlessly into the veil. Falls back to
     *  the plain WARNING flash when no `bg_boss<id>` artwork is present. */
    private bossReveal(bossId: number, name: string) {
        const key = 'bg_boss' + bossId;
        if (!this.textures.exists(key)) { this.bossWarning(); return; }

        const W = this.scale.width, H = this.scale.height;
        const cx = W / 2, cy = H / 2;
        const D = 60;

        const veil = this.add.rectangle(cx, cy, W, H, 0x000000).setScrollFactor(0).setDepth(D).setAlpha(0);
        const img = this.add.image(cx, cy - 12, key).setScrollFactor(0).setDepth(D + 1).setAlpha(0);
        const src = this.textures.get(key).getSourceImage() as { width: number; height: number };
        const fit = (H * 0.64) / src.height;
        img.setScale(fit * 0.85);
        const half = (src.height * fit) / 2;

        const warn = this.add.text(cx, cy - half - 10, '⚠  WARNING  ⚠', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '12px',
            color: '#ffcc33', stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2).setAlpha(0);
        const nameT = this.add.text(cx, cy + half + 4, name.toUpperCase(), {
            fontFamily: '"Press Start 2P", monospace', fontSize: '16px',
            color: '#ff3b56', stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2).setAlpha(0);

        const all = [veil, img, warn, nameT];
        this.tweens.add({ targets: veil, alpha: 0.82, duration: 260 });
        this.tweens.add({ targets: img, alpha: 1, scaleX: fit, scaleY: fit, duration: 480, ease: 'Back.easeOut' });
        this.tweens.add({ targets: [warn, nameT], alpha: 1, duration: 300, delay: 200 });
        this.time.delayedCall(1700, () => {
            this.tweens.add({
                targets: all, alpha: 0, duration: 380,
                onComplete: () => all.forEach(o => o.destroy()),
            });
        });
    }

    private bossWarning() {
        const cx = this.scale.width / 2, cy = this.scale.height / 2;
        const t = this.add.text(cx, cy, '⚠  WARNING  ⚠', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '22px',
            color: '#ff2d2d', stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(45).setAlpha(0);
        this.tweens.add({ targets: t, alpha: 1, duration: 160, yoyo: true, repeat: 3, hold: 220,
            onComplete: () => t.destroy() });
    }

    /** Brief centered announcement for a set-piece. */
    private banner(text: string) {
        const t = this.add.text(this.scale.width / 2, 70, text, {
            fontFamily: '"Press Start 2P", monospace', fontSize: '12px',
            color: '#ff4466', stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(40).setAlpha(0);
        this.tweens.add({ targets: t, alpha: 1, duration: 200, yoyo: true, hold: 1100, onComplete: () => t.destroy() });
    }

    // ─── Public helpers (called by entities) ─────────────────────────────────

    public addScore(val: number) {
        this.registry.get('react_updateScore')?.(Math.round(val));
    }

    /** Floating "+points" popup at a world position (kill feedback). */
    public floatScore(x: number, y: number, points: number) {
        const t = this.add.text(x, y, '+' + points, {
            fontFamily: '"Press Start 2P", monospace', fontSize: '8px',
            color: '#ffec70', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(26);
        this.tweens.add({ targets: t, y: y - 38, alpha: 0, duration: 760, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    }

    public sfx(key: string) {
        sounds.playSFX(key);
    }

    public spawnExplosion(x: number, y: number, tint = 0xffaa00) {
        // bright white core flash
        const core = this.add.circle(x, y, 11, 0xffffff, 0.9).setDepth(21);
        this.tweens.add({ targets: core, scale: 0.1, alpha: 0, duration: 170, onComplete: () => core.destroy() });
        // expanding shock ring
        const ring = this.add.circle(x, y, 6, tint, 0).setStrokeStyle(2, tint, 0.9).setDepth(20);
        this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
        // flung sparks
        const count = 9;
        for (let i = 0; i < count; i++) {
            const dot = this.add.sprite(x, y, 'spark').setTint(tint).setDepth(20);
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.4;
            const dist = Phaser.Math.Between(22, 64);
            this.tweens.add({
                targets: dot,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0.2,
                duration: 350 + Math.random() * 200,
                onComplete: () => dot.destroy(),
            });
        }
    }

    /** Tiny spark burst at a bullet→enemy impact (non-kill feedback). */
    public hitSpark(x: number, y: number, tint = 0xffee88) {
        for (let i = 0; i < 4; i++) {
            const dot = this.add.sprite(x, y, 'spark').setTint(tint).setDepth(22).setScale(0.7);
            const a = Math.random() * Math.PI * 2;
            const d = Phaser.Math.Between(8, 22);
            this.tweens.add({
                targets: dot, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
                alpha: 0, scale: 0.1, duration: 160 + Math.random() * 120, onComplete: () => dot.destroy(),
            });
        }
    }

    /** Brief freeze-frame for impact weight. Cheap; guarded against stacking. */
    public hitStop(ms = 55) {
        if (this.physics.world.isPaused) return;
        this.physics.world.pause();
        // scene clock keeps running while physics is paused, so this still fires
        this.time.delayedCall(ms, () => this.physics.world.resume());
    }

    /** Red screen-edge vignette pulse on player damage — readable feedback that
     *  doesn't wash the whole screen red like a full-screen flash. */
    private damageFlash() {
        if (!this.vignette) {
            const W = this.scale.width, H = this.scale.height;
            if (!this.textures.exists('dmg_vignette')) {
                const c = document.createElement('canvas');
                c.width = W; c.height = H;
                const g = c.getContext('2d');
                if (g) {
                    const grad = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.62);
                    grad.addColorStop(0, 'rgba(255,0,0,0)');
                    grad.addColorStop(1, 'rgba(255,16,16,0.9)');
                    g.fillStyle = grad; g.fillRect(0, 0, W, H);
                    this.textures.addCanvas('dmg_vignette', c);
                }
            }
            this.vignette = this.add.image(W / 2, H / 2, 'dmg_vignette').setScrollFactor(0).setDepth(40).setAlpha(0);
        }
        this.tweens.killTweensOf(this.vignette);
        this.vignette.setAlpha(0.7);
        this.tweens.add({ targets: this.vignette, alpha: 0, duration: 360, ease: 'Cubic.easeOut' });
    }

    /** Small dust puff (landing). */
    private spawnDust(x: number, y: number) {
        for (let i = 0; i < 4; i++) {
            const dir = i < 2 ? -1 : 1;
            const d = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0xbfc8d4, 0.5).setDepth(9);
            this.tweens.add({
                targets: d,
                x: x + dir * Phaser.Math.Between(10, 26),
                y: y - Phaser.Math.Between(2, 8),
                alpha: 0, scale: 0.3, duration: 280,
                onComplete: () => d.destroy(),
            });
        }
    }

    public maybeDropPowerup(x: number, y: number) {
        if (Math.random() < 0.08) {
            const weapon = POWERUP_LETTERS[Math.floor(Math.random() * POWERUP_LETTERS.length)];
            this.dropWeapon(x, y, weapon);
        }
    }

    /** Always drop a specific weapon pickup (used by set-piece kills). */
    public dropWeapon(x: number, y: number, weapon: WeaponType) {
        const item = new PowerUpItem(this, x, y - 20, weapon);
        // The pickups↔platforms collider is registered once in setupCollisions and
        // applies to members added later, so no per-item collider is needed here.
        this.pickups.add(item);
    }

    // ─── HUD ─────────────────────────────────────────────────────────────────

    private hudText?: Phaser.GameObjects.Text;
    private createLevelHud(name: string) {
        if (this.hudText) this.hudText.destroy();
        this.hudText = this.add.text(this.scale.width / 2, 10, `AREA ${this.currentLevelIndex + 1}: ${name.toUpperCase()}`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#00ff00',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(30);

        this.tweens.add({
            targets: this.hudText, alpha: 0, duration: 200,
            delay: 3000, onComplete: () => this.hudText?.setVisible(false),
        });
    }

    // ─── React State Sync ─────────────────────────────────────────────────────

    private syncRegistryToReact() {
        // Nothing needed — React state is mutated via callbacks stored in registry.
        // This stub exists for future per-frame sync if needed.
    }
}
