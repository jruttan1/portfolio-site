import type { OrbState } from "thinking-orbs/engine";

export type MusicBands = { bass: number; energy: number; treble: number };
type Input = MusicBands & {
  playing: boolean;
  track: string;
  phase: string;
  scratching: boolean;
};
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const follow = (from: number, to: number, dt: number, seconds: number) =>
  from + (to - from) * (1 - Math.exp(-dt / seconds));

// All envelopes use elapsed time, so behavior is consistent across refresh rates.
export function createDJMotion() {
  let lastTime = -1, track = "", age = 0;
  let mean = 0, variance = .0001, bassMean = 0, previousBass = 0, previousTreble = 0;
  let energy = 0, nod = 0, sparkle = 0, focus = 0, scratch = 0;
  let lastHit = -10, lastStateChange = -10;
  let state: OrbState = "breathing";
  return (input: Input, now: number) => {
    const dt = lastTime < 0 ? 1 / 60 : Math.min(.1, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    const seconds = now / 1000;
    if (input.track !== track) {
      track = input.track;
      age = 0;
      mean = input.energy;
      variance = .0001;
      bassMean = previousBass = input.bass;
      previousTreble = input.treble;
    }
    const audible = input.playing && input.energy > .012;
    age = audible ? age + dt : 0;
    const deviation = input.energy - mean;
    mean = follow(mean, input.energy, dt, 5);
    variance = follow(variance, deviation * deviation, dt, 5);
    // Relative to this track's recent level, not a global "loud song" threshold.
    const relative = clamp(.45 + deviation / (3 * Math.max(.012, Math.sqrt(variance))));
    energy = follow(energy, audible ? relative : 0, dt, audible ? 1.8 : .65);
    bassMean = follow(bassMean, input.bass, dt, .8);
    const bassRise = input.bass - previousBass;
    nod *= Math.exp(-dt / .19);
    if (audible && age > .6 && input.bass > bassMean * 1.12 &&
        bassRise > Math.max(.006, bassMean * .055) && seconds - lastHit > .26) {
      nod = clamp(.4 + (input.bass - bassMean) / Math.max(.025, bassMean));
      lastHit = seconds;
    }
    sparkle *= Math.exp(-dt / .1);
    if (audible && age > .6) sparkle = Math.max(sparkle,
      clamp((input.treble - previousTreble) / Math.max(.02, previousTreble * .5)));
    previousBass = input.bass;
    previousTreble = input.treble;
    const mixing = input.playing && ["cueing", "echo", "transitioning"].includes(input.phase);
    focus = follow(focus, mixing ? 1 : 0, dt, mixing ? .3 : .8);
    scratch = follow(scratch, input.scratching && input.playing ? 1 : 0, dt, .12);

    let desired: OrbState = state;
    if (!input.playing) desired = "breathing";
    else if (mixing) desired = "solving";
    else if (!audible) desired = "breathing";
    else if (energy > .68 || (state === "composing" && energy > .51)) desired = "composing";
    else if (energy > .39 || (state === "weaving" && energy > .28)) desired = "weaving";
    else desired = "listening";
    const priorityChange = !input.playing || mixing || state === "solving";
    if (desired !== state && (priorityChange || seconds - lastStateChange > 3)) {
      state = desired;
      lastStateChange = seconds;
    }
    return { state, energy, nod, sparkle, focus, scratch, level: audible ? clamp(input.energy * 2.5) : 0 };
  };
}
