import { ROLE_LABEL } from "./constants";
import type { Representative, RepresentativeRole } from "./types";

/** Duas primeiras iniciais do nome em maiúsculas. */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** "Vereador · PT" — party é opcional. */
export function formatRoleParty(
  role: RepresentativeRole,
  party: string | null | undefined,
): string {
  return party ? `${ROLE_LABEL[role]} · ${party}` : ROLE_LABEL[role];
}

/** Rótulo curto tipo "há 2h" / "há 3d" / data pt-BR. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 36e5);
  if (h < 1) return "agora";
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function formatFullName(rep: Pick<Representative, "name">): string {
  return rep.name;
}
