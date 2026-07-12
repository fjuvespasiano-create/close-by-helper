import { useCallback, useEffect, useState } from "react";
import { SAVED_SEARCHES_KEY } from "./constants";
import type { SavedSearch, SearchState } from "./types";

function load(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as SavedSearch[]) : [];
  } catch {
    return [];
  }
}

function persist(list: SavedSearch[]) {
  try {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function useSavedSearches() {
  const [saved, setSaved] = useState<SavedSearch[]>([]);

  useEffect(() => {
    setSaved(load());
  }, []);

  const add = useCallback((name: string, params: SearchState) => {
    setSaved((prev) => {
      const next = [{ name, params }, ...prev.filter((s) => s.name !== name)].slice(0, 10);
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((name: string) => {
    setSaved((prev) => {
      const next = prev.filter((s) => s.name !== name);
      persist(next);
      return next;
    });
  }, []);

  return { saved, add, remove };
}
