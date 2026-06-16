import Phaser from 'phaser';
import { sounds } from '../SoundManager';

export class TitleScene extends Phaser.Scene {
    private starting = false;
    constructor() { super('TitleScene'); }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.starting = false;
        this.registry.get('react_setScene')?.('title');
        this.cameras.main.fadeIn(400, 0, 0, 0);

        // Backdrop: AI title art if present, else a gradient. Dimmed for text legibility.
        if (this.textures.exists('bg_title')) {
            const img = this.add.image(W / 2, H / 2, 'bg_title').setDepth(-10);
            const src = this.textures.get('bg_title').getSourceImage() as { width: number; height: number };
            img.setScale(Math.max(W / src.width, H / src.height));
            this.add.rectangle(W / 2, H / 2, W, H, 0x00010a, 0.42).setDepth(-9);
        } else {
            const bg = this.add.graphics().setDepth(-10);
            bg.fillGradientStyle(0x000014, 0x000014, 0x001430, 0x001430, 1);
            bg.fillRect(0, 0, W, H);
        }

        // Scanline overlay
        const scan = this.add.graphics();
        for (let y = 0; y < H; y += 4) {
            scan.fillStyle(0x000000, 0.18);
            scan.fillRect(0, y, W, 2);
        }

        // Stars
        for (let i = 0; i < 80; i++) {
            const x = Phaser.Math.Between(0, W);
            const y = Phaser.Math.Between(0, H * 0.7);
            const r = Math.random() > 0.85 ? 2 : 1;
            this.add.circle(x, y, r, 0xffffff, Math.random() * 0.8 + 0.2);
        }

        // Title logo — hand-drawn pixel text via graphics
        this.drawLogo(W / 2, 110);

        // Subtitle
        this.add.text(W / 2, 200, 'SOLANA ASSAULT', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '13px',
            color: '#00f3ff',
            stroke: '#002244',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // Decorative divider
        const divider = this.add.graphics();
        divider.lineStyle(2, 0xbc13fe, 0.9);
        divider.strokeRect(40, 220, W - 80, 1);

        // Demo soldiers
        this.spawnDemoSoldiers(W, H);

        // Menu options
        this.add.text(W / 2, 320, '1 PLAYER', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#00ff00',
        }).setOrigin(0.5);

        this.add.text(W / 2, 356, '2 PLAYER', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5);

        // Cursor
        const cursor = this.add.text(W / 2 - 86, 320, '>', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#ffff00',
        }).setOrigin(0.5);
        this.tweens.add({ targets: cursor, alpha: 0, duration: 400, yoyo: true, repeat: -1 });

        // Controls legend
        this.add.text(W / 2, 420, '← → / A D   MOVE        ↑ / W   JUMP ×2\nSPACE / Z    FIRE          ↓ / S   PRONE\nHOLD ↑↓ = AIM (8-WAY)    M = MUTE    ESC = ARMORY', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#4488bb',
            align: 'center',
        }).setOrigin(0.5);

        // Pulsing "press any key" prompt
        const prompt = this.add.text(W / 2, H - 58, '▶  PRESS ANY KEY OR CLICK  ◀', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#ffe24a',
            stroke: '#3a2a00',
            strokeThickness: 3,
        }).setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: 0.25, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        // Credits
        this.add.text(W / 2, H - 28, 'NEOCONTRA © 2026  //  POWERED BY SOLANA', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#224466',
        }).setOrigin(0.5);

        // Input
        sounds.unlock();
        sounds.playBGM('title');

        if (this.input.keyboard) {
            this.input.keyboard.once('keydown', () => this.startGame());
        }
        this.input.once('pointerdown', () => this.startGame());
    }

    private drawLogo(cx: number, cy: number) {
        // "NEO CONTRA" in large styled text
        const shadow = this.add.text(cx + 4, cy + 4, 'NEO CONTRA', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '46px',
            color: '#000000',
        }).setOrigin(0.5);
        void shadow;

        const main = this.add.text(cx, cy, 'NEO CONTRA', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '46px',
            color: '#ff3344',
            stroke: '#7a0008',
            strokeThickness: 6,
        }).setOrigin(0.5);

        // Pulsing glow
        this.tweens.add({
            targets: main,
            alpha: 0.82,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private spawnDemoSoldiers(W: number, H: number) {
        // Left soldier running right
        const s1 = this.add.sprite(60, H - 80, 'player_run1');
        this.tweens.add({ targets: s1, x: 240, duration: 2400, repeat: -1, yoyo: true });
        this.time.addEvent({
            delay: 200, repeat: -1,
            callback: () => { s1.setTexture(s1.texture.key === 'player_run1' ? 'player_run2' : 'player_run1'); },
        });

        // Right soldier running left
        const s2 = this.add.sprite(W - 60, H - 80, 'player_run1').setFlipX(true);
        this.tweens.add({ targets: s2, x: W - 240, duration: 2400, repeat: -1, yoyo: true });
        this.time.addEvent({
            delay: 200, repeat: -1,
            callback: () => { s2.setTexture(s2.texture.key === 'player_run1' ? 'player_run2' : 'player_run1'); },
        });
    }

    private startGame() {
        if (this.starting) return;       // guard against double-trigger (key + click)
        this.starting = true;
        sounds.playSFX('powerup');
        sounds.stopBGM();
        this.cameras.main.fadeOut(350, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
    }
}
