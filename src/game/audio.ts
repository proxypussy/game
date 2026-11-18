class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, endFreq: number, duration: number, type: OscillatorType, gainVal = 0.08, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playSlash() {
    this.playTone(460, 110, 0.11, 'sawtooth', 0.06);
  }

  playSkill() {
    this.playTone(320, 680, 0.14, 'triangle', 0.07);
    this.playTone(540, 880, 0.16, 'sine', 0.05, 0.04);
  }

  playHit(crit = false) {
    if (crit) {
      this.playTone(620, 220, 0.13, 'square', 0.07);
      this.playTone(980, 1240, 0.12, 'triangle', 0.06, 0.03);
    } else {
      this.playTone(190, 75, 0.09, 'triangle', 0.06);
    }
  }

  playWarp() {
    this.playTone(220, 880, 0.32, 'sine', 0.08);
    this.playTone(330, 1100, 0.28, 'triangle', 0.05, 0.05);
  }

  playLevelUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      this.playTone(f, f * 1.02, 0.18, 'triangle', 0.07, idx * 0.08);
    });
  }

  playSynthesis(success: boolean) {
    if (success) {
      [440, 554.37, 659.25, 880].forEach((f, idx) => {
        this.playTone(f, f * 1.03, 0.22, 'sine', 0.08, idx * 0.07);
      });
    } else {
      this.playTone(210, 95, 0.28, 'sawtooth', 0.08);
      this.playTone(160, 70, 0.3, 'triangle', 0.07, 0.08);
    }
  }

  playBuild() {
    this.playTone(260, 390, 0.08, 'square', 0.05);
  }
}

export const soundEngine = new SoundEngine();
