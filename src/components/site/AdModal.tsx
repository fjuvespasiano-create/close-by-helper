import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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
};

const DISMISS_HOURS = 12;

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

function pickWeighted<T extends { weight?: number | null }>(items: T[]): T | null {
  if (!items.length) return null;
  const total = items.reduce((s, it) => s + Math.max(1, it.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= Math.max(1, it.weight ?? 1);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export function AdModal() {
  const { city } = useSelectedCity();
  const [ad, setAd] = useState<Ad | null>(null);
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timers = useRef<{ show?: number; tick?: number }>({});

  // Fetch a random active ad for this city (or global)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("id,name,image_url,link_url,delay_seconds,scroll_trigger_percent,display_seconds,placement,weight,city_slug")
        .or(`city_slug.is.null,city_slug.eq.${city}`)
        .limit(20);
      if (cancelled || error || !data?.length) return;
      const pool = data.filter((a) => !alreadySeen(a.id));
      const picked = pickWeighted(pool);
      if (picked) setAd(picked as Ad);
    })();
    return () => {
      cancelled = true;
    };
  }, [city]);

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
