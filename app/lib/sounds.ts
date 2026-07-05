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

export function playBookOpenRitual() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Press — quiet, higher contact tap as the hand sets its grip (~t=0)
    const press = ctx.createOscillator();
    const pressGain = ctx.createGain();
    press.type = "sine";
    press.frequency.setValueAtTime(150, now);
    press.frequency.exponentialRampToValueAtTime(95, now + 0.1);
    pressGain.gain.setValueAtTime(0, now);
    pressGain.gain.linearRampToValueAtTime(0.16, now + 0.012);
    pressGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    press.connect(pressGain);
    pressGain.connect(ctx.destination);
    press.start(now);
    press.stop(now + 0.14);

    // Drag / creak — filtered noise swell during the mid-swing hitch (~t=0.85s)
    const creakStart = now + 0.85;
    const creakLen = Math.floor(ctx.sampleRate * 0.4);
    const creakBuf = ctx.createBuffer(1, creakLen, ctx.sampleRate);
    const creakData = creakBuf.getChannelData(0);
    for (let i = 0; i < creakLen; i++) {
      const envelope = Math.sin((i / creakLen) * Math.PI); // swell in, swell out
      creakData[i] = (Math.random() * 2 - 1) * envelope;
    }
    const creakSrc = ctx.createBufferSource();
    creakSrc.buffer = creakBuf;
    const creakFilter = ctx.createBiquadFilter();
    creakFilter.type = "bandpass";
    creakFilter.frequency.value = 280;
    creakFilter.Q.value = 0.7;
    const creakGain = ctx.createGain();
    creakGain.gain.value = 0.045;
    creakSrc.connect(creakFilter);
    creakFilter.connect(creakGain);
    creakGain.connect(ctx.destination);
    creakSrc.start(creakStart);

    // Settle — low thud + paper rustle landing at the end of the swing (~t=1.65s)
    const settleStart = now + 1.65;
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, settleStart);
    osc.frequency.exponentialRampToValueAtTime(38, settleStart + 0.3);
    oscGain.gain.setValueAtTime(0.0, settleStart);
    oscGain.gain.linearRampToValueAtTime(0.4, settleStart + 0.015);
    oscGain.gain.exponentialRampToValueAtTime(0.001, settleStart + 0.38);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(settleStart);
    osc.stop(settleStart + 0.38);

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
    rustleSrc.start(settleStart + 0.01);
  } catch { /* AudioContext not supported */ }
}

export function playBookCloseRitual() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Drag / creak — longer swell right away, closing has more felt weight (~t=0)
    const creakLen = Math.floor(ctx.sampleRate * 0.5);
    const creakBuf = ctx.createBuffer(1, creakLen, ctx.sampleRate);
    const creakData = creakBuf.getChannelData(0);
    for (let i = 0; i < creakLen; i++) {
      const envelope = Math.sin((i / creakLen) * Math.PI);
      creakData[i] = (Math.random() * 2 - 1) * envelope;
    }
    const creakSrc = ctx.createBufferSource();
    creakSrc.buffer = creakBuf;
    const creakFilter = ctx.createBiquadFilter();
    creakFilter.type = "bandpass";
    creakFilter.frequency.value = 260;
    creakFilter.Q.value = 0.7;
    const creakGain = ctx.createGain();
    creakGain.gain.value = 0.05;
    creakSrc.connect(creakFilter);
    creakFilter.connect(creakGain);
    creakGain.connect(ctx.destination);
    creakSrc.start(now + 0.05);

    // Close thud — softer, duller than the open settle, no rustle bloom (~t=1.4s)
    const thudStart = now + 1.4;
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, thudStart);
    osc.frequency.exponentialRampToValueAtTime(34, thudStart + 0.26);
    oscGain.gain.setValueAtTime(0.0, thudStart);
    oscGain.gain.linearRampToValueAtTime(0.3, thudStart + 0.012);
    oscGain.gain.exponentialRampToValueAtTime(0.001, thudStart + 0.3);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(thudStart);
    osc.stop(thudStart + 0.3);
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
