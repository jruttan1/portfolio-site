import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const sandbox = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../src/lib/djMotion.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, sandbox);
const { createDJMotion } = sandbox.exports;
const base = { bass: .2, energy: .2, treble: .1, playing: true, track: 'a', phase: 'playing', scratching: false };
const run = (step, input, from, to, interval = 16) => {
  let result;
  for (let t = from; t <= to; t += interval) result = step(input, t);
  return result;
};

test('steady loud music does not create constant nodding or permanent high energy', () => {
  const step = createDJMotion();
  const result = run(step, { ...base, energy: .85, bass: .9 }, 0, 10000);
  assert.equal(result.nod, 0);
  assert.ok(result.energy > .4 && result.energy < .5);
  assert.equal(result.state, 'weaving');
});

test('bass attacks nod then recover; hi-hats flicker without moving the head', () => {
  const step = createDJMotion();
  run(step, base, 0, 2000);
  const hat = step({ ...base, treble: .35 }, 2016);
  assert.ok(hat.sparkle > .5);
  assert.equal(hat.nod, 0);
  const kick = step({ ...base, bass: .45 }, 2032);
  assert.ok(kick.nod > .5);
  const settled = run(step, base, 2048, 3048);
  assert.ok(settled.nod < .02);
});

test('energy reacts over seconds and has a state dwell instead of flickering', () => {
  const step = createDJMotion();
  run(step, base, 0, 4000);
  const first = step({ ...base, energy: .65 }, 4016);
  assert.equal(first.state, 'weaving');
  assert.ok(first.energy < .5);
  const busy = run(step, { ...base, energy: .65 }, 4032, 7500);
  assert.equal(busy.state, 'composing');
});

test('mixing concentrates, scratch looks follow the hand, pause settles', () => {
  const step = createDJMotion();
  run(step, base, 0, 3000);
  const mixing = run(step, { ...base, phase: 'transitioning' }, 3016, 4516);
  assert.equal(mixing.state, 'solving');
  assert.ok(mixing.focus > .95);
  const scratch = run(step, { ...base, scratching: true }, 4532, 5032);
  assert.ok(scratch.scratch > .95);
  const pause = run(step, { ...base, bass: 0, energy: 0, treble: 0, playing: false }, 5048, 8048);
  assert.equal(pause.state, 'breathing');
  assert.ok(pause.energy < .01 && pause.focus < .02 && pause.scratch < .01);
});

test('a new louder track gets a fresh baseline and no fake initial beat', () => {
  const step = createDJMotion();
  run(step, base, 0, 3000);
  const fresh = step({ ...base, track: 'b', bass: .9, energy: .85 }, 3016);
  assert.equal(fresh.nod, 0);
  const settled = run(step, { ...base, track: 'b', bass: .9, energy: .85 }, 3032, 10000);
  assert.ok(settled.energy > .4 && settled.energy < .5);
});

test('motion envelopes are consistent at different refresh rates', () => {
  const fast = createDJMotion(), slow = createDJMotion();
  run(fast, base, 0, 3000, 1000 / 120);
  run(slow, base, 0, 3000, 1000 / 30);
  const a = run(fast, { ...base, energy: .6 }, 3010, 5010, 1000 / 120);
  const b = run(slow, { ...base, energy: .6 }, 3010, 5010, 1000 / 30);
  assert.ok(Math.abs(a.energy - b.energy) < .02);
});
