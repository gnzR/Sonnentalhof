import { GameSettings } from '../types/game';

export interface MidiTrack {
  id: string;
  title: string;
  mood: string;
  bpm: number;
  melody: number[]; // MIDI note numbers (0 = rest)
  bass: number[];
  pad: number[][]; // chord per 4 beats
  waveform: OscillatorType;
}

// 6 calm, cozy MIDI-style background tracks
export const MIDI_TRACKS: MidiTrack[] = [
  {
    id: 'morning_dew',
    title: 'Morgentau im Tal',
    mood: 'Ruhig & sonnig',
    bpm: 76,
    waveform: 'triangle',
    melody: [
      64, 67, 72, 0, 71, 69, 67, 0,
      65, 69, 72, 74, 72, 71, 67, 0,
      64, 67, 76, 74, 72, 69, 67, 64,
      62, 65, 69, 67, 64, 0, 60, 0,
    ],
    bass: [
      48, 0, 55, 0, 48, 0, 55, 0,
      45, 0, 52, 0, 45, 0, 52, 0,
      41, 0, 48, 0, 43, 0, 50, 0,
      43, 0, 50, 0, 48, 0, 48, 0,
    ],
    pad: [
      [60, 64, 67],
      [57, 60, 64],
      [53, 57, 60],
      [55, 59, 62],
    ],
  },
  {
    id: 'summer_pasture',
    title: 'Sommersonne auf der Weide',
    mood: 'Leicht & pastoral',
    bpm: 84,
    waveform: 'sine',
    melody: [
      67, 71, 74, 71, 69, 67, 64, 0,
      62, 67, 69, 71, 69, 0, 67, 0,
      74, 76, 79, 76, 74, 71, 69, 67,
      64, 67, 69, 66, 67, 0, 0, 0,
    ],
    bass: [
      43, 0, 50, 0, 40, 0, 47, 0,
      38, 0, 45, 0, 43, 0, 50, 0,
      48, 0, 55, 0, 47, 0, 54, 0,
      45, 0, 50, 0, 43, 0, 43, 0,
    ],
    pad: [
      [55, 59, 62],
      [50, 54, 57],
      [60, 64, 67],
      [55, 59, 62],
    ],
  },
  {
    id: 'mushroom_mist',
    title: 'Pilzpfad im Nebelwald',
    mood: 'Sanft & verträumt',
    bpm: 68,
    waveform: 'sine',
    melody: [
      62, 65, 69, 0, 72, 69, 65, 0,
      64, 67, 70, 69, 65, 64, 62, 0,
      69, 72, 74, 0, 72, 70, 69, 67,
      65, 64, 62, 60, 62, 0, 0, 0,
    ],
    bass: [
      38, 0, 45, 0, 38, 0, 45, 0,
      41, 0, 48, 0, 43, 0, 50, 0,
      46, 0, 53, 0, 45, 0, 52, 0,
      43, 0, 45, 0, 38, 0, 38, 0,
    ],
    pad: [
      [50, 53, 57],
      [53, 57, 60],
      [58, 62, 65],
      [50, 53, 57],
    ],
  },
  {
    id: 'village_market',
    title: 'Markttag in Sonnental',
    mood: 'Gemütlicher Dorfwalzer',
    bpm: 88,
    waveform: 'triangle',
    melody: [
      65, 69, 72, 74, 72, 69, 67, 0,
      65, 67, 69, 70, 69, 67, 65, 0,
      72, 74, 77, 76, 74, 72, 70, 69,
      67, 69, 70, 67, 65, 0, 0, 0,
    ],
    bass: [
      41, 48, 53, 0, 41, 48, 53, 0,
      46, 53, 58, 0, 48, 55, 60, 0,
      41, 48, 53, 0, 46, 53, 58, 0,
      48, 55, 60, 0, 41, 0, 41, 0,
    ],
    pad: [
      [53, 57, 60],
      [58, 62, 65],
      [53, 57, 60],
      [55, 60, 64],
    ],
  },
  {
    id: 'evening_mill',
    title: 'Abendrot am Mühlbach',
    mood: 'Warm & entspannend',
    bpm: 72,
    waveform: 'sine',
    melody: [
      63, 67, 70, 72, 70, 67, 63, 0,
      65, 68, 72, 75, 72, 70, 68, 0,
      67, 70, 74, 72, 70, 68, 67, 65,
      63, 65, 67, 65, 63, 0, 0, 0,
    ],
    bass: [
      39, 0, 46, 0, 39, 0, 46, 0,
      44, 0, 51, 0, 44, 0, 51, 0,
      46, 0, 53, 0, 46, 0, 53, 0,
      39, 0, 46, 0, 39, 0, 39, 0,
    ],
    pad: [
      [51, 55, 58],
      [56, 60, 63],
      [58, 62, 65],
      [51, 55, 58],
    ],
  },
  {
    id: 'starry_farm',
    title: 'Sternennacht auf dem Hof',
    mood: 'Schlummerlied & Sterne',
    bpm: 64,
    waveform: 'sine',
    melody: [
      69, 72, 76, 0, 74, 72, 71, 0,
      69, 71, 72, 69, 67, 0, 64, 0,
      65, 69, 72, 0, 71, 69, 67, 0,
      64, 67, 71, 69, 69, 0, 0, 0,
    ],
    bass: [
      45, 0, 52, 0, 45, 0, 52, 0,
      41, 0, 48, 0, 48, 0, 55, 0,
      41, 0, 48, 0, 43, 0, 50, 0,
      45, 0, 52, 0, 45, 0, 45, 0,
    ],
    pad: [
      [57, 60, 64],
      [53, 57, 60],
      [55, 59, 62],
      [57, 60, 64],
    ],
  },
  {
    id: 'raindrops_barn',
    title: 'Regentropfen auf dem Scheunendach',
    mood: 'Ruhig & geborgen',
    bpm: 70,
    waveform: 'sine',
    melody: [
      62, 66, 69, 74, 73, 71, 69, 0,
      67, 71, 74, 0, 73, 69, 66, 0,
      64, 67, 71, 74, 73, 71, 69, 66,
      64, 66, 67, 64, 62, 0, 0, 0,
    ],
    bass: [
      38, 0, 45, 0, 43, 0, 50, 0,
      43, 0, 50, 0, 38, 0, 45, 0,
      40, 0, 47, 0, 45, 0, 52, 0,
      45, 0, 52, 0, 38, 0, 38, 0,
    ],
    pad: [
      [50, 54, 57],
      [55, 59, 62],
      [52, 55, 59],
      [50, 54, 57],
    ],
  },
  {
    id: 'campfire_woods',
    title: 'Lagerfeuer am Waldrand',
    mood: 'Warm & abendlich',
    bpm: 66,
    waveform: 'triangle',
    melody: [
      67, 70, 74, 0, 72, 70, 69, 0,
      65, 69, 72, 74, 72, 70, 67, 0,
      63, 67, 70, 72, 70, 69, 67, 65,
      62, 65, 69, 67, 67, 0, 0, 0,
    ],
    bass: [
      43, 0, 50, 0, 43, 0, 50, 0,
      41, 0, 48, 0, 43, 0, 50, 0,
      39, 0, 46, 0, 41, 0, 48, 0,
      38, 0, 45, 0, 43, 0, 43, 0,
    ],
    pad: [
      [55, 58, 62],
      [53, 57, 60],
      [51, 55, 58],
      [50, 55, 58],
    ],
  },
  {
    id: 'spring_clover',
    title: 'Frühlingsbrise über den Klee',
    mood: 'Luftig & heiter',
    bpm: 82,
    waveform: 'sine',
    melody: [
      69, 72, 77, 76, 74, 72, 69, 0,
      70, 74, 77, 0, 76, 74, 72, 0,
      69, 72, 74, 76, 74, 72, 70, 69,
      67, 69, 70, 67, 65, 0, 0, 0,
    ],
    bass: [
      41, 0, 48, 0, 41, 0, 48, 0,
      46, 0, 53, 0, 48, 0, 55, 0,
      41, 0, 48, 0, 46, 0, 53, 0,
      48, 0, 55, 0, 41, 0, 41, 0,
    ],
    pad: [
      [53, 57, 60],
      [58, 62, 65],
      [53, 57, 60],
      [55, 60, 64],
    ],
  },
  {
    id: 'sunday_valley',
    title: 'Sonntagsspaziergang im Tal',
    mood: 'Friedlich & hell',
    bpm: 78,
    waveform: 'triangle',
    melody: [
      64, 68, 73, 0, 71, 69, 68, 0,
      66, 69, 73, 76, 74, 73, 71, 0,
      69, 73, 76, 74, 73, 71, 69, 68,
      66, 68, 71, 69, 69, 0, 0, 0,
    ],
    bass: [
      45, 0, 52, 0, 40, 0, 47, 0,
      42, 0, 49, 0, 40, 0, 47, 0,
      45, 0, 52, 0, 42, 0, 49, 0,
      40, 0, 47, 0, 45, 0, 45, 0,
    ],
    pad: [
      [57, 61, 64],
      [54, 57, 61],
      [57, 61, 64],
      [52, 56, 59],
    ],
  },
  {
    id: 'moonlit_pumpkin',
    title: 'Mondschein über dem Kürbisfeld',
    mood: 'Sanfte Nachtruhe',
    bpm: 62,
    waveform: 'sine',
    melody: [
      60, 63, 67, 72, 70, 67, 63, 0,
      65, 68, 72, 0, 70, 68, 67, 0,
      63, 67, 70, 72, 70, 68, 67, 65,
      63, 62, 60, 62, 60, 0, 0, 0,
    ],
    bass: [
      36, 0, 43, 0, 36, 0, 43, 0,
      41, 0, 48, 0, 43, 0, 50, 0,
      39, 0, 46, 0, 41, 0, 48, 0,
      43, 0, 50, 0, 36, 0, 36, 0,
    ],
    pad: [
      [48, 51, 55],
      [53, 56, 60],
      [51, 55, 58],
      [48, 51, 55],
    ],
  },
];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class MidiAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private timerId: number | null = null;
  private step = 0;
  private settings: GameSettings | null = null;
  private onTrackAdvance?: (nextIndex: number) => void;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      // Gentle low-pass filter on music bus for warm retro MIDI sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2100;
      filter.Q.value = 0.7;

      this.musicGain.connect(filter);
      filter.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.applyVolumes();
    return this.ctx;
  }

  public unlockAndSync(settings: GameSettings, onTrackAdvance?: (nextIndex: number) => void) {
    this.settings = settings;
    this.onTrackAdvance = onTrackAdvance;
    this.ensureContext();
    this.applyVolumes();

    if (settings.musicPlaying && !settings.muted) {
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }

  public updateSettings(settings: GameSettings) {
    const prevTrack = this.settings?.currentTrackIndex;
    const prevPlaying = this.settings?.musicPlaying;
    this.settings = settings;
    this.applyVolumes();

    if (settings.musicPlaying && !settings.muted) {
      if (!prevPlaying || prevTrack !== settings.currentTrackIndex || this.timerId === null) {
        this.step = 0;
        this.startLoop();
      }
    } else {
      this.stopLoop();
    }
  }

  private applyVolumes() {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain || !this.settings) return;
    const now = this.ctx.currentTime;
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume * 0.45, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume * 0.55, now, 0.03);
  }

  private startLoop() {
    this.stopLoop();
    if (!this.settings) return;
    const track = MIDI_TRACKS[this.settings.currentTrackIndex % MIDI_TRACKS.length];
    const stepMs = (60 / track.bpm / 2) * 1000; // eighth-note pulse

    this.timerId = window.setInterval(() => {
      if (!this.settings || !this.settings.musicPlaying || this.settings.muted) return;
      const ctx = this.ensureContext();
      if (!ctx || !this.musicGain) return;

      const idx = this.step % track.melody.length;
      const melodyNote = track.melody[idx];
      const bassNote = track.bass[idx];

      if (melodyNote > 0) {
        this.playNote(ctx, this.musicGain, midiToFreq(melodyNote), track.waveform, 0.16, stepMs / 1000 * 1.35);
      }
      if (bassNote > 0) {
        this.playNote(ctx, this.musicGain, midiToFreq(bassNote), 'sine', 0.13, stepMs / 1000 * 1.6);
      }
      if (idx % 8 === 0) {
        const chord = track.pad[Math.floor(idx / 8) % track.pad.length];
        chord.forEach((n) => {
          this.playNote(ctx, this.musicGain!, midiToFreq(n), 'sine', 0.045, (stepMs / 1000) * 6.5);
        });
      }

      this.step += 1;
      // After 2 full loops, smoothly advance to next track
      if (this.step >= track.melody.length * 2) {
        this.step = 0;
        const nextIdx = (this.settings.currentTrackIndex + 1) % MIDI_TRACKS.length;
        if (this.onTrackAdvance) {
          this.onTrackAdvance(nextIdx);
        }
      }
    }, stepMs);
  }

  public stopLoop() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private playNote(
    ctx: AudioContext,
    target: AudioNode,
    freq: number,
    type: OscillatorType,
    peakGain: number,
    durationSec: number
  ) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(target);
    osc.start(now);
    osc.stop(now + durationSec + 0.03);
  }

  public playSfx(
    kind:
      | 'click'
      | 'till'
      | 'plant'
      | 'water'
      | 'harvest'
      | 'coin'
      | 'levelup'
      | 'animal'
      | 'alert'
      | 'jump'
      | 'splash'
      | 'bite'
      | 'merchant'
      | 'mail'
      | 'santa'
      | 'firework'
      | 'mine'
  ) {
    if (this.settings?.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    switch (kind) {
      case 'click':
        this.playNote(ctx, this.sfxGain, 540, 'triangle', 0.1, 0.06);
        break;
      case 'till':
        this.playNote(ctx, this.sfxGain, 170, 'triangle', 0.2, 0.09);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 130, 'sine', 0.16, 0.08), 35);
        break;
      case 'plant':
        this.playNote(ctx, this.sfxGain, 392, 'sine', 0.14, 0.09);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 523.25, 'sine', 0.14, 0.12), 55);
        break;
      case 'water':
        this.playNote(ctx, this.sfxGain, 660, 'sine', 0.12, 0.08);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 880, 'sine', 0.1, 0.1), 50);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 1046, 'sine', 0.08, 0.11), 95);
        break;
      case 'harvest':
        this.playNote(ctx, this.sfxGain, 523.25, 'triangle', 0.18, 0.11);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 659.25, 'triangle', 0.18, 0.12), 60);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 783.99, 'triangle', 0.2, 0.18), 120);
        break;
      case 'coin':
        this.playNote(ctx, this.sfxGain, 987.77, 'sine', 0.18, 0.09);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 1318.51, 'sine', 0.2, 0.22), 70);
        break;
      case 'animal':
        this.playNote(ctx, this.sfxGain, 440, 'triangle', 0.16, 0.12);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 554.37, 'triangle', 0.16, 0.14), 80);
        break;
      case 'levelup':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
          setTimeout(() => this.playNote(ctx, this.sfxGain!, f, 'triangle', 0.22, 0.25), idx * 90);
        });
        break;
      case 'alert':
        this.playNote(ctx, this.sfxGain, 330, 'triangle', 0.18, 0.18);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 293.66, 'triangle', 0.18, 0.22), 160);
        break;
      case 'jump':
        this.playNote(ctx, this.sfxGain, 290, 'triangle', 0.18, 0.08);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 460, 'triangle', 0.16, 0.11), 50);
        break;
      case 'splash':
        this.playNote(ctx, this.sfxGain, 420, 'sine', 0.15, 0.09);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 310, 'sine', 0.12, 0.14), 70);
        break;
      case 'bite':
        this.playNote(ctx, this.sfxGain, 740, 'triangle', 0.2, 0.08);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 988, 'triangle', 0.22, 0.14), 80);
        break;
      case 'merchant':
        // Distinctive warm wagon horn + bright carriage bell chime when Bruno arrives
        this.playNote(ctx, this.sfxGain, 392.0, 'triangle', 0.2, 0.14);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 493.88, 'triangle', 0.2, 0.14), 110);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 587.33, 'triangle', 0.22, 0.22), 220);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 1174.66, 'sine', 0.16, 0.12), 340);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 1567.98, 'sine', 0.18, 0.24), 450);
        break;
      case 'mail':
        // Cheerful village posthorn chime at 10:00 AM mail delivery
        this.playNote(ctx, this.sfxGain, 587.33, 'triangle', 0.18, 0.12);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 783.99, 'triangle', 0.19, 0.14), 100);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 987.77, 'sine', 0.16, 0.14), 210);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 1174.66, 'sine', 0.18, 0.26), 310);
        break;
      case 'santa':
        // Bright twinkling sleigh bells chime
        [1046.5, 1318.51, 1567.98, 2093.0, 1567.98, 2093.0].forEach((f, idx) => {
          setTimeout(() => this.playNote(ctx, this.sfxGain!, f, 'sine', 0.15, 0.16), idx * 95);
        });
        break;
      case 'firework':
        // Rising firework whistle + soft sparkling burst
        this.playNote(ctx, this.sfxGain, 420, 'sine', 0.09, 0.12);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 680, 'sine', 0.1, 0.12), 80);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 1046.5, 'triangle', 0.15, 0.18), 160);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 1567.98, 'sine', 0.11, 0.22), 240);
        break;
      case 'mine':
        // Crisp pickaxe strike followed by subtle crystal chime
        this.playNote(ctx, this.sfxGain, 260, 'triangle', 0.18, 0.08);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 880, 'sine', 0.12, 0.09), 50);
        setTimeout(() => this.playNote(ctx, this.sfxGain!, 1318.51, 'sine', 0.09, 0.14), 100);
        break;
    }
  }
}

export const audioEngine = new MidiAudioEngine();
