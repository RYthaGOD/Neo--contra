import Phaser from 'phaser';
import { sounds } from '../SoundManager';

export class WinScene extends Phaser.Scene {
    private restarting = false;
    constructor() { super('WinScene'); }

    create(data: { score: number }) {
        const W = this.scale.width;
        const H = this.scale.height;
        const score = data?.score ?? 0;
        this.restarting = false;
        this.registry.get('react_setScene')?.('win');
        this.cameras.main.fadeIn(600, 0, 0, 0);

        // Background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x000000, 0x000000, 0x001a00, 0x001a00, 1);
        bg.fillRect(0, 0, W, H);

        // Celebration particles
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, W);
            const y = Phaser.Math.Between(0, H);
            const c = [0xff3344, 0x00ff00, 0x00f3ff, 0xbc13fe, 0xffff00][i % 5];
            const dot = this.add.circle(x, y, Phaser.Math.Between(2, 5), c, 0.8);
            this.tweens.add({
                targets: dot,
                y: y - Phaser.Math.Between(60, 200),
                alpha: 0,
                duration: Phaser.Math.Between(1000, 2500),
                delay: Phaser.Math.Between(0, 800),
                repeat: -1,
                repeatDelay: Phaser.Math.Between(200, 800),
            });
        }

        this.add.text(W / 2, 130, 'MISSION', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '32px',
            color: '#00ff00', stroke: '#003300', strokeThickness: 6,
        }).setOrigin(0.5);

        this.add.text(W / 2, 178, 'COMPLETE', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '32px',
            color: '#ffff00', stroke: '#333300', strokeThickness: 6,
        }).setOrigin(0.5);

        this.add.text(W / 2, 270, 'FINAL SCORE', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '11px', color: '#888888',
        }).setOrigin(0.5);

        this.add.text(W / 2, 300, String(score).padStart(8, '0'), {
            fontFamily: '"Press Start 2P", monospace', fontSize: '28px', color: '#ffffff',
        }).setOrigin(0.5);

        this.add.text(W / 2, 380, 'PRESS ANY KEY', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '12px', color: '#00f3ff',
        }).setOrigin(0.5);

        sounds.playBGM('title');
        sounds.playSFX('level_clear');

        if (this.input.keyboard) this.input.keyboard.once('keydown', () => this.restart());
        this.input.once('pointerdown', () => this.restart());
    }

    private restart() {
        if (this.restarting) return;
        this.restarting = true;
        sounds.stopBGM();
        // Signal React to show the score screen flagged as a victory (so it reads
        // "MISSION COMPLETE", not "GAME OVER"), then return to the title.
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('TitleScene');
            const setVictory = this.game.registry.get('react_setVictory');
            if (setVictory) setVictory(true);
            else this.game.registry.get('react_setGameOver')?.(true);
        });
    }
}
