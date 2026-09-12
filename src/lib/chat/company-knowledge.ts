import { CANTEK_PHONES, serviceClose } from "@/lib/chat/hazards";
import { localizedChatCopy } from "@/lib/chat/localized";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  tr: "Turkish",
  ar: "Arabic",
  fr: "French",
  ru: "Russian",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  pl: "Polish",
};

export const CANTEK_COMPANY_FACTS = `Company: Cantek Soğutma A.Ş. (Cantek Group)
Headquarters: Antalya, Türkiye
Address: Organized Industrial Zone, 2nd Section, 21st Street, No:1, Döşemealtı, Antalya 07177, Türkiye
Phones: ${CANTEK_PHONES}
Email: info@cantekgroup.com
Work: industrial cold storage, cooling packs, and plant controllers (Octosense, IRS, Octopush)
This portal: answers from approved Cantek service manuals when they are loaded. It does not replace a certified refrigeration technician.`;

const DIAGNOSTIC_RE =
  /(alarm|setpoint|set point|wiring|torque|amper|compressor|evaporator|condenser|refrigerant|nh3|ammonia|hp\b|lp\b|soğuk oda|soğuk oda|alarmı|kablo|tork|kompresör|ayar|consigne|consigna|torque|verdraht|verdrahtung|verdrahtung|авария|уставк|компрессор|إنذار|عزم|ضاغط|alarme|compressore|cablaggio|alarme|compressor|okablow|nastaw)/i;

const GREETING_RE =
  /^(hi+|hey+|hello|yo|sup|what'?s up|howdy|hiya|good (morning|afternoon|evening)|thanks|thank you|thx|ok+|okay|bye|goodbye|see you|how are you|who are you|what can you do|help(?: me)?|merhaba|selam|naber|nasılsın|teşekkür(?:ler)?|günaydın|iyi akşamlar|bonjour|salut|merci|hola|gracias|ciao|buongiorno|olá|oi|obrigado|hallo|guten tag|danke|привет|здравствуй(?:те)?|спасибо|cześć|dzień dobry|dziękuję|مرحبا|أهلا|شكرا)[\s!.,?]*$/i;

const COMPANY_RE =
  /(cantek|who are you|what (is|does) this|contact|phone|telefon|e-?mail|address|where are you|headquarters|antalya|octosense|octopush|\birs\b|product|servis|iletişim|adres|kimsiniz|nedir|şirket|company|hours|working hours|çalışma saati|contactez|contacto|контакт|عنوان|telefonnummer|indirizzo|morada|adres)/i;

function normalized(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

export function isGreetingQuery(query: string): boolean {
  const text = normalized(query);
  if (!text || text.length > 120) return false;
  if (DIAGNOSTIC_RE.test(text)) return false;
  return GREETING_RE.test(text);
}

export function isCompanyQuery(query: string): boolean {
  const text = normalized(query);
  if (!text) return false;
  if (DIAGNOSTIC_RE.test(text) && !/(contact|telefon|phone|iletişim|adres|address)/i.test(text)) {
    return false;
  }
  return COMPANY_RE.test(text);
}

export function isGeneralConversation(query: string): boolean {
  return isGreetingQuery(query) || isCompanyQuery(query);
}

export function buildCompanySystemPrompt(opts: {
  locale: string;
  greeting?: boolean;
}): string {
  const language = LANGUAGE_NAMES[opts.locale] ?? "English";
  return `You provide Cantek Group diagnostic support for industrial cold storage. Headquarters: Antalya, Turkey.

LANGUAGE
- Write the entire response in ${language} (UI locale: ${opts.locale}).

ALLOWED FACTS
${CANTEK_COMPANY_FACTS}

RULES
- You may greet the user, explain what this portal does, and share the company facts above.
- Do not invent pressures, torque, amperage, setpoints, wiring, refrigerant charges, alarm codes, or repair steps.
- If the user starts asking for a repair procedure, tell them to describe the equipment and fault so manuals can be searched, and give Cantek service contacts (${CANTEK_PHONES}).
${opts.greeting ? "- Keep greetings short and offer to help with a plant issue or service contacts." : "- For company or contact questions, answer only from ALLOWED FACTS."}`;
}

export function staticGeneralAnswer(query: string, locale = "en"): string {
  const copy = localizedChatCopy(locale);
  const body = isGreetingQuery(query) ? copy.greeting : copy.companyFacts;
  if (body.includes("+90 242") || body.includes("info@cantekgroup.com")) {
    return body;
  }
  return `${body}\n\n${serviceClose(locale)}`;
}
