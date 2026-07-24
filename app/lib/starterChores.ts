import type { Locale } from "./landingMessages";

export type QuickActionId =
  | "fix-text"
  | "customer-reply"
  | "social-post"
  | "change-tone"
  | "translate"
  | "summarize";

export type StarterAction = {
  id: QuickActionId;
  glyph: string;
  copy: Record<
    Locale,
    {
      label: string;
      sub: string;
      placeholder: string;
      instruction: string;
    }
  >;
};

// These are jobs people already understand. They run directly: no project,
// team selection, or planning screen is required for a one-message result.
export const STARTER_ACTIONS: StarterAction[] = [
  {
    id: "fix-text",
    glyph: "✓",
    copy: {
      en: {
        label: "Fix this text",
        sub: "Correct it without changing your meaning",
        placeholder: "Paste the text you want to correct…",
        instruction: "Correct spelling, grammar, punctuation, and clarity without changing any facts or meaning.",
      },
      es: {
        label: "Corregir este texto",
        sub: "Déjalo claro sin cambiar lo que quieres decir",
        placeholder: "Pega el texto que quieres corregir…",
        instruction: "Corrige ortografía, gramática, puntuación y claridad sin cambiar datos ni significado.",
      },
      pt: {
        label: "Corrigir este texto",
        sub: "Deixe claro sem mudar o que você quer dizer",
        placeholder: "Cole o texto que deseja corrigir…",
        instruction: "Corrija ortografia, gramática, pontuação e clareza sem alterar fatos ou significado.",
      },
    },
  },
  {
    id: "customer-reply",
    glyph: "↩",
    copy: {
      en: {
        label: "Reply to a customer",
        sub: "Get a short, friendly response",
        placeholder: "Paste the customer's message and say what you want to answer…",
        instruction: "Draft a short, warm customer reply. Do not invent prices, availability, discounts, refunds, or policies.",
      },
      es: {
        label: "Responder a un cliente",
        sub: "Prepara una respuesta breve y amable",
        placeholder: "Pega el mensaje del cliente y dime qué quieres responder…",
        instruction: "Redacta una respuesta breve y cordial. No inventes precios, disponibilidad, descuentos, devoluciones ni políticas.",
      },
      pt: {
        label: "Responder a um cliente",
        sub: "Prepare uma resposta curta e simpática",
        placeholder: "Cole a mensagem do cliente e diga o que deseja responder…",
        instruction: "Escreva uma resposta curta e cordial. Não invente preços, disponibilidade, descontos, reembolsos ou políticas.",
      },
    },
  },
  {
    id: "social-post",
    glyph: "✦",
    copy: {
      en: {
        label: "Create a post",
        sub: "A post plus a short WhatsApp Status",
        placeholder: "What are you selling or announcing? Include price and dates if needed…",
        instruction: "Create one natural social post and one shorter WhatsApp Status. Use only the facts provided.",
      },
      es: {
        label: "Crear una publicación",
        sub: "Un post y una versión corta para WhatsApp Status",
        placeholder: "¿Qué vendes o anuncias? Incluye precio y fechas si aplica…",
        instruction: "Crea una publicación natural y una versión corta para WhatsApp Status. Usa solamente los datos proporcionados.",
      },
      pt: {
        label: "Criar uma publicação",
        sub: "Um post e uma versão curta para o WhatsApp Status",
        placeholder: "O que você vende ou anuncia? Inclua preço e datas se necessário…",
        instruction: "Crie uma publicação natural e uma versão curta para o WhatsApp Status. Use apenas os fatos informados.",
      },
    },
  },
  {
    id: "change-tone",
    glyph: "Aa",
    copy: {
      en: {
        label: "Change the tone",
        sub: "Make it friendlier, firmer, or more professional",
        placeholder: "Paste the text and say the tone you want…",
        instruction: "Rewrite in the requested tone while preserving every fact, name, amount, and date.",
      },
      es: {
        label: "Cambiar el tono",
        sub: "Hazlo más amable, firme o profesional",
        placeholder: "Pega el texto y dime qué tono quieres…",
        instruction: "Reescribe con el tono solicitado conservando todos los datos, nombres, cantidades y fechas.",
      },
      pt: {
        label: "Mudar o tom",
        sub: "Deixe mais amigável, firme ou profissional",
        placeholder: "Cole o texto e diga qual tom deseja…",
        instruction: "Reescreva no tom solicitado, preservando todos os fatos, nomes, valores e datas.",
      },
    },
  },
  {
    id: "translate",
    glyph: "文",
    copy: {
      en: {
        label: "Translate naturally",
        sub: "Keep the message, not a word-for-word translation",
        placeholder: "Paste the text and name the language you need…",
        instruction: "Translate naturally into the requested language. Preserve names, amounts, dates, links, and meaning.",
      },
      es: {
        label: "Traducir naturalmente",
        sub: "Conserva el mensaje, no una traducción literal",
        placeholder: "Pega el texto y dime a qué idioma lo necesitas…",
        instruction: "Traduce naturalmente al idioma solicitado. Conserva nombres, cantidades, fechas, enlaces y significado.",
      },
      pt: {
        label: "Traduzir naturalmente",
        sub: "Preserve a mensagem, não uma tradução literal",
        placeholder: "Cole o texto e diga para qual idioma precisa…",
        instruction: "Traduza naturalmente para o idioma solicitado. Preserve nomes, valores, datas, links e significado.",
      },
    },
  },
  {
    id: "summarize",
    glyph: "≡",
    copy: {
      en: {
        label: "Summarize notes",
        sub: "Get the key points and next steps",
        placeholder: "Paste your notes, conversation, or voice transcript…",
        instruction: "Summarize in plain language, then list only concrete next steps mentioned in the text.",
      },
      es: {
        label: "Resumir notas",
        sub: "Obtén los puntos importantes y próximos pasos",
        placeholder: "Pega tus notas, conversación o transcripción de voz…",
        instruction: "Resume en lenguaje sencillo y luego enumera solamente los próximos pasos mencionados en el texto.",
      },
      pt: {
        label: "Resumir anotações",
        sub: "Veja os pontos importantes e próximos passos",
        placeholder: "Cole suas anotações, conversa ou transcrição de voz…",
        instruction: "Resuma em linguagem simples e depois liste apenas os próximos passos mencionados no texto.",
      },
    },
  },
];
