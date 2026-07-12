export type SortMode = "recent" | "salary_desc" | "salary_asc";
export type RemoteMode = "all" | "yes" | "no";

export type SearchState = {
  q: string;
  city: string;
  remote: RemoteMode;
  employment: string;
  experience: string;
  salaryMin: number;
  sort: SortMode;
  page: number;
};

export type JobRow = {
  id: string;
  title: string;
  company_name: string | null;
  location_city: string | null;
  location_state: string | null;
  is_remote: boolean;
  employment_type: string | null;
  experience_level?: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  apply_url: string | null;
  category?: string | null;
  tags?: string[] | null;
  posted_at: string | null;
  is_premium?: boolean | null;
  company_logo_url?: string | null;
};

export type PremiumJobRow = JobRow & {
  benefits: string[];
  requirements: string[];
  workload: string | null;
  featured_until: string | null;
};

export type JobDetail = JobRow & {
  description: string | null;
  is_premium: boolean;
  company_id: string | null;
  company_logo_url: string | null;
  company_size: string | null;
  company_culture: string | null;
  requirements: string[];
  nice_to_have: string[];
  benefits: string[];
  responsibilities: string[];
  workload: string | null;
  apply_email: string | null;
  apply_whatsapp: string | null;
  application_deadline: string | null;
  featured_until: string | null;
  expires_at: string | null;
  job_sources?: { name: string; slug: string } | null;
};

export type SavedSearch = { name: string; params: SearchState };
