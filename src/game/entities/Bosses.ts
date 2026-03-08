import Phaser from 'phaser';

export abstract class BossBase extends Phaser.Physics.Arcade.Sprite {
    protected health: number;
    protected maxHealth: number;
    protected stateTimer: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, health: number) {
        super(scene, x, y, texture);
        this.health = health;
        this.maxHealth = health;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.setImmovable(true);
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    }

    public abstract updateAI(): void;

    update() {
        if (!this.active) return;
        this.stateTimer++;
        this.updateAI();
    }

    public takeDamage(amount: number) {
        this.health -= amount;
        this.scene.cameras.main.shake(100, 0.01);
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => this.clearTint());

        if (this.health <= 0) {
            this.explode();
        }
    }

    protected explode() {
        const scene = this.scene as any;
        const difficulty = scene.levelData?.difficultyMod || 1;
        scene.registry.get('react_updateScore')?.(5000 * difficulty);
        if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 300]);
        if (scene.nextLevel) scene.nextLevel();
        this.destroy();
    }
}

export class DeFiDestroyer extends BossBase {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_placeholder', 20);
        this.setScale(3).setTint(0xff00ff);
    }

    updateAI() {
        this.y = 300 + Math.sin(this.stateTimer * 0.05) * 150;
        if (this.stateTimer % 60 === 0) this.fire();
    }

    private fire() {
        const player = (this.scene as any).player;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        (this.scene as any).bullets.fireBullet(this.x, this.y, angle);
    }
}

export class FlashLoanFalcon extends BossBase {
    private diveState: 'hover' | 'dive' | 'return' = 'hover';

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_placeholder', 30);
        this.setScale(2.5).setTint(0xffff00);
    }

    updateAI() {
        const player = (this.scene as any).player;
        if (this.diveState === 'hover') {
            this.x = player.x;
            this.y = 100 + Math.sin(this.stateTimer * 0.1) * 50;
            if (this.stateTimer % 180 === 0) this.diveState = 'dive';
        } else if (this.diveState === 'dive') {
            this.scene.physics.moveTo(this, this.x, 600, 400);
            if (this.y > 500) this.diveState = 'return';
        } else {
            this.scene.physics.moveTo(this, this.x, 100, 200);
            if (this.y < 150) this.diveState = 'hover';
        }
    }
}

export class RugPullReaper extends BossBase {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_placeholder', 40);
        this.setScale(4).setTint(0x00ff00);
    }

    updateAI() {
        if (this.stateTimer % 120 === 0) {
            this.x = Phaser.Math.Between(500, (this.scene as any).levelData.worldWidth - 500);
            this.y = Phaser.Math.Between(100, 500);
            this.scene.cameras.main.flash(200, 0, 255, 0);
        }
    }
}

export class HashRateHydra extends BossBase {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_placeholder', 60);
        this.setScale(5).setTint(0xff0000);
    }

    updateAI() {
        // Multi-directional fire
        if (this.stateTimer % 45 === 0) {
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                (this.scene as any).bullets.fireBullet(this.x, this.y, angle);
            }
        }
        this.x = (this.scene as any).levelData.worldWidth - 500 + Math.cos(this.stateTimer * 0.02) * 200;
    }
}

export class SatoshiSentinel extends BossBase {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_placeholder', 100);
        this.setScale(6).setTint(0xffffff);
    }

    updateAI() {
        const player = (this.scene as any).player;
        if (this.stateTimer % 90 === 0) {
            // Triple fire towards player
            const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            [-0.2, 0, 0.2].forEach(off => {
                (this.scene as any).bullets.fireBullet(this.x, this.y, baseAngle + off);
            });
        }
        this.scene.physics.moveToObject(this, player, 50);
    }
}
