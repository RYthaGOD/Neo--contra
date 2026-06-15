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
        this.scene.start('TitleScene');
    }
}
