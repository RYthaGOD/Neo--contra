import Phaser from 'phaser';
import { BulletPool } from '../entities/BulletPool';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { sounds } from '../SoundManager';

export class GameScene extends Phaser.Scene {
    public player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private shootKey!: Phaser.Input.Keyboard.Key;
    public bullets!: BulletPool;
    private enemies!: Phaser.Physics.Arcade.Group;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private boss?: Boss;
    private mobileDir = { x: 0, y: 0 };
    private difficulty: number = 1;

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

        // Ground
        for (let i = 0; i < 100; i++) {
            this.platforms.create(i * 32, 580, 'platform');
        }

        // Floating Platforms
        this.platforms.create(400, 450, 'platform').setScale(4, 1).refreshBody();
        this.platforms.create(800, 350, 'platform').setScale(4, 1).refreshBody();
        this.platforms.create(1200, 450, 'platform').setScale(4, 1).refreshBody();

        // Add player
        this.player = this.physics.add.sprite(100, 500, 'player_placeholder');
        this.player.setCollideWorldBounds(true);

        // Controls
        // Mobile Controls Bridge
        window.addEventListener('game_jump', () => {
            if (this.player.body.blocked.down) {
                this.player.setVelocityY(-300);
            }
        });
        window.addEventListener('game_fire', () => {
            this.shoot();
        });
        window.addEventListener('game_move', (e: any) => {
            this.mobileDir = e.detail;
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

        // Boss trigger zone
        this.physics.add.overlap(this.player, this.add.zone(3000, 300, 100, 600), () => {
            this.triggerBoss();
        }, undefined, this);

        this.add.text(10, 10, 'NEOCONTRA: SOLANA ASSAULT', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            color: '#00ff00'
        });
    }

    private handlePlayerHit() {
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
        const offsetX = Math.cos(angle) * 20;
        const offsetY = Math.sin(angle) * 20;
        this.bullets.fireBullet(this.player.x + offsetX, this.player.y + offsetY, angle);

        sounds.playSFX('laser_fire');

        // Interaction with Boss
        if (this.boss && Phaser.Geom.Intersects.RectangleToRectangle(this.boss.getBounds(), new Phaser.Geom.Rectangle(this.player.x + offsetX, this.player.y + offsetY, 8, 8))) {
            this.boss.takeDamage(1);
        }

        // Placeholder score increment
        this.updateScore(10);
    }

    private spawnEnemies() {
        for (let i = 0; i < 5 + this.difficulty; i++) {
            const x = Phaser.Math.Between(500, 2800);
            this.enemies.add(new Enemy(this, x, 300));
        }
    }

    private triggerBoss() {
        if (this.boss) return;

        this.boss = new Boss(this, 3100, 300);
        this.cameras.main.flash(500, 255, 0, 0);

        sounds.playBGM('boss_theme');
        console.log('BOSS ALERT: DEFIDESTROYER PRIME DETECTED');
    }

    public nextLevel() {
        this.difficulty++;
        this.boss?.destroy();
        this.boss = undefined;
        this.player.setPosition(100, 500);
        this.cameras.main.flash(1000, 0, 255, 0);
        this.spawnEnemies();
        this.updateScore(1000);
        sounds.playBGM('neon_jungle');
        sounds.playSFX('level_clear');
    }
}
