import type { UiLang } from "./i18n";

type ActiveNav="analyzer"|"guide"|"comparison"|"api";
type LanguagePaths=Record<UiLang,string>;

const ROOT_LANGUAGE_PATHS:LanguagePaths={en:"/",uk:"/uk",ru:"/ru"};

const LABELS:Record<UiLang,{
  analyzer:string;
  guide:string;
  comparison:string;
  navigation:string;
  languages:string;
  privacy:string;
}>={
  en:{analyzer:"Analyzer",guide:"BOW guide",comparison:"BOW vs Word2Vec",navigation:"Main navigation",languages:"Language",privacy:"Text is processed without server storage."},
  uk:{analyzer:"Аналізатор",guide:"Гайд по BOW",comparison:"BOW і Word2Vec",navigation:"Головна навігація",languages:"Мова",privacy:"Текст обробляється без збереження на сервері."},
  ru:{analyzer:"Анализатор",guide:"Гайд по BOW",comparison:"BOW и Word2Vec",navigation:"Главная навигация",languages:"Язык",privacy:"Текст обрабатывается без сохранения на сервере."},
};

function navItems(locale:UiLang){
  const labels=LABELS[locale];
  return [
    {key:"analyzer" as const,href:ROOT_LANGUAGE_PATHS[locale],label:labels.analyzer},
    {key:"guide" as const,href:locale==="en"?"/bag-of-words-model":`/${locale}/bag-of-words-model`,label:labels.guide},
    {key:"comparison" as const,href:"/bag-of-words-vs-word2vec",label:labels.comparison},
    {key:"api" as const,href:"/api-docs",label:"API"},
  ];
}

export function SiteHeader({locale,active,languagePaths=ROOT_LANGUAGE_PATHS}:{locale:UiLang;active:ActiveNav;languagePaths?:LanguagePaths}){
  const labels=LABELS[locale];
  return <header className="topbar site-header">
    <a className="brand" href={ROOT_LANGUAGE_PATHS[locale]}><span className="brand-mark" aria-hidden="true"/><span>BOW ANALYZER</span></a>
    <nav className="site-nav" aria-label={labels.navigation}>{navItems(locale).map(item=><a key={item.key} className={active===item.key?"active":undefined} href={item.href} aria-current={active===item.key?"page":undefined}>{item.label}</a>)}</nav>
    <div className="header-tools"><nav className="ui-languages" aria-label={labels.languages}>{(["en","uk","ru"] as UiLang[]).map(language=><a key={language} href={languagePaths[language]} className={locale===language?"active":undefined} hrefLang={language} lang={language} aria-current={locale===language?"page":undefined}>{language==="uk"?"UKR":language.toUpperCase()}</a>)}</nav></div>
  </header>;
}

export function SiteFooter({locale}:{locale:UiLang}){
  const labels=LABELS[locale];
  return <footer className="site-footer">
    <div className="site-footer-brand"><a className="brand" href={ROOT_LANGUAGE_PATHS[locale]}><span className="brand-mark" aria-hidden="true"/><span>BOW ANALYZER</span></a><p>{labels.privacy}</p></div>
    <div className="site-footer-links"><nav className="site-footer-nav" aria-label={labels.navigation}>{navItems(locale).map(item=><a key={item.key} href={item.href}>{item.label}</a>)}</nav><nav className="site-footer-utility" aria-label="Machine-readable resources"><a href="/openapi.json">OpenAPI</a><a href="/llms.txt">llms.txt</a><a href="/sitemap.xml">Sitemap</a></nav></div>
  </footer>;
}
