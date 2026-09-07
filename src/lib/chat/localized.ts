import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import ar from "@/messages/ar.json";
import fr from "@/messages/fr.json";
import ru from "@/messages/ru.json";
import es from "@/messages/es.json";
import de from "@/messages/de.json";
import it from "@/messages/it.json";
import pt from "@/messages/pt.json";
import pl from "@/messages/pl.json";

const messages = { en, tr, ar, fr, ru, es, de, it, pt, pl };

const procedureLabels = {
  en: {
    title: "Repair procedure",
    source: "Source",
    page: "p.",
    pageUnknown: "page not listed",
    service: "Cantek service",
  },
  tr: {
    title: "Onarım prosedürü",
    source: "Kaynak",
    page: "s.",
    pageUnknown: "sayfa bilgisi yok",
    service: "Cantek servisi",
  },
  ar: {
    title: "إجراء الإصلاح",
    source: "المصدر",
    page: "ص.",
    pageUnknown: "رقم الصفحة غير متاح",
    service: "خدمة كانتيك",
  },
  fr: {
    title: "Procédure de réparation",
    source: "Source",
    page: "p.",
    pageUnknown: "page non indiquée",
    service: "Service Cantek",
  },
  ru: {
    title: "Процедура ремонта",
    source: "Источник",
    page: "стр.",
    pageUnknown: "страница не указана",
    service: "Сервис Cantek",
  },
  es: {
    title: "Procedimiento de reparación",
    source: "Fuente",
    page: "p.",
    pageUnknown: "página no indicada",
    service: "Servicio Cantek",
  },
  de: {
    title: "Reparaturverfahren",
    source: "Quelle",
    page: "S.",
    pageUnknown: "Seite nicht angegeben",
    service: "Cantek-Service",
  },
  it: {
    title: "Procedura di riparazione",
    source: "Fonte",
    page: "p.",
    pageUnknown: "pagina non indicata",
    service: "Assistenza Cantek",
  },
  pt: {
    title: "Procedimento de reparação",
    source: "Fonte",
    page: "p.",
    pageUnknown: "página não indicada",
    service: "Assistência Cantek",
  },
  pl: {
    title: "Procedura naprawy",
    source: "Źródło",
    page: "s.",
    pageUnknown: "brak numeru strony",
    service: "Serwis Cantek",
  },
} as const;

type SupportedLocale = keyof typeof messages;

function supportedLocale(locale: string): SupportedLocale {
  return locale in messages ? (locale as SupportedLocale) : "en";
}

export function localizedChatCopy(locale: string) {
  const selected = supportedLocale(locale);
  return {
    noDocs: messages[selected].chat.noDocs,
    dangerTitle: messages[selected].danger.title,
    dangerBody: messages[selected].danger.body,
    emergency: messages[selected].danger.emergency,
    ...procedureLabels[selected],
  };
}
