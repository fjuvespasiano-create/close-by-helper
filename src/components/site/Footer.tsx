import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { useSiteContent } from "@/lib/siteContent";

export function Footer() {
  const c = useSiteContent();
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-primary-foreground shadow-sm">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="font-display text-lg font-extrabold tracking-tight">{c.brand.name}</div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.footer.about_text}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">{c.footer.nav_title}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Início</Link></li>
            <li><Link to="/buscar" className="hover:text-foreground">Buscar serviços</Link></li>
            <li><Link to="/eventos" className="hover:text-foreground">Eventos</Link></li>
            <li><Link to="/blog" className="hover:text-foreground">Blog</Link></li>
            <li><Link to="/favoritos" className="hover:text-foreground">Favoritos</Link></li>
            <li><Link to="/sobre" className="hover:text-foreground">Sobre</Link></li>
            <li><Link to="/reputacao" className="hover:text-foreground">Reputação e verificação</Link></li>
            <li><Link to="/contato" className="hover:text-foreground">Contato</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">{c.footer.biz_title}</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/planos" className="hover:text-foreground">Planos e preços</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Anunciar grátis</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Entrar</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">{c.newsletter.title}</h4>
          <p className="mt-3 text-sm text-muted-foreground">{c.newsletter.description}</p>
          <div className="mt-3"><NewsletterForm compact /></div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} {c.footer.copyright}</p>
          <p>{c.footer.location}</p>
        </div>
      </div>
    </footer>
  );
}
