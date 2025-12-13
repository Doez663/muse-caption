
// A lightweight procedural sound engine using Web Audio API
// Designed for a Retro/Industrial UI vibe

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.15; // Keep it subtle
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return { ctx: audioCtx, master: masterGain };
};

// Generic Oscillator Helper
const playTone = (
  freq: number, 
  type: OscillatorType, 
  duration: number, 
  startTime: number, 
  ctx: AudioContext, 
  dest: AudioNode,
  vol: number = 1
) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

  osc.connect(gain);
  gain.connect(dest);

  osc.start(startTime);
  osc.stop(startTime + duration);
};

export const playSound = {
  // Standard UI Click (Mechanical/Keyboard feel)
  click: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    // A mix of a low thud and a high tick
    playTone(300, 'square', 0.05, t, ctx, master, 0.5);
    playTone(1500, 'sine', 0.01, t, ctx, master, 0.3);
  },

  // Copied Sound - Softer "Pop" / Bubble sound
  snap: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    
    // Short sine burst with pitch drop (Water droplet/Pop feel)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
    
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.connect(gain);
    gain.connect(master);
    
    osc.start(t);
    osc.stop(t + 0.1);
  },

  // Success Chime (Ascending Arpeggio)
  success: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    // C Major-ish Arpeggio
    playTone(523.25, 'sine', 0.3, t, ctx, master, 0.6); // C5
    playTone(659.25, 'sine', 0.3, t + 0.1, ctx, master, 0.6); // E5
    playTone(783.99, 'sine', 0.5, t + 0.2, ctx, master, 0.6); // G5
  },

  // Delete / Error (Low frequency, Sawtooth)
  glitch: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.15); // Slide down
    
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    
    osc.connect(gain);
    gain.connect(master);
    
    osc.start(t);
    osc.stop(t + 0.15);
  },

  // Soft blip for selecting items
  select: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    playTone(800, 'sine', 0.05, t, ctx, master, 0.4);
  },
  
  // Upload / Drop sound (Swelling)
  upload: () => {
    const { ctx, master } = initAudio();
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.2); // Slide Up
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 0.2);
    
    osc.connect(gain);
    gain.connect(master);
    
    osc.start(t);
    osc.stop(t + 0.2);
  }
};
