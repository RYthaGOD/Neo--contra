import Phaser from 'phaser';
import { Bullet } from './Bullet';
import { WeaponType } from '../../config/constants';

export class BulletPool extends Phaser.Physics.Arcade.Group {
    constructor(scene: Phaser.Scene, size = 120) {
        super(scene.physics.world, scene);
        this.runChildUpdate = true;
        this.createMultiple({
            classType: Bullet,
            frameQuantity: size,
            active: false,
            visible: false,
            key: 'bullet',
        });
    }

    /** Fire a player weapon bullet. */
    fireBullet(x: number, y: number, angle: number, type: WeaponType = 'NORMAL') {
        const bullet = this.getFirstDead(false) as Bullet;
        if (bullet) bullet.fireWeapon(x, y, angle, type);
        return bullet;
    }

    /** Fire an enemy/boss bullet. */
    fireEnemy(x: number, y: number, angle: number, speed = 280) {
        const bullet = this.getFirstDead(false) as Bullet;
        if (bullet) bullet.fireEnemy(x, y, angle, speed);
        return bullet;
    }
}
