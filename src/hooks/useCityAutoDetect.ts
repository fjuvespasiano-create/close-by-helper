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

export type GPSDetectResult =
  | { ok: true; slug: string | null; name: string | null }
  | { ok: false; reason: "unsupported" | "insecure" | "denied" | "unavailable" | "timeout" | "server"; message: string };

export function useRunGPSDetect() {
  const { setCity } = useSelectedCity();
  const gpsFn = useServerFn(detectCityByGPS);
  return () =>
    new Promise<GPSDetectResult>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({ ok: false, reason: "unsupported", message: "Seu navegador não suporta geolocalização." });
        return;
      }
      // Geolocation requires a secure context (HTTPS or localhost).
      if (typeof window !== "undefined" && window.isSecureContext === false) {
        resolve({ ok: false, reason: "insecure", message: "Localização exige HTTPS. Acesse pelo endereço seguro." });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await gpsFn({
              data: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            });
            if (isKnownSlug(res?.slug)) setCity(res.slug);
            resolve({ ok: true, slug: res?.slug ?? null, name: res?.name ?? null });
          } catch (err) {
            resolve({ ok: false, reason: "server", message: (err as Error)?.message || "Falha ao consultar cidade." });
          }
        },
        (err) => {
          const map: Record<number, { reason: GPSDetectResult extends { ok: false; reason: infer R } ? R : never; message: string }> = {
            1: { reason: "denied", message: "Permissão de localização negada. Habilite nas configurações do navegador." },
            2: { reason: "unavailable", message: "Localização indisponível no momento. Tente novamente." },
            3: { reason: "timeout", message: "Tempo esgotado ao obter localização. Tente novamente." },
          };
          const info = map[err.code] ?? { reason: "unavailable" as const, message: err.message || "Não foi possível obter sua localização." };
          resolve({ ok: false, reason: info.reason, message: info.message });
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60_000 },
      );
    });
}

