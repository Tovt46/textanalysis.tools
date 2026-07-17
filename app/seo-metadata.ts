import type { Metadata } from "next";
import type { UiLang } from "./i18n";

export const SITE_URL = "https://bow-zipf-lab.tovt7.chatgpt.site";

const SEO_COPY: Record<UiLang,{ path:string; title:string; description:string; locale:string }> = {
  ru: {
    path: "/ru",
    title: "BOW-анализ текста и сравнение частот — Zipf Lab",
    description: "Сравнивайте два текста по частотности слов и биграммам. Анализируйте закон Ципфа, проценты, стоп-слова и контрольные фразы.",
    locale: "ru_RU",
  },
  en: {
    path: "/",
    title: "Bag-of-Words Text Analyzer & Comparison — Zipf Lab",
    description: "Compare two texts by word and bigram frequency. Analyze Zipf distribution, percentages, editable stop words, and tracked phrases.",
    locale: "en_US",
  },
  uk: {
    path: "/uk",
    title: "BOW-аналіз тексту та порівняння частот — Zipf Lab",
    description: "Порівнюйте два тексти за частотою слів і біграм. Аналізуйте закон Ципфа, відсотки, стоп-слова та контрольні фрази.",
    locale: "uk_UA",
  },
};

const languageAlternates = { en:"/", ru:"/ru", uk:"/uk", "x-default":"/" };

export function pageMetadata(lang:UiLang):Metadata {
  const page=SEO_COPY[lang];
  return {
    metadataBase:new URL(SITE_URL),
    title:page.title,
    description:page.description,
    alternates:{ canonical:page.path, languages:languageAlternates },
    openGraph:{
      type:"website",
      url:page.path,
      siteName:"BOW / Zipf Lab",
      title:page.title,
      description:page.description,
      locale:page.locale,
      alternateLocale:Object.values(SEO_COPY).filter(item=>item.locale!==page.locale).map(item=>item.locale),
    },
    twitter:{ card:"summary", title:page.title, description:page.description },
    icons:{ icon:"/favicon.svg", shortcut:"/favicon.svg" },
  };
}
