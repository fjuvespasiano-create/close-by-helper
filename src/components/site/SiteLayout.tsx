import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { PWAInstallPrompt } from "./PWAInstallPrompt";
import { useCityAutoDetect } from "@/hooks/useCityAutoDetect";

export function SiteLayout({ children }: { children: ReactNode }) {
  useCityAutoDetect();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <PWAInstallPrompt />
    </div>
  );
}
