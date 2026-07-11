import { useCallback, useSyncExternalStore } from "react";

const KEY = "selected_city";
const DEFAULT: CitySlug = "vespasiano";

export type CitySlug = "vespasiano" | "sao-jose-da-lapa";

export const CITY_OPTIONS: { slug: CitySlug; name: string }[] = [
  { slug: "vespasiano", name: "Vespasiano" },
  { slug: "sao-jose-da-lapa", name: "São José da Lapa" },
];

function read(): CitySlug {
  if (typeof window === "undefined") return DEFAULT;
  const v = window.localStorage.getItem(KEY);
  if (v === "vespasiano" || v === "sao-jose-da-lapa") return v;
  return DEFAULT;
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSelectedCity() {
  const city = useSyncExternalStore(
    subscribe,
    () => read(),
    () => DEFAULT
  );
  const setCity = useCallback((next: CitySlug) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, next);
    listeners.forEach((l) => l());
  }, []);
  return { city, setCity };
}
