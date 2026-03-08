import { Howl } from 'howler';

class SoundManager {
    private sounds: Map<string, Howl> = new Map();
    private bgm: Howl | null = null;

    constructor() {
        // Initialize placeholders or instructions for adding real assets
    }

    public playSFX(key: string) {
        // In a real app, we'd have paths here. 
        // For now, this is the infrastructure ready for the .wav files.
        console.log(`[SFX] Playing: ${key}`);
        const sound = this.sounds.get(key);
        if (sound) sound.play();
    }

    public playBGM(key: string) {
        if (this.bgm) this.bgm.stop();
        console.log(`[BGM] Starting: ${key}`);
        // this.bgm = new Howl({ src: [`/assets/audio/${key}.mp3`], loop: true });
        // this.bgm.play();
    }

    public stopBGM() {
        if (this.bgm) this.bgm.stop();
    }
}

export const sounds = new SoundManager();
