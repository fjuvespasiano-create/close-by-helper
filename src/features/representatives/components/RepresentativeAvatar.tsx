import { cn } from "@/lib/utils";
import { getInitials } from "../format";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-28 w-28 text-3xl",
};

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: Size;
  className?: string;
  ring?: boolean;
};

export function RepresentativeAvatar({
  name,
  photoUrl,
  size = "md",
  className,
  ring = false,
}: Props) {
  const sizeCls = SIZE_CLASSES[size];
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        loading="lazy"
        className={cn(
          "rounded-full object-cover",
          size === "xl" ? "rounded-2xl" : "rounded-full",
          sizeCls,
          ring && (size === "xl" ? "ring-4 ring-background shadow-md" : "ring-2 ring-primary/10"),
          className,
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "bg-primary/10 text-primary flex items-center justify-center font-bold",
        size === "xl" ? "rounded-2xl" : "rounded-full",
        sizeCls,
        ring && (size === "xl" ? "ring-4 ring-background shadow-md" : "ring-2 ring-primary/10"),
        className,
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
