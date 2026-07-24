import type { Locale } from "./landingMessages";

export type CategoryKey = "writing" | "customers" | "marketing" | "office" | "business";

export const CATEGORY_ORDER: CategoryKey[] = [
  "writing",
  "customers",
  "marketing",
  "office",
  "business",
];

export const CATEGORY_LABELS: Record<CategoryKey, Record<Locale, string>> = {
  writing: { en: "Writing", es: "Textos", pt: "Textos" },
  customers: { en: "Customer care", es: "Atención al cliente", pt: "Atendimento ao cliente" },
  marketing: { en: "Posts & promotions", es: "Publicaciones y promociones", pt: "Publicações e promoções" },
  office: { en: "Daily office work", es: "Trabajo de oficina", pt: "Trabalho de escritório" },
  business: { en: "For your business", es: "Para tu negocio", pt: "Para o seu negócio" },
};

type LocalizedTemplate = Record<Locale, { name: string; tagline: string }>;

export const TEMPLATE_COPY: Record<string, LocalizedTemplate> = {
  "everyday-writing": {
    en: { name: "Writing & Messages", tagline: "Fix, shorten, translate, or improve any text." },
    es: { name: "Textos y mensajes", tagline: "Corrige, acorta, traduce o mejora cualquier texto." },
    pt: { name: "Textos e mensagens", tagline: "Corrija, encurte, traduza ou melhore qualquer texto." },
  },
  "customer-messages": {
    en: { name: "Customer Care", tagline: "Reply clearly and kindly without promising too much." },
    es: { name: "Atención al cliente", tagline: "Responde con claridad y amabilidad, sin prometer de más." },
    pt: { name: "Atendimento ao cliente", tagline: "Responda com clareza e simpatia, sem prometer demais." },
  },
  "social-posts": {
    en: { name: "Posts & Promotions", tagline: "Turn an offer or idea into a post and a short Status." },
    es: { name: "Redes y promociones", tagline: "Convierte una oferta en un post y un Status corto." },
    pt: { name: "Posts e promoções", tagline: "Transforme uma oferta em um post e um Status curto." },
  },
  "secretary-daily": {
    en: { name: "Daily Secretary", tagline: "Prepare emails, notices, summaries, invitations, and next steps." },
    es: { name: "Secretaría diaria", tagline: "Prepara correos, avisos, resúmenes, invitaciones y pendientes." },
    pt: { name: "Secretária do dia a dia", tagline: "Prepare e-mails, avisos, resumos, convites e pendências." },
  },
  "shop-helper": {
    en: { name: "Shop & Minimarket", tagline: "Answer questions about prices, hours, stock, and offers." },
    es: { name: "Tienda y minimarket", tagline: "Responde sobre precios, horarios, productos y ofertas." },
    pt: { name: "Loja e minimercado", tagline: "Responda sobre preços, horários, produtos e ofertas." },
  },
  "restaurant-helper": {
    en: { name: "Restaurant & Food", tagline: "Prepare menus, confirm orders, and explain delivery times." },
    es: { name: "Restaurante y comida", tagline: "Prepara menús, confirma pedidos y explica tiempos de entrega." },
    pt: { name: "Restaurante e comida", tagline: "Prepare cardápios, confirme pedidos e informe prazos de entrega." },
  },
  "service-business": {
    en: { name: "Services & Freelance", tagline: "Write quotes, scope notes, updates, and delivery messages." },
    es: { name: "Servicios y freelance", tagline: "Redacta cotizaciones, alcance, avances y mensajes de entrega." },
    pt: { name: "Serviços e freelance", tagline: "Escreva orçamentos, escopo, atualizações e mensagens de entrega." },
  },
  "social-seller": {
    en: { name: "Social Seller", tagline: "Describe products and follow up with interested buyers." },
    es: { name: "Vendedor en redes", tagline: "Describe productos y responde a compradores interesados." },
    pt: { name: "Vendedor nas redes", tagline: "Descreva produtos e responda a compradores interessados." },
  },
};

export const TEMPLATE_GLYPH: Record<string, string> = {
  "everyday-writing": "✓",
  "customer-messages": "↩",
  "social-posts": "✦",
  "secretary-daily": "≡",
  "shop-helper": "▦",
  "restaurant-helper": "◉",
  "service-business": "◇",
  "social-seller": "◆",
};

export function glyphFor(templateId: string): string {
  return TEMPLATE_GLYPH[templateId] ?? "✦";
}

export function isEverydayTemplate(templateId: string): boolean {
  return Object.prototype.hasOwnProperty.call(TEMPLATE_COPY, templateId);
}

export function localizedTemplate(
  templateId: string,
  locale: Locale,
  fallback: { name: string; tagline?: string },
): { name: string; tagline: string } {
  return TEMPLATE_COPY[templateId]?.[locale] ?? {
    name: fallback.name,
    tagline: fallback.tagline ?? "",
  };
}
