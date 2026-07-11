import { useEffect, useRef, useState } from "react";
import { X, Crown } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedCity } from "@/hooks/useSelectedCity";

type Ad = {
  id: string;
  name: string;
  image_url: string;
  link_url: string;
  delay_seconds: number;
  scroll_trigger_percent: number;
  display_seconds: number;
  placement: "bottom-right" | "bottom-center" | "center";
  weight: number | null;
  route_patterns: string[] | null;
  company_id: string | null;
  is_premium: boolean;
};

const DISMISS_HOURS = 12;
const PREMIUM_WEIGHT_MULTIPLIER = 3;

function alreadySeen(id: string) {
  try {
    const raw = localStorage.getItem(`ad_seen_${id}`);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_HOURS * 3600 * 1000;
  } catch {
    return false;
  }
}

function markSeen(id: string) {
  try {
    localStorage.setItem(`ad_seen_${id}`, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Matches a URL pathname against a pattern list. Empty list = matches everywhere.
 *  Patterns support a trailing `*` wildcard (e.g. `/empresa/*` matches `/empresa/foo`). */
function matchesRoute(pathname: string, patterns: string[] | null | undefined) {
  if (!patterns || patterns.length === 0) return true;
  return patterns.some((raw) => {
    const p = raw.trim();
    if (!p) return false;
    if (p.endsWith("*")) return pathname.startsWith(p.slice(0, -1));
    return pathname === p;
  });
}

function effectiveWeight(ad: { weight: number | null; is_premium: boolean }) {
  const base = Math.max(1, ad.weight ?? 1);
  return ad.is_premium ? base * PREMIUM_WEIGHT_MULTIPLIER : base;
}

function pickWeighted(items: Ad[]): Ad | null {
  if (!items.length) return null;
  const total = items.reduce((s, it) => s + effectiveWeight(it), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= effectiveWeight(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export function AdModal() {
  const { city } = useSelectedCity();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [ad, setAd] = useState<Ad | null>(null);
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timers = useRef<{ show?: number; tick?: number }>({});

  // Fetch active ads for this city, then filter by current route + boost Premium weight.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select(
          "id,name,image_url,link_url,delay_seconds,scroll_trigger_percent,display_seconds,placement,weight,city_slug,route_patterns,company_id,companies:company_id(plan,status,plan_expires_at)",
        )
        .eq("active", true)
        .or(`city_slug.is.null,city_slug.eq.${city}`)
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .limit(40);
      if (cancelled || error || !data?.length) return;

      const enriched: Ad[] = data
        .map((row) => {
          const company = row.companies as { plan?: string | null; status?: string | null; plan_expires_at?: string | null } | null;
          const premiumActive =
            !!company &&
            company.plan === "premium" &&
            company.status === "active" &&
            (!company.plan_expires_at || new Date(company.plan_expires_at) > new Date());
          return {
            id: row.id,
            name: row.name,
            image_url: row.image_url,
            link_url: row.link_url,
            delay_seconds: row.delay_seconds,
            scroll_trigger_percent: row.scroll_trigger_percent,
            display_seconds: row.display_seconds,
            placement: row.placement as Ad["placement"],
            weight: row.weight,
            route_patterns: row.route_patterns,
            company_id: row.company_id,
            is_premium: premiumActive,
          };
        })
        .filter((a) => matchesRoute(pathname, a.route_patterns) && !alreadySeen(a.id));

      const picked = pickWeighted(enriched);
      if (picked) setAd(picked);
    })();
    return () => {
      cancelled = true;
    };
  }, [city, pathname]);


  // Trigger by delay OR scroll depth
  useEffect(() => {
    if (!ad) return;
    let triggered = false;
    const show = () => {
      if (triggered) return;
      triggered = true;
      setVisible(true);
      setCountdown(ad.display_seconds);
      void supabase.rpc("track_ad_event", { _ad_id: ad.id, _kind: "impression" });
      void supabase.from("analytics_events").insert({
        name: "ad_impression",
        entity_type: "ad_campaign",
        entity_id: ad.id,
        meta: { device: window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop" },
      });
      timers.current.tick = window.setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            close();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    };
    timers.current.show = window.setTimeout(show, Math.max(0, ad.delay_seconds) * 1000);

    const onScroll = () => {
      if (triggered || !ad.scroll_trigger_percent) return;
      const scrolled = window.scrollY + window.innerHeight;
      const pct = (scrolled / document.documentElement.scrollHeight) * 100;
      if (pct >= ad.scroll_trigger_percent) show();
    };
    if (ad.scroll_trigger_percent > 0) {
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timers.current.show) window.clearTimeout(timers.current.show);
      if (timers.current.tick) window.clearInterval(timers.current.tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad]);

  function close() {
    if (timers.current.tick) window.clearInterval(timers.current.tick);
    setVisible(false);
    if (ad) markSeen(ad.id);
  }

  function onClick() {
    if (!ad) return;
    void supabase.rpc("track_ad_event", { _ad_id: ad.id, _kind: "click" });
    void supabase.from("analytics_events").insert({
      name: "ad_click",
      entity_type: "ad_campaign",
      entity_id: ad.id,
      meta: { device: window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop" },
    });
    markSeen(ad.id);
  }

  if (!ad || !visible) return null;

  const positionClass =
    ad.placement === "center"
      ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      : ad.placement === "bottom-center"
        ? "left-1/2 bottom-4 -translate-x-1/2"
        : "right-4 bottom-4";

  return (
    <div
      role="dialog"
      aria-label={`Anúncio: ${ad.name}`}
      className={`fixed z-[70] w-[320px] max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-scale-in ${positionClass}`}
    >
      <button
        type="button"
        onClick={close}
        aria-label="Fechar anúncio"
        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
      >
        <X className="h-4 w-4" />
      </button>
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener sponsored"
        onClick={onClick}
        className="block"
      >
        <img
          src={ad.image_url}
          alt={ad.name}
          className="block h-auto w-full object-cover"
          loading="lazy"
        />
      </a>
      <div className="flex items-center justify-between gap-2 border-t bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>Publicidade local</span>
        <span>Fecha em {countdown}s</span>
      </div>
    </div>
  );
}
