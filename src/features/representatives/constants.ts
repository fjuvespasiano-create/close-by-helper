import type { CitySlug } from "@/hooks/useSelectedCity";
import type { ActivityKind, ActivityStatus, RepresentativeRole } from "./types";

export const CITY_IDS: Record<CitySlug, string> = {
  vespasiano: "c4ccc60b-b17c-4e91-968e-4d38ab42e734",
  "sao-jose-da-lapa": "d9203559-409c-4512-ae93-a5d398afe0b0",
};

export const ROLE_LABEL: Record<RepresentativeRole, string> = {
  prefeito: "Prefeito",
  vice_prefeito: "Vice-Prefeito",
  vereador: "Vereador",
};

export const KIND_META: Record<
  ActivityKind,
  { label: string; emoji: string; color: string }
> = {
  projeto_lei: { label: "Projeto de Lei", emoji: "📜", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  indicacao: { label: "Indicação", emoji: "📍", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
  requerimento: { label: "Requerimento", emoji: "📝", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300" },
  voto: { label: "Voto", emoji: "🗳️", color: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  decreto: { label: "Decreto", emoji: "🏛️", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  obra: { label: "Obra", emoji: "🚧", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  contrato: { label: "Contrato", emoji: "📑", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  pauta: { label: "Pauta", emoji: "📅", color: "bg-pink-500/10 text-pink-700 dark:text-pink-300" },
  outro: { label: "Outro", emoji: "•", color: "bg-muted text-muted-foreground" },
};

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  em_tramitacao: "Em tramitação",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  vetado: "Vetado",
  arquivado: "Arquivado",
  publicado: "Publicado",
};

export const CITY_NAME: Record<CitySlug, string> = {
  vespasiano: "Vespasiano",
  "sao-jose-da-lapa": "São José da Lapa",
};
