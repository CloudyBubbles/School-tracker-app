let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export function playBookOpen() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.3);
    oscGain.gain.setValueAtTime(0.0, now);
    oscGain.gain.linearRampToValueAtTime(0.45, now + 0.015);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);

    const rustleLen = Math.floor(ctx.sampleRate * 0.18);
    const rustleBuf = ctx.createBuffer(1, rustleLen, ctx.sampleRate);
    const rustleData = rustleBuf.getChannelData(0);
    for (let i = 0; i < rustleLen; i++) {
      rustleData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (rustleLen * 0.35));
    }
    const rustleSrc = ctx.createBufferSource();
    rustleSrc.buffer = rustleBuf;
    const rustleGain = ctx.createGain();
    rustleGain.gain.value = 0.025;
    rustleSrc.connect(rustleGain);
    rustleGain.connect(ctx.destination);
    rustleSrc.start(now + 0.01);
  } catch { /* AudioContext not supported */ }
}

export function playTypewriterClick() {
  try {
    const ctx = getCtx();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.025), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0.07;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch {
    // AudioContext not supported
  }
}
