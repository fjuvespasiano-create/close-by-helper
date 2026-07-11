import {
  HardHat, Sparkles, Truck, Wrench, PaintRoller, Zap, Droplets,
  Building2, UtensilsCrossed, HeartPulse, Laptop, Printer, Tag,
  Scissors, Scale, GraduationCap, PawPrint, Car, Home, PartyPopper,
  Shirt, Dumbbell, Trees, Camera, Plane, Calculator, Hammer, Shield,
  Ambulance, Flame, Badge, CloudRain, PhoneCall, Bus, HandHeart,
  Siren, MoreHorizontal,
} from "lucide-react";

const map: Record<string, React.ComponentType<{ className?: string }>> = {
  HardHat, Sparkles, Truck, Wrench, PaintRoller, Zap, Droplets,
  Building2, UtensilsCrossed, HeartPulse, Laptop, Printer,
  Scissors, Scale, GraduationCap, PawPrint, Car, Home, PartyPopper,
  Shirt, Dumbbell, Trees, Camera, Plane, Calculator, Hammer, Shield,
  Ambulance, Flame, Badge, CloudRain, PhoneCall, Bus, HandHeart,
  Siren, MoreHorizontal,
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && map[name]) || Tag;
  return <Icon className={className} />;
}
