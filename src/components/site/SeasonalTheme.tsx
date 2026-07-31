import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  getActiveTheme,
  getThemeById,
  SEASON_OFF,
  SEASON_OVERRIDE_KEY,
  type SeasonalTheme,
} from "@/lib/seasonalThemes";

/**
 * Resolve o tema efetivo no browser:
 *  1. `?tema=<id>` na URL (preview instantâneo, também grava o override)
 *  2. override salvo em localStorage (`off` desliga tudo)
 *  3. tema da data corrente
 */
function resolveTheme(): SeasonalTheme | null {
  try {
    const param = new URLSearchParams(window.location.search).get("tema");
    if (param) {
      window.localStorage.setItem(SEASON_OVERRIDE_KEY, param);
      return param === SEASON_OFF ? null : getThemeById(param) ?? getActiveTheme();
    }
    const saved = window.localStorage.getItem(SEASON_OVERRIDE_KEY);
    if (saved === SEASON_OFF) return null;
    if (saved) {
      const forced = getThemeById(saved);
      if (forced) return forced;
    }
  } catch {
    /* storage indisponível (modo privado) — segue com a data */
  }
  return getActiveTheme();
}

/** Partículas determinísticas: sem Math.random para não “pular” entre renders. */
function ParticleField({ theme }: { theme: SeasonalTheme }) {
  const particles = useMemo(
    () =>
      Array.from({ length: theme.density }, (_, i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const r = seed / 233280;
        return {
          glyph: theme.glyphs[i % theme.glyphs.length],
          left: ((i * 37) % 100) + r * 0.9,
          delay: -(r * 18).toFixed(2),
          duration: (9 + r * 12).toFixed(2),
          size: (0.7 + r * 1.1).toFixed(2),
          drift: `${(r * 2 - 1) * 120}px`,
          opacity: (0.35 + r * 0.5).toFixed(2),
        };
      }),
    [theme],
  );

  return (
    <div className="season-field" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="season-particle"
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              fontSize: `${p.size}rem`,
              opacity: p.opacity,
              "--drift": p.drift,
            } as React.CSSProperties
          }
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
}

/**
 * Aplica o tema sazonal no documento e desenha a camada de efeitos.
 * Renderizado apenas no cliente (ver SiteLayout) para evitar mismatch de SSR:
 * o tema depende da data/relógio do visitante.
 */
export function SeasonalTheme() {
  const [theme, setTheme] = useState<SeasonalTheme | null>(null);
  const [motionOk, setMotionOk] = useState(true);
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    const resolved = resolveTheme();
    setTheme(resolved);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);

    // Revalida à meia-noite para virar o tema sem exigir refresh.
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 30, 0);
    const timer = window.setTimeout(() => setTheme(resolveTheme()), midnight.getTime() - now.getTime());

    return () => {
      mq.removeEventListener("change", sync);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme) root.setAttribute("data-season", theme.id);
    else root.removeAttribute("data-season");

    if (!theme) return;
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(`agendda:season-banner:${theme.id}`) === "1";
    } catch {
      /* ignora */
    }
    setBannerOpen(!dismissed);

    return () => root.removeAttribute("data-season");
  }, [theme]);

  if (!theme) return null;

  const closeBanner = () => {
    setBannerOpen(false);
    try {
      window.sessionStorage.setItem(`agendda:season-banner:${theme.id}`, "1");
    } catch {
      /* ignora */
    }
  };

  // Ancestrais com `transform` (PageTransition) quebram `position: fixed`,
  // então a camada sazonal é montada direto no <body> via portal.
  return createPortal(
    <>
      <div className="season-aura" aria-hidden="true" />
      {motionOk && <ParticleField theme={theme} />}
      {bannerOpen && (
        <div className="season-banner" role="status">
          <span className="season-banner-glyph" aria-hidden="true">
            {theme.glyphs[0]}
          </span>
          <span className="season-banner-text">
            <strong>{theme.name}</strong>
            <span className="hidden sm:inline"> — {theme.tagline}</span>
          </span>
          <button
            type="button"
            onClick={closeBanner}
            aria-label="Fechar aviso do tema sazonal"
            className="season-banner-close focus-ring"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>,
    document.body,
  );
}
