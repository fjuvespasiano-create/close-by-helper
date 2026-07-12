import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CitySlug } from "./useSelectedCity";

export function useCityId(slug?: CitySlug | null) {
  return useQuery({
    queryKey: ["city-id", slug],
    enabled: !!slug,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await supabase
        .from("cities")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      return data?.id ?? null;
    },
  });
}
