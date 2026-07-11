import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bus,
  Clock,
  MapPin,
  Star,
  Search,
  Route as RouteIcon,
  ExternalLink,
  Ticket,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transporte")({
  head: () => ({
    meta: [
      { title: "Transporte Público — Vespasiano e São José da Lapa" },
      {
        name: "description",
        content:
          "Linhas municipais e metropolitanas (DER-MG) que operam em Vespasiano e São José da Lapa: horários, tarifas, itinerários e operadoras.",
      },
      { property: "og:title", content: "Transporte Público — AgendaAqui" },
      {
        property: "og:description",
        content:
          "Consulte linhas de ônibus, horários, tarifas e pontos de embarque em Vespasiano, São José da Lapa e região metropolitana de BH.",
      },
    ],
  }),
  component: TransportePage,
});

type Cidade = "vespasiano" | "sao-jose-da-lapa" | "intermunicipal";
type Tipo = "municipal" | "metropolitana" | "intermunicipal" | "tarifa-zero";

interface Linha {
  numero: string;
  nome: string;
  cidade: Cidade;
  tipo: Tipo;
  operadora: string;
  tarifa: string;
  status: "em-operacao" | "atrasada" | "encerrada";
  horarios: { util: string[]; sabado: string[]; domingo: string[] };
  pontos: string[];
  fonte?: { label: string; url: string };
}

/**
 * Dados coletados de fontes oficiais/confiáveis em jul/2025:
 *  - Prefeitura de São José da Lapa (Tarifa Zero, jan/2025)
 *  - Prefeitura de Vespasiano / Consórcio Vetor Norte (abr/2025)
 *  - DER-MG (RIT 5) via movemetropolitano.com.br e onibus.online
 *  - horariodeonibus.net (linha 5230)
 * Horários podem sofrer alterações; confirme sempre com a operadora.
 */
const LINHAS: Linha[] = [
  // ===== SÃO JOSÉ DA LAPA — TARIFA ZERO (municipal) =====
  {
    numero: "TZ-01",
    nome: "Centro / Dom Pedro I / Jardim Encantado",
    cidade: "sao-jose-da-lapa",
    tipo: "tarifa-zero",
    operadora: "Prefeitura de São José da Lapa",
    tarifa: "Gratuito",
    status: "em-operacao",
    horarios: {
      util: ["06:00", "07:30", "09:00", "10:30", "12:00", "13:00", "15:00", "17:00", "18:20", "19:00"],
      sabado: ["06:00", "07:00", "09:00", "11:00", "12:00", "13:00", "15:00", "17:00", "18:00"],
      domingo: [],
    },
    pontos: ["Centro de SJL", "Bairro Dom Pedro I", "Jardim Encantado"],
    fonte: {
      label: "Prefeitura de SJL",
      url: "https://www.saojosedalapa.mg.gov.br/portal/servicos/1049/tarifa-zero/",
    },
  },
  {
    numero: "TZ-02",
    nome: "Centro / Dom Pedro I (Expresso)",
    cidade: "sao-jose-da-lapa",
    tipo: "tarifa-zero",
    operadora: "Prefeitura de São José da Lapa",
    tarifa: "Gratuito",
    status: "em-operacao",
    horarios: {
      util: ["06:45", "08:15", "09:45", "11:15", "14:15", "16:15", "17:45"],
      sabado: ["07:30", "08:45", "10:30", "12:30", "16:15", "18:30"],
      domingo: [],
    },
    pontos: ["Centro de SJL", "Bairro Dom Pedro I (sem paradas intermediárias)"],
    fonte: {
      label: "Prefeitura de SJL",
      url: "https://www.saojosedalapa.mg.gov.br/portal/servicos/1049/tarifa-zero/",
    },
  },
  {
    numero: "TZ-03",
    nome: "Nova Granja / Maravilha",
    cidade: "sao-jose-da-lapa",
    tipo: "tarifa-zero",
    operadora: "Prefeitura de São José da Lapa",
    tarifa: "Gratuito",
    status: "em-operacao",
    horarios: {
      util: ["05:50", "07:50", "11:50", "17:50"],
      sabado: ["05:50", "12:50", "16:50"],
      domingo: [],
    },
    pontos: ["Nova Granja", "Maria de Lourdes", "Centro de SJL", "Inácia de Carvalho", "Maravilha"],
    fonte: {
      label: "Prefeitura de SJL",
      url: "https://www.saojosedalapa.mg.gov.br/portal/servicos/1049/tarifa-zero/",
    },
  },

  // ===== VESPASIANO — MUNICIPAIS (Consórcio Vetor Norte) =====
  {
    numero: "0114",
    nome: "Centro / Jardim Encantado / Lar de Minas / Jardim Bela Vista",
    cidade: "vespasiano",
    tipo: "municipal",
    operadora: "Consórcio Vetor Norte",
    tarifa: "R$ 5,00",
    status: "em-operacao",
    horarios: {
      util: ["05:30", "06:30", "09:30", "12:25", "14:50", "17:25", "19:30"],
      sabado: ["06:30", "10:30", "14:30", "18:30"],
      domingo: ["06:30", "10:30", "14:30", "18:30"],
    },
    pontos: ["Centro de Vespasiano", "Jardim Encantado", "Lar de Minas", "Jardim Bela Vista"],
    fonte: {
      label: "Portal Impactto / Prefeitura",
      url: "https://portalimpactto.com.br/noticia/7602/",
    },
  },
  {
    numero: "0214",
    nome: "Centro / Imperial / Jardim da Glória / Vila Esportiva",
    cidade: "vespasiano",
    tipo: "municipal",
    operadora: "Consórcio Vetor Norte",
    tarifa: "R$ 5,00",
    status: "em-operacao",
    horarios: {
      util: ["06:00", "07:30", "09:10", "11:40", "14:00", "15:30", "17:00", "18:30"],
      sabado: ["06:00", "08:00", "10:30", "12:00", "15:00", "17:00"],
      domingo: ["08:00", "11:00", "14:00", "17:00"],
    },
    pontos: ["Centro de Vespasiano", "Imperial", "Jardim da Glória", "Vila Esportiva"],
    fonte: {
      label: "Portal Impactto / Prefeitura",
      url: "https://portalimpactto.com.br/noticia/7602/",
    },
  },
  {
    numero: "0614",
    nome: "Centro / Morro Alto / Nova Pampulha / Nova York",
    cidade: "vespasiano",
    tipo: "municipal",
    operadora: "Consórcio Vetor Norte",
    tarifa: "R$ 5,00",
    status: "em-operacao",
    horarios: {
      util: ["05:00", "05:50", "06:20", "07:00", "07:40", "09:10", "11:40", "13:20", "15:00", "18:20", "20:00", "21:40"],
      sabado: ["06:00", "07:00", "09:10", "11:20", "14:00", "17:00", "20:00", "21:40"],
      domingo: ["06:00", "07:00", "08:00", "09:00", "13:00", "18:30", "21:00"],
    },
    pontos: ["Centro de Vespasiano", "Morro Alto", "Nova Pampulha", "Nova York"],
    fonte: {
      label: "Portal Impactto / Prefeitura",
      url: "https://portalimpactto.com.br/noticia/7602/",
    },
  },
  {
    numero: "0714",
    nome: "Centro / Caieiras / Célvia / Distrito Industrial",
    cidade: "vespasiano",
    tipo: "municipal",
    operadora: "Consórcio Vetor Norte",
    tarifa: "R$ 5,00",
    status: "em-operacao",
    horarios: {
      util: ["06:00", "08:00", "10:30", "13:00", "14:30", "16:20", "18:30"],
      sabado: ["07:00", "09:30", "11:00", "14:30", "17:30"],
      domingo: ["09:00", "11:00", "14:30"],
    },
    pontos: ["Centro de Vespasiano", "Caieiras", "Célvia", "Distrito Industrial"],
    fonte: {
      label: "Portal Impactto / Prefeitura",
      url: "https://portalimpactto.com.br/noticia/7602/",
    },
  },
  {
    numero: "0914",
    nome: "Centro / Santa Clara / Gávea II / Serra Dourada",
    cidade: "vespasiano",
    tipo: "municipal",
    operadora: "Consórcio Vetor Norte",
    tarifa: "R$ 5,00",
    status: "em-operacao",
    horarios: {
      util: ["06:00", "07:00", "08:30", "10:10", "11:50", "13:20", "14:30", "16:20", "17:50", "19:30", "21:40"],
      sabado: ["05:00", "06:00", "08:00", "13:50", "15:45"],
      domingo: ["08:00", "10:00", "15:00", "18:00"],
    },
    pontos: ["Centro de Vespasiano", "Santa Clara", "Gávea II", "Serra Dourada"],
    fonte: {
      label: "Portal Impactto / Prefeitura",
      url: "https://portalimpactto.com.br/noticia/7602/",
    },
  },
  {
    numero: "1114",
    nome: "Centro / Vida Nova / Sueli",
    cidade: "vespasiano",
    tipo: "municipal",
    operadora: "Consórcio Vetor Norte",
    tarifa: "R$ 5,00",
    status: "em-operacao",
    horarios: {
      util: ["05:50", "06:00", "08:00", "11:00", "12:30", "14:30", "16:30", "18:00", "19:10"],
      sabado: ["05:00", "07:30", "11:00", "13:30", "16:30"],
      domingo: ["11:00", "16:30"],
    },
    pontos: ["Centro de Vespasiano", "Vida Nova", "Sueli"],
    fonte: {
      label: "Portal Impactto / Prefeitura",
      url: "https://portalimpactto.com.br/noticia/7602/",
    },
  },

  // ===== METROPOLITANAS DER-MG — VESPASIANO ↔ BH =====
  {
    numero: "500C",
    nome: "Terminal Morro Alto / Belo Horizonte (Semi-Direta)",
    cidade: "intermunicipal",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 8,95",
    status: "em-operacao",
    horarios: {
      util: ["04:55", "05:20", "05:40", "06:00", "06:20", "06:40", "07:10", "12:00", "17:15", "18:30", "19:40"],
      sabado: ["05:30", "07:00", "09:00", "12:30", "17:00", "21:00"],
      domingo: ["06:00", "09:00", "13:00", "18:00", "21:30"],
    },
    pontos: [
      "Terminal Morro Alto",
      "MG-424",
      "BR-381",
      "Av. Cristiano Machado",
      "Centro de BH",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5280",
    nome: "Vespasiano / Aeroporto Internacional de Confins",
    cidade: "intermunicipal",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 8,45",
    status: "em-operacao",
    horarios: {
      util: ["05:05", "06:30", "08:00", "10:00", "12:00", "14:00", "15:30", "17:15", "19:00"],
      sabado: ["05:30", "08:00", "12:00", "16:00", "19:00"],
      domingo: ["06:30", "10:00", "14:00", "18:00"],
    },
    pontos: [
      "Terminal Rodoviário de Vespasiano",
      "BR-040",
      "Aeroporto Internacional de Confins (Tancredo Neves)",
    ],
    fonte: {
      label: "DER-MG / onibus.online",
      url: "https://onibus.online/mg/vespasiano/",
    },
  },
  {
    numero: "5070",
    nome: "Célvia / Estação Vilarinho / Venda Nova",
    cidade: "intermunicipal",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 7,60",
    status: "em-operacao",
    horarios: {
      util: ["04:45", "05:30", "06:15", "07:00", "12:00", "17:30", "18:40", "20:00"],
      sabado: ["05:30", "08:00", "12:00", "17:00", "20:00"],
      domingo: ["06:00", "10:00", "14:00", "19:00"],
    },
    pontos: [
      "Bairro Célvia",
      "Centro de Vespasiano",
      "Estação Vilarinho (Metrô BH)",
      "Terminal Venda Nova",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },

  // ===== METROPOLITANAS DER-MG — SÃO JOSÉ DA LAPA ↔ BH =====
  {
    numero: "5130",
    nome: "Dom Pedro I / São José da Lapa / Terminal Vilarinho",
    cidade: "intermunicipal",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: {
      util: [
        "03:55", "05:00", "05:25", "05:50", "06:10", "06:30",
        "07:00", "07:30", "08:00", "08:45", "10:00", "12:00",
        "14:00", "16:00", "17:30", "18:30", "20:20",
      ],
      sabado: ["05:00", "07:00", "09:00", "12:00", "15:00", "18:00", "20:00"],
      domingo: ["05:30", "08:00", "12:00", "16:00", "19:00"],
    },
    pontos: [
      "Bairro Dom Pedro I (SJL)",
      "Centro de São José da Lapa",
      "MG-424",
      "Vespasiano",
      "Terminal Vilarinho / Estação Vilarinho (BH)",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/saojosedalapa/",
    },
  },
  {
    numero: "5140",
    nome: "São José da Lapa / Terminal Vilarinho",
    cidade: "intermunicipal",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: {
      util: ["04:20", "05:20", "06:15", "10:45", "13:10", "14:00", "15:00", "16:15", "16:50", "18:10", "19:45", "21:10"],
      sabado: ["05:30", "09:00", "13:00", "17:00", "20:00"],
      domingo: ["06:00", "10:00", "14:00", "18:00"],
    },
    pontos: [
      "Centro de São José da Lapa",
      "MG-424",
      "Terminal Vilarinho (BH)",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/saojosedalapa/",
    },
  },
  {
    numero: "5150",
    nome: "São José da Lapa / Inácia de Carvalho / Terminal Vilarinho",
    cidade: "intermunicipal",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: {
      util: ["05:00", "07:00", "09:05", "11:20", "16:35", "18:45"],
      sabado: ["06:00", "10:00", "15:00", "19:00"],
      domingo: ["07:00", "13:00", "18:00"],
    },
    pontos: [
      "Distrito de Inácia de Carvalho",
      "Centro de São José da Lapa",
      "Terminal Vilarinho (BH)",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/saojosedalapa/",
    },
  },
  {
    numero: "5141",
    nome: "São José da Lapa / Maria de Lourdes / Terminal Vilarinho",
    cidade: "intermunicipal",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Centro de São José da Lapa",
      "Bairro Maria de Lourdes",
      "MG-424",
      "Terminal Vilarinho (BH)",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/saojosedalapa/",
    },
  },
  {
    numero: "5160",
    nome: "Cachoeira / Lar de Minas / Terminal Vilarinho",
    cidade: "intermunicipal",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Distrito de Cachoeira (SJL)",
      "Lar de Minas",
      "MG-424",
      "Terminal Vilarinho (BH)",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/saojosedalapa/",
    },
  },
  {
    numero: "5162",
    nome: "Cachoeira / Lar de Minas / Terminal Vilarinho",
    cidade: "intermunicipal",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Distrito de Cachoeira (SJL)",
      "Lar de Minas",
      "MG-424",
      "Terminal Vilarinho (BH)",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/saojosedalapa/",
    },
  },
  {
    numero: "5296",
    nome: "Pedro Leopoldo / Trevo São José da Lapa",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 6,80",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Centro de Pedro Leopoldo",
      "MG-424",
      "Trevo de São José da Lapa",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/saojosedalapa/",
    },
  },
  {
    numero: "5304",
    nome: "Cachoeira / Trevo Lagoa Santa",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 6,80",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Distrito de Cachoeira (SJL)",
      "MG-010",
      "Trevo de Lagoa Santa",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/saojosedalapa/",
    },
  },

  // ===== INTERMUNICIPAIS ENTRE VESPASIANO ↔ SJL / VIZINHOS =====
  {
    numero: "5230",
    nome: "Vespasiano / São José da Lapa",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 8,20",
    status: "em-operacao",
    horarios: {
      util: ["06:30", "09:00", "10:30", "12:00", "14:00", "16:00", "18:00"],
      sabado: ["06:30", "09:00", "10:30", "12:00", "14:00", "17:45"],
      domingo: ["06:15", "09:15", "10:45", "18:30"],
    },
    pontos: [
      "Terminal Rodoviário de Vespasiano",
      "Av. Prefeito Sebastião Fernandes",
      "Trevo da MG-424",
      "Av. Antônio Mourão Guimarães",
      "Centro de São José da Lapa",
    ],
    fonte: {
      label: "horariodeonibus.net",
      url: "https://horariodeonibus.net/horario-de-onibus-5230-vespasiano-sao-jose-da-lapa/",
    },
  },
  {
    numero: "5303",
    nome: "São José da Lapa / Dom Pedro I / Lagoa Santa",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 6,80",
    status: "em-operacao",
    horarios: {
      util: ["05:45", "07:30", "10:00", "12:30", "15:00", "17:30", "19:00"],
      sabado: ["06:30", "10:00", "14:00", "18:00"],
      domingo: ["07:00", "13:00", "18:00"],
    },
    pontos: [
      "Centro de São José da Lapa",
      "Bairro Dom Pedro I",
      "MG-010",
      "Centro de Lagoa Santa",
    ],
    fonte: {
      label: "DER-MG / onibus.online",
      url: "https://onibus.online/mg/saojosedalapa/",
    },
  },
  {
    numero: "5313",
    nome: "Dom Pedro I / Cachoeira / Aeroporto de Confins",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 8,45",
    status: "em-operacao",
    horarios: {
      util: ["05:30", "08:00", "11:00", "14:00", "17:00", "19:30"],
      sabado: ["06:00", "10:00", "15:00", "19:00"],
      domingo: ["07:00", "12:00", "18:00"],
    },
    pontos: [
      "Bairro Dom Pedro I (SJL)",
      "Distrito de Cachoeira",
      "MG-010",
      "Aeroporto Internacional de Confins",
    ],
    fonte: {
      label: "DER-MG / onibus.online",
      url: "https://onibus.online/mg/saojosedalapa/",
    },
  },
  {
    numero: "5030",
    nome: "Nova Pampulha 3ª e 4ª Seções / Estação Vilarinho / Venda Nova",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Nova Pampulha 3ª e 4ª Seções",
      "Estação Vilarinho",
      "Venda Nova",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5045",
    nome: "Serra Dourada / Estação Vilarinho / Venda Nova",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Serra Dourada",
      "Estação Vilarinho",
      "Venda Nova",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5055",
    nome: "Morro Alto / Alameda da Serra via Anel Rodoviário",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Morro Alto",
      "Alameda da Serra via Anel Rodoviário",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5075",
    nome: "Conjunto Caieiras / Estação Vilarinho / Venda Nova",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Conjunto Caieiras",
      "Estação Vilarinho",
      "Venda Nova",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5308",
    nome: "Atendimento Dom Pedro I / Terminal Vilarinho",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Atendimento Dom Pedro I",
      "Terminal Vilarinho",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5600",
    nome: "São Cosme / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "São Cosme",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5605",
    nome: "Circular 695",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Circular 695",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5610",
    nome: "Morro Alto / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Morro Alto",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5620",
    nome: "Nova Pampulha / Bonsucesso / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Nova Pampulha",
      "Bonsucesso",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5630",
    nome: "Jardim Bela Vista / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Jardim Bela Vista",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5631",
    nome: "Santa Maria / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Santa Maria",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5635",
    nome: "Nova Pampulha 3ª e 4ª Seção / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Nova Pampulha 3ª e 4ª Seção",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5646",
    nome: "Vida Nova / Terminal Vilarinho",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Vida Nova",
      "Terminal Vilarinho",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5671",
    nome: "Circular Vila Esportiva / Jardim da Glória",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Circular Vila Esportiva",
      "Jardim da Glória",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5715",
    nome: "Gávea II / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Gávea II",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5716",
    nome: "Gávea II / Praça da MRV / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Gávea II",
      "Praça da MRV",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5800",
    nome: "Conjunto Caieiras A / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Conjunto Caieiras A",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5805",
    nome: "Conjunto Caieiras B / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Conjunto Caieiras B",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5815",
    nome: "Célvia B / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Célvia B",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5825",
    nome: "Jane (Imperial) / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Jane (Imperial)",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5835",
    nome: "Nova York / Terminal Morro Alto",
    cidade: "vespasiano",
    tipo: "metropolitana",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 9,65",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Nova York",
      "Terminal Morro Alto",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5877",
    nome: "Lagoa Santa / Vespasiano",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 6,80",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Lagoa Santa",
      "Vespasiano",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5905",
    nome: "Tavares / Vespasiano",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 6,80",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Tavares",
      "Vespasiano",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5910",
    nome: "Vespasiano / São José da Lapa",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 6,80",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Vespasiano",
      "São José da Lapa",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5915",
    nome: "Vespasiano / São José da Lapa / Pedro Leopoldo",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 6,80",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Vespasiano",
      "São José da Lapa",
      "Pedro Leopoldo",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5925",
    nome: "Vespasiano / Cachoeira",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 6,80",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Vespasiano",
      "Cachoeira",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5930",
    nome: "Nova Granja / Cachoeira",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 6,80",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Nova Granja",
      "Cachoeira",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
  {
    numero: "5935",
    nome: "Vespasiano / Maravilha / Inácia de Carvalho",
    cidade: "intermunicipal",
    tipo: "intermunicipal",
    operadora: "Consórcio Linha Verde",
    tarifa: "R$ 6,80",
    status: "em-operacao",
    horarios: { util: [], sabado: [], domingo: [] },
    pontos: [
      "Vespasiano",
      "Maravilha",
      "Inácia de Carvalho",
    ],
    fonte: {
      label: "DER-MG / Move Metropolitano",
      url: "https://movemetropolitano.com.br/vespasiano/",
    },
  },
];

const CIDADE_LABEL: Record<Cidade, string> = {
  vespasiano: "Vespasiano",
  "sao-jose-da-lapa": "São José da Lapa",
  intermunicipal: "Intermunicipal",
};

const TIPO_STYLES: Record<Tipo, string> = {
  municipal: "bg-amber-100 text-amber-800 border-amber-200",
  metropolitana: "bg-blue-100 text-blue-800 border-blue-200",
  intermunicipal: "bg-purple-100 text-purple-800 border-purple-200",
  "tarifa-zero": "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const TIPO_LABEL: Record<Tipo, string> = {
  municipal: "Municipal",
  metropolitana: "Metropolitana",
  intermunicipal: "Intermunicipal",
  "tarifa-zero": "Tarifa Zero",
};

const STATUS_STYLES: Record<Linha["status"], { label: string; className: string }> = {
  "em-operacao": {
    label: "Em operação",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  atrasada: {
    label: "Atrasada",
    className: "bg-orange-100 text-orange-900 border-orange-200",
  },
  encerrada: {
    label: "Encerrada",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const FAV_KEY = "transporte_favoritos";

function readFavs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function TransportePage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"todas" | Cidade>("todas");
  const [favs, setFavs] = useState<string[]>(() => readFavs());

  const toggleFav = (numero: string) => {
    setFavs((prev) => {
      const next = prev.includes(numero)
        ? prev.filter((n) => n !== numero)
        : [...prev, numero];
      if (typeof window !== "undefined")
        window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LINHAS.filter((l) => {
      if (tab !== "todas" && l.cidade !== tab) return false;
      if (!q) return true;
      return (
        l.numero.toLowerCase().includes(q) ||
        l.nome.toLowerCase().includes(q) ||
        l.operadora.toLowerCase().includes(q) ||
        l.pontos.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [query, tab]);

  const favoritas = LINHAS.filter((l) => favs.includes(l.numero));

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark text-primary-foreground">
        <div className="container mx-auto px-4 py-10 sm:py-14">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Bus className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold sm:text-4xl">
                Transporte Público
              </h1>
              <p className="mt-1 max-w-xl text-sm text-white/85 sm:text-base">
                Consulte linhas, horários, tarifas e pontos de embarque de
                Vespasiano, São José da Lapa e região.
              </p>
            </div>
          </div>

          {/* Busca */}
          <div className="mt-6">
            <label htmlFor="linha-search" className="sr-only">
              Buscar linha, destino ou operadora
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="linha-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Ex: "5130", "Confins", "Vilarinho", "Vetor Norte"'
                className="h-14 rounded-2xl border-0 bg-white pl-12 pr-4 text-base text-foreground shadow-lg placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent"
                inputMode="search"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Favoritos */}
        <section aria-labelledby="favs-title">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" aria-hidden />
            <h2 id="favs-title" className="text-lg font-bold">
              Minhas linhas favoritas
            </h2>
          </div>
          {favoritas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Toque na estrela de uma linha para fixá-la aqui e acessá-la
                rapidamente.
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {favoritas.map((l) => (
                <button
                  key={l.numero}
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(`linha-${l.numero}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                  className="shrink-0 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition hover:border-primary hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">
                      {l.numero}
                    </span>
                    <Star
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-1 max-w-[200px] truncate text-xs text-muted-foreground">
                    {l.nome}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Tabs cidade */}
        <section aria-labelledby="linhas-title">
          <div className="mb-3 flex items-center gap-2">
            <RouteIcon className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="linhas-title" className="text-lg font-bold">
              Linhas disponíveis
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({LINHAS.length} linhas)
              </span>
            </h2>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:grid-cols-4">
              <TabsTrigger value="todas" className="rounded-lg py-2 text-xs sm:text-sm">
                Todas
              </TabsTrigger>
              <TabsTrigger value="vespasiano" className="rounded-lg py-2 text-xs sm:text-sm">
                Vespasiano
              </TabsTrigger>
              <TabsTrigger value="sao-jose-da-lapa" className="rounded-lg py-2 text-xs sm:text-sm">
                S. J. da Lapa
              </TabsTrigger>
              <TabsTrigger value="intermunicipal" className="rounded-lg py-2 text-xs sm:text-sm">
                Intermunicipais
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              {filtradas.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    Nenhuma linha encontrada para "{query}".
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="single" collapsible className="space-y-3">
                  {filtradas.map((l) => {
                    const isFav = favs.includes(l.numero);
                    const status = STATUS_STYLES[l.status];
                    return (
                      <AccordionItem
                        key={l.numero}
                        value={l.numero}
                        id={`linha-${l.numero}`}
                        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                      >
                        <div className="flex items-center gap-2 pr-2">
                          <AccordionTrigger className="flex-1 px-4 py-4 hover:no-underline">
                            <div className="flex w-full items-start gap-3 text-left">
                              <div className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                <Bus className="h-4 w-4" aria-hidden />
                                <span className="text-[13px] font-black leading-tight">
                                  {l.numero}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="line-clamp-2 text-sm font-bold text-foreground sm:text-base">
                                  {l.nome}
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={cn("border text-[10px]", status.className)}
                                  >
                                    {status.label}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "border text-[10px]",
                                      TIPO_STYLES[l.tipo],
                                    )}
                                  >
                                    {TIPO_LABEL[l.tipo]}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="border text-[10px] text-muted-foreground"
                                  >
                                    {CIDADE_LABEL[l.cidade]}
                                  </Badge>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                                    <Ticket className="h-3 w-3" aria-hidden />
                                    {l.tarifa}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFav(l.numero);
                            }}
                            aria-label={
                              isFav
                                ? `Remover linha ${l.numero} dos favoritos`
                                : `Favoritar linha ${l.numero}`
                            }
                            aria-pressed={isFav}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-muted"
                          >
                            <Star
                              className={cn(
                                "h-5 w-5 transition",
                                isFav
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground",
                              )}
                            />
                          </button>
                        </div>

                        <AccordionContent className="border-t border-border bg-muted/30 px-4 pb-4 pt-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Clock className="h-4 w-4 text-primary" aria-hidden />
                                Próximos horários
                              </div>
                              <HorariosBloco titulo="Dia útil" horarios={l.horarios.util} />
                              <HorariosBloco titulo="Sábado" horarios={l.horarios.sabado} />
                              <HorariosBloco titulo="Domingo/Feriado" horarios={l.horarios.domingo} />
                            </div>

                            <div>
                              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                                <MapPin className="h-4 w-4 text-primary" aria-hidden />
                                Itinerário / pontos de embarque
                              </div>
                              <ol className="space-y-1.5">
                                {l.pontos.map((p, i) => (
                                  <li
                                    key={p}
                                    className="flex items-start gap-2 text-sm text-foreground/90"
                                  >
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                      {i + 1}
                                    </span>
                                    <span>{p}</span>
                                  </li>
                                ))}
                              </ol>

                              <div className="mt-4 space-y-1.5 rounded-lg bg-background p-3 text-xs">
                                <div className="flex items-center gap-2 text-foreground">
                                  <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                                  <span className="font-semibold">Operadora:</span>
                                  <span className="text-muted-foreground">{l.operadora}</span>
                                </div>
                                <div className="flex items-center gap-2 text-foreground">
                                  <Ticket className="h-3.5 w-3.5 text-primary" aria-hidden />
                                  <span className="font-semibold">Tarifa:</span>
                                  <span className="text-muted-foreground">{l.tarifa}</span>
                                </div>
                                {l.fonte ? (
                                  <a
                                    href={l.fonte.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                    Fonte: {l.fonte.label}
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleFav(l.numero)}
                              className="gap-1.5"
                            >
                              <Star
                                className={cn(
                                  "h-4 w-4",
                                  isFav && "fill-amber-400 text-amber-400",
                                )}
                              />
                              {isFav ? "Favoritado" : "Favoritar linha"}
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Fontes / disclaimer */}
        <Card className="border-dashed">
          <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Sobre estes dados</p>
            <p>
              Informações coletadas em fontes oficiais e confiáveis: Prefeitura de
              São José da Lapa (Tarifa Zero), Prefeitura de Vespasiano / Consórcio
              Vetor Norte, DER-MG (RIT 5) via Move Metropolitano e Ônibus Online.
              Horários podem sofrer alterações — confirme sempre com a operadora
              antes de sua viagem. Consultas em tempo real das linhas
              metropolitanas em{" "}
              <a
                className="text-primary hover:underline"
                href="http://www.consultas.der.mg.gov.br/grgx/sgtm/consulta_linha.xhtml"
                target="_blank"
                rel="noopener noreferrer"
              >
                consultas.der.mg.gov.br
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HorariosBloco({ titulo, horarios }: { titulo: string; horarios: string[] }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </div>
      {horarios.length === 0 ? (
        <div className="mt-1 text-xs italic text-muted-foreground">Não circula</div>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {horarios.map((h) => (
            <span
              key={h}
              className="rounded-md bg-background px-2 py-1 text-xs font-medium text-foreground shadow-sm ring-1 ring-border"
            >
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
