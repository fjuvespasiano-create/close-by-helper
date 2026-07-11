import { CITY_OPTIONS, useSelectedCity } from "@/hooks/useSelectedCity";

export function CitySwitch({ onDark = false }: { onDark?: boolean }) {
  const { city, setCity } = useSelectedCity();
  return (
    <div
      className={`inline-flex rounded-full border p-1 text-sm font-medium ${
        onDark ? "border-white/30 bg-white/10" : "border-border bg-card"
      }`}
      role="tablist"
      aria-label="Cidade"
    >
      {CITY_OPTIONS.map((opt) => {
        const active = city === opt.slug;
        return (
          <button
            key={opt.slug}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setCity(opt.slug)}
            className={`rounded-full px-4 py-1.5 transition ${
              active
                ? onDark
                  ? "bg-white text-primary shadow"
                  : "bg-primary text-primary-foreground shadow"
                : onDark
                ? "text-white/85 hover:text-white"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            {opt.name}
          </button>
        );
      })}
    </div>
  );
}
