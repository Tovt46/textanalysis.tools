"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UiLang } from "./i18n";
import { languagePaths,localizedPath } from "./localization";
import { SiteBrand } from "./SiteChrome";
import ThemeToggle from "./ThemeToggle";

const SLUGS=["word-frequency-counter","keyword-density-checker","ngram-analyzer","text-analysis-comparison","bag-of-words-analyzer","bag-of-words-generator","tf-idf-calculator","text-similarity-calculator"];
const ICONS=["▥","⌗","≋","⇄","▤","⊞","ƒ","◉"];
const AGENT_LABELS:Record<UiLang,string>={en:"AI agents & MCP",ru:"AI-агенты и MCP",uk:"AI-агенти та MCP",es:"Agentes IA y MCP"};
const COPY:Record<UiLang,{workspace:string;session:string;analyze:string;connect:string;tools:string;home:string;language:string;local:string;privacy:string;evidence:string;names:string[]}>= {
  en:{workspace:"Workspace",session:"Browser session",analyze:"ANALYZE",connect:"CONNECT",tools:"Analysis tools",home:"Back to overview",language:"Language",local:"Text analysis on your device",privacy:"URL inputs use the stateless API.",evidence:"Evidence workspace",names:["Word frequency","Keyword density","N-grams","Compare texts","Bag of words","Word vectors","TF-IDF","Text similarity"]},
  ru:{workspace:"Рабочая область",session:"Сессия в браузере",analyze:"АНАЛИЗ",connect:"ИНТЕГРАЦИИ",tools:"Инструменты анализа",home:"На главную",language:"Язык",local:"Анализ текста на устройстве",privacy:"Для URL используется API без хранения.",evidence:"Проверка утверждений",names:["Частотность слов","Плотность ключей","N-граммы","Сравнение текстов","Bag of Words","Векторы слов","TF-IDF","Сходство текстов"]},
  uk:{workspace:"Робоча область",session:"Сесія в браузері",analyze:"АНАЛІЗ",connect:"ІНТЕГРАЦІЇ",tools:"Інструменти аналізу",home:"На головну",language:"Мова",local:"Аналіз тексту на пристрої",privacy:"Для URL використовується API без зберігання.",evidence:"Перевірка тверджень",names:["Частотність слів","Щільність ключів","N-грами","Порівняння текстів","Bag of Words","Вектори слів","TF-IDF","Схожість текстів"]},
  es:{workspace:"Espacio de trabajo",session:"Sesión del navegador",analyze:"ANALIZAR",connect:"CONECTAR",tools:"Herramientas de análisis",home:"Volver al inicio",language:"Idioma",local:"Análisis de texto en tu dispositivo",privacy:"Las URL usan la API sin almacenamiento.",evidence:"Revisión de afirmaciones",names:["Frecuencia de palabras","Densidad de palabras","N-gramas","Comparar textos","Bolsa de palabras","Vectores de palabras","TF-IDF","Similitud de textos"]},
};

export default function ToolShell({locale,children}:{locale:UiLang;children:React.ReactNode}){
  const pathname=usePathname();
  const slug=pathname.split("/").filter(Boolean).at(-1)||"";
  const index=SLUGS.indexOf(slug);
  if(index<0&&slug!=="evidence-workspace")return children;
  const copy=COPY[locale];
  const title=index<0?copy.evidence:copy.names[index];
  const paths=slug==="evidence-workspace"?languagePaths("/tools"):languagePaths(`/tools/${slug}`);
  const nav=<>{SLUGS.map((item,i)=><Link key={item} href={localizedPath(locale,`/tools/${item}`)} className={slug===item?"active":undefined} aria-current={slug===item?"page":undefined}><span aria-hidden="true">{ICONS[i]}</span>{copy.names[i]}</Link>)}<Link href="/tools/evidence-workspace" className={slug==="evidence-workspace"?"active":undefined} aria-current={slug==="evidence-workspace"?"page":undefined}><span aria-hidden="true">◇</span>{copy.evidence}{locale!=="en"?<small>EN</small>:null}</Link></>;
  return <div className="tool-shell">
    <aside className="workspace-sidebar">
      <SiteBrand locale={locale}/>
      <div className="workspace-identity"><span aria-hidden="true">W</span><div>{copy.workspace}<small>{copy.session}</small></div></div>
      <p className="sidebar-label">{copy.analyze}</p>
      <nav className="workspace-tool-nav" aria-label={copy.tools}>{nav}</nav>
      <p className="sidebar-label connect-label">{copy.connect}</p>
      <nav className="workspace-tool-nav" aria-label="API, CLI & MCP"><Link href={localizedPath(locale,"/api-docs")}><span aria-hidden="true">⌘</span>API</Link><Link href={localizedPath(locale,"/cli")}><span aria-hidden="true">›_</span>CLI</Link><Link href={localizedPath(locale,"/agents")}><span aria-hidden="true">◇</span>{AGENT_LABELS[locale]}</Link></nav>
      <div className="workspace-sidebar-bottom"><p><i aria-hidden="true"/>{copy.local}</p><small>{copy.privacy}</small><Link href={localizedPath(locale,"/")}>← {copy.home}</Link></div>
    </aside>
    <div className="workspace-page">
      <header className="workspace-topbar"><div className="workspace-breadcrumb"><Link href={localizedPath(locale,"/tools")}>{copy.workspace}</Link><span aria-hidden="true">/</span><b>{title}</b></div><div className="workspace-header-actions"><nav className="ui-languages" aria-label={copy.language}>{(["en","uk","ru","es"] as UiLang[]).map(language=><a key={language} href={paths[language]} lang={language} hrefLang={language} className={language===locale?"active":undefined} aria-current={language===locale?"page":undefined}>{language==="uk"?"UKR":language.toUpperCase()}</a>)}</nav><ThemeToggle locale={locale}/></div></header>
      <details className="workspace-mobile-tools"><summary>{copy.tools}<span aria-hidden="true">⌄</span></summary><nav className="workspace-tool-nav" aria-label={copy.tools}><Link href={localizedPath(locale,"/")}>← {copy.home}</Link>{nav}</nav></details>
      {children}
    </div>
  </div>;
}
