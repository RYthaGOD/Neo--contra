import Phaser from 'phaser';

export class Boss extends Phaser.Physics.Arcade.Sprite {
    private health: number = 20;
    private maxHealth: number = 20;
    private phase: number = 1;
    private stateTimer: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_placeholder');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(3); // Make it a big boss
        this.setTint(0xff00ff); // Boss color
        this.setCollideWorldBounds(true);
        this.setImmovable(true);
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    }

    update() {
        if (!this.active) return;

        this.stateTimer++;

        // Phase 1: Sine wave movement
        if (this.phase === 1) {
            this.y = 300 + Math.sin(this.stateTimer * 0.05) * 150;
            if (this.stateTimer % 60 === 0) {
                this.fireBullet();
            }
            if (this.health < 10) {
                this.phase = 2;
                this.setTint(0xff0000);
            }
        }
        // Phase 2: Aggressive tracking
        else {
            const player = (this.scene as any).player;
            if (player) {
                this.scene.physics.moveToObject(this, player, 150);
            }
            if (this.stateTimer % 30 === 0) {
                this.fireBullet();
            }
        }
    }

    private fireBullet() {
        const bullets = (this.scene as any).bullets;
        if (bullets) {
            // Boss fires at player direction
            const player = (this.scene as any).player;
            const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            bullets.fireBullet(this.x, this.y, angle);
        }
    }

    takeDamage(amount: number) {
        this.health -= amount;
        this.scene.cameras.main.shake(100, 0.01);

        if (this.health <= 0) {
            this.explode();
        }
    }

    private explode() {
        this.scene.registry.get('react_updateScore')?.(5000);
        // Haptic rumble for boss death
        if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100, 50, 300]);

        // Trigger next level transition
        if ((this.scene as any).nextLevel) {
            (this.scene as any).nextLevel();
        }

        this.destroy();
    }
}
