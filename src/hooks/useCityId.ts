import { useQuery } from "@tanstack/react-query";
import { resolveCityIdBySlug } from "@/lib/data/cities";
import type { CitySlug } from "./useSelectedCity";

export function useCityId(slug?: CitySlug | null) {
  return useQuery({
    queryKey: ["city-id", slug],
    enabled: !!slug,
    staleTime: 60 * 60 * 1000,
    queryFn: () => resolveCityIdBySlug(slug),
  });
}
