import Phaser from 'phaser';
import { Bullet } from './Bullet';
import { WeaponType } from '../../config/constants';

export class BulletPool extends Phaser.Physics.Arcade.Group {
    constructor(scene: Phaser.Scene) {
        super(scene.physics.world, scene);

        this.createMultiple({
            classType: Bullet,
            frameQuantity: 100, // Increased for spread/rapid
            active: false,
            visible: false,
            key: 'bullet'
        });
    }

    fireBullet(x: number, y: number, angle: number, type: WeaponType = 'NORMAL') {
        const bullet = this.getFirstDead(false) as Bullet;
        if (bullet) {
            bullet.fire(x, y, angle, type);
        }
    }
}
