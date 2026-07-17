import type { Metadata } from "next";
import type { UiLang } from "./i18n";

export const SITE_URL = "https://bow-zipf-lab.tovt7.chatgpt.site";

const SEO_COPY: Record<UiLang,{ path:string; title:string; description:string; locale:string }> = {
  ru: {
    path: "/ru",
    title: "Бесплатный Bag of Words SEO-анализатор | Zipf Lab",
    description: "Анализируйте частотность и плотность ключевых слов, биграммы и стоп-слова. Сравнивайте два текста с помощью Bag of Words и закона Ципфа.",
    locale: "ru_RU",
  },
  en: {
    path: "/",
    title: "Free Bag of Words SEO Analyzer & Comparison | Zipf Lab",
    description: "Analyze keyword density, word and bigram frequency, and editable stop words. Compare two texts with Bag of Words and Zipf distribution.",
    locale: "en_US",
  },
  uk: {
    path: "/uk",
    title: "Безкоштовний Bag of Words SEO-аналізатор | Zipf Lab",
    description: "Аналізуйте частотність і щільність ключових слів, біграми та стоп-слова. Порівнюйте два тексти за допомогою Bag of Words і закону Ципфа.",
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
    verification:{ google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU" },
    icons:{ icon:"/favicon.svg", shortcut:"/favicon.svg" },
  };
}
