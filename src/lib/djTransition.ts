const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const x = clamp(value); return x * x * (3 - 2 * x); };

// Equal-power overlap, with staggered bass handoff to avoid two competing kick drums.
export function transitionAt(progress: number) {
  const p = clamp(progress);
  return {
    outgoing: {
      gain: Math.cos(p * Math.PI / 2),
      bass: -18 * smooth(p / 0.6),
      highpass: 30 * Math.pow(1200 / 30, p),
      lowpass: 20000
    },
    incoming: {
      gain: Math.sin(p * Math.PI / 2),
      bass: -18 * (1 - smooth((p - 0.35) / 0.65)),
      highpass: 20,
      lowpass: 400 * Math.pow(20000 / 400, smooth(p))
    }
  };
}
