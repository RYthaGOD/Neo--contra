import Phaser from 'phaser';

export type EnemyType = 'runner' | 'turret' | 'jumper' | 'drone' | 'cannon';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    public enemyType: EnemyType;
    private health: number;
    private speed: number;
    private nextFire = 0;
    private nextJump = 0;
    private elite = false;
    public points: number;

    /** Upgrade this enemy into a tougher, larger "elite" mini-boss variant. */
    public makeElite(hp: number) {
        this.elite = true;
        this.health = hp;
        this.points = Math.max(this.points, 1500);
        this.setScale(1.5);          // bigger silhouette; hitbox stays forgiving
        this.setTint(0xffaa33);
        return this;
    }

    constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType = 'runner') {
        super(scene, x, y, type === 'turret' ? 'turret' : type === 'drone' ? 'drone' : type === 'cannon' ? 'cannon' : 'enemy_idle');
        this.enemyType = type;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(false);

        if (type === 'turret') {
            this.health = 4;
            this.speed = 0;
            this.points = 300;
            body.setAllowGravity(false);
            body.setImmovable(true);
            this.setSize(30, 22);
        } else if (type === 'drone') {
            this.health = 2;
            this.speed = 70;
            this.points = 250;
            body.setAllowGravity(false);
            this.setSize(30, 18);
        } else if (type === 'cannon') {
            this.health = 14;          // tough set-piece
            this.speed = 0;
            this.points = 600;
            body.setAllowGravity(false);
            body.setImmovable(true);
            this.setSize(44, 42);
        } else {
            this.health = type === 'jumper' ? 2 : 1;
            this.speed = type === 'jumper' ? 110 : 90;
            this.points = type === 'jumper' ? 200 : 100;
            body.setAllowGravity(true);
            this.setSize(16, 34).setOffset(5, 4);
            this.play('enemy-run');
        }

        this.nextFire = scene.time.now + Phaser.Math.Between(600, 1800);
        this.nextJump = scene.time.now + Phaser.Math.Between(800, 2000);
    }

    update() {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body || !this.active) return;
        const scene = this.scene as any;
        const player = scene.player as Phaser.GameObjects.Sprite | undefined;
        if (!player) return;

        // Only act when reasonably near the camera view (keeps off-screen foes idle)
        const view = this.scene.cameras.main.worldView;
        const onScreen = this.x > view.x - 80 && this.x < view.right + 80;

        if (this.enemyType === 'turret') {
            this.setFlipX(player.x < this.x);
            if (onScreen && this.scene.time.now > this.nextFire) {
                this.fireAtPlayer(player, 300);
                this.nextFire = this.scene.time.now + Phaser.Math.Between(1100, 1800);
            }
            return;
        }

        if (this.enemyType === 'cannon') {
            // fixed wall emplacement — aimed bursts (elite fires more, faster)
            this.setFlipX(player.x > this.x);
            if (onScreen && this.scene.time.now > this.nextFire) {
                const shots = this.elite ? 5 : 3;
                for (let i = 0; i < shots; i++) {
                    this.scene.time.delayedCall(i * 110, () => { if (this.active) this.fireAtPlayer(player, this.elite ? 360 : 320); });
                }
                this.nextFire = this.scene.time.now + (this.elite ? Phaser.Math.Between(1300, 1900) : Phaser.Math.Between(1800, 2600));
            }
            return;
        }

        if (this.enemyType === 'drone') {
            // Hover above & toward the player, bobbing, raining down aimed shots.
            const dx = player.x - this.x;
            this.setVelocityX(Math.abs(dx) > 160 ? Math.sign(dx) * this.speed : Math.sign(dx) * 18);
            const targetY = Phaser.Math.Clamp(player.y - 150, 100, 380);
            const bob = Math.sin(this.scene.time.now / 340) * 16;
            this.setVelocityY((targetY + bob - this.y) * 2);
            this.setFlipX(dx < 0);
            if (onScreen && this.scene.time.now > this.nextFire) {
                this.fireAtPlayer(player, 250);
                this.nextFire = this.scene.time.now + Phaser.Math.Between(1100, 1900);
            }
            return;
        }

        // Runner / jumper: chase the player horizontally
        const dir = player.x < this.x ? -1 : 1;
        this.setVelocityX(this.speed * dir);
        this.setFlipX(dir < 0);

        // Turn around / hop when blocked
        if (body.blocked.down && (body.blocked.left || body.blocked.right)) {
            if (this.scene.time.now > this.nextJump) {
                this.setVelocityY(-330);
                this.nextJump = this.scene.time.now + 600;
            }
        }

        if (this.enemyType === 'jumper' && body.blocked.down && this.scene.time.now > this.nextJump) {
            this.setVelocityY(-360);
            this.nextJump = this.scene.time.now + Phaser.Math.Between(900, 1600);
        }

        if (onScreen && this.scene.time.now > this.nextFire && Math.abs(player.y - this.y) < 60) {
            this.fireAtPlayer(player, 280);
            this.nextFire = this.scene.time.now + Phaser.Math.Between(1400, 2400);
        }
    }

    private fireAtPlayer(player: Phaser.GameObjects.Sprite, speed: number) {
        const scene = this.scene as any;
        if (!scene.enemyBullets) return;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        scene.enemyBullets.fireEnemy(this.x, this.y, angle, speed);
        scene.sfx?.('machine_fire');
    }

    takeDamage(amount: number) {
        this.health -= amount;
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(40, () => { if (this.active) this.clearTint(); });
        if (this.health <= 0) this.explode();
    }

    private explode() {
        const scene = this.scene as any;
        scene.addScore?.(this.points);
        scene.floatScore?.(this.x, this.y, this.points);
        scene.spawnExplosion?.(this.x, this.y);
        if (this.enemyType === 'cannon') {
            // set-piece kill: bigger blast + guaranteed weapon reward
            scene.spawnExplosion?.(this.x, this.y - 10, 0xff5522);
            scene.dropWeapon?.(this.x, this.y, 'S');
            scene.cameras?.main?.shake(220, 0.01);
            scene.sfx?.('boss_explode');
        } else {
            scene.maybeDropPowerup?.(this.x, this.y);
            scene.sfx?.('enemy_explode');
            scene.cameras?.main?.shake(50, 0.003);
        }
        this.destroy();
    }
}
