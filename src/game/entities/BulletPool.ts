import Phaser from 'phaser';
import { Bullet } from './Bullet';

export class BulletPool extends Phaser.Physics.Arcade.Group {
    constructor(scene: Phaser.Scene) {
        super(scene.physics.world, scene);

        this.createMultiple({
            classType: Bullet,
            frameQuantity: 50,
            active: false,
            visible: false,
            key: 'bullet'
        });
    }

    fireBullet(x: number, y: number, angle: number) {
        const bullet = this.getFirstDead(false);
        if (bullet) {
            bullet.fire(x, y, angle);
        }
    }
}
