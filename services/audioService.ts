import { AlarmSoundType } from "../types";

export class AudioEngine {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private tone(freq: number, duration: number, type: OscillatorType, vol: number, startTime: number) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  playAlarm(type: AlarmSoundType = 'standard') {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    switch (type) {
      case 'gentle':
        // Sine waves, soft and slow rising
        for (let i = 0; i < 3; i++) {
          const t = now + i * 1.5;
          this.tone(330, 0.5, 'sine', 0.4, t); // E4
          this.tone(415, 0.5, 'sine', 0.4, t + 0.2); // G#4
          this.tone(494, 1.0, 'sine', 0.3, t + 0.4); // B4
        }
        break;

      case 'digital':
        // 8-bit style arpeggio
        for (let i = 0; i < 4; i++) {
          const t = now + i * 0.4;
          this.tone(523.25, 0.1, 'square', 0.2, t);
          this.tone(659.25, 0.1, 'square', 0.2, t + 0.1);
          this.tone(783.99, 0.1, 'square', 0.2, t + 0.2);
        }
        break;

      case 'intense':
        // Sawtooth, fast and urgent
        for (let i = 0; i < 6; i++) {
          const t = now + i * 0.5;
          this.tone(880, 0.1, 'sawtooth', 0.6, t);
          this.tone(1100, 0.1, 'sawtooth', 0.6, t + 0.1);
        }
        break;

      case 'standard':
      default:
        // Original beep pattern
        for (let i = 0; i < 5; i++) {
          const t = now + i * 1.0;
          this.tone(880, 0.1, 'square', 0.5, t);
          this.tone(880, 0.1, 'square', 0.5, t + 0.15);
          this.tone(880, 0.2, 'square', 0.5, t + 0.3);
        }
        break;
    }
  }

  playLoginSuccess() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.tone(440, 0.1, 'sine', 0.5, now);
    this.tone(554, 0.1, 'sine', 0.5, now + 0.1);
    this.tone(659, 0.2, 'square', 0.5, now + 0.2);
  }

  playError() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.tone(150, 0.3, 'sawtooth', 0.5, now);
  }
}

export const audioService = new AudioEngine();