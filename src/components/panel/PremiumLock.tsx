import { Link } from "@tanstack/react-router";
import { Crown, Lock } from "lucide-react";
import { isPremium } from "@/lib/plans";

type Props = {
  plan?: string | null;
  children: React.ReactNode;
  label?: string;
};

export function PremiumLock({ plan, children, label = "Recurso Premium" }: Props) {
  if (isPremium(plan)) return <>{children}</>;
  return (
    <div className="relative rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3">
      <div className="pointer-events-none select-none opacity-50">{children}</div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-accent">
          <Lock className="h-3.5 w-3.5" /> {label}
        </span>
        <Link
          to="/planos"
          className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-foreground hover:bg-accent/90"
        >
          <Crown className="h-3 w-3" /> Fazer upgrade
        </Link>
      </div>
    </div>
  );
}

export function PremiumBadgeInline() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
      <Crown className="h-3 w-3" /> Premium
    </span>
  );
}
