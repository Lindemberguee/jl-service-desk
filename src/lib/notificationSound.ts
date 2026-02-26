/**
 * Plays a short, pleasant notification chime using Web Audio API.
 * No external audio file needed.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Two-tone chime (pleasant bell-like sound)
  const frequencies = [830, 1050]; // E5 → C6 approx
  const durations = [0.15, 0.25];

  let offset = 0;
  for (let i = 0; i < frequencies.length; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequencies[i], now + offset);

    // Soft attack + decay envelope
    gain.gain.setValueAtTime(0, now + offset);
    gain.gain.linearRampToValueAtTime(0.3, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + durations[i]);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + offset);
    osc.stop(now + offset + durations[i]);

    offset += durations[i] * 0.7; // slight overlap for smoothness
  }
}
