import Phaser from 'phaser';

export abstract class BossBase extends Phaser.Physics.Arcade.Sprite {
    protected health: number;
    protected maxHealth: number;
    protected stateTimer = 0;
    public readonly bossName: string;

    private barBg!: Phaser.GameObjects.Rectangle;
    private barFill!: Phaser.GameObjects.Rectangle;
    private nameText!: Phaser.GameObjects.Text;
    private dead = false;

    constructor(scene: Phaser.Scene, x: number, y: number, health: number, name: string) {
        super(scene, x, y, 'boss_core');
        this.health = health;
        this.maxHealth = health;
        this.bossName = name;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(false);
        this.setImmovable(true);
        (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        this.createHud();
    }

    private createHud() {
        const cam = this.scene.cameras.main;
        const w = cam.width;
        this.nameText = this.scene.add.text(w / 2, 56, this.bossName.toUpperCase(), {
            fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#ff4466',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(50);
        this.barBg = this.scene.add.rectangle(w / 2, 74, 300, 12, 0x330011).setScrollFactor(0).setDepth(50).setStrokeStyle(2, 0xff4466);
        this.barFill = this.scene.add.rectangle(w / 2 - 148, 74, 296, 8, 0xff2244).setOrigin(0, 0.5).setScrollFactor(0).setDepth(51);
    }

    private refreshHud() {
        const pct = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        this.barFill.width = 296 * pct;
    }

    public abstract updateAI(): void;

    protected fire(angle: number, speed = 300) {
        (this.scene as any).enemyBullets?.fireEnemy(this.x, this.y, angle, speed);
    }

    protected fireAtPlayer(spread: number[] = [0], speed = 300) {
        const player = (this.scene as any).player;
        if (!player) return;
        const base = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        spread.forEach(off => this.fire(base + off, speed));
    }

    update() {
        if (!this.active || this.dead) return;
        this.stateTimer++;
        this.updateAI();
        this.refreshHud();
    }

    public takeDamage(amount: number) {
        if (this.dead) return;
        this.health -= amount;
        this.scene.cameras.main.shake(80, 0.006);
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => { if (this.active) this.clearTint(); });
        if (this.health <= 0) this.explode();
        else this.refreshHud();
    }

    protected explode() {
        if (this.dead) return;
        this.dead = true;
        const scene = this.scene as any;
        scene.sfx?.('boss_explode');
        scene.floatScore?.(this.x, this.y - 40, 5000);
        scene.cameras?.main?.shake(420, 0.012);
        // Cluster of explosions
        for (let i = 0; i < 8; i++) {
            this.scene.time.delayedCall(i * 70, () => {
                scene.spawnExplosion?.(this.x + Phaser.Math.Between(-40, 40), this.y + Phaser.Math.Between(-40, 40), 0xffaa00);
            });
        }
        this.barBg.destroy();
        this.barFill.destroy();
        this.nameText.destroy();
        this.scene.time.delayedCall(700, () => {
            scene.onBossDefeated?.();
            this.destroy();
        });
        this.setActive(false);
        this.setVisible(false);
    }
}

export class DeFiDestroyer extends BossBase {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 26, 'DeFi Destroyer Prime');
        this.setScale(2.4).setTint(0xff00ff);
    }
    updateAI() {
        this.y = 300 + Math.sin(this.stateTimer * 0.04) * 150;
        if (this.stateTimer % 55 === 0) this.fireAtPlayer([0]);
        if (this.stateTimer % 160 === 0) this.fireAtPlayer([-0.25, 0, 0.25]);
    }
}

export class FlashLoanFalcon extends BossBase {
    private diveState: 'hover' | 'dive' | 'return' = 'hover';
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 34, 'Flash Loan Falcon');
        this.setScale(2.2).setTint(0xffff00);
    }
    updateAI() {
        const player = (this.scene as any).player;
        if (this.diveState === 'hover') {
            this.x = Phaser.Math.Linear(this.x, player.x, 0.04);
            this.y = 130 + Math.sin(this.stateTimer * 0.1) * 40;
            if (this.stateTimer % 50 === 0) this.fireAtPlayer([0], 320);
            if (this.stateTimer % 150 === 0) this.diveState = 'dive';
        } else if (this.diveState === 'dive') {
            this.y += 14;
            if (this.y > 470) this.diveState = 'return';
        } else {
            this.y -= 8;
            if (this.y < 150) this.diveState = 'hover';
        }
    }
}

export class RugPullReaper extends BossBase {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 46, 'Rug Pull Reaper');
        this.setScale(3).setTint(0x00ff66);
    }
    updateAI() {
        if (this.stateTimer % 110 === 0) {
            const view = this.scene.cameras.main.worldView;
            this.x = Phaser.Math.Between(view.x + 200, view.right - 100);
            this.y = Phaser.Math.Between(140, 460);
            this.scene.cameras.main.flash(150, 0, 255, 80);
            // Radial burst on teleport
            for (let i = 0; i < 6; i++) this.fire((Math.PI * 2 / 6) * i, 240);
        }
        if (this.stateTimer % 40 === 0) this.fireAtPlayer([0], 300);
    }
}

export class HashRateHydra extends BossBase {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 60, 'Hash Rate Hydra');
        this.setScale(3.4).setTint(0xff3333);
    }
    updateAI() {
        const view = this.scene.cameras.main.worldView;
        this.x = view.right - 160 + Math.cos(this.stateTimer * 0.02) * 120;
        this.y = 300 + Math.sin(this.stateTimer * 0.03) * 120;
        if (this.stateTimer % 45 === 0) {
            const o = (this.stateTimer % 90 === 0) ? 0 : Math.PI / 8;
            for (let i = 0; i < 8; i++) this.fire((Math.PI * 2 / 8) * i + o, 230);
        }
    }
}

export class SatoshiSentinel extends BossBase {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 90, 'Satoshi Sentinel');
        this.setScale(4).setTint(0xffffff);
    }
    updateAI() {
        const player = (this.scene as any).player;
        const view = this.scene.cameras.main.worldView;
        this.x = Phaser.Math.Linear(this.x, view.x + view.width * 0.7, 0.02);
        this.y = 280 + Math.sin(this.stateTimer * 0.04) * 140;
        if (this.stateTimer % 70 === 0) this.fireAtPlayer([-0.3, -0.15, 0, 0.15, 0.3], 320);
        if (this.stateTimer % 120 === 0) {
            for (let i = 0; i < 10; i++) this.fire((Math.PI * 2 / 10) * i, 220);
        }
        void player;
    }
}
