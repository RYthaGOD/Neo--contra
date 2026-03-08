import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    private health: number = 2;
    private fireTimer: Phaser.Time.TimerEvent | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_placeholder');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setImmovable(false);
        body.setAllowGravity(true);

        // Simple Patrol Logic
        this.setVelocityX(-100);
    }

    update() {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        if (body.blocked.left) {
            this.setVelocityX(100);
            this.setFlipX(true);
        } else if (body.blocked.right) {
            this.setVelocityX(-100);
            this.setFlipX(false);
        }
    }

    takeDamage(amount: number) {
        this.health -= amount;
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => this.clearTint());

        if (this.health <= 0) {
            this.explode();
        }
    }

    private explode() {
        // Emit score event via registry (bridged to React)
        this.scene.registry.get('react_updateScore')?.(100);

        this.destroy();
    }
}
