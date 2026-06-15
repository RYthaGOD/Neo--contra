import Phaser from 'phaser';
import { WeaponType, WEAPONS } from '../../config/constants';

function hexStr(n: number): string {
    return '#' + n.toString(16).padStart(6, '0');
}

/**
 * Collectible letter power-up — walk through it to equip the weapon.
 * Extends Arcade Sprite so it works properly with physics groups and overlap.
 */
export class PowerUpItem extends Phaser.Physics.Arcade.Sprite {
    public weapon: WeaponType;

    constructor(scene: Phaser.Scene, x: number, y: number, weapon: WeaponType) {
        super(scene, x, y, 'pod');
        this.weapon = weapon;
        const cfg = WEAPONS[weapon];

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setTint(cfg.color);
        this.setDepth(15);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(true);
        body.setBounce(0.3);
        body.setCollideWorldBounds(false);
        body.setSize(28, 20);

        // Label overlay (non-physics, just visual)
        const label = scene.add.text(x, y - 2, weapon, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '11px',
            color: hexStr(cfg.color),
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(16);

        // Keep label in sync with sprite position. Use a named handler so we can
        // remove exactly this listener — passing undefined to off() would clear
        // every 'update' listener on the scene (Phaser EventEmitter semantics).
        const sync = () => {
            if (this.active) {
                label.setPosition(this.x, this.y - 2);
            } else {
                label.destroy();
                scene.events.off('update', sync, this);
            }
        };
        scene.events.on('update', sync, this);

        scene.tweens.add({ targets: this, scaleX: 1.1, scaleY: 1.1, yoyo: true, repeat: -1, duration: 440 });

        // Expire after 14 seconds
        scene.time.delayedCall(14000, () => {
            if (this.active) {
                label.destroy();
                this.destroy();
            }
        });
    }
}

/**
 * Flying armoured pod that crosses the screen. Shoot it to release a weapon letter.
 */
export class WeaponPod extends Phaser.Physics.Arcade.Sprite {
    public weapon: WeaponType;
    private baseY: number;
    private phase = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, weapon: WeaponType) {
        super(scene, x, y, 'pod');
        this.weapon = weapon;
        this.baseY = y;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setVelocityX(-70);
        body.setSize(28, 20);
        this.setTint(WEAPONS[weapon].color).setDepth(12);

        // Weapon label on pod
        const label = scene.add.text(x, y, weapon, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(13);

        const sync = () => {
            if (this.active) label.setPosition(this.x, this.y);
            else { label.destroy(); scene.events.off('update', sync, this); }
        };
        scene.events.on('update', sync, this);
    }

    update() {
        if (!this.active) return;
        this.phase += 0.05;
        this.y = this.baseY + Math.sin(this.phase) * 28;
        const view = this.scene.cameras.main.worldView;
        if (this.x < view.x - 140) this.destroy();
    }

    /** Called when struck by a player bullet. */
    open() {
        const scene = this.scene as any;
        const item = new PowerUpItem(this.scene, this.x, this.y, this.weapon);
        // Add to the scene's pickups group so the player→pickup overlap fires. The
        // group already carries a platforms collider, so the dropped letter lands
        // on the floor without needing a per-item collider.
        if (scene.pickups) scene.pickups.add(item);
        scene.spawnExplosion?.(this.x, this.y, 0x00ffff);
        scene.sfx?.('powerup');
        this.destroy();
    }
}
