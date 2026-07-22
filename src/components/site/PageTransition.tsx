import { AnimatePresence, motion, useReducedMotion, type Transition, type Variants } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  CONFIG_EVENT,
  DEFAULT_CONFIG,
  loadTransitionConfig,
  resolveEasing,
  resolvePresetForPath,
} from "@/lib/page-transition-config";


export type TransitionPreset =
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "zoom-in"
  | "zoom-out"
  | "flip-x"
  | "flip-y"
  | "parallax"
  | "blur"
  | "rotate"
  | "curtain"
  | "mask"
  | "glide";

export interface PageTransitionProps {
  children: ReactNode;
  /** Sobrescreve o preset resolvido pela config global. */
  preset?: TransitionPreset;
  duration?: number;
  ease?: Transition["ease"];
  variants?: Variants;
}

export const PRESETS: Record<TransitionPreset, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "slide-left": {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  },
  "slide-right": {
    initial: { opacity: 0, x: -40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 40 },
  },
  "slide-up": {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -24 },
  },
  "slide-down": {
    initial: { opacity: 0, y: -24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 24 },
  },
  "zoom-in": {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.02 },
  },
  "zoom-out": {
    initial: { opacity: 0, scale: 1.04 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  },
  "flip-x": {
    initial: { opacity: 0, rotateX: -90 },
    animate: { opacity: 1, rotateX: 0 },
    exit: { opacity: 0, rotateX: 90 },
  },
  "flip-y": {
    initial: { opacity: 0, rotateY: -90 },
    animate: { opacity: 1, rotateY: 0 },
    exit: { opacity: 0, rotateY: 90 },
  },
  parallax: {
    initial: { opacity: 0, y: 60, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -60, scale: 1.02 },
  },
  blur: {
    initial: { opacity: 0, filter: "blur(12px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(12px)" },
  },
  rotate: {
    initial: { opacity: 0, rotate: -4, scale: 0.98 },
    animate: { opacity: 1, rotate: 0, scale: 1 },
    exit: { opacity: 0, rotate: 4, scale: 0.98 },
  },
  curtain: {
    initial: { opacity: 0, clipPath: "inset(0 0 100% 0)" },
    animate: { opacity: 1, clipPath: "inset(0 0 0% 0)" },
    exit: { opacity: 0, clipPath: "inset(100% 0 0 0)" },
  },
  mask: {
    initial: { opacity: 0, clipPath: "circle(0% at 50% 50%)" },
    animate: { opacity: 1, clipPath: "circle(140% at 50% 50%)" },
    exit: { opacity: 0, clipPath: "circle(0% at 50% 50%)" },
  },
  glide: {
    initial: { opacity: 0, x: 80, skewX: 4 },
    animate: { opacity: 1, x: 0, skewX: 0 },
    exit: { opacity: 0, x: -80, skewX: -4 },
  },
};

export function PageTransition({
  children,
  preset,
  duration,
  ease,
  variants,
}: PageTransitionProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();
  const [cfg, setCfg] = useState(() => loadTransitionConfig());

  useEffect(() => {
    const sync = () => setCfg(loadTransitionConfig());
    window.addEventListener(CONFIG_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONFIG_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const resolvedPreset = preset ?? resolvePresetForPath(cfg, pathname);
  const active = variants ?? PRESETS[resolvedPreset];
  const finalDuration = duration ?? cfg.duration;
  const finalEase = ease ?? resolveEasing(cfg.easing);

  const transition = useMemo<Transition>(
    () => ({ duration: reduceMotion ? 0 : finalDuration, ease: finalEase }),
    [finalDuration, finalEase, reduceMotion],
  );

  if (reduceMotion || !cfg.enabled) return <>{children}</>;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        variants={active}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        style={{ willChange: "transform, opacity, filter, clip-path" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
