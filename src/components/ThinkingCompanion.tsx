import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { unlockAndPlayUISFX } from "../lib/uiSfx";
import "./ThinkingCompanion.css";

const TRANSITION_MS = 520;
const WELCOME_MESSAGE = "Oh hello there";
const AMBIENT_QUESTIONS = [
  "Finding everything alright?",
  "Do you always scroll this carefully?",
  "Seen anything good yet?",
  "Are you here on purpose?",
  "Should I be taking notes?",
  "How is the browsing going?",
  "Still with me?"
];
const CLICK_STATES: Array<{ state: OrbState; label: string }> = [
  { state: "shaping", label: "Need something?" },
  { state: "weaving", label: "Still here" },
  { state: "connecting", label: "Yes?" },
  { state: "solving", label: "You can keep doing that" },
  { state: "searching", label: "Quite persistent" },
  { state: "working", label: "Alright then" }
];

const reactionFor = (element: Element | null): string | null => {
  if (!element) return null;

  const contact = element.closest<HTMLElement>(".header-links a")?.getAttribute("aria-label");
  if (contact) {
    return ({
      Email: "Say what's up",
      GitHub: "Lots of code",
      LinkedIn: "Professionally formatted",
      X: "Don't click this one",
      "Google Scholar": "Citations are here",
      Resume: "The short version",
      "Cal.com": "Pick a time please"
    } as Record<string, string>)[contact] ?? null;
  }

  if (element.closest(".thinking-companion__button")) return "Yes, that is me";
  if (element.closest(".widget-music [data-prev]")) return "The previous selection";
  if (element.closest(".widget-music [data-next]")) return "Another fine selection";
  if (element.closest(".widget-music [data-play]")) return "Press for atmosphere";
  if (element.closest(".widget-music")) return "A tasteful little soundtrack";
  if (element.closest(".site-header h1")) return "Legally named John for some reason";
  if (element.closest(".header-contact-label")) return "Several ways to say hello";
  if (element.closest("#about-heading")) return "The general idea";
  if (element.closest(".about-word-western")) return "Going to every class";
  if (element.closest(".about-word-lifemark")) return "Grateful for job :)";
  if (element.closest(".about-word-primate")) return "The monkey means business";
  if (element.closest(".location-place")) return "Living over there";
  if (element.closest(".location")) return "Available within reason";
  if (element.closest(".about-copy > p:first-of-type")) return "A brief introduction";
  if (element.closest(".about-copy > p:nth-of-type(2)")) return "The current situation";
  if (element.closest(".experience h2")) return "Has done jobs";

  const role = element.closest<HTMLElement>(".experience li");
  if (role) {
    const name = role.querySelector("h3")?.textContent?.trim();
    return ({
      "Lifemark Health Group": "Yes I am employed.",
      "Tech for Social Impact": "Software but impactful.",
      "Unity Health Toronto": "AI doctors? No"
    } as Record<string, string>)[name ?? ""] ?? "Has done jobs";
  }

  if (element.closest("[data-board-reset]")) return "A clean slate Convenient";
  if (element.closest(".chess-copy a")) return "The training continues";
  if (element.closest(".chess-copy")) return "A patient explanation";
  if (element.closest(".chessground-board")) return "Not ready yet sorry";
  if (element.closest(".chess-feature")) return "Chess has appeared";
  if (element.closest(".project-prize")) return "They gave it a prize";
  if (element.closest(".project-video-link")) return "Moving pictures Helpful";
  if (element.closest(".project-featured")) return "Serious monkey business";
  if (element.closest(".project-primate")) return "Serious monkey business";
  if (element.closest(".project-optimate")) return "Insurance, sounds boring";
  if (element.closest(".project-doppels")) return "Looks familiar";
  if (element.closest("#projects .mobile-section-heading")) return "Things he made";
  if (element.closest(".paper-link")) return "The paper, in full";
  if (element.closest(".publication-venue")) return "Published Officially";
  if (element.closest(".publication-heading")) return "A very long title";
  if (element.closest(".publication-summary")) return "The slightly longer version";
  if (element.closest(".research-visual")) return "Research, but visual";
  if (element.closest("#research .mobile-section-heading")) return "Things he proved";
  if (element.closest(".research-layout")) return "Apparently publishable";
  if (element.closest("footer")) return "Made by the guy above";

  const navItem = element.closest<HTMLElement>(".side-nav a");
  if (navItem) {
    const label = navItem.textContent?.trim();
    return label ? ({
      About: "Back to the introduction",
      Projects: "Things he made",
      Research: "Things he proved"
    } as Record<string, string>)[label] ?? null : null;
  }

  return null;
};

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
    const tint = { r: 217, g: 72, b: 43 };
    let animationFrame = 0;

    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const draw = (time: number) => {
      const preset = resolvePreset(targetState.current, size);
      const target = MODE_FRAMES[preset.mode](size, (time / 1000) * preset.speed * 0.88, preset.opts);
      const activeTransition = transition.current;
      let frame = target;

      if (activeTransition && !reducedMotion) {
        const progress = Math.min(1, (time - activeTransition.startedAt) / TRANSITION_MS);
        const eased = 1 - Math.pow(1 - progress, 3);
        frame = morphFrame(activeTransition.from, target, activeTransition.dots, activeTransition.lines, eased);
        if (progress >= 1) transition.current = null;
      } else if (reducedMotion) {
        transition.current = null;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, size, size);
      paintFrame(context, frame, true, tint);
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
      aria-label={`Companion is ${state}`}
      style={{ width: displaySize, height: displaySize }}
    />
  );
}

export default function ThinkingCompanion() {
  const [reaction, setReaction] = useState<string | null>(null);
  const [ambientMessage, setAmbientMessage] = useState<string | null>(WELCOME_MESSAGE);
  const [orbSize, setOrbSize] = useState<64 | 32>(64);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [clickedState, setClickedState] = useState<(typeof CLICK_STATES)[number] | null>(null);
  const clickIndex = useRef(0);
  const clickTimer = useRef<number | undefined>(undefined);
  const reactionTimer = useRef<number | undefined>(undefined);
  const pendingReaction = useRef<string | null>(null);
  const ambientTimer = useRef<number | undefined>(undefined);
  const ambientClearTimer = useRef<number | undefined>(undefined);
  const lastQuestion = useRef(-1);

  useEffect(() => {
    const scheduleQuestion = () => {
      const delay = 16000 + Math.random() * 18000;
      ambientTimer.current = window.setTimeout(() => {
        let index = Math.floor(Math.random() * AMBIENT_QUESTIONS.length);
        if (index === lastQuestion.current) index = (index + 1) % AMBIENT_QUESTIONS.length;
        lastQuestion.current = index;
        setAmbientMessage(AMBIENT_QUESTIONS[index]);
        ambientClearTimer.current = window.setTimeout(() => {
          setAmbientMessage(null);
          scheduleQuestion();
        }, 6000);
      }, delay);
    };

    ambientClearTimer.current = window.setTimeout(() => {
      setAmbientMessage(null);
      scheduleQuestion();
    }, 4800);

    return () => {
      window.clearTimeout(ambientTimer.current);
      window.clearTimeout(ambientClearTimer.current);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const updateSize = () => setOrbSize(media.matches ? 32 : 64);

    updateSize();
    media.addEventListener("change", updateSize);

    const onMusic = (event: Event) => {
      const detail = (event as CustomEvent<{ playing: boolean; title: string }>).detail;
      setMusicPlaying(detail.playing);
    };

    const queueReaction = (next: string | null, delay: number) => {
      if (pendingReaction.current === next) return;
      pendingReaction.current = next;
      window.clearTimeout(reactionTimer.current);
      reactionTimer.current = window.setTimeout(() => setReaction(next), delay);
    };

    const onPointerOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const next = reactionFor(target);
      queueReaction(next, next ? 180 : 420);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      queueReaction(reactionFor(target), 120);
    };

    const onFocusOut = (event: FocusEvent) => {
      const target = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      queueReaction(reactionFor(target), 240);
    };

    window.addEventListener("portfolio:music", onMusic);
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      media.removeEventListener("change", updateSize);
      window.removeEventListener("portfolio:music", onMusic);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.clearTimeout(clickTimer.current);
      window.clearTimeout(reactionTimer.current);
    };
  }, []);

  const changeState = () => {
    const next = CLICK_STATES[clickIndex.current % CLICK_STATES.length];
    clickIndex.current += 1;
    setClickedState(next);
    window.clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => setClickedState(null), 2200);
    void unlockAndPlayUISFX("select", 0.6);
  };

  const status = clickedState?.label ?? reaction ?? ambientMessage ?? (musicPlaying ? "Good song" : "Just looking");
  const [displayedStatus, setDisplayedStatus] = useState(status);
  const [statusVisible, setStatusVisible] = useState(true);
  const [companionHeight, setCompanionHeight] = useState(80);
  const statusRef = useRef<HTMLSpanElement>(null);
  const displayedStatusRef = useRef(status);
  const statusSwapTimer = useRef<number | undefined>(undefined);
  const statusFrame = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(statusSwapTimer.current);
    window.cancelAnimationFrame(statusFrame.current ?? 0);
    if (status === displayedStatusRef.current) {
      setStatusVisible(true);
      return;
    }
    setStatusVisible(false);
    statusSwapTimer.current = window.setTimeout(() => {
      displayedStatusRef.current = status;
      setDisplayedStatus(status);
      statusFrame.current = window.requestAnimationFrame(() => setStatusVisible(true));
    }, 170);
  }, [status]);

  useEffect(() => () => {
    window.clearTimeout(statusSwapTimer.current);
    window.cancelAnimationFrame(statusFrame.current ?? 0);
  }, []);

  useLayoutEffect(() => {
    const textHeight = Math.ceil(statusRef.current?.scrollHeight ?? 0);
    const frameHeight = orbSize === 64 ? 68 : 50;
    const minimumHeight = orbSize === 64 ? 83 : 62;
    setCompanionHeight(Math.max(minimumHeight, frameHeight + textHeight));
  }, [displayedStatus, orbSize]);

  const askingQuestion = ambientMessage !== null && ambientMessage !== WELCOME_MESSAGE;
  const state: OrbState = clickedState?.state
    ?? (reaction ? "listening" : musicPlaying ? "composing" : askingQuestion ? "searching" : "breathing");

  return (
    <aside className="thinking-companion" aria-label="Site companion" style={{ height: companionHeight }}>
      <button
        className="thinking-companion__button"
        type="button"
        aria-label="Change orb state"
        onClick={changeState}
        style={{ height: companionHeight - 2 }}
      >
        <AnimatedOrb state={state} size={orbSize} displaySize={orbSize === 64 ? 40 : 24} />
        <span ref={statusRef} className={`thinking-companion__status${statusVisible ? " is-visible" : ""}`} aria-live="polite">
          {displayedStatus}
        </span>
      </button>
    </aside>
  );
}
