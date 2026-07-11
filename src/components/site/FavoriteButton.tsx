import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useToggleFavorite } from "@/lib/favorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({ companyId, className }: { companyId: string; className?: string }) {
  const { isFav, isLoggedIn, toggle, isPending } = useToggleFavorite(companyId);
  const navigate = useNavigate();

  return (
    <button
      type="button"
      aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoggedIn) {
          toast.info("Entre para salvar favoritos");
          navigate({ to: "/auth" });
          return;
        }
        toggle(undefined, {
          onSuccess: () => toast.success(isFav ? "Removido dos favoritos" : "Adicionado aos favoritos"),
          onError: () => toast.error("Erro ao atualizar favorito"),
        });
      }}
      disabled={isPending}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur transition hover:scale-105 hover:bg-background disabled:opacity-50",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", isFav && "fill-red-500 text-red-500")} />
    </button>
  );
}
