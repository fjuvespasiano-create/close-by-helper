import type { SearchState } from "./types";

export const EMPLOYMENT_OPTIONS = [
  { value: "CLT", label: "CLT" },
  { value: "PJ", label: "PJ" },
  { value: "Temporário", label: "Temporário" },
  { value: "Freelancer", label: "Freelancer" },
  { value: "Estágio", label: "Estágio" },
  { value: "Jovem Aprendiz", label: "Jovem Aprendiz" },
];

export const EXPERIENCE_OPTIONS = [
  { value: "Estágio", label: "Estágio" },
  { value: "Júnior", label: "Júnior" },
  { value: "Pleno", label: "Pleno" },
  { value: "Sênior", label: "Sênior" },
  { value: "Especialista", label: "Especialista" },
];

export const SALARY_OPTIONS = [
  { value: 0, label: "Qualquer" },
  { value: 1500, label: "R$ 1,5k+" },
  { value: 2500, label: "R$ 2,5k+" },
  { value: 4000, label: "R$ 4k+" },
  { value: 6000, label: "R$ 6k+" },
  { value: 10000, label: "R$ 10k+" },
];

export const SAVED_SEARCHES_KEY = "empregos_saved_searches";
export const PAGE_SIZE = 20;

export const DEFAULT_SEARCH: SearchState = {
  q: "",
  city: "",
  remote: "all",
  employment: "",
  experience: "",
  salaryMin: 0,
  sort: "recent",
  page: 1,
};

export const CITY_OPTIONS = [
  { value: "Vespasiano", label: "Vespasiano" },
  { value: "São José da Lapa", label: "São José da Lapa" },
];
