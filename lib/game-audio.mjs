const volumes = { connect: 0.34, disconnect: 0.2, success: 0.38, turn: 0.035 };
const fade = 0.015;

// One context, decoded samples and bounded crossfades instead of media-element seeks.
export function createGameAudio({
  makeContext = () => new AudioContext(),
  load = async (name) => {
    const response = await fetch('/sounds/' + name + '.wav');
    if (!response.ok) throw Error('Sound unavailable');
    return response.arrayBuffer();
  },
} = {}) {
  let context,
    serial = 0,
    disposed = false,
    lastStart = -Infinity;
  const buffers = new Map(),
    voices = new Set();
  function gainAt(voice, now) {
    if (voice.release) {
      return (
        voice.release.level * Math.max(0, 1 - (now - voice.release.at) / fade)
      );
    }
    const elapsed = Math.max(0, now - voice.start);
    return (
      voice.volume *
      Math.max(
        0,
        Math.min(
          1,
          elapsed / (voice.attackEnd - voice.start),
          (voice.end - now) / (voice.end - voice.decayStart),
        ),
      )
    );
  }
  function release(voice, now) {
    if (voice.release) return;
    const level = gainAt(voice, now);
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(level, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + fade);
    voice.release = { at: now, level };
    voice.source.stop(Math.min(voice.end, now + fade + 0.002));
  }
  function stop() {
    serial++;
    if (context)
      for (const voice of voices) release(voice, context.currentTime);
  }
  async function unlock() {
    if (disposed) return;
    try {
      context ??= makeContext();
      if (context.state === 'suspended') await context.resume();
    } catch {}
  }
  async function play(name) {
    if (disposed || !(name in volumes)) return;
    const request = ++serial;
    try {
      context ??= makeContext();
      const ctx = context;
      // Called immediately in the user gesture, before fetching/decoding.
      if (ctx.state === 'suspended') await ctx.resume();
      let buffer;
      if (name !== 'turn') {
        if (!buffers.has(name)) {
          const pending = load(name).then((bytes) =>
            ctx.decodeAudioData(bytes),
          );
          buffers.set(name, pending);
          pending.catch(() => {
            if (buffers.get(name) === pending) buffers.delete(name);
          });
        }
        buffer = await buffers.get(name);
      }
      if (disposed || request !== serial || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      // Ignore sub-frame bursts. Previous fades finish before the next normal effect.
      if (name !== 'success' && now - lastStart < 0.035) return;
      for (const voice of voices) release(voice, now);
      lastStart = now;
      const source =
        name === 'turn' ? ctx.createOscillator() : ctx.createBufferSource();
      const duration = name === 'turn' ? 0.09 : buffer.duration;
      if (name === 'turn') source.frequency.value = 520;
      else source.buffer = buffer;
      const gain = ctx.createGain(),
        end = now + duration;
      const volume = volumes[name];
      const attackEnd = now + Math.min(0.008, duration / 3);
      const decayStart =
        name === 'turn' ? attackEnd : Math.max(now + duration / 3, end - 0.02);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, attackEnd);
      gain.gain.setValueAtTime(volume, decayStart);
      gain.gain.linearRampToValueAtTime(0, end);
      source.connect(gain);
      gain.connect(ctx.destination);
      const voice = {
        source,
        gain,
        start: now,
        end,
        volume,
        attackEnd,
        decayStart,
        release: null,
      };
      voices.add(voice);
      source.onended = () => {
        voices.delete(voice);
        source.disconnect();
        gain.disconnect();
      };
      source.start(now);
      source.stop(end);
    } catch {
      // Audio failures must never interrupt a move or produce unhandled rejections.
    }
  }
  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    const ctx = context;
    if (ctx)
      setTimeout(() => {
        void ctx.close().catch(() => {});
      }, 25);
    buffers.clear();
  }
  return { play, stop, dispose, unlock };
}
