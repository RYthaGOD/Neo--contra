import Phaser from 'phaser';
import { WeaponType } from '../../config/constants';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
    private bulletType: WeaponType = 'NORMAL';
    private lifespan: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'bullet_placeholder');
    }

    fire(x: number, y: number, angle: number, type: WeaponType = 'NORMAL') {
        this.bulletType = type;
        this.enableBody(true, x, y, true, true);
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!body) return;

        this.setRotation(angle);
        this.setAlpha(1);
        this.setScale(1);
        this.clearTint();

        switch (type) {
            case 'L': // Laser: Instant, long, piercing
                this.scene.physics.velocityFromRotation(angle, 1200, body.velocity);
                this.setScale(4, 0.5);
                this.setTint(0x00ffff);
                break;
            case 'F': // Firedancer: Corkscrew/Rotating
                this.scene.physics.velocityFromRotation(angle, 400, body.velocity);
                this.setTint(0xffaa00);
                this.lifespan = 2000;
                break;
            case 'S': // Spread: Slower but larger
                this.scene.physics.velocityFromRotation(angle, 500, body.velocity);
                this.setScale(1.5);
                this.setTint(0xff00ff);
                break;
            default:
                this.scene.physics.velocityFromRotation(angle, 600, body.velocity);
        }
    }

    update() {
        if (!this.active) return;

        if (this.bulletType === 'F') {
            const time = this.scene.time.now * 0.01;
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.velocity.y += Math.sin(time) * 100; // Corkscrew effect
        }

        const worldWidth = (this.scene as any).levelData?.worldWidth || 3200;
        if (this.x < 0 || this.x > worldWidth || this.y < 0 || this.y > 600) {
            this.disableBody(true, true);
        }
    }
}
