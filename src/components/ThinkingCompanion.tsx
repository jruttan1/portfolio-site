import React, { useCallback, useEffect, useId, useRef, useState } from "react";
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
import { createDJMotion } from "../lib/djMotion";
import "./ThinkingCompanion.css";

const TRANSITION_MS = 1100;
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

function AnimatedOrb({ playing, phase, scratching, trackKey, size, displaySize }: {
  playing: boolean; phase: string; scratching: boolean; trackKey: string; size: OrbSize; displaySize: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetState = useRef<OrbState>("breathing");
  const lastFrame = useRef<OrbFrame | null>(null);
  const motion = useRef(createDJMotion());
  const clock = useRef({ time: 0, phase: 0 });
  const blink = useRef({ next: 0, started: -Infinity });
  const transition = useRef<{
    startedAt: number; from: OrbFrame; dots: DotPair[]; lines: LinePair[];
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const head = canvas.closest<HTMLElement>(".dj-head");
    const dj = canvas.closest<HTMLElement>(".thinking-companion");
    const monitorBars = dj?.querySelectorAll<HTMLElement>(".dj-sound-monitor i");
    const spectrum = new Float32Array(8);
    const monitorLevels = new Float32Array(8);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tint = { r: 61, g: 99, b: 221 };
    let animationFrame = 0, sampledAt = -Infinity;
    let bands = { bass: 0, energy: 0, treble: 0 };
    const pixels = Math.round(size * dpr);
    if (canvas.width !== pixels) canvas.width = pixels;
    if (canvas.height !== pixels) canvas.height = pixels;

    const draw = (time: number) => {
      if (document.hidden) return;
      const reduced = reducedMotion.matches;
      if (time - sampledAt >= 30) {
        const player = getMusicPlayer();
        bands = player.bands();
        if (monitorBars?.length) {
          player.spectrum(spectrum);
          const sampleElapsed = Math.min(.1, Math.max(0, (time - sampledAt) / 1000));
          monitorBars.forEach((bar, index) => {
            const target = reduced ? 0 : spectrum[index];
            const response = target > monitorLevels[index] ? .07 : .24;
            monitorLevels[index] += (target - monitorLevels[index]) * (1 - Math.exp(-sampleElapsed / response));
            bar.style.transform = `scaleY(${.07 + monitorLevels[index] * .93})`;
          });
        }
        sampledAt = time;
      }
      const reaction = motion.current({ ...bands, playing, phase, scratching, track: trackKey }, time);
      const elapsed = Math.min(.05, Math.max(0, (time - clock.current.time) / 1000));
      clock.current.time = time;
      clock.current.phase += reduced ? 0 : elapsed * (.5 + reaction.energy * .65);
      const preset = resolvePreset(reaction.state, size);
      const target = MODE_FRAMES[preset.mode](size, reduced ? 0 : clock.current.phase * preset.speed, preset.opts);
      if (reaction.state !== targetState.current) {
        targetState.current = reaction.state;
        const source = lastFrame.current;
        if (source && !reduced) transition.current = {
          startedAt: time, from: source,
          dots: pairDots(source.dots, target.dots), lines: pairLines(source.lines, target.lines)
        };
      }
      let frame = target;
      const active = transition.current;
      if (active && !reduced) {
        const progress = Math.min(1, (time - active.startedAt) / TRANSITION_MS);
        frame = morphFrame(active.from, target, active.dots, active.lines, progress * progress * (3 - 2 * progress));
        if (progress >= 1) transition.current = null;
      } else if (reduced) transition.current = null;
      lastFrame.current = frame;

      if (!blink.current.next) blink.current.next = time + 2400 + Math.random() * 2200;
      if (time >= blink.current.next) {
        blink.current.started = time;
        blink.current.next = time + 3600 + Math.random() * 4200;
      }
      const blinkProgress = (time - blink.current.started) / 160;
      const openness = !reduced && blinkProgress >= 0 && blinkProgress < 1
        ? 1 - .94 * Math.sin(blinkProgress * Math.PI) ** 2 : 1;
      head?.style.setProperty("--blink", String(openness));
      head?.style.setProperty("--nod", String(reduced ? 0 : reaction.nod));
      head?.style.setProperty("--focus", String(reduced ? Number(playing && phase !== "playing") : reaction.focus));
      head?.style.setProperty("--scratch-look", String(reduced ? 0 : reaction.scratch));
      if (dj) dj.dataset.orbState = reaction.state;
      // Only a sparse set of particles twinkle; treble never moves the whole head.
      const rendered = reduced ? frame : {
        ...frame,
        dots: frame.dots.map((dot, index) => index % 7 === 0 ? {
          ...dot,
          r: dot.r * (1 + reaction.sparkle * .35),
          a: Math.min(1, (dot.a ?? 1) + reaction.sparkle * .3)
        } : dot)
      };
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, size, size);
      context.save();
      context.translate(size / 2, size / 2);
      const scale = reduced ? 1 : 1 - reaction.focus * .09 - reaction.energy * .035;
      context.scale(scale, scale);
      context.translate(-size / 2, -size / 2);
      paintFrame(context, rendered, true, tint);
      context.restore();
      if (!reduced) animationFrame = window.requestAnimationFrame(draw);
    };
    const restart = () => {
      window.cancelAnimationFrame(animationFrame);
      if (!document.hidden) animationFrame = window.requestAnimationFrame(draw);
    };
    restart();
    document.addEventListener("visibilitychange", restart);
    reducedMotion.addEventListener("change", restart);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("visibilitychange", restart);
      reducedMotion.removeEventListener("change", restart);
    };
  }, [size, playing, phase, scratching, trackKey]);

  return <canvas ref={canvasRef} className="thinking-companion__orb" role="img" aria-hidden="true"
    style={{ width: displaySize, height: displaySize }} />;
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
  const tooltipId = useId();
  const bodyId = useId();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const update = () => {
      setMobile(query.matches);
      swipe.current = null;
      bodyRef.current?.style.removeProperty("--dj-drag");
      bodyRef.current?.removeAttribute("data-dragging");
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const tuckAway = () => {
    setCollapsed(true);
    setTooltipDismissed(true);
    requestAnimationFrame(() => expandRef.current?.focus({ preventScroll: true }));
  };
  const finishSwipe = (event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const gesture = swipe.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    swipe.current = null;
    bodyRef.current?.style.removeProperty("--dj-drag");
    bodyRef.current?.removeAttribute("data-dragging");
    if (gesture.dragging) {
      suppressClick.current = true;
      if (!cancelled && event.clientX - gesture.x > 40) tuckAway();
    }
  };
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
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
    const capturePose = (prefix: "pause" | "play") => {
      djRef.current?.querySelectorAll<HTMLElement>(".dj-hand, .dj-tonearm, .dj-vinyl-motion").forEach(element => {
        const pose = getComputedStyle(element);
        element.style.setProperty(`--${prefix}-from`, pose.transform);
        element.style.setProperty(`--${prefix}-translate`, pose.translate === "none" ? "0px 0px" : pose.translate);
      });
    };
    const update = () => {
      const next = player.snapshot();
      if (wasPlaying && !next.playing) {
        clearTimeout(scratchTimer.current);
        setScratching(false);
        vinylPointer.current = null;
        capturePose("pause");
        setStopping(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      } else if (next.playing && !wasPlaying) {
        scratchReadyAt.current = performance.now() + 1600;
        capturePose("play");
        setStopping(false);
      }
      wasPlaying = next.playing;
      setMusic(next);
    };
    update();
    const unsubscribe = player.subscribe(update);
    return () => { unsubscribe(); clearTimeout(scratchTimer.current); };
  }, []);

  const playing = music?.playing ?? false;
  const track = music?.track ?? tracks[0];
  const clipProgress = Math.min(1, Math.max(0, (music?.position ?? 0) / (music?.duration || 1)));

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
    <aside ref={djRef} className="thinking-companion" data-collapsed={collapsed} data-playing={playing} data-stopping={stopping} data-scratching={scratching} data-mixing={music?.phase === "echo" || music?.phase === "transitioning" || music?.phase === "cueing"} aria-label="Pocket DJ" data-tooltip-dismissed={tooltipDismissed}
      onKeyDown={(event) => { if (event.key === "Escape") setTooltipDismissed(true); }}
      onPointerLeave={() => setTooltipDismissed(false)}
      onFocusCapture={() => setTooltipDismissed(false)}>
      <button ref={expandRef} className="dj-expand" type="button" aria-label="Show DJ"
        aria-expanded={!collapsed} aria-controls={bodyId} onClick={() => {
          setCollapsed(false);
          requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLButtonElement>(".dj-collapse")?.focus({ preventScroll: true }));
        }}><span aria-hidden="true">‹</span> DJ</button>
      <div id={bodyId} ref={bodyRef} className="dj-body" inert={mobile && collapsed}
        onPointerDown={event => {
          suppressClick.current = false;
          if (!mobile || collapsed || event.pointerType === "mouse" || !event.isPrimary) return;
          swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
        }}
        onPointerMove={event => {
          const gesture = swipe.current;
          if (!gesture || gesture.id !== event.pointerId) return;
          const dx = event.clientX - gesture.x;
          const dy = event.clientY - gesture.y;
          if (!gesture.dragging) {
            if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { swipe.current = null; return; }
            if (dx < 10 || dx < Math.abs(dy) * 1.3) return;
            gesture.dragging = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.dataset.dragging = "true";
          }
          event.currentTarget.style.setProperty("--dj-drag", `${Math.max(0, Math.min(dx, 160))}px`);
        }}
        onPointerUp={event => finishSwipe(event)}
        onPointerCancel={event => finishSwipe(event, true)}
        onClickCapture={event => {
          if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }
        }}>
      <button className="dj-collapse" type="button" aria-label="Hide DJ (or swipe right)"
        aria-expanded={!collapsed} aria-controls={bodyId} onClick={tuckAway}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button className="dj-head" type="button" onClick={() => getMusicPlayer().toggle()}
        onPointerMove={event => {
          if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
          const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
          event.currentTarget.style.setProperty("--look-x", `${x * 1.5}px`);
          event.currentTarget.style.setProperty("--look-y", `${y}px`);
        }}
        onPointerLeave={event => {
          event.currentTarget.style.setProperty("--look-x", "0px");
          event.currentTarget.style.setProperty("--look-y", "0px");
        }}
        aria-label={playing ? "Pause music" : "Play music"} aria-describedby={tooltipId}>
        <span className="dj-headphones" aria-hidden="true">
          <i className="dj-earcup dj-earcup--left" /><i className="dj-earcup dj-earcup--right" />
        </span>
        <AnimatedOrb playing={playing} phase={music?.phase ?? "idle"} scratching={scratching} trackKey={track.audio} size={64} displaySize={62} />
        <span className="dj-face" aria-hidden="true"><i><b /></i><i><b /></i></span>
      </button>
      <div className="dj-booth" onAnimationEnd={event => {
        if (event.animationName === "dj-right-park" && !getMusicPlayer().snapshot().playing) setStopping(false);
      }}>
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
            aria-label={playing ? "Pause music" : "Play music"} aria-describedby={tooltipId}>
            <span className="dj-vinyl-motion">
            <span className="dj-vinyl">
              <RecordArtwork src={track.cover} /><i />
            </span>
            </span>
          </button>
          <span className="dj-tonearm" aria-hidden="true" />
        </div>
        <div className="dj-instruments">
        <span className="dj-sound-monitor" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        </span>
        <div className="dj-switches" role="group" aria-label="DJ controls">
          {(['reverb', 'filter', 'flanger'] as const).map(effect => (
            <button className="dj-switch" key={effect} type="button" role="switch"
              aria-label={{ reverb: 'Reverb', filter: 'Underwater filter', flanger: 'Flanger' }[effect]} aria-checked={music?.effects[effect] ?? false}
              disabled={music?.effectsAvailable === false}
              onClick={() => { const player = getMusicPlayer(); player.setEffect(effect, !player.snapshot().effects[effect]); }}>
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        </div>
        <div className="dj-progress">
          <span className="dj-progress-rail" key={track.audio} aria-hidden="true">
            <span className="dj-progress-fill" style={{ transform: `scaleX(${clipProgress})` }} />
          </span>
          <progress value={music?.position ?? 0} max={music?.duration || 1} aria-label="Track progress" />
        </div>
      </div>
      <div id={tooltipId} className="dj-tooltip" role="tooltip">
        <strong>{track.title}</strong>
        <span>{track.artist}</span>
        <dl className="dj-tooltip-effects">
          {([['reverb', 'Reverb'], ['filter', 'Filter'], ['flanger', 'Flanger']] as const).map(([effect, label]) => (
            <div key={effect} data-active={music?.effects[effect] ?? false}>
              <dt>{label}</dt><dd>{music?.effectsAvailable === false ? 'Unavailable' : music?.effects[effect] ? 'On' : 'Off'}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="dj-status" aria-live="polite">{music?.error || ""}</p>
      </div>
    </aside>
  );
}
