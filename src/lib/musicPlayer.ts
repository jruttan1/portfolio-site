import { tracks } from "../data/music";
import { transitionAt } from "./djTransition";

type Channel = {
  bass: BiquadFilterNode;
  highpass: BiquadFilterNode;
  lowpass: BiquadFilterNode;
  gain: GainNode;
  echo: GainNode;
  reverb?: GainNode;
  flanger?: GainNode;
  flangeDelay?: DelayNode;
};
type Deck = {
  audio: HTMLAudioElement;
  index: number;
  cue: number;
  duration: number;
  ready: boolean;
  failed: boolean;
  revision: number;
  channel?: Channel;
};
type Phase = "idle" | "playing" | "cueing" | "echo" | "transitioning";
const EXCERPT = 35;
const OVERLAP = 8;
const MAX_VOLUME = 0.5;

export function createMusicPlayer() {
  function shuffled() {
    const order = tracks.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }
  let queue = shuffled();
  const history = [queue.shift()!];
  let historyPosition = 0;
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let scratchBuffer: AudioBuffer | undefined;
  let scratchSource: AudioBufferSourceNode | undefined;
  let transitionCount = 0;
  let analyser: AnalyserNode | undefined;
  let samples: Uint8Array<ArrayBuffer> | undefined;
  let wanted = false;
  let volume = 0.36;
  let request = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let startingTransition = false;
  let mixing: { start: number; duration: number } | undefined;
  let phase: Phase = "idle";
  let tone = 100;
  let echo = false;
  let error = "";
  let transitionEffect: "reverb" | "flanger" = Math.random() < 0.5 ? "reverb" : "flanger";
  let effectAt = 5 + Math.random() * 3;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());

  function makeDeck(): Deck {
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = 0;
    const deck: Deck = { audio, index: -1, cue: 0, duration: EXCERPT, ready: false, failed: false, revision: 0 };
    audio.addEventListener("loadedmetadata", () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      deck.cue = Math.min(30, Math.max(0, audio.duration - EXCERPT));
      deck.duration = Math.min(EXCERPT, audio.duration - deck.cue);
      deck.ready = true;
      audio.currentTime = deck.cue;
      emit();
    });
    audio.addEventListener("error", () => {
      deck.failed = true;
      if (deck === current) {
        stop();
        error = "Couldn’t load this track. Tap to retry.";
      } else {
        if (mixing || startingTransition) cancelMix();
        error = "Next track couldn’t load. The current track will continue.";
      }
      emit();
    });
    return deck;
  }
  let current = makeDeck();
  let next = makeDeck();

  function load(deck: Deck, index: number, preload: "none" | "auto") {
    deck.audio.pause();
    deck.revision++;
    deck.index = index;
    deck.ready = false;
    deck.failed = false;
    deck.cue = 0;
    deck.duration = EXCERPT;
    deck.audio.preload = preload;
    deck.audio.src = tracks[index].audio;
  }
  load(current, history[0], "none");

  function upcoming() {
    if (historyPosition < history.length - 1) return history[historyPosition + 1];
    if (!queue.length) {
      queue = shuffled();
      if (queue.length > 1 && queue[0] === current.index) [queue[0], queue[1]] = [queue[1], queue[0]];
    }
    return queue[0];
  }
  function prepareNext() {
    const index = upcoming();
    if (next.index !== index) load(next, index, "auto");
  }
  function commitNext() {
    if (historyPosition < history.length - 1) historyPosition++;
    else { upcoming(); history.push(queue.shift()!); historyPosition++; }
  }

  function connect() {
    if (context || typeof window.AudioContext === "undefined") return;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0;
    analyser = context.createAnalyser();
    analyser.fftSize = 256;
    samples = new Uint8Array(analyser.frequencyBinCount);
    master.connect(analyser);
    analyser.connect(context.destination);
    for (const deck of [current, next]) {
      deck.audio.volume = 1;
      const source = context.createMediaElementSource(deck.audio);
      const bass = context.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 220;
      const highpass = context.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 20;
      highpass.Q.value = 0.5;
      const lowpass = context.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 20000;
      lowpass.Q.value = 0.5;
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(bass);
      bass.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(master);
      const delay = context.createDelay(1);
      delay.delayTime.value = 0.28;
      const feedback = context.createGain();
      feedback.gain.value = 0.22;
      const wet = context.createGain();
      wet.gain.value = 0;
      lowpass.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(gain);
      deck.channel = { bass, highpass, lowpass, gain, echo: wet };
    }
    // One small, shared reverb impulse; no samples to download.
    const impulse = context.createBuffer(2, Math.ceil(context.sampleRate * 1.0), context.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
      }
    }
    for (const deck of [current, next]) {
      const ch = deck.channel!;
      const reverb = context.createGain();
      reverb.gain.value = 0;
      const room = context.createConvolver();
      room.buffer = impulse;
      const roomFilter = context.createBiquadFilter();
      roomFilter.type = "highpass";
      roomFilter.frequency.value = 650;
      ch.lowpass.connect(roomFilter);
      roomFilter.connect(reverb);
      reverb.connect(room);
      room.connect(ch.gain);
      const flanger = context.createGain();
      flanger.gain.value = 0;
      const flangeDelay = context.createDelay(0.02);
      flangeDelay.delayTime.value = 0.003;
      ch.lowpass.connect(flanger);
      flanger.connect(flangeDelay);
      flangeDelay.connect(ch.gain);
      Object.assign(ch, { reverb, flanger, flangeDelay });
    }
    // Load only after listening is enabled; failure leaves music playback unaffected.
    const audioContext = context;
    void fetch("/audio/classic-scratch.mp3")
      .then(response => { if (!response.ok) throw new Error("Scratch unavailable"); return response.arrayBuffer(); })
      .then(bytes => audioContext.decodeAudioData(bytes))
      .then(buffer => { scratchBuffer = buffer; })
      .catch(() => {});
  }

  function apply(deck: Deck, gain: number, bass = 0, highpass = 20, lowpass = 20000, wet = 0, wash = 0, flange = 0, sweep = 0) {
    if (!context || !deck.channel) {
      deck.audio.volume = wanted ? Math.min(1, volume * MAX_VOLUME * gain) : 0;
      return;
    }
    const ch = deck.channel;
    ch.reverb?.gain.setTargetAtTime(wash, context.currentTime, 0.08);
    ch.flanger?.gain.setTargetAtTime(flange, context.currentTime, 0.08);
    ch.flangeDelay?.delayTime.setTargetAtTime(0.001 + 0.005 * (0.5 - 0.5 * Math.cos(sweep * Math.PI * 2)), context.currentTime, 0.12);
    for (const [param, value] of [[ch.gain.gain, gain], [ch.bass.gain, bass], [ch.highpass.frequency, highpass], [ch.lowpass.frequency, lowpass], [ch.echo.gain, wet]] as const) {
      param.setTargetAtTime(value, context.currentTime, 0.06);
    }
  }

  function cancelMix() {
    request++;
    next.audio.pause();
    apply(next, 0);
    startingTransition = false;
    mixing = undefined;
  }

  function scratch() {
    if (!wanted || !volume || !context || !master || !scratchBuffer || scratchSource ||
      (phase !== "playing" && phase !== "echo") || current.audio.paused || current.audio.readyState < 3) return;
    const source = context.createBufferSource();
    const level = context.createGain();
    level.gain.value = 0.32;
    source.buffer = scratchBuffer;
    source.connect(level);
    level.connect(master);
    scratchSource = source;
    source.onended = () => {
      source.disconnect();
      level.disconnect();
      if (scratchSource === source) scratchSource = undefined;
    };
    source.start();
  }

  function stop() {
    wanted = false;
    scratchSource?.stop();
    scratchSource = undefined;
    request++;
    startingTransition = false;
    clearInterval(timer);
    timer = undefined;
    for (const deck of [current, next]) deck.audio.pause();
    master?.gain.setTargetAtTime(0, context!.currentTime, 0.01);
    if (!context) { current.audio.volume = 0; next.audio.volume = 0; }
    phase = "idle";
    echo = false;
    emit();
  }

  // Prime the standby element inside the first click too: Safari grants media permission per element.
  function primeStandby() {
    const deck = next;
    const revision = deck.revision;
    void deck.audio.play().then(() => {
      if (deck === next && deck.revision === revision && !mixing && !startingTransition) {
        deck.audio.pause();
        if (deck.ready) deck.audio.currentTime = deck.cue;
      }
    }).catch(() => {});
  }

  async function start() {
    const token = ++request;
    error = "";
    wanted = true;
    try {
      connect();
      if (current.failed) load(current, current.index, "auto");
      if (next.failed) load(next, next.index, "auto");
      prepareNext();
      // Both calls originate in the listener's click, before awaiting anything.
      const playing = [current.audio.play()];
      if (mixing) playing.push(next.audio.play());
      else primeStandby();
      await Promise.all([context?.resume(), ...playing]);
      if (token !== request || !wanted) return;
      master?.gain.setTargetAtTime(volume * MAX_VOLUME, context!.currentTime, 0.04);
      tick();
      timer ??= setInterval(tick, 100);
    } catch {
      if (token !== request) return;
      stop();
      error = "Couldn’t play. Tap to retry.";
      emit();
    }
  }

  async function beginMix() {
    if (startingTransition || mixing || next.failed || !next.ready || next.audio.seeking || next.audio.readyState < 3) return;
    const token = request;
    const deck = next;
    const revision = deck.revision;
    startingTransition = true;
    apply(next, 0, -18, 20, 600);
    next.audio.currentTime = next.cue;
    try {
      await next.audio.play();
      if (!wanted || token !== request || deck !== next || revision !== deck.revision) return;
      mixing = { start: next.audio.currentTime, duration: Math.min(OVERLAP, next.duration / 2, current.duration / 2) };
      startingTransition = false;
    } catch {
      if (token !== request) return;
      startingTransition = false;
      next.failed = true;
      next.audio.pause();
      apply(next, 0);
      error = "Next track couldn’t start. The current track will continue.";
      emit();
    }
  }

  function finishMix() {
    transitionCount++;
    current.audio.pause();
    apply(current, 0);
    commitNext();
    [current, next] = [next, current];
    mixing = undefined;
    startingTransition = false;
    effectAt = 5 + Math.random() * 3;
    transitionEffect = transitionEffect === "reverb" ? "flanger" : "reverb";
    error = "";
    apply(current, 1);
    prepareNext();
  }

  function tick() {
    if (!wanted) return;
    const position = Math.max(0, current.audio.currentTime - current.cue);
    tone = 100;
    echo = false;
    phase = "playing";
    if (mixing) {
      // Use incoming media time: buffering and pause cannot race a wall-clock fade to silence.
      const p = Math.max(0, Math.min(1, (next.audio.currentTime - mixing.start) / mixing.duration));
      const { outgoing, incoming } = transitionAt(p);
      // Swell the outgoing effect while keeping the incoming deck dry.
      const swell = Math.sin(p * Math.PI) ** 2;
      apply(current, outgoing.gain, outgoing.bass, outgoing.highpass, outgoing.lowpass, 0,
        transitionEffect === "reverb" ? 0.34 * swell : 0,
        transitionEffect === "flanger" ? 0.24 * swell : 0, p);
      apply(next, incoming.gain, incoming.bass, incoming.highpass, incoming.lowpass);
      phase = "transitioning";
      tone = 100 - 35 * Math.sin(p * Math.PI);
      if (p >= 1) finishMix();
    } else {
      const ready = current.ready && !current.audio.seeking;
      const intro = Math.min(1, position / 1.5);
      const fx = (position - effectAt) / 3.6;
      echo = ready && fx >= 0 && fx < 1;
      if (!ready || intro < 1) phase = "cueing";
      else if (echo) phase = "echo";
      const envelope = echo ? Math.sin(fx * Math.PI) ** 2 : 0;
      tone = echo ? 100 - 60 * envelope : 75 + 25 * intro;
      // A deeper dip, with the echo fading in and out instead of switching on.
      const cutoff = echo ? 20000 * Math.pow(1200 / 20000, envelope) : 180 * Math.pow(20000 / 180, tone / 100);
      apply(current, ready ? 0.3 + 0.7 * intro : 0, 0, 20, cutoff, 0.23 * envelope);
      if (ready && position >= Math.max(0, current.duration - OVERLAP)) void beginMix();
    }
    if (current.audio.ended && next.failed) {
      stop();
      error = "Next track couldn’t load. Tap to retry.";
    }
    emit();
  }

  function skip(direction: number) {
    const resume = wanted;
    stop();
    cancelMix();
    if (direction < 0) {
      if (historyPosition > 0) historyPosition--;
    } else commitNext();
    load(current, history[historyPosition], resume ? "auto" : "none");
    next.index = -1;
    effectAt = 5 + Math.random() * 3;
    error = "";
    emit();
    if (resume) void start();
  }

  return {
    snapshot: () => ({ transitionCount, playing: wanted, track: tracks[current.index], tone, echo, phase, error, volume,
      position: current.ready ? Math.max(0, Math.min(current.duration, current.audio.currentTime - current.cue)) : 0,
      duration: current.duration, effectsAvailable: typeof window.AudioContext !== "undefined" }),
    toggle() { if (wanted) stop(); else void start(); },
    setVolume(value: number) {
      if (!Number.isFinite(value)) return;
      volume = Math.max(0, Math.min(1, value));
      master?.gain.setTargetAtTime(wanted ? volume * MAX_VOLUME : 0, context!.currentTime, 0.04);
      if (wanted && !context) tick();
      emit();
    },
    scratch,
    skip,
    seek(seconds: number) {
      if (!current.ready || !Number.isFinite(seconds)) return;
      cancelMix();
      current.audio.currentTime = current.cue + Math.max(0, Math.min(current.duration, seconds));
      tick();
    },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    energy() {
      if (!analyser || !samples || !wanted) return 0;
      analyser.getByteFrequencyData(samples);
      let bass = 0;
      for (let i = 1; i < 12; i++) bass += samples[i];
      return Math.min(1, bass / (11 * 170));
    }
  };
}

let player: ReturnType<typeof createMusicPlayer> | undefined;
export function getMusicPlayer() { return player ??= createMusicPlayer(); }
