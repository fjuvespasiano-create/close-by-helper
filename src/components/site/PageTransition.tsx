import { AnimatePresence, motion, useReducedMotion, type Transition, type Variants } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";

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
  | "parallax";

export interface PageTransitionProps {
  children: ReactNode;
  /** Preset ou variant customizado */
  preset?: TransitionPreset;
  duration?: number;
  /** ex: [0.22, 1, 0.36, 1] */
  ease?: Transition["ease"];
  /** Sobrescreve o preset */
  variants?: Variants;
}

const PRESETS: Record<TransitionPreset, Variants> = {
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
};

/** Escolhe preset por rota (personalizável) */
function pickPreset(pathname: string): TransitionPreset {
  if (pathname.startsWith("/admin")) return "fade";
  if (pathname.startsWith("/representantes")) return "slide-up";
  if (pathname.startsWith("/empregos")) return "slide-left";
  if (pathname === "/") return "zoom-in";
  return "fade";
}

export function PageTransition({
  children,
  preset,
  duration = 0.18,
  ease = [0.22, 1, 0.36, 1],
  variants,
}: PageTransitionProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();

  const active = variants ?? PRESETS[preset ?? pickPreset(pathname)];

  const transition = useMemo<Transition>(
    () => ({ duration: reduceMotion ? 0 : duration, ease }),
    [duration, ease, reduceMotion],
  );

  if (reduceMotion) return <>{children}</>;

  // `mode="popLayout"` renderiza a nova rota imediatamente, sem esperar
  // a animação de exit da anterior — elimina o delay percebido na navegação.
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        variants={active}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
