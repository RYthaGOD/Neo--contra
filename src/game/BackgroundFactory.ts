import Phaser from 'phaser';

/**
 * Generates tileable parallax background layers procedurally — a glowing factory
 * skyline, neon-lit mid structures, lush foreground foliage/pipes, and rain — so
 * levels feel like the dense cyber-jungle reference instead of a flat colour.
 *
 * Layers are baked with their own colours (no runtime tint) so window/neon glows
 * stay bright; per-level mood comes from the sky gradient drawn in the scene.
 */
export class BackgroundFactory {
    static readonly W = 512;
    static readonly H = 600;

    static generate(scene: Phaser.Scene) {
        BackgroundFactory.far(scene);
        BackgroundFactory.mid(scene);
        BackgroundFactory.near(scene);
        BackgroundFactory.rain(scene);
        BackgroundFactory.smoke(scene);
    }

    // ── Far skyline: distant factory towers + smokestacks with lit windows ──
    private static far(scene: Phaser.Scene) {
        const key = 'bg_far';
        if (scene.textures.exists(key)) return;
        const { W, H } = BackgroundFactory;
        const g = scene.make.graphics({ x: 0, y: 0 });
        const base = H * 0.42;

        let x = 0;
        while (x < W) {
            const bw = Phaser.Math.Between(34, 64);
            const bh = Phaser.Math.Between(110, 300);
            const top = H - bh;
            // tower body (cool dark steel)
            g.fillStyle(0x162033, 1);
            g.fillRect(x, top, bw, bh);
            g.fillStyle(0x1e2c44, 1);
            g.fillRect(x, top, bw, 6); // lighter cap
            // lit windows
            for (let wy = top + 12; wy < H - 10; wy += 14) {
                for (let wx = x + 5; wx < x + bw - 5; wx += 12) {
                    if (Math.random() < 0.45) {
                        g.fillStyle(Math.random() < 0.7 ? 0xffcc66 : 0x66ddff, Math.random() * 0.5 + 0.4);
                        g.fillRect(wx, wy, 5, 6);
                    }
                }
            }
            x += bw + Phaser.Math.Between(6, 20);
        }

        // a couple of smokestacks emitting an orange glow
        for (const sx of [W * 0.32, W * 0.74]) {
            const sw = 26, sh = 230;
            const top = base - 120;
            g.fillStyle(0x202b3d, 1);
            g.fillRect(sx, top, sw, sh + 120);
            g.fillStyle(0x3a2418, 1);
            g.fillRect(sx - 3, top, sw + 6, 10);
            // warm glow at the mouth
            g.fillStyle(0xff7a2a, 0.5);
            g.fillRect(sx - 2, top, sw + 4, 16);
            g.fillStyle(0xffb347, 0.7);
            g.fillRect(sx + 4, top + 2, sw - 8, 8);
        }
        g.generateTexture(key, W, H);
        g.destroy();
    }

    // ── Mid structures with neon sign billboards ──
    private static mid(scene: Phaser.Scene) {
        const key = 'bg_mid';
        if (scene.textures.exists(key)) return;
        const { W, H } = BackgroundFactory;
        const g = scene.make.graphics({ x: 0, y: 0 });

        // chunky industrial blocks along the lower half
        let x = -10;
        while (x < W) {
            const bw = Phaser.Math.Between(70, 130);
            const bh = Phaser.Math.Between(150, 280);
            const top = H - bh;
            g.fillStyle(0x202d42, 1);
            g.fillRect(x, top, bw, bh);
            g.fillStyle(0x2a3a55, 1);
            g.fillRect(x, top, bw, 8);
            // vertical pipe detail
            g.fillStyle(0x18222f, 1);
            g.fillRect(x + bw - 14, top + 8, 6, bh - 8);
            g.fillRect(x + 10, top + 8, 4, bh - 8);
            // window strips
            for (let wy = top + 18; wy < H - 16; wy += 22) {
                g.fillStyle(0x53e0ff, Math.random() * 0.4 + 0.25);
                g.fillRect(x + 18, wy, bw - 40, 5);
            }
            // a neon billboard on some blocks
            if (Math.random() < 0.6) {
                const col = [0xff2d95, 0x00f3ff, 0xffae00, 0x9d4dff][Phaser.Math.Between(0, 3)];
                const bx = x + 16, by = top + 16, bbw = Math.min(bw - 32, 70), bbh = 26;
                g.fillStyle(0x05070d, 1);
                g.fillRect(bx, by, bbw, bbh);
                g.lineStyle(2, col, 1);
                g.strokeRect(bx, by, bbw, bbh);
                g.fillStyle(col, 0.85);
                for (let i = 0; i < 3; i++) g.fillRect(bx + 6, by + 6 + i * 6, bbw - 12, 3);
            }
            x += bw + Phaser.Math.Between(8, 24);
        }
        g.generateTexture(key, W, H);
        g.destroy();
    }

    // ── Near foreground: lush foliage + heavy pipes ──
    private static near(scene: Phaser.Scene) {
        const key = 'bg_near';
        if (scene.textures.exists(key)) return;
        const { W, H } = BackgroundFactory;
        const g = scene.make.graphics({ x: 0, y: 0 });

        // big pipe run across the very bottom
        g.fillStyle(0x172230, 1);
        g.fillRect(0, H - 46, W, 46);
        g.fillStyle(0x243650, 1);
        g.fillRect(0, H - 46, W, 6);
        for (let px = 0; px < W; px += 64) {
            g.fillStyle(0x101824, 1);
            g.fillRect(px + 28, H - 60, 12, 60); // joints
        }

        // foliage clumps — fronds in greens & purples
        const palette = [0x1f6b3a, 0x2a8f4a, 0x126b5a, 0x5a2a8a, 0x7a3aa0, 0x2a5acc];
        for (let i = 0; i < 70; i++) {
            const fx = Phaser.Math.Between(0, W);
            const fy = Phaser.Math.Between(H - 130, H - 20);
            const col = palette[Phaser.Math.Between(0, palette.length - 1)];
            const len = Phaser.Math.Between(16, 46);
            const lean = Phaser.Math.FloatBetween(-0.5, 0.5);
            g.fillStyle(col, 1);
            // a frond = a thin leaning triangle-ish blade
            for (let s = 0; s < len; s += 3) {
                const wgt = Math.max(1, 5 - s / 10);
                g.fillRect(fx + lean * s - wgt / 2, fy - s, wgt, 3);
            }
            // a couple of leaf dots near the tip for a glow accent
            if (Math.random() < 0.3) {
                g.fillStyle(0x7dffb0, 0.7);
                g.fillRect(fx + lean * len, fy - len, 3, 3);
            }
        }
        g.generateTexture(key, W, H);
        g.destroy();
    }

    // ── Rain streaks (tileable) ──
    private static rain(scene: Phaser.Scene) {
        const key = 'bg_rain';
        if (scene.textures.exists(key)) return;
        const W = 256, H = 256;
        const g = scene.make.graphics({ x: 0, y: 0 });
        for (let i = 0; i < 80; i++) {
            const x = Phaser.Math.Between(0, W);
            const y = Phaser.Math.Between(0, H);
            g.fillStyle(0xaad4ff, Math.random() * 0.25 + 0.1);
            // a short diagonal streak
            for (let s = 0; s < 10; s++) g.fillRect(x + s, y + s * 2, 1, 2);
        }
        g.generateTexture(key, W, H);
        g.destroy();
    }

    // ── Soft round smoke puff for emitters ──
    private static smoke(scene: Phaser.Scene) {
        const key = 'bg_smoke';
        if (scene.textures.exists(key)) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0xffffff, 1);
        g.fillCircle(16, 16, 16);
        g.generateTexture(key, 32, 32);
        g.destroy();
    }
}
