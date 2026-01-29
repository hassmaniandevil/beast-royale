// ============================================
// BEAST ROYALE - AUDIO MANAGER
// Procedural music and sound effects
// ============================================

type SoundType =
  | 'attack' | 'hit' | 'ability' | 'death' | 'victory' | 'defeat'
  | 'select' | 'click' | 'hover' | 'panic' | 'knockback' | 'powerup'
  | 'zone_warning' | 'chaos_event' | 'countdown' | 'match_start'
  | 'fireball' | 'lightning' | 'dash' | 'teleport' | 'explosion'
  | 'honk' | 'scream' | 'splash' | 'crunch' | 'whoosh';

interface Track {
  name: string;
  bpm: number;
  key: number; // Base frequency
  pattern: number[];
  bassPattern: number[];
  drums: boolean;
  intensity: number;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private currentTrack: number = 0;
  private musicPlaying: boolean = false;
  private musicInterval: number | null = null;
  private beatIndex: number = 0;

  private musicVolume: number = 0.3;
  private sfxVolume: number = 0.5;
  private muted: boolean = false;

  // Musical scales (semitone offsets from root)
  private scales = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    pentatonic: [0, 2, 4, 7, 9],
    blues: [0, 3, 5, 6, 7, 10],
  };

  // Background music tracks
  private tracks: Track[] = [
    {
      name: 'Battle Theme',
      bpm: 140,
      key: 130.81, // C3
      pattern: [0, 0, 4, 0, 3, 0, 4, 7, 0, 0, 4, 0, 3, 5, 4, 0],
      bassPattern: [0, 0, 0, 0, 5, 5, 5, 5, 3, 3, 3, 3, 4, 4, 7, 7],
      drums: true,
      intensity: 0.8,
    },
    {
      name: 'Chaos Mode',
      bpm: 160,
      key: 146.83, // D3
      pattern: [0, 3, 5, 7, 0, 3, 5, 10, 0, 3, 5, 7, 10, 7, 5, 3],
      bassPattern: [0, 0, 5, 5, 3, 3, 7, 7, 0, 0, 5, 5, 3, 7, 5, 3],
      drums: true,
      intensity: 1.0,
    },
    {
      name: 'Final Showdown',
      bpm: 150,
      key: 110.00, // A2
      pattern: [0, 0, 7, 5, 3, 0, 7, 5, 0, 0, 7, 5, 3, 5, 7, 10],
      bassPattern: [0, 0, 0, 0, 3, 3, 3, 3, 5, 5, 5, 5, 7, 7, 0, 0],
      drums: true,
      intensity: 0.9,
    },
    {
      name: 'Menu Chill',
      bpm: 100,
      key: 164.81, // E3
      pattern: [0, 4, 7, 4, 0, 4, 7, 9, 0, 4, 7, 4, 0, 4, 7, 4],
      bassPattern: [0, 0, 0, 0, 5, 5, 5, 5, 4, 4, 4, 4, 0, 0, 0, 0],
      drums: false,
      intensity: 0.4,
    },
    {
      name: 'Victory Fanfare',
      bpm: 120,
      key: 196.00, // G3
      pattern: [0, 2, 4, 7, 9, 11, 12, 12, 12, 11, 9, 7, 12, 12, 12, 12],
      bassPattern: [0, 0, 0, 0, 4, 4, 4, 4, 7, 7, 7, 7, 0, 0, 0, 0],
      drums: true,
      intensity: 0.7,
    },
  ];

  constructor() {
    // Initialize on first user interaction
    this.init = this.init.bind(this);
  }

  async init(): Promise<void> {
    if (this.ctx) return;

    try {
      this.ctx = new AudioContext();

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);

      // Separate gains for music and SFX
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      console.log('[Audio] Initialized');
    } catch (e) {
      console.warn('[Audio] Failed to initialize:', e);
    }
  }

  // ============================================
  // MUSIC SYSTEM
  // ============================================

  startMusic(trackIndex: number = 0): void {
    if (!this.ctx || this.muted) return;

    this.stopMusic();
    this.currentTrack = trackIndex % this.tracks.length;
    this.musicPlaying = true;
    this.beatIndex = 0;

    const track = this.tracks[this.currentTrack];
    const beatDuration = 60000 / track.bpm / 4; // 16th notes

    this.musicInterval = window.setInterval(() => {
      if (!this.musicPlaying) return;
      this.playBeat(track);
      this.beatIndex = (this.beatIndex + 1) % 16;
    }, beatDuration);

    console.log(`[Audio] Playing: ${track.name}`);
  }

  private playBeat(track: Track): void {
    if (!this.ctx || !this.musicGain) return;

    const time = this.ctx.currentTime;
    const beatDuration = 60 / track.bpm / 4;

    // Melody
    const melodyNote = track.pattern[this.beatIndex];
    if (melodyNote !== 0 || this.beatIndex % 4 === 0) {
      this.playNote(
        track.key * Math.pow(2, melodyNote / 12) * 2,
        beatDuration * 0.8,
        0.15 * track.intensity,
        'square',
        time
      );
    }

    // Bass
    const bassNote = track.bassPattern[this.beatIndex];
    if (this.beatIndex % 2 === 0) {
      this.playNote(
        track.key * Math.pow(2, bassNote / 12) / 2,
        beatDuration * 1.5,
        0.2 * track.intensity,
        'sawtooth',
        time
      );
    }

    // Drums
    if (track.drums) {
      // Kick on 1 and 9
      if (this.beatIndex === 0 || this.beatIndex === 8) {
        this.playKick(time);
      }
      // Snare on 4 and 12
      if (this.beatIndex === 4 || this.beatIndex === 12) {
        this.playSnare(time);
      }
      // Hi-hat on every other beat
      if (this.beatIndex % 2 === 0) {
        this.playHiHat(time, this.beatIndex % 4 === 0 ? 0.15 : 0.08);
      }
    }
  }

  private playNote(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    time: number
  ): void {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  private playKick(time: number): void {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playSnare(time: number): void {
    if (!this.ctx || !this.musicGain) return;

    // Noise component
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.1);

    // Body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 180;
    oscGain.gain.setValueAtTime(0.2, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  private playHiHat(time: number, volume: number): void {
    if (!this.ctx || !this.musicGain) return;

    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  setMusicIntensity(intensity: number): void {
    // Adjust based on game phase
    if (intensity > 0.8) {
      this.startMusic(1); // Chaos mode
    } else if (intensity > 0.6) {
      this.startMusic(2); // Final showdown
    } else {
      this.startMusic(0); // Battle theme
    }
  }

  // ============================================
  // SOUND EFFECTS
  // ============================================

  playSound(type: SoundType, variation: number = 0): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;

    const time = this.ctx.currentTime;

    switch (type) {
      case 'attack':
        this.playSwoosh(time, 0.3 + variation * 0.1);
        break;
      case 'hit':
        this.playImpact(time, 0.4);
        break;
      case 'ability':
        this.playAbilitySound(time);
        break;
      case 'death':
        this.playDeath(time);
        break;
      case 'victory':
        this.playVictorySound(time);
        break;
      case 'defeat':
        this.playDefeatSound(time);
        break;
      case 'select':
        this.playSelect(time);
        break;
      case 'click':
        this.playClick(time);
        break;
      case 'hover':
        this.playHover(time);
        break;
      case 'panic':
        this.playPanicSound(time, variation);
        break;
      case 'knockback':
        this.playKnockback(time);
        break;
      case 'powerup':
        this.playPowerup(time);
        break;
      case 'zone_warning':
        this.playZoneWarning(time);
        break;
      case 'chaos_event':
        this.playChaosEvent(time);
        break;
      case 'countdown':
        this.playCountdown(time);
        break;
      case 'match_start':
        this.playMatchStart(time);
        break;
      case 'fireball':
        this.playFireball(time);
        break;
      case 'lightning':
        this.playLightning(time);
        break;
      case 'dash':
        this.playDash(time);
        break;
      case 'teleport':
        this.playTeleport(time);
        break;
      case 'explosion':
        this.playExplosion(time);
        break;
      case 'honk':
        this.playHonk(time);
        break;
      case 'scream':
        this.playScream(time);
        break;
      case 'splash':
        this.playSplash(time);
        break;
      case 'crunch':
        this.playCrunch(time);
        break;
      case 'whoosh':
        this.playSwoosh(time, 0.2);
        break;
    }
  }

  private playSwoosh(time: number, volume: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / this.ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 20);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + 0.15);
    filter.Q.value = 2;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(time);
  }

  private playImpact(time: number, volume: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(60, time + 0.1);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.15);

    // Crunch
    this.playNoise(time, 0.08, 1500, volume * 0.5);
  }

  private playAbilitySound(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Rising tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, time);
    osc.frequency.exponentialRampToValueAtTime(800, time + 0.15);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.3);

    // Shimmer
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(600, time);
    osc2.frequency.exponentialRampToValueAtTime(1200, time + 0.2);

    gain2.gain.setValueAtTime(0.15, time + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);

    osc2.start(time);
    osc2.stop(time + 0.3);
  }

  private playDeath(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Descending tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.5);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.5);

    // Pop
    this.playNoise(time + 0.1, 0.1, 500, 0.4);
  }

  private playVictorySound(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, time + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.2, time + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.15 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(time + i * 0.15);
      osc.stop(time + i * 0.15 + 0.5);
    });
  }

  private playDefeatSound(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const notes = [392.00, 349.23, 293.66, 261.63]; // G4, F4, D4, C4

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, time + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.15, time + i * 0.2 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.2 + 0.4);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(time + i * 0.2);
      osc.stop(time + i * 0.2 + 0.5);
    });
  }

  private playSelect(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, time);
    osc.frequency.setValueAtTime(660, time + 0.05);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private playClick(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 800;

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playHover(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 600;

    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.03);
  }

  private playPanicSound(time: number, variation: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Random panic sounds based on variation
    const sounds = ['scream', 'honk', 'boing', 'splat', 'whomp'];
    const sound = sounds[Math.floor(variation * sounds.length) % sounds.length];

    switch (sound) {
      case 'scream':
        this.playScream(time);
        break;
      case 'honk':
        this.playHonk(time);
        break;
      case 'boing':
        this.playBoing(time);
        break;
      case 'splat':
        this.playSplash(time);
        break;
      default:
        this.playExplosion(time);
    }
  }

  private playKnockback(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Whomp sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.15);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.2);

    this.playSwoosh(time, 0.2);
  }

  private playPowerup(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Sparkle arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, time + i * 0.04);
      gain.gain.linearRampToValueAtTime(0.2, time + i * 0.04 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.04 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(time + i * 0.04);
      osc.stop(time + i * 0.04 + 0.3);
    });
  }

  private playZoneWarning(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Warning beeps
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.value = 880;

      gain.gain.setValueAtTime(0, time + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.15, time + i * 0.2 + 0.01);
      gain.gain.setValueAtTime(0.15, time + i * 0.2 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.2 + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(time + i * 0.2);
      osc.stop(time + i * 0.2 + 0.15);
    }
  }

  private playChaosEvent(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Dramatic chord
    const frequencies = [130.81, 164.81, 196.00, 246.94]; // C3 E3 G3 B3

    frequencies.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 1);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, time);
      filter.frequency.exponentialRampToValueAtTime(500, time + 1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(time);
      osc.stop(time + 1);
    });

    // Siren sweep
    const siren = this.ctx.createOscillator();
    const sirenGain = this.ctx.createGain();

    siren.type = 'sine';
    siren.frequency.setValueAtTime(400, time);
    siren.frequency.linearRampToValueAtTime(800, time + 0.5);
    siren.frequency.linearRampToValueAtTime(400, time + 1);

    sirenGain.gain.setValueAtTime(0.1, time);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, time + 1);

    siren.connect(sirenGain);
    sirenGain.connect(this.sfxGain);

    siren.start(time);
    siren.stop(time + 1);
  }

  private playCountdown(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 440;

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private playMatchStart(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Ascending fanfare
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4 E4 G4 C5

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, time + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.25, time + i * 0.1 + 0.02);
      gain.gain.setValueAtTime(0.25, time + i * 0.1 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.1 + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(time + i * 0.1);
      osc.stop(time + i * 0.1 + 0.4);
    });

    // Cymbal
    this.playNoise(time + 0.3, 0.5, 5000, 0.2);
  }

  private playFireball(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Whoosh + crackle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.3);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.3);

    // Crackle
    this.playNoise(time, 0.3, 2000, 0.15);
  }

  private playLightning(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Zap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2000, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.15);

    // Crackle
    this.playNoise(time, 0.1, 4000, 0.3);
  }

  private playDash(time: number): void {
    this.playSwoosh(time, 0.4);
  }

  private playTeleport(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Warp sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, time);
    osc.frequency.exponentialRampToValueAtTime(2000, time + 0.15);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.3);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private playExplosion(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Low boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.3);

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.4);

    // Debris
    this.playNoise(time, 0.3, 800, 0.4);
  }

  private playHonk(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Goose honk
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, time);
    osc.frequency.setValueAtTime(500, time + 0.05);
    osc.frequency.setValueAtTime(450, time + 0.1);
    osc.frequency.exponentialRampToValueAtTime(300, time + 0.3);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.setValueAtTime(0.4, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 3;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.35);
  }

  private playScream(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // Cartoon scream
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, time);
    osc.frequency.linearRampToValueAtTime(1200, time + 0.1);
    osc.frequency.linearRampToValueAtTime(800, time + 0.2);
    osc.frequency.exponentialRampToValueAtTime(400, time + 0.4);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 2;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  private playSplash(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    this.playNoise(time, 0.2, 1000, 0.3);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.2);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playCrunch(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    this.playNoise(time, 0.08, 2000, 0.4);
    this.playNoise(time + 0.02, 0.06, 1500, 0.3);
  }

  private playBoing(time: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(600, time + 0.05);
    osc.frequency.exponentialRampToValueAtTime(150, time + 0.3);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private playNoise(time: number, duration: number, filterFreq: number, volume: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(time);
  }

  // ============================================
  // VOLUME CONTROLS
  // ============================================

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxVolume;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopMusic();
    }
  }

  getMuted(): boolean {
    return this.muted;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }
}

// Singleton instance
export const audio = new AudioManager();
