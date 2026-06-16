import Phaser from 'phaser';
import { TextureFactory } from '../TextureFactory';
import { BackgroundFactory } from '../BackgroundFactory';
import { BG_URLS } from '../backgrounds';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load any AI backdrops that exist in src/assets/bg/ (auto-detected).
        // Missing art simply isn't here, so there are no failed requests.
        for (const key in BG_URLS) {
            if (!this.textures.exists(key)) this.load.image(key, BG_URLS[key]);
        }
        this.load.on('loaderror', () => { /* tolerate any odd asset, fall back */ });
    }

    create() {
        // Core art is generated procedurally — no network/asset dependency.
        TextureFactory.generate(this);
        BackgroundFactory.generate(this);

        // Boss portraits arrive on a solid-black background (great for the reveal
        // card, which sits on a dark veil). For the in-fight sprite we need them
        // cut out, so make a transparent-background copy `boss_cut_<n>` for each.
        for (let i = 1; i <= 5; i++) this.makeCutout('bg_boss' + i, 'boss_cut_' + i);

        this.scene.start('TitleScene');
    }

    // Build a transparent-background copy of a texture by knocking out near-black
    // pixels (with a soft feathered edge so it isn't a hard alpha cliff).
    private makeCutout(srcKey: string, dstKey: string, threshold = 30) {
        if (!this.textures.exists(srcKey) || this.textures.exists(dstKey)) return;
        const src = this.textures.get(srcKey).getSourceImage() as CanvasImageSource & { width: number; height: number };
        const w = src.width, h = src.height;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(src, 0, 0);
        const img = ctx.getImageData(0, 0, w, h);
        const px = img.data;
        const featherTop = threshold * 2.2;
        for (let i = 0; i < px.length; i += 4) {
            const lum = Math.max(px[i], px[i + 1], px[i + 2]); // brightest channel
            if (lum <= threshold) px[i + 3] = 0;
            else if (lum < featherTop) px[i + 3] = Math.round(((lum - threshold) / (featherTop - threshold)) * 255);
        }
        ctx.putImageData(img, 0, 0);
        this.textures.addCanvas(dstKey, canvas);
    }
}
