import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MODE_FRAMES,
  paintFrame,
  resolvePreset,
  type Dot,
  type Line,
  type OrbFrame,
  type OrbSize,
  type OrbState
} from "thinking-orbs/engine";
import { getMusicPlayer } from "../lib/musicPlayer";
import { tracks } from "../data/music";
import "./ThinkingCompanion.css";

const TRANSITION_MS = 720;
type DotPair = { from: number; to: number };
type LinePair = { from: number | null; to: number | null };

const nearestDot = (dot: Dot, candidates: Dot[]) => {
  let nearest = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  candidates.forEach((candidate, index) => {
    const dx = dot.x - candidate.x;
    const dy = dot.y - candidate.y;
    const dz = dot.z - candidate.z;
    const distance = dx * dx + dy * dy + dz * dz;
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });
  return nearest;
};

const pairDots = (from: Dot[], to: Dot[]): DotPair[] => {
  if (!from.length || !to.length) return [];
  return to.length >= from.length
    ? to.map((dot, toIndex) => ({ from: nearestDot(dot, from), to: toIndex }))
    : from.map((dot, fromIndex) => ({ from: fromIndex, to: nearestDot(dot, to) }));
};

const pairLines = (from: Line[], to: Line[]): LinePair[] => {
  const count = Math.max(from.length, to.length);
  return Array.from({ length: count }, (_, index) => ({
    from: from.length ? Math.min(from.length - 1, Math.floor(index * from.length / count)) : null,
    to: to.length ? Math.min(to.length - 1, Math.floor(index * to.length / count)) : null
  }));
};

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

const morphFrame = (from: OrbFrame, to: OrbFrame, dotPairs: DotPair[], linePairs: LinePair[], amount: number): OrbFrame => {
  const dots = dotPairs.map(({ from: fromIndex, to: toIndex }) => {
    const start = from.dots[fromIndex];
    const end = to.dots[toIndex];
    return {
      x: mix(start.x, end.x, amount),
      y: mix(start.y, end.y, amount),
      z: mix(start.z, end.z, amount),
      r: mix(start.r, end.r, amount),
      white: mix(start.white, end.white, amount),
      a: mix(start.a ?? 1, end.a ?? 1, amount)
    };
  });

  const lines = linePairs.map(({ from: fromIndex, to: toIndex }) => {
    const start = fromIndex === null ? null : from.lines[fromIndex];
    const end = toIndex === null ? null : to.lines[toIndex];
    const startLine = start ?? {
      x1: end!.x1,
      y1: end!.y1,
      x2: end!.x1,
      y2: end!.y1,
      white: end!.white,
      a: 1,
      w: 0
    };
    const endLine = end ?? {
      x1: start!.x1,
      y1: start!.y1,
      x2: start!.x1,
      y2: start!.y1,
      white: start!.white,
      a: 1,
      w: 0
    };
    return {
      x1: mix(startLine.x1, endLine.x1, amount),
      y1: mix(startLine.y1, endLine.y1, amount),
      x2: mix(startLine.x2, endLine.x2, amount),
      y2: mix(startLine.y2, endLine.y2, amount),
      white: mix(startLine.white, endLine.white, amount),
      a: mix(startLine.a ?? 1, endLine.a ?? 1, amount),
      w: mix(startLine.w, endLine.w, amount)
    };
  });

  return { dots, lines };
};

function AnimatedOrb({ state, size, displaySize }: { state: OrbState; size: OrbSize; displaySize: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetState = useRef(state);
  const lastFrame = useRef<OrbFrame | null>(null);
  const beat = useRef({ level: 0, time: 0 });
  const transition = useRef<{
    startedAt: number;
    from: OrbFrame;
    dots: DotPair[];
    lines: LinePair[];
  } | null>(null);

  useEffect(() => {
    if (state === targetState.current) return;
    const source = lastFrame.current;
    targetState.current = state;
    if (!source) return;

    const now = performance.now();
    const preset = resolvePreset(state, size);
    const target = MODE_FRAMES[preset.mode](size, (now / 1000) * preset.speed * 0.88, preset.opts);
    transition.current = {
      startedAt: now,
      from: source,
      dots: pairDots(source.dots, target.dots),
      lines: pairLines(source.lines, target.lines)
    };
  }, [state, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tint = { r: 61, g: 99, b: 221 };
    let animationFrame = 0;

    const pixels = Math.round(size * dpr);
    if (canvas.width !== pixels) canvas.width = pixels;
    if (canvas.height !== pixels) canvas.height = pixels;

    const draw = (time: number) => {
      const preset = resolvePreset(targetState.current, size);
      const target = MODE_FRAMES[preset.mode](size, reducedMotion ? 0 : (time / 1000) * preset.speed * 0.88, preset.opts);
      const activeTransition = transition.current;
      let frame = target;

      if (activeTransition && !reducedMotion) {
        const progress = Math.min(1, (time - activeTransition.startedAt) / TRANSITION_MS);
        const eased = progress * progress * (3 - 2 * progress);
        frame = morphFrame(activeTransition.from, target, activeTransition.dots, activeTransition.lines, eased);
        if (progress >= 1) transition.current = null;
      } else if (reducedMotion) {
        transition.current = null;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, size, size);
      const targetEnergy = reducedMotion ? 0 : getMusicPlayer().energy();
      const elapsed = Math.min(50, Math.max(0, time - beat.current.time));
      const response = targetEnergy > beat.current.level ? 90 : 260;
      beat.current.level += (targetEnergy - beat.current.level) * (1 - Math.exp(-elapsed / response));
      beat.current.time = time;
      const energy = reducedMotion ? 0 : beat.current.level;
      const head = canvas.closest<HTMLElement>(".dj-head");
      if (head) head.style.setProperty("--beat", String(energy));
      canvas.closest<HTMLElement>(".thinking-companion")?.style.setProperty("--level", String(energy));
      context.save();
      context.translate(size / 2, size / 2);
      context.scale(1 + energy * 0.12, 1 + energy * 0.12);
      context.translate(-size / 2, -size / 2);
      paintFrame(context, frame, true, tint);
      context.restore();
      lastFrame.current = frame;

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);
    };

    animationFrame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [size, state]);

  return (
    <canvas
      ref={canvasRef}
      className="thinking-companion__orb"
      role="img"
      aria-hidden="true"
      style={{ width: displaySize, height: displaySize }}
    />
  );
}

function ScrollingTrackText({ text, className }: { text: string; className: string }) {
  const windowRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const frame = windowRef.current!;
    const content = textRef.current!;
    const measure = () => {
      const distance = Math.max(0, Math.ceil(content.getBoundingClientRect().width - frame.clientWidth));
      frame.dataset.overflow = String(distance > 1);
      frame.style.setProperty("--text-pan", `-${distance}px`);
      frame.style.setProperty("--text-pan-duration", `${Math.max(8, distance / 18 + 4)}s`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, [text]);

  return <span ref={windowRef} className={className}><span ref={textRef} className="dj-track-scroll">{text}</span></span>;
}

function RecordArtwork({ src }: { src: string }) {
  const [covers, setCovers] = useState({ current: src, previous: null as string | null });

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.src = src;
    // Don't spend the fade waiting for the new artwork to download or decode.
    void image.decode().then(() => {
      if (cancelled) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setCovers((previous) => previous.current === src ? previous : {
        current: src,
        previous: reducedMotion ? null : previous.current
      });
    }).catch(() => { /* Keep the last usable cover if this image fails. */ });
    return () => { cancelled = true; };
  }, [src]);

  return <>
    {covers.previous && <span key={covers.previous} className="dj-cover-layer dj-cover-out" style={{ backgroundImage: `url(${JSON.stringify(covers.previous)})` }} aria-hidden="true" />}
    <span key={covers.current} className={`dj-cover-layer dj-cover-current${covers.previous ? " dj-cover-entering" : ""}`}
      style={{ backgroundImage: `url(${JSON.stringify(covers.current)})` }} aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.animationName === "dj-cover-in") setCovers((current) => ({ ...current, previous: null }));
      }} />
  </>;
}

export default function ThinkingCompanion() {
  const [music, setMusic] = useState<ReturnType<ReturnType<typeof getMusicPlayer>["snapshot"]> | null>(null);
  const [stopping, setStopping] = useState(false);
  const [scratching, setScratching] = useState(false);
  const scratchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scratchReadyAt = useRef(0);
  const vinylPointer = useRef<{ x: number; y: number; distance: number } | null>(null);
  const triggerScratch = useCallback(() => {
    const player = getMusicPlayer();
    const snapshot = player.snapshot();
    const now = performance.now();
    if (now < scratchReadyAt.current || !snapshot.playing || snapshot.volume <= 0 ||
      (snapshot.phase !== "playing" && snapshot.phase !== "echo")) return;
    scratchReadyAt.current = now + 1800;
    player.scratch();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setScratching(true);
    clearTimeout(scratchTimer.current);
    scratchTimer.current = setTimeout(() => setScratching(false), 1350);
  }, []);
  const lastScratchTransition = useRef<number | null>(null);
  const djRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const player = getMusicPlayer();
    let wasPlaying = false;
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      const next = player.snapshot();
      if (wasPlaying && !next.playing) {
        clearTimeout(scratchTimer.current);
        setScratching(false);
        vinylPointer.current = null;
        djRef.current?.querySelectorAll<HTMLElement>(".dj-hand, .dj-tonearm, .dj-vinyl-motion").forEach((element) => {
          element.style.setProperty("--pause-from", getComputedStyle(element).transform);
        });
        setStopping(true);
        clearTimeout(stopTimer);
        stopTimer = setTimeout(() => setStopping(false), 1400);
      } else if (next.playing && !wasPlaying) {
        scratchReadyAt.current = performance.now() + 1600;
        clearTimeout(stopTimer);
        setStopping(false);
      }
      wasPlaying = next.playing;
      setMusic(next);
    };
    update();
    const unsubscribe = player.subscribe(update);
    return () => { unsubscribe(); clearTimeout(stopTimer); clearTimeout(scratchTimer.current); };
  }, []);

  const playing = music?.playing ?? false;
  const track = music?.track ?? tracks[0];
  const [trackLayers, setTrackLayers] = useState<{ current: typeof track; previous: typeof track | null }>({ current: track, previous: null });
  if (trackLayers.current !== track) setTrackLayers({ current: track, previous: trackLayers.current });
  useEffect(() => {
    if (!trackLayers.previous) return;
    const timer = setTimeout(() => setTrackLayers((layers) => ({ ...layers, previous: null })), 700);
    return () => clearTimeout(timer);
  }, [trackLayers.current]);
  const state: OrbState = playing ? (music?.echo ? "weaving" : "composing") : "breathing";

  useEffect(() => {
    setScratching(false);
    const count = music?.transitionCount;
    if (count === undefined) return;
    const previous = lastScratchTransition.current;
    lastScratchTransition.current = count;
    if (!playing || previous === null || count === previous) return;
    const timer = setTimeout(() => {
      const snapshot = getMusicPlayer().snapshot();
      if (document.visibilityState === "visible" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && snapshot.playing && (snapshot.phase === "playing" || snapshot.phase === "echo") && snapshot.volume > 0) {
        triggerScratch();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [playing, music?.transitionCount, triggerScratch]);

  return (
    <aside ref={djRef} className="thinking-companion" data-playing={playing} data-stopping={stopping} data-scratching={scratching} data-mixing={music?.phase === "echo" || music?.phase === "transitioning" || music?.phase === "cueing"} aria-label="Pocket DJ">
      <button className="dj-head" type="button" onClick={() => getMusicPlayer().toggle()}
        aria-label={playing ? "Pause music" : "Play music"} title={playing ? "Pause music" : "Play music"}>
        <span className="dj-headphones" aria-hidden="true" />
        <AnimatedOrb state={state} size={64} displaySize={54} />
        <span className="dj-face" aria-hidden="true"><i /><i /></span>
      </button>
      <div className="dj-booth">
        <span className="dj-hand dj-hand--left" aria-hidden="true" />
        <span className="dj-hand dj-hand--right" aria-hidden="true" />
        <div className="dj-turntable">
          <button className="dj-record" type="button" onClick={() => getMusicPlayer().toggle()}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") vinylPointer.current = { x: event.clientX, y: event.clientY, distance: 0 };
            }}
            onPointerLeave={() => { vinylPointer.current = null; }}
            onPointerMove={(event) => {
              const previous = vinylPointer.current;
              if (event.pointerType !== "mouse" || event.buttons !== 0 || !previous) return;
              const distance = previous.distance + Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
              vinylPointer.current = { x: event.clientX, y: event.clientY, distance: distance >= 10 ? 0 : distance };
              if (distance >= 10) triggerScratch();
            }}
            aria-label={playing ? "Pause music" : "Play music"} title={playing ? "Pause music" : "Play music"}>
            <span className="dj-vinyl-motion">
            <span className="dj-vinyl">
              <RecordArtwork src={track.cover} /><i />
            </span>
            </span>
          </button>
          <span className="dj-tonearm" aria-hidden="true" />
          <span className="dj-meters" aria-hidden="true"><i /><i /><i /></span>
        </div>
        <div className="dj-display" aria-live="polite" aria-atomic="true" title={`${track.title} — ${track.artist}`}>
          <span className="dj-now-playing">Now playing<span className="dj-now-playing-glow" aria-hidden="true">Now playing</span></span>
          <span className="dj-display-light" aria-hidden="true"><i /></span>
          <div className="dj-track-window" data-track-changing={Boolean(trackLayers.previous)}>
            {trackLayers.previous && <div className="dj-track-details dj-track-out" aria-hidden="true">
              <span className="dj-track-title">{trackLayers.previous.title}</span>
              <span className="dj-track-artist">{trackLayers.previous.artist}</span>
            </div>}
            <div key={track.cover} className="dj-track-details dj-track-current">
              <ScrollingTrackText className="dj-track-title" text={track.title} />
              <ScrollingTrackText className="dj-track-artist" text={track.artist} />
            </div>
          </div>
        </div>
        <div className="dj-progress">
          <span className="dj-progress-fill" key={track.cover} aria-hidden="true" style={{ transform: `scaleX(${Math.min(1, Math.max(0, (music?.position ?? 0) / (music?.duration || 1)))})` }} />
          <progress value={music?.position ?? 0} max={music?.duration || 1} aria-label="Track progress" />
        </div>
      </div>
      <p className="dj-status" aria-live="polite">{music?.error || ""}</p>
    </aside>
  );
}
