import type { UiLang } from "./i18n";
import { languagePaths,localizedPath } from "./localization";

type ActiveNav="home"|"tools"|"guide"|"api"|"agents";
type LanguagePaths=Record<UiLang,string>;

const ROOT_LANGUAGE_PATHS:LanguagePaths=languagePaths("/");

const LABELS:Record<UiLang,{
  home:string;
  tools:string;
  guides:string;
  navigation:string;
  languages:string;
  privacy:string;
  resources:string;
  sitemap:string;
  agents:string;
}>={
  en:{home:"Home",tools:"Tools",guides:"Guides",navigation:"Main navigation",languages:"Language",privacy:"Transparent text analysis without server storage.",resources:"Developer and machine-readable resources",sitemap:"Sitemap",agents:"Agents"},
  uk:{home:"Головна",tools:"Інструменти",guides:"Гайди",navigation:"Головна навігація",languages:"Мова",privacy:"Прозорий аналіз тексту без збереження на сервері.",resources:"Ресурси для розробників і машинного читання",sitemap:"Мапа сайту",agents:"Агенти"},
  ru:{home:"Главная",tools:"Инструменты",guides:"Гайды",navigation:"Главная навигация",languages:"Язык",privacy:"Прозрачный анализ текста без хранения на сервере.",resources:"Ресурсы для разработчиков и машинного чтения",sitemap:"Карта сайта",agents:"Агенты"},
  es:{home:"Inicio",tools:"Herramientas",guides:"Guías",navigation:"Navegación principal",languages:"Idioma",privacy:"Análisis de texto transparente sin almacenamiento en el servidor.",resources:"Recursos para desarrolladores y lectura automática",sitemap:"Mapa del sitio",agents:"Agentes"},
};

function navItems(locale:UiLang){
  const labels=LABELS[locale];
  return [
    {key:"home" as const,href:ROOT_LANGUAGE_PATHS[locale],label:labels.home},
    {key:"tools" as const,href:localizedPath(locale,"/tools"),label:labels.tools},
    {key:"guide" as const,href:localizedPath(locale,"/guides"),label:labels.guides},
    {key:"api" as const,href:localizedPath(locale,"/api-docs"),label:"API"},
    {key:"agents" as const,href:localizedPath(locale,"/agents"),label:labels.agents},
  ];
}

export function SiteHeader({locale,active,languagePaths=ROOT_LANGUAGE_PATHS}:{locale:UiLang;active:ActiveNav;languagePaths?:LanguagePaths}){
  const labels=LABELS[locale];
  return <header className="topbar site-header">
    <a className="brand" href={ROOT_LANGUAGE_PATHS[locale]}><span className="brand-mark" aria-hidden="true"/><span>TEXT ANALYSIS TOOLS</span></a>
    <nav className="site-nav" aria-label={labels.navigation}>{navItems(locale).map(item=><a key={item.key} className={active===item.key?"active":undefined} href={item.href} aria-current={active===item.key?"page":undefined}>{item.label}</a>)}</nav>
    <div className="header-tools"><nav className="ui-languages" aria-label={labels.languages}>{(["en","uk","ru","es"] as UiLang[]).map(language=><a key={language} href={languagePaths[language]} className={locale===language?"active":undefined} hrefLang={language} lang={language} aria-current={locale===language?"page":undefined}>{language==="uk"?"UKR":language.toUpperCase()}</a>)}</nav></div>
  </header>;
}

export function SiteFooter({locale}:{locale:UiLang}){
  const labels=LABELS[locale];
  return <footer className="site-footer">
    <div className="site-footer-brand"><a className="brand" href={ROOT_LANGUAGE_PATHS[locale]}><span className="brand-mark" aria-hidden="true"/><span>TEXT ANALYSIS TOOLS</span></a><p>{labels.privacy}</p></div>
    <div className="site-footer-links"><nav className="site-footer-nav" aria-label={labels.navigation}>{navItems(locale).map(item=><a key={item.key} href={item.href}>{item.label}</a>)}</nav><nav className="site-footer-utility" aria-label={labels.resources}><a href={localizedPath(locale,"/cli")}>CLI</a><a href={localizedPath(locale,"/agents")}>{labels.agents}</a><a href="/openapi.json">OpenAPI</a><a href="/llms.txt">llms.txt</a><a href="/sitemap.xml">{labels.sitemap}</a></nav></div>
  </footer>;
}
