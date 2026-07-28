import Phaser from 'phaser';

interface Palette {
    band: number;
    skin: number;
    shirt: number;
    pants: number;
    gun: number;
    eye: number;
}

const PLAYER: Palette = { band: 0xff3344, skin: 0xffcc99, shirt: 0x2ce8a0, pants: 0x2a4cd6, gun: 0xd0d0d0, eye: 0x202020 };
const ENEMY: Palette = { band: 0x222222, skin: 0xd98c5f, shirt: 0xff4d4d, pants: 0x7a1f1f, gun: 0x888888, eye: 0xffff00 };

// Purchasable cosmetic skins. Keyed by the lowercased SkinId — textures are
// generated as `player_<prefix>_<pose>` (e.g. player_gold_run1). DEFAULT keeps
// the original unprefixed keys for backwards compatibility.
const SKIN_PALETTES: Record<string, Palette> = {
    gold:    { band: 0xffd23f, skin: 0xffcc99, shirt: 0xf5a623, pants: 0x8a5a16, gun: 0xfff1b0, eye: 0x3a2400 },
    solana:  { band: 0x14f195, skin: 0xffcc99, shirt: 0x9945ff, pants: 0x3b1a6e, gun: 0x14f195, eye: 0x0c8f59 },
    diamond: { band: 0xeaffff, skin: 0xcfe9ff, shirt: 0x66e0ff, pants: 0x1f6fae, gun: 0xffffff, eye: 0x004a6e },
};

type Pose = 'idle' | 'run1' | 'run2' | 'jump';

/**
 * Generates every texture and animation the game needs at runtime, so no
 * external image assets are required (works fully offline).
 */
export class TextureFactory {
    static generate(scene: Phaser.Scene) {
        TextureFactory.soldier(scene, 'player_idle', PLAYER, 'idle');
        TextureFactory.soldier(scene, 'player_run1', PLAYER, 'run1');
        TextureFactory.soldier(scene, 'player_run2', PLAYER, 'run2');
        TextureFactory.soldier(scene, 'player_jump', PLAYER, 'jump');
        TextureFactory.prone(scene, 'player_prone', PLAYER);

        // Recolored cosmetic skins (player_<prefix>_<pose>)
        for (const [prefix, palette] of Object.entries(SKIN_PALETTES)) {
            TextureFactory.soldier(scene, `player_${prefix}_idle`, palette, 'idle');
            TextureFactory.soldier(scene, `player_${prefix}_run1`, palette, 'run1');
            TextureFactory.soldier(scene, `player_${prefix}_run2`, palette, 'run2');
            TextureFactory.soldier(scene, `player_${prefix}_jump`, palette, 'jump');
            TextureFactory.prone(scene, `player_${prefix}_prone`, palette);
        }

        TextureFactory.soldier(scene, 'enemy_idle', ENEMY, 'idle');
        TextureFactory.soldier(scene, 'enemy_run1', ENEMY, 'run1');
        TextureFactory.soldier(scene, 'enemy_run2', ENEMY, 'run2');

        TextureFactory.turret(scene);
        TextureFactory.drone(scene);
        TextureFactory.cannon(scene);
        TextureFactory.bossCore(scene);
        TextureFactory.pod(scene);
        TextureFactory.bullet(scene);
        TextureFactory.enemyBullet(scene);
        TextureFactory.spark(scene);
        TextureFactory.muzzle(scene);
        TextureFactory.hazard(scene);
        TextureFactory.tile(scene);

        // Backwards-compatible aliases used elsewhere in the code base
        TextureFactory.alias(scene, 'player_placeholder', 'player_idle');
        TextureFactory.alias(scene, 'enemy_placeholder', 'enemy_idle');

        // Animations (shared via the global AnimationManager)
        if (!scene.anims.exists('player-run')) {
            scene.anims.create({ key: 'player-run', frames: [{ key: 'player_run1' }, { key: 'player_run2' }], frameRate: 12, repeat: -1 });
        }
        if (!scene.anims.exists('enemy-run')) {
            scene.anims.create({ key: 'enemy-run', frames: [{ key: 'enemy_run1' }, { key: 'enemy_run2' }], frameRate: 8, repeat: -1 });
        }
    }

    private static alias(scene: Phaser.Scene, key: string, source: string) {
        if (scene.textures.exists(key) || !scene.textures.exists(source)) return;
        // Copy the canvas from the source texture into a new canvas-based texture
        const src = scene.textures.get(source).getSourceImage() as HTMLCanvasElement;
        const canvas = document.createElement('canvas');
        canvas.width = src.width;
        canvas.height = src.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(src, 0, 0);
        scene.textures.addCanvas(key, canvas);
    }

    private static soldier(scene: Phaser.Scene, key: string, p: Palette, pose: Pose) {
        if (scene.textures.exists(key)) return;
        const W = 26, H = 40;
        const g = scene.make.graphics({ x: 0, y: 0 });

        // Legs
        g.fillStyle(p.pants, 1);
        if (pose === 'idle') {
            g.fillRect(5, 24, 4, 14);
            g.fillRect(11, 24, 4, 14);
        } else if (pose === 'run1') {
            g.fillRect(3, 24, 4, 11);
            g.fillRect(11, 24, 5, 14);
        } else if (pose === 'run2') {
            g.fillRect(4, 24, 5, 14);
            g.fillRect(12, 24, 4, 11);
        } else { // jump - tucked
            g.fillRect(4, 25, 5, 9);
            g.fillRect(11, 27, 6, 8);
        }

        // Torso
        g.fillStyle(p.shirt, 1);
        g.fillRect(4, 11, 11, 13);
        // Belt
        g.fillStyle(0x111111, 1);
        g.fillRect(4, 22, 11, 2);

        // Head
        g.fillStyle(p.skin, 1);
        g.fillRect(4, 2, 10, 9);
        // Headband
        g.fillStyle(p.band, 1);
        g.fillRect(3, 3, 12, 3);
        g.fillRect(0, 4, 4, 2); // tail
        // Eye (faces right)
        g.fillStyle(p.eye, 1);
        g.fillRect(11, 6, 2, 2);

        // Arm + gun (horizontal, pointing right)
        g.fillStyle(p.skin, 1);
        g.fillRect(12, 13, 6, 3);
        g.fillStyle(p.gun, 1);
        g.fillRect(15, 13, 10, 3);
        g.fillStyle(0xffffff, 1);
        g.fillRect(25, 13, 1, 3); // muzzle highlight

        g.generateTexture(key, W, H);
        g.destroy();
    }

    private static prone(scene: Phaser.Scene, key: string, p: Palette) {
        if (scene.textures.exists(key)) return;
        const W = 42, H = 20;
        const g = scene.make.graphics({ x: 0, y: 0 });
        // Body lying down, head + gun to the right
        g.fillStyle(p.pants, 1);
        g.fillRect(2, 8, 14, 7); // legs
        g.fillStyle(p.shirt, 1);
        g.fillRect(14, 6, 12, 9); // torso
        g.fillStyle(p.skin, 1);
        g.fillRect(24, 4, 9, 9); // head
        g.fillStyle(p.band, 1);
        g.fillRect(24, 4, 9, 3); // band
        g.fillStyle(p.gun, 1);
        g.fillRect(30, 8, 12, 3); // gun forward
        g.generateTexture(key, W, H);
        g.destroy();
    }

    private static turret(scene: Phaser.Scene) {
        if (scene.textures.exists('turret')) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x445566, 1);
        g.fillRect(2, 14, 32, 12); // base
        g.fillStyle(0x99aabb, 1);
        g.fillRect(8, 4, 20, 14); // dome
        g.fillStyle(0xff3344, 1);
        g.fillRect(15, 8, 6, 4); // core light
        g.fillStyle(0x778899, 1);
        g.fillRect(28, 9, 12, 5); // barrel
        g.generateTexture('turret', 42, 26);
        g.destroy();
    }

    private static drone(scene: Phaser.Scene) {
        if (scene.textures.exists('drone')) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        // hovering attack drone — central pod + side rotors + red eye
        g.fillStyle(0x2a3550, 1);
        g.fillRect(6, 10, 24, 14);            // body
        g.fillStyle(0x3a4a6a, 1);
        g.fillRect(0, 12, 8, 4);              // left rotor arm
        g.fillRect(28, 12, 8, 4);             // right rotor arm
        g.fillStyle(0x9fb4d8, 0.8);
        g.fillRect(-2, 8, 8, 3); g.fillRect(30, 8, 8, 3); // rotor blades
        g.fillStyle(0xff3344, 1);
        g.fillRect(14, 14, 8, 6);             // red eye
        g.fillStyle(0xffd23f, 0.9);
        g.fillRect(16, 24, 4, 3);             // underside gun glow
        g.generateTexture('drone', 36, 28);
        g.destroy();
    }

    private static cannon(scene: Phaser.Scene) {
        if (scene.textures.exists('cannon')) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        // armoured wall emplacement; barrel points left (flip for right)
        g.fillStyle(0x2a3645, 1);
        g.fillRect(10, 6, 40, 42);            // main housing
        g.fillStyle(0x3a4a5e, 1);
        g.fillRect(10, 6, 40, 6);             // top plate
        g.fillStyle(0x141c26, 1);
        g.fillRect(14, 40, 6, 8); g.fillRect(40, 40, 6, 8); // feet
        g.fillStyle(0xff3344, 1);
        g.fillRect(26, 20, 16, 12);           // glowing core
        g.fillStyle(0xff9a77, 0.85);
        g.fillRect(29, 23, 10, 5);
        g.fillStyle(0x1c2530, 1);
        g.fillRect(0, 22, 16, 9);             // barrel
        g.fillStyle(0x55687e, 1);
        g.fillRect(0, 24, 4, 5);              // muzzle
        g.generateTexture('cannon', 52, 50);
        g.destroy();
    }

    private static muzzle(scene: Phaser.Scene) {
        if (scene.textures.exists('muzzle')) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        // a small 4-point burst
        g.fillStyle(0xffffff, 1);
        g.fillCircle(12, 12, 6);
        g.fillStyle(0xffe88a, 0.95);
        g.fillRect(0, 10, 24, 4);             // horizontal flare
        g.fillRect(10, 0, 4, 24);             // vertical flare
        g.generateTexture('muzzle', 24, 24);
        g.destroy();
    }

    private static bossCore(scene: Phaser.Scene) {
        if (scene.textures.exists('boss_core')) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        const s = 64;
        // Armoured octagon
        g.fillStyle(0xffffff, 1);
        g.beginPath();
        const r = 30, cx = 32, cy = 32;
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i + Math.PI / 8;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.closePath();
        g.fillPath();
        // Inner plating
        g.fillStyle(0xcccccc, 1);
        g.fillCircle(cx, cy, 20);
        // Eye
        g.fillStyle(0x000000, 1);
        g.fillCircle(cx, cy, 11);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx, cy, 5);
        g.generateTexture('boss_core', s, s);
        g.destroy();
    }

    private static pod(scene: Phaser.Scene) {
        if (scene.textures.exists('pod')) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x222244, 1);
        g.fillRoundedRect(0, 0, 28, 20, 6);
        g.fillStyle(0x00ffff, 1);
        g.fillRoundedRect(3, 3, 22, 14, 4);
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(6, 5, 16, 4, 2);
        g.generateTexture('pod', 28, 20);
        g.destroy();
    }

    private static bullet(scene: Phaser.Scene) {
        if (scene.textures.exists('bullet')) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 10, 4);
        g.generateTexture('bullet', 10, 4);
        g.destroy();
        // legacy alias
        if (!scene.textures.exists('bullet_placeholder')) {
            const img = scene.textures.get('bullet').getSourceImage() as HTMLImageElement;
            scene.textures.addImage('bullet_placeholder', img);
        }
    }

    private static enemyBullet(scene: Phaser.Scene) {
        if (scene.textures.exists('bullet_enemy')) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0xff8800, 1);
        g.fillCircle(5, 5, 5);
        g.fillStyle(0xffee66, 1);
        g.fillCircle(5, 5, 2);
        g.generateTexture('bullet_enemy', 10, 10);
        g.destroy();
    }

    private static hazard(scene: Phaser.Scene) {
        if (scene.textures.exists('hazard')) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        // a vertical flame jet (origin bottom). Outer orange, inner yellow core.
        g.fillStyle(0xff5a1e, 0.9);
        g.fillTriangle(2, 64, 18, 64, 10, 4);
        g.fillStyle(0xffd23f, 0.95);
        g.fillTriangle(5, 64, 15, 64, 10, 18);
        g.fillStyle(0xffffff, 0.8);
        g.fillTriangle(7, 64, 13, 64, 10, 34);
        g.generateTexture('hazard', 20, 66);
        g.destroy();
        // emitter base grate
        if (!scene.textures.exists('hazard_base')) {
            const b = scene.make.graphics({ x: 0, y: 0 });
            b.fillStyle(0x2a2018, 1); b.fillRect(0, 0, 26, 8);
            b.fillStyle(0x55402a, 1); b.fillRect(2, 0, 22, 2);
            b.fillStyle(0x000000, 1); for (let i = 3; i < 24; i += 5) b.fillRect(i, 3, 2, 4);
            b.generateTexture('hazard_base', 26, 8);
            b.destroy();
        }
    }

    private static spark(scene: Phaser.Scene) {
        if (scene.textures.exists('spark')) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('spark', 8, 8);
        g.destroy();
    }

    private static tile(scene: Phaser.Scene) {
        if (scene.textures.exists('platform')) return;
        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x101830, 1);
        g.fillRect(0, 0, 32, 32);
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 32, 3); // bright top edge (tintable)
        g.fillStyle(0x1c2c50, 1);
        g.fillRect(3, 6, 26, 4);
        g.fillRect(3, 14, 26, 4);
        g.generateTexture('platform', 32, 32);
        g.destroy();
    }
}
