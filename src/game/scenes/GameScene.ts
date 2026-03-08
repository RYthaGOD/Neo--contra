import { BulletPool } from '../entities/BulletPool';
import { Enemy } from '../entities/Enemy';
import { DeFiDestroyer, FlashLoanFalcon, RugPullReaper, HashRateHydra, SatoshiSentinel, BossBase } from '../entities/Bosses';
import { sounds } from '../SoundManager';
import { LEVELS, LevelData } from '../LevelConfig';

export class GameScene extends Phaser.Scene {
    public player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private shootKey!: Phaser.Input.Keyboard.Key;
    public bullets!: BulletPool;
    private enemies!: Phaser.Physics.Arcade.Group;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private boss?: BossBase;
    private mobileDir = { x: 0, y: 0 };
    private currentLevelIndex: number = 0;
    private levelData: LevelData = LEVELS[0];
    private invulnerable: boolean = false;

    private handlers: { [key: string]: (e: any) => void } = {};

    constructor() {
        super('GameScene');
    }

    create() {
        // Create Platform Texture
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0x00ffff, 0.5); // Cyan glassmorphism
        graphics.fillRect(0, 0, 32, 32);
        graphics.generateTexture('platform', 32, 32);

        // Add platforms
        this.platforms = this.physics.add.staticGroup();
        this.generatePlatforms();

        // Add player
        this.player = this.physics.add.sprite(100, 500, 'player_placeholder');
        this.player.setCollideWorldBounds(true);

        // Controls
        // Mobile Controls Bridge
        // Mobile Controls Bridge
        this.handlers.jump = () => {
            if (this.player.body.blocked.down) {
                this.player.setVelocityY(-400); // Slightly stronger jump for mobile
            }
        };
        this.handlers.fire = () => this.shoot();
        this.handlers.move = (e: any) => { this.mobileDir = e.detail; };

        window.addEventListener('game_jump', this.handlers.jump);
        window.addEventListener('game_fire', this.handlers.fire);
        window.addEventListener('game_move', this.handlers.move);

        this.events.on('shutdown', () => {
            window.removeEventListener('game_jump', this.handlers.jump);
            window.removeEventListener('game_fire', this.handlers.fire);
            window.removeEventListener('game_move', this.handlers.move);
        });

        sounds.playBGM('neon_jungle');

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        }

        // Projectiles
        this.bullets = new BulletPool(this);

        // Enemies
        this.enemies = this.physics.add.group({
            classType: Enemy,
            runChildUpdate: true
        });

        // Initial Enemies
        this.spawnEnemies();

        // World Bounds & Camera
        this.physics.world.setBounds(0, 0, 3200, 600);
        this.cameras.main.setBounds(0, 0, 3200, 600);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBackgroundColor('#000033'); // Darker cyber blue

        // Collisions
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);

        this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
            (e as Enemy).takeDamage(1);
            b.destroy();
        });

        this.physics.add.collider(this.player, this.enemies, () => {
            this.handlePlayerHit();
        });

        // Bullet -> Boss overlap (using Phaser physics instead of manual check)
        this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
            if (e instanceof BossBase) {
                (e as BossBase).takeDamage(1);
            } else {
                (e as Enemy).takeDamage(1);
            }
            (b as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
        });

        // Boss trigger zone
        this.physics.add.overlap(this.player, this.add.zone(this.levelData.worldWidth - 200, 300, 100, 600), () => {
            this.triggerBoss();
        }, undefined, this);

        this.updateAesthetics();
    }

    private updateAesthetics() {
        this.cameras.main.setBackgroundColor(this.levelData.backgroundColor);
        this.add.text(10, 10, `NEOCONTRA: ${this.levelData.name.toUpperCase()}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#00ff00'
        }).setScrollFactor(0);
    }

    private handlePlayerHit() {
        if (this.invulnerable) return; // Barrier active

        this.player.setTint(0xff0000);
        this.updateLives(-1);

        // Haptic Feedback (Rumble)
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(100);
        }

        sounds.playSFX('player_hit');

        this.time.delayedCall(500, () => {
            this.player.clearTint();
            if (this.registry.get('lives') > 0) {
                this.player.setPosition(100, 500);
            }
        });
    }

    private getAimAngle(): number {
        let angle = 0;
        if (this.cursors.right.isDown) {
            if (this.cursors.up.isDown) angle = -Math.PI / 4;
            else if (this.cursors.down.isDown) angle = Math.PI / 4;
            else angle = 0;
        } else if (this.cursors.left.isDown) {
            if (this.cursors.up.isDown) angle = -3 * Math.PI / 4;
            else if (this.cursors.down.isDown) angle = 3 * Math.PI / 4;
            else angle = Math.PI;
        } else if (this.cursors.up.isDown) {
            angle = -Math.PI / 2;
        } else if (this.cursors.down.isDown) {
            angle = Math.PI / 2;
        } else {
            angle = this.player.flipX ? Math.PI : 0;
        }
        return angle;
    }

    update() {
        if (!this.cursors || this.registry.get('isGameOver')) return;

        const speed = 200;
        this.player.setVelocity(0);

        // Update Boss
        if (this.boss) this.boss.update();

        // Keyboard Logic
        if (this.cursors) {
            if (this.cursors.left.isDown) {
                this.player.setVelocityX(-speed);
                this.player.setFlipX(true);
            } else if (this.cursors.right.isDown) {
                this.player.setVelocityX(speed);
                this.player.setFlipX(false);
            }

            if (this.cursors.up.isDown && (this.player.body as Phaser.Physics.Arcade.Body).blocked.down) {
                this.player.setVelocityY(-speed * 1.5);
            }
        }

        // Mobile Logic Overrides/Addition
        if (Math.abs(this.mobileDir.x) > 0.1) {
            this.player.setVelocityX(this.mobileDir.x * speed);
            this.player.setFlipX(this.mobileDir.x < 0);
        }

        // Shooting logic (8-way aim)
        if (Phaser.Input.Keyboard.JustDown(this.shootKey)) {
            this.shoot();
        }

        // ESC to toggle shop
        if (this.input.keyboard && Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC))) {
            const toggle = this.registry.get('react_toggleShop');
            if (toggle) toggle(true);
        }
    }

    private updateScore(val: number) {
        const update = this.registry.get('react_updateScore');
        if (update) update(val);
    }

    private updateLives(val: number) {
        const update = this.registry.get('react_updateLives');
        if (update) update(val);
    }

    private shoot() {
        const angle = this.getAimAngle();
        const weaponType = this.registry.get('weapon') || 'NORMAL';

        const fire = (ang: number) => {
            const offsetX = Math.cos(ang) * 20;
            const offsetY = Math.sin(ang) * 20;
            this.bullets.fireBullet(this.player.x + offsetX, this.player.y + offsetY, ang, weaponType);
        };

        switch (weaponType) {
            case 'S': // Spread: 5 bullets
                [-0.4, -0.2, 0, 0.2, 0.4].forEach(off => fire(angle + off));
                break;
            case 'B': // Barrier: Temporary invulnerability
                this.activateBarrier();
                break;
            default:
                fire(angle);
        }

        sounds.playSFX('laser_fire');
        this.updateScore(10);
    }

    private activateBarrier() {
        if (this.invulnerable) return;
        this.invulnerable = true;
        this.player.setAlpha(0.5);
        this.player.setTint(0x00ffff);

        // Return to normal weapon after activation? No, original barrier is a duration.
        this.time.delayedCall(10000, () => {
            this.invulnerable = false;
            this.player.setAlpha(1);
            this.player.clearTint();
            this.registry.get('react_updateWeapon')?.('NORMAL');
        });
    }

    private spawnEnemies() {
        const count = Math.floor(5 * this.levelData.difficultyMod);
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(500, this.levelData.worldWidth - 400);
            this.enemies.add(new Enemy(this, x, 300));
        }
    }

    private triggerBoss() {
        if (this.boss) return;

        switch (this.levelData.id) {
            case 2: this.boss = new FlashLoanFalcon(this, this.levelData.worldWidth - 100, 350); break;
            case 3: this.boss = new RugPullReaper(this, this.levelData.worldWidth - 100, 350); break;
            case 4: this.boss = new HashRateHydra(this, this.levelData.worldWidth - 100, 350); break;
            case 5: this.boss = new SatoshiSentinel(this, this.levelData.worldWidth - 100, 350); break;
            default: this.boss = new DeFiDestroyer(this, this.levelData.worldWidth - 100, 350);
        }

        this.enemies.add(this.boss);
        this.cameras.main.flash(500, 255, 0, 0);

        sounds.playBGM('boss_theme');
        console.log(`BOSS ALERT: ${this.levelData.bossType.toUpperCase()} DETECTED`);
    }

    private generatePlatforms() {
        this.platforms.clear(true, true);

        // Dynamic Ground based on world width
        const groundUnits = Math.ceil(this.levelData.worldWidth / 32);
        for (let i = 0; i < groundUnits; i++) {
            this.platforms.create(i * 32, 580, 'platform').setTint(this.levelData.platformColor);
        }

        // Procedural obstacles based on level ID (aesthetic variations)
        const platformCount = 10 + (this.levelData.id * 5);
        for (let i = 0; i < platformCount; i++) {
            const x = Phaser.Math.Between(500, this.levelData.worldWidth - 500);
            const y = Phaser.Math.Between(200, 450);
            const scaleX = Phaser.Math.Between(2, 6);
            this.platforms.create(x, y, 'platform').setScale(scaleX, 1).setTint(this.levelData.platformColor).refreshBody();
        }
    }

    public nextLevel() {
        this.currentLevelIndex = (this.currentLevelIndex + 1) % LEVELS.length;
        this.levelData = LEVELS[this.currentLevelIndex];

        // Clear current entities
        this.enemies.clear(true, true);
        this.bullets.clear(true, true);
        this.boss?.destroy();
        this.boss = undefined;

        this.player.setPosition(100, 500);
        this.generatePlatforms(); // Important: Regen platforms for new level
        this.cameras.main.flash(1000, 0, 255, 0);
        this.spawnEnemies();
        this.updateScore(1000);
        this.updateAesthetics();
        sounds.playBGM(this.levelData.bgm);
        sounds.playSFX('level_clear');
    }
}
