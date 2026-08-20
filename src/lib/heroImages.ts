/**
 * Hero images da Home que mudam conforme o horário do dia (fuso de Brasília),
 * sempre priorizando as imagens de destaque de Vespasiano e São José da Lapa.
 *
 * São 10 imagens: 5 momentos do dia × 2 cidades.
 */
import vespDawn from "@/assets/hero-vesp-dawn.jpg.asset.json";
import vespMorning from "@/assets/hero-vesp-morning.jpg.asset.json";
import vespMidday from "@/assets/hero-vesp-midday.jpg.asset.json";
import vespSunset from "@/assets/hero-vesp-sunset.jpg.asset.json";
import vespNight from "@/assets/hero-vesp-night.jpg.asset.json";
import sjlDawn from "@/assets/hero-sjl-dawn.jpg.asset.json";
import sjlMorning from "@/assets/hero-sjl-morning.jpg.asset.json";
import sjlMidday from "@/assets/hero-sjl-midday.jpg.asset.json";
import sjlSunset from "@/assets/hero-sjl-sunset.jpg.asset.json";
import sjlNight from "@/assets/hero-sjl-night.jpg.asset.json";

export type DaypartId = "dawn" | "morning" | "midday" | "sunset" | "night";

export type HeroImage = {
  url: string;
  alt: string;
  daypart: DaypartId;
  city: "vespasiano" | "sao-jose-da-lapa";
  /** Rótulo curto exibido no badge do hero. */
  label: string;
};

const DAYPART_LABEL: Record<DaypartId, string> = {
  dawn: "Amanhecer",
  morning: "Bom dia",
  midday: "Boa tarde",
  sunset: "Entardecer",
  night: "Boa noite",
};

export const HERO_IMAGES: HeroImage[] = [
  { url: vespDawn.url, daypart: "dawn", city: "vespasiano", label: DAYPART_LABEL.dawn, alt: "Vista aérea de Vespasiano ao amanhecer, com névoa sobre as serras" },
  { url: vespMorning.url, daypart: "morning", city: "vespasiano", label: DAYPART_LABEL.morning, alt: "Vista aérea de Vespasiano em manhã ensolarada, com a igreja matriz em destaque" },
  { url: vespMidday.url, daypart: "midday", city: "vespasiano", label: DAYPART_LABEL.midday, alt: "Vista aérea de Vespasiano ao meio-dia, avenida principal e serras ao fundo" },
  { url: vespSunset.url, daypart: "sunset", city: "vespasiano", label: DAYPART_LABEL.sunset, alt: "Vista aérea de Vespasiano ao pôr do sol, céu alaranjado sobre a cidade" },
  { url: vespNight.url, daypart: "night", city: "vespasiano", label: DAYPART_LABEL.night, alt: "Vista aérea noturna de Vespasiano, luzes da cidade sob céu estrelado" },
  { url: sjlDawn.url, daypart: "dawn", city: "sao-jose-da-lapa", label: DAYPART_LABEL.dawn, alt: "Vista aérea de São José da Lapa ao amanhecer, com as formações calcárias na névoa" },
  { url: sjlMorning.url, daypart: "morning", city: "sao-jose-da-lapa", label: DAYPART_LABEL.morning, alt: "Vista aérea de São José da Lapa em manhã ensolarada, igreja e campos verdes" },
  { url: sjlMidday.url, daypart: "midday", city: "sao-jose-da-lapa", label: DAYPART_LABEL.midday, alt: "Vista aérea de São José da Lapa ao meio-dia, paredões de calcário e grutas" },
  { url: sjlSunset.url, daypart: "sunset", city: "sao-jose-da-lapa", label: DAYPART_LABEL.sunset, alt: "Vista aérea de São José da Lapa ao pôr do sol, rochas em silhueta contra o céu dourado" },
  { url: sjlNight.url, daypart: "night", city: "sao-jose-da-lapa", label: DAYPART_LABEL.night, alt: "Vista aérea noturna de São José da Lapa, luzes da cidade e céu estrelado" },
];

/**
 * Converte uma hora (0-23) no momento do dia correspondente.
 * Faixas pensadas para o horário de Brasília.
 */
export function daypartFromHour(hour: number): DaypartId {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "midday";
  if (hour >= 17 && hour < 19) return "sunset";
  return "night";
}

/** Hora atual no fuso de São Paulo, independente do fuso do dispositivo. */
export function currentSaoPauloHour(now: Date = new Date()): number {
  try {
    const value = new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(now);
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed % 24 : now.getHours();
  } catch {
    // Ambientes sem dados de fuso completos caem no horário local.
    return now.getHours();
  }
}

/**
 * Seleciona a imagem do hero: prioriza a cidade selecionada; se ela não tiver
 * imagem para aquele momento, cai para a outra cidade e, por fim, para Vespasiano.
 */
export function pickHeroImage(city: string | undefined, daypart: DaypartId): HeroImage {
  const byDaypart = HERO_IMAGES.filter((img) => img.daypart === daypart);
  return (
    byDaypart.find((img) => img.city === city) ??
    byDaypart[0] ??
    HERO_IMAGES[0]!
  );
}
