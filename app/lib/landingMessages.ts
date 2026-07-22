/**
 * Landing-page copy in English, Spanish, and Brazilian Portuguese.
 * Content is the product-strategist-reconciled spec: helper + verbs framing
 * (not "AI team"), non-custodial trust, credits pricing (not hourly), real
 * template names. No em-dashes anywhere (copy rule). Neutral LatAm Spanish.
 *
 * Kept as a plain typed object (no i18n library) — a few KB of copy shipped in
 * the bundle is cheaper than a fetch + loading state on toggle, and avoids
 * restructuring the app's routes for a compact multilingual page.
 */

export type Locale = "en" | "es" | "pt";
export const LOCALES: Locale[] = ["en", "es", "pt"];
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
};

export type LandingCopy = {
  eyebrow: string;
  hero: {
    headline: string;
    subhead: string;
    ctaPrimary: string;
    ctaSecondary: string;
    enterApp: string;
    browserNote: string;
    trust: string[];
  };
  problem: { title: string; items: string[] };
  how: {
    title: string;
    steps: { title: string; desc: string }[];
    key: string;
  };
  templates: {
    title: string;
    subtitle: string;
    more: string;
    items: { emoji: string; title: string; benefit: string }[];
  };
  pricing: {
    title: string;
    body: string;
    highlights: { value: string; label: string }[];
    smallprint: string;
  };
  trust: { title: string; items: string[] };
  social: string;
  finalCta: { title: string; sub: string; cta: string };
  minipay: { title: string; body: string };
  footer: { built: string; rights: string };
};

const en: LandingCopy = {
  eyebrow: "Meet Anna, your business companion",
  hero: {
    headline: "Your business, clearer every day",
    subhead:
      "Anna logs sales, prepares invoices, and follows up on late payments with you. You approve every step, and your money never leaves your wallet.",
    ctaPrimary: "Get started free",
    ctaSecondary: "See what it can do",
    enterApp: "Open the app",
    browserNote: "On the web, continue with email or a wallet. In MiniPay, your wallet connects automatically.",
    trust: ["Free to start", "No seed phrase", "Money stays in your wallet"],
  },
  problem: {
    title: "Sound familiar?",
    items: [
      "You keep chasing the same customers for money.",
      "You lose track of who bought on credit.",
      "You never really know your weekly profit.",
      "The same admin eats your evening, every day.",
    ],
  },
  how: {
    title: "How it works",
    steps: [
      { title: "Open it in MiniPay", desc: "No signup, no seed phrase. Your wallet is already there." },
      { title: "Tell Anna what you need", desc: "Speak or type naturally. Nothing new to learn." },
      { title: "See the plan and cost", desc: "Anna shows the steps and a small credit estimate. You approve it." },
      { title: "Get something useful", desc: "Anna hands you what's ready. You make any payment yourself in MiniPay." },
    ],
    key: "It prepares the work. You stay in control of the money.",
  },
  templates: {
    title: "What it does for you",
    subtitle: "Practical skills you can add to Anna in one tap.",
    more: "See 2 more",
    items: [
      { emoji: "🧾", title: "Merchant Daily", benefit: "Log every sale in seconds and get your profit added up at the end of each week." },
      { emoji: "🛒", title: "Market Trader", benefit: "Record sales fast and always remember who is buying on credit." },
      { emoji: "📄", title: "Freelance Invoices", benefit: "Draft clean invoices and politely chase the ones that go unpaid." },
      { emoji: "🤝", title: "Savings Group (Ajo / ROSCA)", benefit: "Keep your group's rotation and ledger straight, so everyone knows who has paid." },
      { emoji: "🌍", title: "Cross-Border Trade", benefit: "Track what you owe suppliers and check today's rate at a glance." },
      { emoji: "🏠", title: "Rent Tracker", benefit: "Get a reminder before rent is due, so you never miss a date." },
    ],
  },
  pricing: {
    title: "Start free. Pay only for the work.",
    body: "Approve each job after seeing its price. Monthly plans are optional.",
    highlights: [
      { value: "3", label: "free jobs every month" },
      { value: "≈ $0.02", label: "for a quick job" },
      { value: "$0.25", label: "for 10 credits" },
    ],
    smallprint: "Simple jobs cost 1 credit, bigger ones 2 to 3. You always see the estimate before it runs.",
  },
  trust: {
    title: "Trust and control",
    items: [
      "Your money stays in your wallet",
      "No seed phrase",
      "Works in stablecoins (USDT, cUSD, USDC)",
      "No CELO needed",
      "Pay only for what you use",
      "Built on Celo",
    ],
  },
  social: "Built for the 14M+ people already using MiniPay.",
  finalCta: {
    title: "Your business, minus the paperwork.",
    sub: "Free to start. No seed phrase.",
    cta: "Get started free",
  },
  minipay: {
    title: "On your phone with MiniPay?",
    body: "Open the MiniPay app, go to Mini Apps, and find Anna there for the native experience.",
  },
  footer: { built: "Built on Celo", rights: "Anna by PerkOS" },
};

const es: LandingCopy = {
  eyebrow: "Conoce a Anna, tu compañera de negocio",
  hero: {
    headline: "Tu negocio, más claro cada día",
    subhead:
      "Anna registra ventas, prepara facturas y te ayuda a cobrar lo pendiente. Tú apruebas cada paso, y tu dinero nunca sale de tu wallet.",
    ctaPrimary: "Empieza gratis",
    ctaSecondary: "Mira lo que hace",
    enterApp: "Abrir la app",
    browserNote: "En la web, continúa con email o wallet. Dentro de MiniPay, tu wallet se conecta automáticamente.",
    trust: ["Gratis para empezar", "Sin frase semilla", "Tu dinero se queda en tu wallet"],
  },
  problem: {
    title: "¿Te suena?",
    items: [
      "Persigues a los mismos clientes para que te paguen.",
      "Pierdes la cuenta de quién compró fiado.",
      "Nunca sabes bien cuánto ganaste en la semana.",
      "El mismo papeleo se come tu noche, todos los días.",
    ],
  },
  how: {
    title: "Cómo funciona",
    steps: [
      { title: "Ábrelo en MiniPay", desc: "Sin registro, sin frase semilla. Tu wallet ya está ahí." },
      { title: "Cuéntale a Anna qué necesitas", desc: "Habla o escribe con naturalidad. Nada nuevo que aprender." },
      { title: "Revisa el plan y el costo", desc: "Anna te muestra los pasos y un pequeño estimado en créditos. Tú lo apruebas." },
      { title: "Recibe algo útil", desc: "Anna te entrega lo que está listo. Tú haces cualquier pago desde MiniPay." },
    ],
    key: "Prepara el trabajo. Tú tienes el control del dinero.",
  },
  templates: {
    title: "Lo que hace por ti",
    subtitle: "Capacidades prácticas que agregas a Anna con un toque.",
    more: "Ver 2 más",
    items: [
      { emoji: "🧾", title: "Comercio Diario", benefit: "Registra cada venta en segundos y ve tu ganancia sumada al final de la semana." },
      { emoji: "🛒", title: "Vendedor de Mercado", benefit: "Anota ventas rápido y recuerda siempre quién compra fiado." },
      { emoji: "📄", title: "Facturas Freelance", benefit: "Prepara facturas claras y cobra con amabilidad las que quedan sin pagar." },
      { emoji: "🤝", title: "Grupo de Ahorro (Ajo / Tanda)", benefit: "Lleva el orden y el registro del grupo, para que todos sepan quién ya pagó." },
      { emoji: "🌍", title: "Comercio Transfronterizo", benefit: "Controla lo que debes a proveedores y revisa el tipo de cambio de hoy de un vistazo." },
      { emoji: "🏠", title: "Control de Renta", benefit: "Recibe un recordatorio antes del vencimiento, para no perder ninguna fecha." },
    ],
  },
  pricing: {
    title: "Empieza gratis. Paga solo por el trabajo.",
    body: "Aprueba cada trabajo después de ver su precio. Los planes mensuales son opcionales.",
    highlights: [
      { value: "3", label: "trabajos gratis cada mes" },
      { value: "≈ $0.02", label: "por un trabajo rápido" },
      { value: "$0.25", label: "por 10 créditos" },
    ],
    smallprint: "Las tareas simples cuestan 1 crédito, las más grandes de 2 a 3. Siempre ves el estimado antes de que corra.",
  },
  trust: {
    title: "Confianza y control",
    items: [
      "Tu dinero se queda en tu wallet",
      "Sin frase semilla",
      "Funciona con stablecoins (USDT, cUSD, USDC)",
      "No necesitas CELO",
      "Paga solo por lo que usas",
      "Construido en Celo",
    ],
  },
  social: "Hecho para los más de 14 millones que ya usan MiniPay.",
  finalCta: {
    title: "Tu negocio, sin el papeleo.",
    sub: "Gratis para empezar. Sin frase semilla.",
    cta: "Empieza gratis",
  },
  minipay: {
    title: "¿En tu teléfono con MiniPay?",
    body: "Abre la app de MiniPay, ve a Mini Apps y busca Anna para la experiencia nativa.",
  },
  footer: { built: "Construido en Celo", rights: "Anna by PerkOS" },
};

const pt: LandingCopy = {
  eyebrow: "Conheça Anna, sua parceira de negócios",
  hero: {
    headline: "Seu negócio, mais claro todos os dias",
    subhead:
      "Anna registra vendas, prepara faturas e ajuda você a cobrar pagamentos atrasados. Você aprova cada etapa, e seu dinheiro nunca sai da sua carteira.",
    ctaPrimary: "Comece grátis",
    ctaSecondary: "Veja o que ela pode fazer",
    enterApp: "Abrir o app",
    browserNote: "Na web, continue com e-mail ou carteira. No MiniPay, sua carteira se conecta automaticamente.",
    trust: ["Grátis para começar", "Sem frase-semente", "Seu dinheiro fica na sua carteira"],
  },
  problem: {
    title: "Parece familiar?",
    items: [
      "Você vive cobrando os mesmos clientes.",
      "Você perde o controle de quem comprou fiado.",
      "Você nunca sabe ao certo quanto lucrou na semana.",
      "A mesma papelada ocupa sua noite todos os dias.",
    ],
  },
  how: {
    title: "Como funciona",
    steps: [
      { title: "Abra no MiniPay", desc: "Sem cadastro e sem frase-semente. Sua carteira já está lá." },
      { title: "Conte para Anna o que precisa", desc: "Fale ou escreva naturalmente. Nada novo para aprender." },
      { title: "Veja o plano e o custo", desc: "Anna mostra as etapas e uma pequena estimativa em créditos. Você aprova." },
      { title: "Receba algo útil", desc: "Anna entrega o que estiver pronto. Você faz qualquer pagamento no MiniPay." },
    ],
    key: "Ela prepara o trabalho. Você mantém o controle do dinheiro.",
  },
  templates: {
    title: "O que ela faz por você",
    subtitle: "Recursos práticos que você adiciona à Anna com um toque.",
    more: "Ver mais 2",
    items: [
      { emoji: "🧾", title: "Comércio Diário", benefit: "Registre cada venda em segundos e veja seu lucro somado no fim da semana." },
      { emoji: "🛒", title: "Vendedor de Mercado", benefit: "Anote vendas rapidamente e lembre sempre quem está comprando fiado." },
      { emoji: "📄", title: "Faturas Freelance", benefit: "Prepare faturas claras e cobre com educação as que ainda não foram pagas." },
      { emoji: "🤝", title: "Grupo de Poupança", benefit: "Mantenha a ordem e os registros do grupo para todos saberem quem já pagou." },
      { emoji: "🌍", title: "Comércio Internacional", benefit: "Acompanhe o que deve aos fornecedores e consulte a cotação do dia rapidamente." },
      { emoji: "🏠", title: "Controle de Aluguel", benefit: "Receba um lembrete antes do vencimento para nunca perder uma data." },
    ],
  },
  pricing: {
    title: "Comece grátis. Pague apenas pelo trabalho.",
    body: "Aprove cada trabalho depois de ver o preço. Os planos mensais são opcionais.",
    highlights: [
      { value: "3", label: "trabalhos grátis por mês" },
      { value: "≈ $0.02", label: "por um trabalho rápido" },
      { value: "$0.25", label: "por 10 créditos" },
    ],
    smallprint: "Trabalhos simples custam 1 crédito; os maiores, de 2 a 3. Você sempre vê a estimativa antes de começar.",
  },
  trust: {
    title: "Confiança e controle",
    items: [
      "Seu dinheiro fica na sua carteira",
      "Sem frase-semente",
      "Funciona com stablecoins (USDT, cUSD, USDC)",
      "Você não precisa de CELO",
      "Pague apenas pelo que usar",
      "Construído na Celo",
    ],
  },
  social: "Feito para mais de 14 milhões de pessoas que já usam o MiniPay.",
  finalCta: {
    title: "Seu negócio, sem a papelada.",
    sub: "Grátis para começar. Sem frase-semente.",
    cta: "Comece grátis",
  },
  minipay: {
    title: "Está no celular com MiniPay?",
    body: "Abra o MiniPay, acesse Mini Apps e procure Anna para usar a experiência nativa.",
  },
  footer: { built: "Construído na Celo", rights: "Anna by PerkOS" },
};

export const MESSAGES: Record<Locale, LandingCopy> = { en, es, pt };

/** Detect the initial locale: ?lang → localStorage → navigator → en. */
export function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "en" || q === "es" || q === "pt") return q;
    const saved = window.localStorage.getItem("perkos_lang");
    if (saved === "en" || saved === "es" || saved === "pt") return saved;
    const nav = (navigator.language || "en").toLowerCase();
    if (nav.startsWith("es")) return "es";
    if (nav.startsWith("pt")) return "pt";
  } catch {
    /* ignore */
  }
  return "en";
}
