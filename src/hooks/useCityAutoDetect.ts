import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { detectCityByIP, detectCityByGPS } from "@/lib/cityDetect.functions";
import { CITY_OPTIONS, useSelectedCity, type CitySlug } from "./useSelectedCity";

const DETECTED_KEY = "city_auto_detected_v1";
const SLUGS = CITY_OPTIONS.map((c) => c.slug) as string[];

function isKnownSlug(s: string | null | undefined): s is CitySlug {
  return !!s && SLUGS.includes(s);
}

/**
 * Runs once per browser to auto-detect the user's city:
 *   1. If a preference is already stored, do nothing.
 *   2. Try IP-based detection (server-side).
 *   3. Fallback stays with the current default (Vespasiano).
 * GPS is offered opt-in via `runGPSDetect()`.
 */
export function useCityAutoDetect() {
  const { setCity } = useSelectedCity();
  const ipFn = useServerFn(detectCityByIP);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("selected_city")) return; // already chosen
    if (window.localStorage.getItem(DETECTED_KEY)) return; // avoid re-running each visit

    ipFn()
      .then((res) => {
        if (isKnownSlug(res?.slug)) setCity(res.slug);
      })
      .catch(() => {})
      .finally(() => {
        try {
          window.localStorage.setItem(DETECTED_KEY, "1");
        } catch {}
      });
  }, [ipFn, setCity]);
}

export function useRunGPSDetect() {
  const { setCity } = useSelectedCity();
  const gpsFn = useServerFn(detectCityByGPS);
  return () =>
    new Promise<{ slug: string | null; name: string | null } | null>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await gpsFn({
              data: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            });
            if (isKnownSlug(res?.slug)) setCity(res.slug);
            resolve(res ?? null);
          } catch {
            resolve(null);
          }
        },
        () => resolve(null),
        { timeout: 8000, maximumAge: 5 * 60_000 },
      );
    });
}
