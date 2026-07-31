/**
 * Temas sazonais — trocam a identidade visual do site inteiro em datas especiais.
 *
 * Arquitetura:
 *  - Cada tema declara um `id` (usado como `data-season` no <html>), uma janela de
 *    datas (fixa ou calculada, ex.: 2º domingo de maio) e um efeito de partículas.
 *  - As cores/sombras vivem em `src/styles.css` sob `[data-season="<id>"]`, sempre
 *    como tokens semânticos — nenhum componente precisa saber que o tema existe.
 *  - Este módulo é puro (sem DOM, sem rede) para poder rodar no SSR e em testes.
 */

export type SeasonEffect =
  | "snow"
  | "petals"
  | "leaves"
  | "bats"
  | "confetti"
  | "hearts"
  | "lanterns"
  | "fireworks"
  | "eggs"
  | "sparks";

export interface SeasonalTheme {
  /** Identificador estável usado no atributo `data-season`. */
  id: string;
  /** Nome exibido na faixa/banner do tema. */
  name: string;
  /** Frase curta de apoio exibida na faixa. */
  tagline: string;
  /** Glifos usados como partículas (renderizados como texto, custo zero de rede). */
  glyphs: string[];
  effect: SeasonEffect;
  /** Densidade de partículas (quantidade base em desktop). */
  density: number;
  /** Janela de exibição. */
  window: SeasonWindow;
}

/** Janela fixa (mês/dia) ou relativa a um enésimo dia da semana de um mês. */
export type SeasonWindow =
  | { kind: "fixed"; from: [month: number, day: number]; to: [month: number, day: number] }
  | {
      kind: "nth-weekday";
      month: number;
      /** 0 = domingo … 6 = sábado */
      weekday: number;
      /** 1 = primeira ocorrência do mês */
      nth: number;
      /** Dias antes/depois da data-alvo em que o tema fica ativo. */
      daysBefore: number;
      daysAfter: number;
    };

/**
 * Ordem importa: o primeiro tema ativo vence (datas podem se sobrepor,
 * ex.: Natal x Ano Novo).
 */
export const SEASONAL_THEMES: SeasonalTheme[] = [
  {
    id: "halloween",
    name: "Halloween",
    tagline: "A cidade em modo assombrado",
    glyphs: ["🦇", "🎃", "🕸️", "👻"],
    effect: "bats",
    density: 18,
    window: { kind: "fixed", from: [10, 24], to: [11, 2] },
  },
  {
    id: "black-friday",
    name: "Black Friday",
    tagline: "As melhores ofertas da região",
    glyphs: ["✦", "✧", "★"],
    effect: "sparks",
    density: 22,
    window: { kind: "fixed", from: [11, 20], to: [11, 30] },
  },
  {
    id: "natal",
    name: "Natal",
    tagline: "Boas festas para toda a vizinhança",
    glyphs: ["❄", "❅", "❆", "✦"],
    effect: "snow",
    density: 40,
    window: { kind: "fixed", from: [12, 1], to: [12, 26] },
  },
  {
    id: "ano-novo",
    name: "Ano Novo",
    tagline: "Um novo ciclo começa aqui",
    glyphs: ["✧", "✦", "★", "❋"],
    effect: "fireworks",
    density: 26,
    window: { kind: "fixed", from: [12, 27], to: [1, 6] },
  },
  {
    id: "ano-novo-lunar",
    name: "Ano Novo Lunar",
    tagline: "Prosperidade e sorte para o novo ano",
    glyphs: ["🏮", "✦", "❋"],
    effect: "lanterns",
    density: 14,
    window: { kind: "fixed", from: [1, 28], to: [2, 12] },
  },
  {
    id: "carnaval",
    name: "Carnaval",
    tagline: "A folia toma conta da cidade",
    glyphs: ["✦", "❋", "◆", "●"],
    effect: "confetti",
    density: 38,
    window: { kind: "fixed", from: [2, 13], to: [3, 5] },
  },
  {
    id: "sakura",
    name: "Primavera Sakura",
    tagline: "A estação das flores chegou",
    glyphs: ["🌸", "❀", "✿"],
    effect: "petals",
    density: 30,
    window: { kind: "fixed", from: [3, 20], to: [4, 5] },
  },
  {
    id: "pascoa",
    name: "Páscoa",
    tagline: "Doçura e recomeço",
    glyphs: ["🥚", "🐣", "❀"],
    effect: "eggs",
    density: 16,
    window: { kind: "fixed", from: [4, 6], to: [4, 22] },
  },
  {
    id: "dia-das-maes",
    name: "Dia das Mães",
    tagline: "Para quem cuida da cidade inteira",
    glyphs: ["🌷", "❤", "❀"],
    effect: "hearts",
    density: 24,
    window: { kind: "nth-weekday", month: 5, weekday: 0, nth: 2, daysBefore: 10, daysAfter: 1 },
  },
  {
    id: "namorados",
    name: "Dia dos Namorados",
    tagline: "A cidade fica mais romântica",
    glyphs: ["❤", "♥", "✦"],
    effect: "hearts",
    density: 26,
    window: { kind: "fixed", from: [6, 5], to: [6, 13] },
  },
  {
    id: "festa-junina",
    name: "Festa Junina",
    tagline: "Arraiá aberto na vizinhança",
    glyphs: ["🎈", "✦", "❋"],
    effect: "confetti",
    density: 30,
    window: { kind: "fixed", from: [6, 14], to: [7, 6] },
  },
  {
    id: "dia-dos-pais",
    name: "Dia dos Pais",
    tagline: "Homenagem a quem segura a barra",
    glyphs: ["✦", "★", "❋"],
    effect: "sparks",
    density: 18,
    window: { kind: "nth-weekday", month: 8, weekday: 0, nth: 2, daysBefore: 10, daysAfter: 1 },
  },
  {
    id: "outono",
    name: "Outono Dourado",
    tagline: "A estação mais aconchegante do ano",
    glyphs: ["🍂", "🍁", "❋"],
    effect: "leaves",
    density: 26,
    window: { kind: "fixed", from: [9, 20], to: [10, 23] },
  },
];

/** Retorna o dia do mês da enésima ocorrência de um dia da semana. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month - 1, 1 + offset + (nth - 1) * 7));
}

function dayIndex(month: number, day: number): number {
  return month * 100 + day;
}

/** `true` se a data cai dentro da janela do tema (suporta virada de ano). */
export function isThemeActive(theme: SeasonalTheme, date: Date): boolean {
  const w = theme.window;
  if (w.kind === "fixed") {
    const now = dayIndex(date.getMonth() + 1, date.getDate());
    const from = dayIndex(w.from[0], w.from[1]);
    const to = dayIndex(w.to[0], w.to[1]);
    return from <= to ? now >= from && now <= to : now >= from || now <= to;
  }
  const target = nthWeekdayOfMonth(date.getUTCFullYear(), w.month, w.weekday, w.nth);
  const start = new Date(target);
  start.setUTCDate(start.getUTCDate() - w.daysBefore);
  const end = new Date(target);
  end.setUTCDate(end.getUTCDate() + w.daysAfter + 1);
  const t = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return t >= start.getTime() && t < end.getTime();
}

/** Tema ativo para a data informada, ou `null` fora de qualquer janela. */
export function getActiveTheme(date: Date = new Date()): SeasonalTheme | null {
  return SEASONAL_THEMES.find((t) => isThemeActive(t, date)) ?? null;
}

export function getThemeById(id: string | null | undefined): SeasonalTheme | null {
  if (!id) return null;
  return SEASONAL_THEMES.find((t) => t.id === id) ?? null;
}

/** Chave de localStorage usada para forçar/desligar um tema (preview e opt-out). */
export const SEASON_OVERRIDE_KEY = "agendda:season-override";
/** Valor especial que desliga qualquer tema sazonal. */
export const SEASON_OFF = "off";
