// Configuração persistente das transições de página.
// Fonte única de verdade lida pelo <PageTransition/> e pela tela admin.

import type { TransitionPreset } from "@/components/site/PageTransition";

export const TRANSITION_PRESETS: { value: TransitionPreset; label: string; hint: string }[] = [
  { value: "fade", label: "Fade", hint: "Aparece suavemente" },
  { value: "slide-left", label: "Slide ←", hint: "Entra pela direita" },
  { value: "slide-right", label: "Slide →", hint: "Entra pela esquerda" },
  { value: "slide-up", label: "Slide ↑", hint: "Sobe ao entrar" },
  { value: "slide-down", label: "Slide ↓", hint: "Desce ao entrar" },
  { value: "zoom-in", label: "Zoom In", hint: "Cresce ao entrar" },
  { value: "zoom-out", label: "Zoom Out", hint: "Recua ao entrar" },
  { value: "flip-x", label: "Flip X", hint: "Vira no eixo horizontal" },
  { value: "flip-y", label: "Flip Y", hint: "Vira no eixo vertical" },
  { value: "parallax", label: "Parallax", hint: "Movimento com profundidade" },
  { value: "blur", label: "Blur", hint: "Desfoca e foca" },
  { value: "rotate", label: "Rotate", hint: "Leve rotação" },
  { value: "curtain", label: "Curtain", hint: "Cortina descendo" },
  { value: "mask", label: "Mask", hint: "Revelar por máscara" },
  { value: "glide", label: "Glide", hint: "Desliza com inércia" },
];

export const EASINGS: { value: string; label: string; curve: [number, number, number, number] }[] = [
  { value: "ease-out-expo", label: "Ease Out Expo (padrão)", curve: [0.22, 1, 0.36, 1] },
  { value: "ease-in-out", label: "Ease In Out", curve: [0.65, 0, 0.35, 1] },
  { value: "ease-out-back", label: "Ease Out Back", curve: [0.34, 1.56, 0.64, 1] },
  { value: "linear", label: "Linear", curve: [0, 0, 1, 1] },
  { value: "ease-out-quart", label: "Ease Out Quart", curve: [0.25, 1, 0.5, 1] },
];

export type PageTransitionConfig = {
  enabled: boolean;
  defaultPreset: TransitionPreset;
  duration: number;
  easing: string;
  overrides: { pathPrefix: string; preset: TransitionPreset }[];
};

export const DEFAULT_CONFIG: PageTransitionConfig = {
  enabled: true,
  defaultPreset: "fade",
  duration: 0.22,
  easing: "ease-out-expo",
  overrides: [
    { pathPrefix: "/admin", preset: "fade" },
    { pathPrefix: "/representantes", preset: "slide-up" },
    { pathPrefix: "/empregos", preset: "slide-left" },
    { pathPrefix: "/painel", preset: "fade" },
  ],
};

const STORAGE_KEY = "page_transition_config_v1";
export const CONFIG_EVENT = "page-transition-config-changed";

export function loadTransitionConfig(): PageTransitionConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<PageTransitionConfig>;
    return { ...DEFAULT_CONFIG, ...parsed, overrides: parsed.overrides ?? DEFAULT_CONFIG.overrides };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveTransitionConfig(cfg: PageTransitionConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  window.dispatchEvent(new CustomEvent(CONFIG_EVENT));
}

export function resolveEasing(value: string): [number, number, number, number] {
  return (EASINGS.find((e) => e.value === value) ?? EASINGS[0]).curve;
}

export function resolvePresetForPath(cfg: PageTransitionConfig, pathname: string): TransitionPreset {
  const override = cfg.overrides.find((o) => o.pathPrefix && pathname.startsWith(o.pathPrefix));
  return override?.preset ?? cfg.defaultPreset;
}
