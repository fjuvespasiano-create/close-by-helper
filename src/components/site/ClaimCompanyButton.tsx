import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClaimCompanyDialog } from "./ClaimCompanyDialog";
import { getMyClaimForCompany } from "@/lib/company-claims.functions";

export function ClaimCompanyButton({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [openLogin, setOpenLogin] = useState(false);
  const [openClaim, setOpenClaim] = useState(false);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
      setAuthLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("companies")
      .select("owner_id")
      .eq("id", companyId)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) setOwnerId((data as { owner_id: string | null } | null)?.owner_id ?? null);
      });
    return () => {
      mounted = false;
    };
  }, [companyId]);

  const fetchMine = useServerFn(getMyClaimForCompany);
  const claimQuery = useQuery({
    queryKey: ["my-claim", companyId, userId],
    enabled: !!userId,
    queryFn: () => fetchMine({ data: { company_id: companyId } }),
    staleTime: 30_000,
  });

  if (authLoading) return null;

  const isOwner = !!userId && !!ownerId && userId === ownerId;
  const currentClaim = claimQuery.data;

  if (isOwner) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
        <BadgeCheck className="h-3.5 w-3.5" /> Você gerencia esta empresa
      </div>
    );
  }

  if (currentClaim?.status === "pending") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        <ShieldCheck className="h-3.5 w-3.5" /> Reivindicação em análise
      </div>
    );
  }

  if (currentClaim?.status === "approved") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <BadgeCheck className="h-3.5 w-3.5" /> Reivindicação aprovada
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (!userId) setOpenLogin(true);
          else setOpenClaim(true);
        }}
      >
        <ShieldCheck className="mr-2 h-4 w-4" />
        {currentClaim?.status === "rejected" ? "Enviar nova reivindicação" : "Reivindicar esta empresa"}
      </Button>

      <Dialog open={openLogin} onOpenChange={setOpenLogin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Entre para reivindicar</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Para reivindicar a propriedade de <strong>{companyName}</strong> você precisa ter uma conta no
            AgenddaAqui. É rápido e gratuito.
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/auth" search={{ redirect: typeof window !== "undefined" ? window.location.pathname : "/" }} className="flex-1">
              <Button className="w-full">Entrar ou criar conta</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <ClaimCompanyDialog
        open={openClaim}
        onOpenChange={setOpenClaim}
        companyId={companyId}
        companyName={companyName}
        userId={userId ?? ""}
        onSubmitted={() => claimQuery.refetch()}
      />
    </>
  );
}
