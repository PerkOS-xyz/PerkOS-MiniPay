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
  eyebrow: "Meet Anna, your everyday business helper",
  hero: {
    headline: "Say it better. Get more done.",
    subhead:
      "Fix a message, reply to a customer, or create a social post in minutes. Just paste what you have. Anna helps you finish it.",
    ctaPrimary: "Get started free",
    ctaSecondary: "See what it can do",
    enterApp: "Open the app",
    browserNote: "On the web, continue with email or a wallet. In MiniPay, your wallet connects automatically.",
    trust: ["Free to start", "No AI skills needed", "English, Spanish, Portuguese"],
  },
  problem: {
    title: "Sound familiar?",
    items: [
      "You rewrite the same customer message again and again.",
      "You know what to say, but it is hard to make it sound professional.",
      "A social post takes longer than the work it promotes.",
      "Notes and long messages pile up before you can organize them.",
    ],
  },
  how: {
    title: "How it works",
    steps: [
      { title: "Open it in MiniPay", desc: "No signup, no seed phrase. Your wallet is already there." },
      { title: "Tell Anna what you need", desc: "Speak or type naturally. Nothing new to learn." },
      { title: "Paste what you have", desc: "It can be a rough message, an idea, or a long note." },
      { title: "Copy the finished result", desc: "Anna gives you clear text that is ready to send or publish." },
    ],
    key: "No special prompts. Choose an action and use your own words.",
  },
  templates: {
    title: "Help for everyday work",
    subtitle: "Choose a simple action or a profile for your kind of business.",
    more: "See 2 more",
    items: [
      { emoji: "✍️", title: "Fix My Text", benefit: "Turn a rough message into clear, natural writing while keeping your meaning." },
      { emoji: "💬", title: "Customer Reply", benefit: "Prepare a friendly, professional response you can copy into WhatsApp or email." },
      { emoji: "📣", title: "Social Post", benefit: "Create a short promotion from one simple idea about your product or service." },
      { emoji: "🗂️", title: "Secretary Help", benefit: "Summarize long notes, organize tasks, and prepare everyday messages." },
      { emoji: "🛒", title: "Shop Helper", benefit: "Write product descriptions, opening updates, and customer answers for your store." },
      { emoji: "🍽️", title: "Restaurant Helper", benefit: "Prepare menu descriptions, daily specials, and courteous guest replies." },
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
    title: "Start with the message in front of you.",
    sub: "Paste it. Choose what you need. Copy the result.",
    cta: "Get started free",
  },
  minipay: {
    title: "On your phone with MiniPay?",
    body: "Open the MiniPay app, go to Mini Apps, and find Anna there for the native experience.",
  },
  footer: { built: "Built on Celo", rights: "Anna by PerkOS" },
};

const es: LandingCopy = {
  eyebrow: "Conoce a Anna, tu ayuda para el trabajo diario",
  hero: {
    headline: "Exprésate mejor. Avanza más.",
    subhead:
      "Corrige un mensaje, responde a un cliente o crea una publicación en minutos. Solo pega lo que tienes. Anna te ayuda a terminarlo.",
    ctaPrimary: "Empieza gratis",
    ctaSecondary: "Mira lo que hace",
    enterApp: "Abrir la app",
    browserNote: "En la web, continúa con email o wallet. Dentro de MiniPay, tu wallet se conecta automáticamente.",
    trust: ["Gratis para empezar", "No necesitas saber de IA", "Español, inglés y portugués"],
  },
  problem: {
    title: "¿Te suena?",
    items: [
      "Reescribes el mismo mensaje para clientes una y otra vez.",
      "Sabes qué decir, pero cuesta que suene profesional.",
      "Una publicación tarda más que el trabajo que quieres promocionar.",
      "Las notas y los mensajes largos se acumulan antes de poder organizarlos.",
    ],
  },
  how: {
    title: "Cómo funciona",
    steps: [
      { title: "Ábrelo en MiniPay", desc: "Sin registro, sin frase semilla. Tu wallet ya está ahí." },
      { title: "Cuéntale a Anna qué necesitas", desc: "Habla o escribe con naturalidad. Nada nuevo que aprender." },
      { title: "Pega lo que tienes", desc: "Puede ser un mensaje sin terminar, una idea o una nota larga." },
      { title: "Copia el resultado terminado", desc: "Anna te entrega un texto claro, listo para enviar o publicar." },
    ],
    key: "Sin instrucciones complicadas. Elige una acción y usa tus propias palabras.",
  },
  templates: {
    title: "Ayuda para el trabajo diario",
    subtitle: "Elige una acción simple o un perfil para tu tipo de negocio.",
    more: "Ver 2 más",
    items: [
      { emoji: "✍️", title: "Corregir mi texto", benefit: "Convierte un mensaje rápido en un texto claro y natural sin cambiar lo que quieres decir." },
      { emoji: "💬", title: "Responder a un cliente", benefit: "Prepara una respuesta amable y profesional para copiar en WhatsApp o email." },
      { emoji: "📣", title: "Publicación para redes", benefit: "Crea una promoción corta a partir de una idea simple sobre tu producto o servicio." },
      { emoji: "🗂️", title: "Ayuda de secretaría", benefit: "Resume notas largas, organiza tareas y prepara mensajes cotidianos." },
      { emoji: "🛒", title: "Ayuda para mi tienda", benefit: "Escribe descripciones, horarios y respuestas para los clientes de tu comercio." },
      { emoji: "🍽️", title: "Ayuda para mi restaurante", benefit: "Prepara descripciones del menú, especiales del día y respuestas amables." },
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
    title: "Empieza con el mensaje que tienes delante.",
    sub: "Pégalo. Elige lo que necesitas. Copia el resultado.",
    cta: "Empieza gratis",
  },
  minipay: {
    title: "¿En tu teléfono con MiniPay?",
    body: "Abre la app de MiniPay, ve a Mini Apps y busca Anna para la experiencia nativa.",
  },
  footer: { built: "Construido en Celo", rights: "Anna by PerkOS" },
};

const pt: LandingCopy = {
  eyebrow: "Conheça Anna, sua ajuda para o trabalho diário",
  hero: {
    headline: "Comunique-se melhor. Faça mais.",
    subhead:
      "Corrija uma mensagem, responda a um cliente ou crie uma publicação em minutos. Basta colar o que você tem. Anna ajuda a concluir.",
    ctaPrimary: "Comece grátis",
    ctaSecondary: "Veja o que ela pode fazer",
    enterApp: "Abrir o app",
    browserNote: "Na web, continue com e-mail ou carteira. No MiniPay, sua carteira se conecta automaticamente.",
    trust: ["Grátis para começar", "Não precisa saber usar IA", "Português, espanhol e inglês"],
  },
  problem: {
    title: "Parece familiar?",
    items: [
      "Você reescreve a mesma mensagem para clientes várias vezes.",
      "Você sabe o que dizer, mas é difícil fazer parecer profissional.",
      "Uma publicação demora mais que o trabalho que você quer divulgar.",
      "Notas e mensagens longas se acumulam antes que você possa organizá-las.",
    ],
  },
  how: {
    title: "Como funciona",
    steps: [
      { title: "Abra no MiniPay", desc: "Sem cadastro e sem frase-semente. Sua carteira já está lá." },
      { title: "Conte para Anna o que precisa", desc: "Fale ou escreva naturalmente. Nada novo para aprender." },
      { title: "Cole o que você tem", desc: "Pode ser uma mensagem incompleta, uma ideia ou uma nota longa." },
      { title: "Copie o resultado pronto", desc: "Anna entrega um texto claro, pronto para enviar ou publicar." },
    ],
    key: "Sem instruções complicadas. Escolha uma ação e use suas próprias palavras.",
  },
  templates: {
    title: "Ajuda para o trabalho diário",
    subtitle: "Escolha uma ação simples ou um perfil para o seu tipo de negócio.",
    more: "Ver mais 2",
    items: [
      { emoji: "✍️", title: "Corrigir meu texto", benefit: "Transforme uma mensagem rápida em um texto claro e natural sem mudar o sentido." },
      { emoji: "💬", title: "Responder a um cliente", benefit: "Prepare uma resposta gentil e profissional para copiar no WhatsApp ou e-mail." },
      { emoji: "📣", title: "Publicação para redes", benefit: "Crie uma promoção curta a partir de uma ideia sobre seu produto ou serviço." },
      { emoji: "🗂️", title: "Ajuda de secretaria", benefit: "Resuma notas longas, organize tarefas e prepare mensagens do dia a dia." },
      { emoji: "🛒", title: "Ajuda para minha loja", benefit: "Escreva descrições, horários e respostas para os clientes da sua loja." },
      { emoji: "🍽️", title: "Ajuda para meu restaurante", benefit: "Prepare descrições do cardápio, especiais do dia e respostas atenciosas." },
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
    title: "Comece com a mensagem que está na sua frente.",
    sub: "Cole. Escolha o que precisa. Copie o resultado.",
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
