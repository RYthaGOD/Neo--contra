import Phaser from 'phaser';
import { WeaponType, WEAPONS } from '../../config/constants';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
    public pierce = false;
    public damage = 1;
    public isEnemy = false;
    private wobble = false;
    private wobblePhase = 0;
    private bornAt = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'bullet');
    }

    private arm(x: number, y: number, angle: number) {
        this.enableBody(true, x, y, true, true);
        this.setActive(true);
        this.setVisible(true);
        this.setRotation(angle);
        this.setAlpha(1);
        this.setScale(1);
        this.clearTint();
        this.wobble = false;
        this.bornAt = this.scene.time.now;
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) body.setAllowGravity(false);
    }

    /** Player weapon bullet. */
    fireWeapon(x: number, y: number, angle: number, type: WeaponType) {
        const cfg = WEAPONS[type];
        this.arm(x, y, angle);
        this.isEnemy = false;
        this.pierce = cfg.pierce;
        this.damage = type === 'L' ? 2 : 1;
        this.setTexture('bullet');
        this.setTint(cfg.color);
        const body = this.body as Phaser.Physics.Arcade.Body;
        // Reset to the player-bullet base body (pooled bullets are shared with
        // enemy shots, which resize it). It scales with the per-weapon setScale
        // below, so the laser etc. get a proportional hitbox.
        body.setSize(10, 4, true);

        switch (type) {
            case 'L':
                this.setScale(4, 1.2);
                break;
            case 'S':
                this.setScale(1.6, 1.4);
                break;
            case 'F':
                this.setScale(1.8, 1.8);
                this.wobble = true;
                this.wobblePhase = Math.random() * Math.PI * 2;
                break;
            case 'M':
                this.setScale(1.2, 1);
                break;
            default:
                this.setScale(1.4, 1);
        }
        this.scene.physics.velocityFromRotation(angle, cfg.speed, body.velocity);
        if (this.wobble) {
            // store base velocity magnitude for perpendicular wobble
            (this as any)._baseAngle = angle;
            (this as any)._speed = cfg.speed;
        }
    }

    /** Enemy / boss bullet. */
    fireEnemy(x: number, y: number, angle: number, speed = 280) {
        this.arm(x, y, angle);
        this.isEnemy = true;
        this.pierce = false;
        this.damage = 1;
        this.setTexture('bullet_enemy');
        this.setScale(1);
        const body = this.body as Phaser.Physics.Arcade.Body;
        // bullet_enemy is a 10x10 circle — match the body to it (the pool's base
        // body is 10x4, which left a thin, unfair hitbox under a round sprite).
        body.setSize(9, 9, true);
        this.scene.physics.velocityFromRotation(angle, speed, body.velocity);
    }

    update() {
        if (!this.active) return;
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        if (this.wobble) {
            const t = (this.scene.time.now - this.bornAt) / 1000;
            const base = (this as any)._baseAngle as number;
            const speed = (this as any)._speed as number;
            const perp = base + Math.PI / 2;
            const w = Math.sin(t * 14 + this.wobblePhase) * speed * 0.5;
            body.velocity.x = Math.cos(base) * speed + Math.cos(perp) * w;
            body.velocity.y = Math.sin(base) * speed + Math.sin(perp) * w;
        }

        const b = this.scene.physics.world.bounds;
        if (this.x < b.x - 40 || this.x > b.right + 40 || this.y < -40 || this.y > b.bottom + 40) {
            this.kill();
        }
        // Cap lifetime
        if (this.scene.time.now - this.bornAt > 2500) this.kill();
    }

    kill() {
        this.disableBody(true, true);
    }
}
