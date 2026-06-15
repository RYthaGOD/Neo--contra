// Procedural retro audio. No external asset files required — everything is
// synthesised with the WebAudio API so the game ships self-contained.
//
// Polished for density: a master compressor tames peaks, a voice cap stops
// dozens of overlapping shots from turning into noise, and each SFX is throttled
// so rapid/automatic fire (and many enemies firing at once) stays musical.

type Wave = OscillatorType;

const MASTER_VOLUME = 0.32;
const MAX_VOICES = 10;

// Minimum ms between repeats of the same SFX. Keeps machine-gun fire and a
// screen full of enemies from stacking into a harsh wall of blips.
const THROTTLE: Record<string, number> = {
    laser_fire: 55,
    machine_fire: 60,
    spread_fire: 95,
    beam_fire: 95,
    jump: 90,
    enemy_explode: 70,
    player_hit: 160,
    powerup: 120,
};

class SoundManager {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private muted = false;
    private activeVoices = 0;
    private lastSfx: Record<string, number> = {};

    // BGM state
    private bgmTimer: number | null = null;
    private bgmName: string | null = null;

    /** Lazily create the audio graph. Must run after a user gesture. */
    private ensure(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!this.ctx) {
            const AC = window.AudioContext || (window as any).webkitAudioContext;
            if (!AC) return null;
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
            // A gentle compressor/limiter rounds off harsh peaks when many
            // sounds overlap, so the mix never feels "crazy".
            const comp = this.ctx.createDynamicsCompressor();
            comp.threshold.value = -18;
            comp.knee.value = 24;
            comp.ratio.value = 12;
            comp.attack.value = 0.003;
            comp.release.value = 0.25;
            this.master.connect(comp);
            comp.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    /** Call from a click/keypress to satisfy autoplay policies. */
    public unlock() {
        this.ensure();
    }

    public isMuted() {
        return this.muted;
    }

    public toggleMute(): boolean {
        this.muted = !this.muted;
        if (this.master) this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
        return this.muted;
    }

    private blip(opts: {
        freq: number;
        dur: number;
        type?: Wave;
        gain?: number;
        slideTo?: number;
        delay?: number;
    }) {
        const ctx = this.ensure();
        if (!ctx || !this.master) return;
        if (this.activeVoices >= MAX_VOICES) return; // voice cap
        const t = ctx.currentTime + (opts.delay || 0);
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = opts.type || 'square';
        osc.frequency.setValueAtTime(opts.freq, t);
        if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t + opts.dur);
        const peak = opts.gain ?? 0.22;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
        osc.connect(g);
        g.connect(this.master);
        this.activeVoices++;
        osc.onended = () => { this.activeVoices = Math.max(0, this.activeVoices - 1); };
        osc.start(t);
        osc.stop(t + opts.dur + 0.02);
    }

    private noise(dur: number, gain = 0.3, delay = 0) {
        const ctx = this.ensure();
        if (!ctx || !this.master) return;
        if (this.activeVoices >= MAX_VOICES) return;
        const t = ctx.currentTime + delay;
        const frames = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1600;
        src.connect(filter);
        filter.connect(g);
        g.connect(this.master);
        this.activeVoices++;
        src.onended = () => { this.activeVoices = Math.max(0, this.activeVoices - 1); };
        src.start(t);
        src.stop(t + dur);
    }

    public playSFX(key: string) {
        // Per-key throttle so rapid/overlapping triggers don't pile up.
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const gap = THROTTLE[key] ?? 30;
        if (now - (this.lastSfx[key] || 0) < gap) return;
        this.lastSfx[key] = now;

        switch (key) {
            case 'laser_fire':
                this.blip({ freq: 820, slideTo: 320, dur: 0.07, type: 'square', gain: 0.12 });
                break;
            case 'machine_fire':
                this.blip({ freq: 480, slideTo: 230, dur: 0.045, type: 'square', gain: 0.1 });
                break;
            case 'spread_fire':
                this.blip({ freq: 620, slideTo: 200, dur: 0.09, type: 'triangle', gain: 0.12 });
                break;
            case 'beam_fire':
                this.blip({ freq: 1300, slideTo: 560, dur: 0.11, type: 'triangle', gain: 0.11 });
                break;
            case 'jump':
                this.blip({ freq: 300, slideTo: 680, dur: 0.14, type: 'square', gain: 0.14 });
                break;
            case 'enemy_explode':
                this.noise(0.2, 0.26);
                this.blip({ freq: 190, slideTo: 60, dur: 0.2, type: 'square', gain: 0.13 });
                break;
            case 'boss_explode':
                this.noise(0.55, 0.4);
                this.blip({ freq: 150, slideTo: 40, dur: 0.55, type: 'sawtooth', gain: 0.22 });
                break;
            case 'player_hit':
                this.blip({ freq: 380, slideTo: 80, dur: 0.35, type: 'sawtooth', gain: 0.22 });
                this.noise(0.25, 0.22);
                break;
            case 'powerup':
                [523, 659, 784, 1046].forEach((f, i) => this.blip({ freq: f, dur: 0.08, type: 'triangle', gain: 0.16, delay: i * 0.06 }));
                break;
            case 'level_clear':
                [392, 523, 659, 784, 1046].forEach((f, i) => this.blip({ freq: f, dur: 0.15, type: 'triangle', gain: 0.18, delay: i * 0.12 }));
                break;
            default:
                break;
        }
    }

    // ---- Background music: simple looping arpeggio per track ----
    private tracks: Record<string, { notes: number[]; tempo: number; type: Wave }> = {
        title:           { notes: [220, 277, 330, 440, 330, 277], tempo: 240, type: 'triangle' },
        neon_jungle:     { notes: [165, 220, 247, 330, 247, 220], tempo: 165, type: 'triangle' },
        block_bridge:    { notes: [196, 262, 311, 392, 311, 262], tempo: 155, type: 'triangle' },
        liquid_lake:     { notes: [147, 196, 247, 294, 247, 196], tempo: 175, type: 'triangle' },
        mining_mountain: { notes: [110, 165, 220, 262, 220, 165], tempo: 150, type: 'square' },
        genesis_citadel: { notes: [131, 175, 233, 277, 349, 277], tempo: 140, type: 'square' },
        boss_theme:      { notes: [98, 123, 147, 196, 147, 123], tempo: 130, type: 'square' },
    };

    public playBGM(name: string) {
        if (this.bgmName === name && this.bgmTimer !== null) return;
        this.stopBGM();
        const ctx = this.ensure();
        if (!ctx) return;
        this.bgmName = name;
        const track = this.tracks[name] || this.tracks.neon_jungle;
        let step = 0;
        const tick = () => {
            const note = track.notes[step % track.notes.length];
            // Quieter, softer melody so it sits under the SFX.
            this.blip({ freq: note, dur: track.tempo / 1000 * 0.85, type: track.type, gain: 0.045 });
            // bass on the downbeat
            if (step % track.notes.length === 0) {
                this.blip({ freq: note / 2, dur: track.tempo / 1000 * 1.7, type: 'triangle', gain: 0.055 });
            }
            step++;
        };
        tick();
        this.bgmTimer = window.setInterval(tick, track.tempo);
    }

    public stopBGM() {
        if (this.bgmTimer !== null) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.bgmName = null;
    }
}

export const sounds = new SoundManager();
