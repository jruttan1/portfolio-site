import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const compile = name => ts.transpileModule(fs.readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const curves = { exports: {} };
vm.runInNewContext(compile('djTransition'), curves);
const { transitionAt } = curves.exports;
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup({ webAudio = true, scratchAvailable = true } = {}) {
  const media = [], gains = [], filters = [], scratchSources = [], intervals = new Set();
  let sourceCount = 0;
  class Media extends EventTarget {
    paused = true; ended = false; seeking = false; currentTime = 0; duration = NaN; readyState = 0; fail = false;
    constructor() { super(); media.push(this); }
    set src(value) { this.url = value; this.currentTime = 0; this.duration = NaN; this.readyState = 0; this.paused = true; this.ended = false; }
    get src() { return this.url; }
    play() { if (this.fail) return Promise.reject(new Error('blocked')); this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    metadata(duration = 200) { this.duration = duration; this.readyState = 4; this.dispatchEvent(new Event('loadedmetadata')); }
  }
  const parameter = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  const node = () => ({ connect() {}, disconnect() {} });
  class Context {
    currentTime = 0; destination = {}; sampleRate = 44100;
    createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { numberOfChannels: channels, getChannelData: i => data[i] }; }
    decodeAudioData() { return Promise.resolve({ duration: 1.3 }); }
    createBufferSource() {
      const source = { ...node(), started: false, stopped: false, start() { this.started = true; }, stop() { this.stopped = true; this.onended?.(); } };
      scratchSources.push(source); return source;
    }
    createConvolver() { return node(); }
    createGain() { const n = { ...node(), gain: parameter() }; gains.push(n); return n; }
    createBiquadFilter() { const n = { ...node(), frequency: parameter(), gain: parameter(), Q: parameter() }; filters.push(n); return n; }
    createMediaElementSource() { sourceCount++; return node(); }
    createAnalyser() { return { ...node(), frequencyBinCount: 128, getByteFrequencyData(array) { array.fill(30); } }; }
    createDelay() { return { ...node(), delayTime: parameter() }; }
    resume() { return Promise.resolve(); }
  }
  const tracks = Array.from({ length: 7 }, (_, i) => ({ audio: `${i}.mp3`, title: String(i) }));
  const sandbox = {
    exports: {}, Audio: Media, AudioContext: Context, window: webAudio ? { AudioContext: Context } : {}, Uint8Array,
    fetch: () => Promise.resolve({ ok: scratchAvailable, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }),
    require: name => name.includes('djTransition') ? curves.exports : { tracks },
    setInterval(fn) { intervals.add(fn); return fn; }, clearInterval(fn) { intervals.delete(fn); }
  };
  vm.runInNewContext(compile('musicPlayer'), sandbox);
  const player = sandbox.exports.createMusicPlayer();
  return { player, media, gains, filters, scratchSources, intervals, sourceCount: () => sourceCount,
    async tick() { for (const fn of [...intervals]) fn(); await flush(); },
    async start() { player.toggle(); await flush(); media.forEach(m => m.metadata()); await this.tick(); }
  };
}

test('transition curves have equal-power gains, staggered bass and monotonic filters', () => {
  let previous = transitionAt(0);
  for (let i = 0; i <= 100; i++) {
    const mix = transitionAt(i / 100);
    assert.ok(Math.abs(mix.outgoing.gain ** 2 + mix.incoming.gain ** 2 - 1) < 1e-10);
    assert.ok(mix.outgoing.bass <= previous.outgoing.bass);
    assert.ok(mix.incoming.bass >= previous.incoming.bass);
    assert.ok(mix.outgoing.highpass >= previous.outgoing.highpass);
    assert.ok(mix.incoming.lowpass >= previous.incoming.lowpass);
    previous = mix;
  }
  assert.equal(transitionAt(0).incoming.bass, -18);
  assert.ok(Math.abs(transitionAt(1).incoming.bass) < 1e-10);
  assert.equal(transitionAt(1).outgoing.bass, -18);
});

test('opt-in, two reusable decks, real overlap and bass/filter handoff', async () => {
  const s = setup(); const { player: p, media: m } = s;
  assert.equal(p.snapshot().playing, false);
  assert.equal(s.sourceCount(), 0);
  assert.equal(m[0].preload, 'none');
  await s.start();
  assert.equal(s.sourceCount(), 2);
  assert.equal(m[0].currentTime, 30);
  assert.equal(m[1].paused, true);
  assert.equal(p.snapshot().duration, 35);
  m[0].currentTime = 56.9; await s.tick();
  assert.equal(m[1].paused, true);
  m[0].currentTime = 57; await s.tick();
  assert.ok(!m[0].paused && !m[1].paused);
  m[1].currentTime = 34; m[0].currentTime = 61; await s.tick();
  assert.equal(p.snapshot().phase, 'transitioning');
  assert.ok(s.gains[1].gain.value > .7 && s.gains[4].gain.value > .7);
  assert.ok(s.filters[0].gain.value < -15);
  assert.ok(s.filters[3].gain.value < -15);
  assert.ok(s.filters[1].frequency.value > 100);
  assert.ok(s.filters[5].frequency.value < 4000);
  const old = p.snapshot().track.audio;
  m[1].currentTime = 37.9; await s.tick();
  assert.equal(p.snapshot().track.audio, old);
  m[1].currentTime = 38; await s.tick();
  assert.notEqual(p.snapshot().track.audio, old);
  assert.equal(m[0].paused, true);
  assert.equal(m[1].paused, false);
  assert.equal(s.sourceCount(), 2);
  assert.equal(p.snapshot().position, 8);
  p.toggle();
});

test('pause silences both decks; resume retains transition progress', async () => {
  const s = setup(); await s.start();
  s.media[0].currentTime = 57; await s.tick();
  s.media[1].currentTime = 34; await s.tick();
  s.player.toggle();
  assert.ok(s.media.every(m => m.paused));
  assert.equal(s.gains[0].gain.value, 0);
  assert.equal(s.intervals.size, 0);
  s.player.toggle(); await flush();
  assert.equal(s.media[1].currentTime, 34);
  assert.ok(s.media.every(m => !m.paused));
  assert.equal(s.player.snapshot().phase, 'transitioning');
  s.player.toggle();
});

test('late loading and buffering keep outgoing audio alive', async () => {
  const s = setup(); s.player.toggle(); await flush(); s.media[0].metadata();
  s.media[0].currentTime = 67; await s.tick();
  assert.equal(s.media[0].paused, false);
  assert.equal(s.gains[1].gain.value, 1);
  s.media[1].metadata(); await s.tick();
  s.media[1].currentTime = 31; await s.tick();
  const level = s.gains[1].gain.value;
  s.media[0].currentTime += 8; await s.tick();
  assert.equal(s.gains[1].gain.value, level);
  assert.ok(level > .9);
  s.player.toggle();
});

test('incoming rejection keeps current track audible and reports error', async () => {
  const s = setup(); await s.start(); s.media[1].fail = true;
  s.media[0].currentTime = 57; await s.tick(); await s.tick();
  assert.equal(s.media[0].paused, false);
  assert.equal(s.media[1].paused, true);
  assert.equal(s.gains[1].gain.value, 1);
  assert.ok(s.player.snapshot().error.includes('couldn’t start'));
  s.player.toggle();
});

test('standby errors during overlap recover the outgoing channel', async () => {
  const s = setup(); await s.start(); s.media[0].currentTime = 57; await s.tick();
  s.media[1].currentTime = 34; await s.tick();
  s.media[1].dispatchEvent(new Event('error')); await s.tick();
  assert.equal(s.media[1].paused, true);
  assert.equal(s.gains[1].gain.value, 1);
  assert.equal(s.filters[0].gain.value, 0);
  s.player.toggle();
});

test('paused skipping preserves shuffle rounds and listening history', () => {
  const s = setup(), p = s.player;
  const sequence = [p.snapshot().track.audio];
  for (let i = 1; i < 28; i++) { p.skip(1); sequence.push(p.snapshot().track.audio); }
  for (let i = 0; i < 28; i += 7) assert.equal(new Set(sequence.slice(i, i + 7)).size, 7);
  for (let i = 1; i < 28; i++) assert.notEqual(sequence[i], sequence[i - 1]);
  p.skip(-1); assert.equal(p.snapshot().track.audio, sequence[26]);
  p.skip(1); assert.equal(p.snapshot().track.audio, sequence[27]);
  assert.equal(p.snapshot().playing, false);
});

test('no-Web-Audio fallback crossfades at a capped volume and stops both decks', async () => {
  const s = setup({ webAudio: false }); await s.start();
  s.media[0].currentTime = 57; await s.tick(); s.media[1].currentTime = 34; await s.tick();
  assert.ok(s.media.every(m => m.volume > 0 && m.volume <= .18));
  s.player.toggle(); assert.ok(s.media.every(m => m.volume === 0 && m.paused));
});


test('stopping during transition startup prevents a late playback promise from restarting the mix', async () => {
  const s = setup(); await s.start();
  let resolvePlay;
  s.media[1].play = () => { s.media[1].paused = false; return new Promise(resolve => { resolvePlay = resolve; }); };
  s.media[0].currentTime = 57; await s.tick();
  s.player.toggle(); resolvePlay(); await flush();
  assert.equal(s.player.snapshot().playing, false);
  assert.ok(s.media.every(m => m.paused));
  assert.equal(s.intervals.size, 0);
  assert.equal(s.gains[0].gain.value, 0);
});

test('short clips finish their overlap before either source runs out', async () => {
  const s = setup(); s.player.toggle(); await flush();
  s.media.forEach(m => m.metadata(6));
  s.media[0].currentTime = 2; await s.tick();
  s.media[1].currentTime = 3; s.media[0].currentTime = 5; await s.tick();
  assert.equal(s.media[0].paused, true);
  assert.equal(s.media[1].paused, false);
  assert.equal(s.player.snapshot().position, 3);
  s.player.toggle();
});

test('volume changes both decks through the master and survives pause and track changes', async () => {
  const s = setup();
  s.player.setVolume(.6);
  assert.equal(s.player.snapshot().playing, false);
  await s.start();
  assert.equal(s.gains[0].gain.value, .3);
  s.media[0].currentTime = 57; await s.tick();
  s.media[1].currentTime = 34; await s.tick();
  s.player.setVolume(.2); assert.equal(s.gains[0].gain.value, .1);
  s.media[1].currentTime = 38; await s.tick();
  assert.equal(s.player.snapshot().volume, .2);
  s.player.toggle(); s.player.setVolume(.8);
  assert.equal(s.gains[0].gain.value, 0);
  assert.ok(s.media.every(m => m.paused));
  s.player.toggle(); await flush(); assert.equal(s.gains[0].gain.value, .4);
  s.player.setVolume(-2); assert.equal(s.gains[0].gain.value, 0);
  s.player.setVolume(9); assert.equal(s.player.snapshot().volume, 1);
  assert.equal(s.gains[0].gain.value, .5);
  s.player.setVolume(NaN); assert.equal(s.player.snapshot().volume, 1);
  s.player.toggle();
});

test('volume fallback updates both sides of the crossfade without starting paused audio', async () => {
  const s = setup({ webAudio: false }); await s.start();
  s.media[0].currentTime = 57; await s.tick(); s.media[1].currentTime = 34; await s.tick();
  s.player.setVolume(0); assert.ok(s.media.every(m => m.volume === 0));
  s.player.setVolume(1); assert.ok(s.media.every(m => m.volume > .3 && m.volume < .4));
  s.player.toggle(); s.player.setVolume(.5);
  assert.ok(s.media.every(m => m.paused && m.volume === 0));
});


test('transition effects alternate, stay bounded and reset after each handoff', async () => {
  const s = setup(); await s.start();
  assert.ok(s.gains.slice(7).every(n => n.gain.value === 0));
  s.media[0].currentTime = 57; await s.tick();
  s.media[1].currentTime = 34; await s.tick();
  const firstWash = s.gains[7].gain.value;
  const firstFlange = s.gains[8].gain.value;
  assert.ok((firstWash > 0) !== (firstFlange > 0));
  assert.ok(firstWash <= .34 && firstFlange <= .24);
  assert.equal(s.gains[9].gain.value, 0);
  assert.equal(s.gains[10].gain.value, 0);
  s.player.toggle();
  assert.equal(s.gains[0].gain.value, 0);
  s.player.toggle(); await flush();
  assert.equal(s.gains[7].gain.value, firstWash);
  assert.equal(s.gains[8].gain.value, firstFlange);
  s.media[1].currentTime = 38; await s.tick();
  assert.ok(s.gains.slice(7).every(n => n.gain.value === 0));
  s.media[0].metadata();
  s.media[1].currentTime = 57; await s.tick();
  s.media[0].currentTime = 34; await s.tick();
  assert.equal(s.gains[9].gain.value > 0, firstFlange > 0);
  assert.equal(s.gains[10].gain.value > 0, firstWash > 0);
  s.player.seek(12);
  assert.ok(s.gains.slice(7).every(n => n.gain.value === 0));
  s.player.toggle();
});


test('recorded scratch respects mute, pause and transitions', async () => {
  const s = setup();
  s.player.scratch(); assert.equal(s.scratchSources.length, 0);
  await s.start();
  s.media[0].currentTime = 42; await s.tick();
  s.player.setVolume(0); s.player.scratch(); assert.equal(s.scratchSources.length, 0);
  s.player.setVolume(.36); s.player.scratch();
  assert.ok(s.scratchSources[0].started);
  assert.equal(s.gains.at(-1).gain.value, .32);
  s.player.scratch(); assert.equal(s.scratchSources.length, 1);
  s.player.toggle(); assert.ok(s.scratchSources[0].stopped);
  s.player.scratch(); assert.equal(s.scratchSources.length, 1);
  s.player.toggle(); await flush();
  s.media[0].currentTime = 57; await s.tick(); await s.tick();
  s.player.scratch(); assert.equal(s.scratchSources.length, 1);
  s.media[1].currentTime = 38; await s.tick(); await s.tick();
  s.player.scratch(); assert.equal(s.scratchSources.length, 2);
  s.player.toggle();
});

test('scratch safely skips unavailable audio or a failed sample download', async () => {
  for (const options of [{ webAudio: false }, { scratchAvailable: false }]) {
    const s = setup(options); await s.start();
    s.media[0].currentTime = 42; await s.tick();
    s.player.scratch(); assert.equal(s.scratchSources.length, 0);
    assert.equal(s.player.snapshot().playing, true);
    s.player.toggle();
  }
});

test('scratch transition cue increments only when a handoff completes', async () => {
  const s = setup(); await s.start();
  assert.equal(s.player.snapshot().transitionCount, 0);
  s.media[0].currentTime = 57; await s.tick();
  s.media[1].currentTime = 34; await s.tick();
  assert.equal(s.player.snapshot().transitionCount, 0);
  s.player.toggle(); s.player.toggle(); await flush();
  assert.equal(s.player.snapshot().transitionCount, 0);
  s.media[1].currentTime = 38; await s.tick();
  assert.equal(s.player.snapshot().transitionCount, 1);
  await s.tick(); assert.equal(s.player.snapshot().transitionCount, 1);
  s.player.skip(1); await flush();
  assert.equal(s.player.snapshot().transitionCount, 1);
  s.player.toggle();
});


test('underwater sweep is audible, smoothly enveloped, and restores the dry track', async () => {
  const s = setup(); await s.start();
  let lowestCutoff = 20000, peakEcho = 0, previousEcho = 0;
  for (let elapsed = 4; elapsed <= 12; elapsed += 0.1) {
    s.media[0].currentTime = 30 + elapsed;
    await s.tick();
    const wet = s.gains[3].gain.value;
    lowestCutoff = Math.min(lowestCutoff, s.filters[2].frequency.value);
    peakEcho = Math.max(peakEcho, wet);
    assert.ok(Math.abs(wet - previousEcho) < .025, 'no abrupt echo on/off');
    previousEcho = wet;
  }
  assert.ok(lowestCutoff >= 1200 && lowestCutoff < 1250);
  assert.ok(peakEcho > .22 && peakEcho <= .23);
  assert.equal(s.gains[3].gain.value, 0);
  assert.equal(s.filters[2].frequency.value, 20000);
  s.player.toggle();
});
