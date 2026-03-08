import Phaser from 'phaser';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'bullet_placeholder');
    }

    fire(x: number, y: number, angle: number) {
        this.enableBody(true, x, y, true, true);
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            this.scene.physics.velocityFromRotation(angle, 600, body.velocity);
        }
    }

    update() {
        if (this.x < 0 || this.x > 3200 || this.y < 0 || this.y > 600) {
            this.disableBody(true, true);
        }
    }
}
