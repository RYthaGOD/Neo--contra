// Procedural retro audio. No external asset files required — everything is
// synthesised with the WebAudio API so the game ships self-contained.
//
// SFX are layered (transient + tone + body) for punch; music is a small step
// sequencer with kick/snare/hat drums, a bassline, a lead arpeggio and an
// occasional chord pad. A master compressor tames peaks, a voice cap stops
// dozens of overlapping shots from turning into noise, and each SFX is throttled
// so rapid/automatic fire stays musical.

type Wave = OscillatorType;

const MASTER_VOLUME = 0.3;
const MAX_VOICES = 14;

// Minimum ms between repeats of the same SFX. Keeps machine-gun fire and a
// screen full of enemies from stacking into a harsh wall of blips.
const THROTTLE: Record<string, number> = {
    laser_fire: 55,
    machine_fire: 58,
    spread_fire: 95,
    beam_fire: 95,
    jump: 90,
    enemy_explode: 70,
    player_hit: 160,
    powerup: 120,
};

interface BlipOpts {
    freq: number;
    dur: number;
    type?: Wave;
    gain?: number;
    slideTo?: number;
    delay?: number;
    detune?: number;
    force?: boolean; // bypass the voice cap (used by rhythmic music layers)
}

class SoundManager {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private muted = false;
    private activeVoices = 0;
    private lastSfx: Record<string, number> = {};

    // BGM state
    private bgmTimer: number | null = null;
    private bgmName: string | null = null;
    private bgmStep = 0;

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
            comp.threshold.value = -16;
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

    /** Call from a click/keypress/touch to satisfy autoplay policies. Safe to
     *  call repeatedly — it just resumes a suspended context. */
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

    // ── Synth primitives ───────────────────────────────────────────────────────

    private blip(opts: BlipOpts) {
        const ctx = this.ensure();
        if (!ctx || !this.master) return;
        if (!opts.force && this.activeVoices >= MAX_VOICES) return;
        const t = ctx.currentTime + (opts.delay || 0);
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = opts.type || 'square';
        if (opts.detune) osc.detune.setValueAtTime(opts.detune, t);
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

    private noise(dur: number, gain = 0.3, delay = 0, hp = 0, force = false) {
        const ctx = this.ensure();
        if (!ctx || !this.master) return;
        if (!force && this.activeVoices >= MAX_VOICES) return;
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
        if (hp > 0) { filter.type = 'highpass'; filter.frequency.value = hp; }
        else { filter.type = 'lowpass'; filter.frequency.value = 1600; }
        src.connect(filter);
        filter.connect(g);
        g.connect(this.master);
        this.activeVoices++;
        src.onended = () => { this.activeVoices = Math.max(0, this.activeVoices - 1); };
        src.start(t);
        src.stop(t + dur);
    }

    // Drum voices for the music sequencer (bypass the SFX voice cap so the beat
    // never drops out under heavy gunfire).
    private kick(delay = 0) {
        this.blip({ freq: 130, slideTo: 45, dur: 0.13, type: 'sine', gain: 0.16, delay, force: true });
    }
    private snare(delay = 0) {
        this.noise(0.13, 0.10, delay, 900, true);
        this.blip({ freq: 220, slideTo: 160, dur: 0.08, type: 'triangle', gain: 0.04, delay, force: true });
    }
    private hat(delay = 0, gain = 0.035) {
        this.noise(0.03, gain, delay, 6000, true);
    }

    public playSFX(key: string) {
        // Per-key throttle so rapid/overlapping triggers don't pile up.
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const gap = THROTTLE[key] ?? 30;
        if (now - (this.lastSfx[key] || 0) < gap) return;
        this.lastSfx[key] = now;

        switch (key) {
            case 'laser_fire': // default rifle — tight zap with a click transient
                this.noise(0.02, 0.06, 0, 3000);
                this.blip({ freq: 860, slideTo: 300, dur: 0.07, type: 'square', gain: 0.12 });
                break;
            case 'machine_fire': // punchy, dry
                this.noise(0.015, 0.05, 0, 2500);
                this.blip({ freq: 500, slideTo: 210, dur: 0.045, type: 'square', gain: 0.1 });
                break;
            case 'spread_fire': // fuller, detuned
                this.blip({ freq: 620, slideTo: 200, dur: 0.1, type: 'triangle', gain: 0.12 });
                this.blip({ freq: 620, slideTo: 200, dur: 0.1, type: 'square', gain: 0.05, detune: 14 });
                break;
            case 'beam_fire': // bright energy beam
                this.blip({ freq: 1320, slideTo: 560, dur: 0.12, type: 'triangle', gain: 0.1 });
                this.blip({ freq: 660, slideTo: 280, dur: 0.12, type: 'sine', gain: 0.06 });
                break;
            case 'jump':
                this.blip({ freq: 300, slideTo: 680, dur: 0.14, type: 'square', gain: 0.13 });
                break;
            case 'enemy_explode':
                this.noise(0.22, 0.26, 0, 0);
                this.blip({ freq: 200, slideTo: 55, dur: 0.22, type: 'square', gain: 0.13 });
                break;
            case 'boss_explode': // big layered blast
                this.noise(0.6, 0.4, 0, 0);
                this.blip({ freq: 160, slideTo: 38, dur: 0.6, type: 'sawtooth', gain: 0.2 });
                this.blip({ freq: 80, slideTo: 30, dur: 0.7, type: 'sine', gain: 0.18 }); // sub thump
                this.noise(0.25, 0.2, 0.18, 1200); // secondary crackle
                break;
            case 'player_hit':
                this.blip({ freq: 380, slideTo: 80, dur: 0.35, type: 'sawtooth', gain: 0.22 });
                this.noise(0.25, 0.22);
                break;
            case 'powerup':
                [523, 659, 784, 1046].forEach((f, i) => this.blip({ freq: f, dur: 0.09, type: 'triangle', gain: 0.16, delay: i * 0.06 }));
                break;
            case 'level_clear':
                [392, 523, 659, 784, 1046].forEach((f, i) => {
                    this.blip({ freq: f, dur: 0.16, type: 'triangle', gain: 0.18, delay: i * 0.12 });
                    this.blip({ freq: f / 2, dur: 0.16, type: 'sine', gain: 0.06, delay: i * 0.12 });
                });
                break;
            default:
                break;
        }
    }

    // ---- Background music: a small step sequencer per track ----
    // lead/bass are note frequencies (0 = rest); drums is an 8-step pattern of
    // K(ick) S(nare) h(at) or . (rest). The clock ticks at 8th notes.
    private tracks: Record<string, { bpm: number; wave: Wave; lead: number[]; bass: number[]; drums: string }> = {
        title:           { bpm: 112, wave: 'triangle', lead: [440, 554, 659, 880, 659, 554, 440, 330], bass: [110, 110, 165, 123], drums: 'K.h.S.h.' },
        neon_jungle:     { bpm: 104, wave: 'triangle', lead: [330, 392, 494, 587, 494, 392, 330, 247], bass: [82, 82, 110, 98],    drums: 'K.h.S.hh' },
        block_bridge:    { bpm: 116, wave: 'triangle', lead: [392, 494, 587, 784, 587, 494, 392, 330], bass: [98, 98, 131, 116],   drums: 'K.hKS.h.' },
        liquid_lake:     { bpm: 96,  wave: 'triangle', lead: [294, 349, 440, 523, 440, 349, 294, 220], bass: [73, 73, 98, 87],     drums: 'K..hS..h' },
        mining_mountain: { bpm: 126, wave: 'square',   lead: [220, 330, 440, 523, 440, 330, 220, 165], bass: [55, 55, 82, 73],     drums: 'KKh.S.h.' },
        genesis_citadel: { bpm: 120, wave: 'square',   lead: [349, 440, 523, 698, 523, 440, 349, 262], bass: [87, 87, 116, 98],    drums: 'K.hKS.hh' },
        boss_theme:      { bpm: 142, wave: 'sawtooth', lead: [196, 247, 294, 392, 294, 247, 196, 165], bass: [49, 49, 65, 55],     drums: 'KKhSK.hS' },
    };

    public playBGM(name: string) {
        if (this.bgmName === name && this.bgmTimer !== null) return;
        this.stopBGM();
        const ctx = this.ensure();
        if (!ctx) return;
        this.bgmName = name;
        this.bgmStep = 0;
        const track = this.tracks[name] || this.tracks.neon_jungle;
        const stepMs = (60000 / track.bpm) / 2; // 8th notes
        const tick = () => {
            const i = this.bgmStep % 8;
            const beat = this.bgmStep % 2 === 0; // quarter-note beats

            // Drums
            const d = track.drums[i];
            if (d === 'K') this.kick();
            else if (d === 'S') this.snare();
            else if (d === 'h') this.hat();

            // Bass on each beat (softer, short)
            if (beat) {
                const bn = track.bass[(this.bgmStep / 2) % track.bass.length];
                if (bn) this.blip({ freq: bn, dur: stepMs / 1000 * 1.6, type: 'triangle', gain: 0.06, force: true });
            }

            // Lead arpeggio every step (quiet, sits under SFX)
            const ln = track.lead[i % track.lead.length];
            if (ln) this.blip({ freq: ln, dur: stepMs / 1000 * 0.8, type: track.wave, gain: 0.04, force: true });

            // Soft chord pad at the top of each bar
            if (i === 0) {
                const root = track.bass[0] * 2;
                [root, root * 1.25, root * 1.5].forEach(f =>
                    this.blip({ freq: f, dur: stepMs / 1000 * 7, type: 'sine', gain: 0.018, force: true }));
            }

            this.bgmStep++;
        };
        tick();
        this.bgmTimer = window.setInterval(tick, stepMs);
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
