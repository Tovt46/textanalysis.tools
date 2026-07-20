import type { Metadata } from "next";
import type { UiLang } from "./i18n";

export const SITE_URL = "https://bow-zipf-lab.tovt7.chatgpt.site";

export const SITE_ICONS:Metadata["icons"] = {
  icon:[
    {url:"/favicon.ico"},
    {url:"/favicon-16x16.png",sizes:"16x16",type:"image/png"},
    {url:"/favicon-32x32.png",sizes:"32x32",type:"image/png"},
  ],
  shortcut:"/favicon.ico",
  apple:[{url:"/apple-touch-icon.png",sizes:"180x180",type:"image/png"}],
};

const SEO_COPY: Record<UiLang,{ path:string; title:string; description:string; locale:string }> = {
  ru: {
    path: "/ru",
    title: "Бесплатный Bag of Words SEO-анализатор | BOW Analyzer",
    description: "Анализируйте частотность и плотность ключевых слов, биграммы и стоп-слова. Сравнивайте два текста с помощью Bag of Words и закона Ципфа.",
    locale: "ru_RU",
  },
  en: {
    path: "/",
    title: "Free Bag of Words SEO Analyzer & Comparison | BOW Analyzer",
    description: "Analyze keyword density, word and bigram frequency, and editable stop words. Compare two texts with Bag of Words and Zipf distribution.",
    locale: "en_US",
  },
  uk: {
    path: "/uk",
    title: "Безкоштовний Bag of Words SEO-аналізатор | BOW Analyzer",
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
      siteName:"BOW Analyzer",
      title:page.title,
      description:page.description,
      locale:page.locale,
      alternateLocale:Object.values(SEO_COPY).filter(item=>item.locale!==page.locale).map(item=>item.locale),
    },
    twitter:{ card:"summary", title:page.title, description:page.description },
    verification:{ google:"EHMYng8W4h43q3z7zXOfviXigYp0afX9hUkmWwzykdU" },
    icons:SITE_ICONS,
    manifest:"/site.webmanifest",
  };
}
