import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load local assets or placeholders
        this.load.image('player', 'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/bezel.png');
        this.load.image('bullet', 'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/bullets/bullet7.png');
        this.createPlaceholders();
    }

    createPlaceholders() {
        // Create a 32x32 green square as a placeholder for the player if the URL fails
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0x00ff00);
        graphics.fillRect(0, 0, 32, 64);
        graphics.generateTexture('player_placeholder', 32, 64);

        graphics.clear();
        graphics.fillStyle(0xff0000);
        graphics.fillRect(0, 0, 8, 8);
        graphics.generateTexture('bullet_placeholder', 8, 8);

        graphics.clear();
        graphics.fillStyle(0xff00ff); // Neon Purple for enemies
        graphics.fillRect(0, 0, 32, 48);
        graphics.generateTexture('enemy_placeholder', 32, 48);
    }

    update() {
        this.scene.start('GameScene');
    }
}
