// Web Audio Notification Sounds Generator

class SoundPlayer {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playChime(type: 'reminder' | 'success' | 'alert' | 'urgent' = 'reminder') {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'reminder') {
        // Two-tone gentle bell chime (E5 -> B5)
        this.playTone(ctx, 659.25, now, 0.2, 0.2);
        this.playTone(ctx, 987.77, now + 0.15, 0.4, 0.25);
      } else if (type === 'success') {
        // Uplifting major triad (C5 -> E5 -> G5)
        this.playTone(ctx, 523.25, now, 0.15, 0.2);
        this.playTone(ctx, 659.25, now + 0.1, 0.15, 0.2);
        this.playTone(ctx, 783.99, now + 0.2, 0.4, 0.3);
      } else if (type === 'alert') {
        // Attention chime (A5 -> F5)
        this.playTone(ctx, 880, now, 0.2, 0.25);
        this.playTone(ctx, 698.46, now + 0.15, 0.3, 0.25);
      } else if (type === 'urgent') {
        // Urgent 3 rapid pulses
        this.playTone(ctx, 880, now, 0.1, 0.3, 'sawtooth');
        this.playTone(ctx, 880, now + 0.12, 0.1, 0.3, 'sawtooth');
        this.playTone(ctx, 1046.5, now + 0.24, 0.3, 0.35, 'sawtooth');
      }
    } catch (err) {
      console.warn('Audio play prevented or unavailable:', err);
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    gainLevel = 0.2,
    type: OscillatorType = 'sine'
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(gainLevel, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const soundPlayer = new SoundPlayer();
