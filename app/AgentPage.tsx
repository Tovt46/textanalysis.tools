import Link from "next/link";
import cliPackage from "../packages/cli/package.json";
import type {UiLang} from "./i18n";
import {languagePaths,localizedMetadata,localizedPath} from "./localization";
import {SiteFooter,SiteHeader} from "./SiteChrome";
import {SITE_NAME,SITE_URL} from "./seo-metadata";

type AgentCopy={
  title:string;
  description:string;
  eyebrow:string;
  deck:string;
  start:string;
  contents:string;
  interfaces:string;
  interfacesTitle:string;
  webTitle:string;
  webText:string;
  apiTitle:string;
  apiText:string;
  cliTitle:string;
  cliText:string;
  mcpTitle:string;
  mcpText:string;
  mcpSection:string;
  mcpSectionTitle:string;
  mcpIntro:string;
  tools:string;
  toolsTitle:string;
  toolsText:string;
  toolMeta:string;
  contracts:string;
  contractsTitle:string;
  contractsText:string;
  boundaries:string;
  boundariesTitle:string;
  boundaryItems:string[];
  ctaTitle:string;
  ctaText:string;
  openCli:string;
};

export const AGENT_COPY:Record<UiLang,AgentCopy>={
  en:{
    title:"Text Analysis Tools for AI Agents",
    description:"Connect AI agents to deterministic text analysis through OpenAPI, a local npm CLI, or an eight-tool MCP server.",
    eyebrow:"AGENT-READY · DETERMINISTIC · READ-ONLY",
    deck:"Give an agent transparent word frequency, keyword density, N-gram, Bag of Words, TF-IDF, comparison, and similarity tools without asking a language model to invent the measurements.",
    start:"Start with local MCP",contents:"On this page",interfaces:"Interfaces",interfacesTitle:"One analysis engine, four ways to use it",
    webTitle:"Web for people",webText:"Paste text, inspect bounded tables, compare results, and export evidence in a visual interface. Large tables are marked when only the returned page is shown.",
    apiTitle:"API for apps and agents",apiText:"Call eight stateless JSON operations with OpenAPI discovery, stable errors, and no API key.",
    cliTitle:"CLI for automation",cliText:"Analyze files, URLs, inline text, or stdin locally and return tables, JSON, or CSV.",
    mcpTitle:"MCP for AI agents",mcpText:"Expose the same eight local read-only operations as discoverable tools over stdio.",
    mcpSection:"Local MCP",mcpSectionTitle:"Connect the npm package to an MCP client",mcpIntro:"The MCP command starts a local stdio server. Text supplied to a tool stays inside that process; only explicit public URL inputs use the network.",
    tools:"Tools",toolsTitle:"Eight focused operations",toolsText:"Each tool has a bounded input schema and structured output. Agents can choose a focused operation instead of parsing a general-purpose report.",toolMeta:"read-only · structured JSON · local execution",
    contracts:"Contracts",contractsTitle:"Use OpenAPI when HTTP is the better transport",contractsText:"The public API exposes the same analysis primitives for remote applications. Use the machine-readable contract for tool generation and the concise capability map for discovery.",
    boundaries:"Boundaries",boundariesTitle:"Deterministic analysis, not generated judgment",
    boundaryItems:["No LLM is used to calculate the results.","Counts and formulas remain inspectable.","Local CLI and MCP text is not sent to textanalysis.tools.","Public URL inputs require a network request to that page.","Results are diagnostics, not guarantees about ranking or content quality."],
    ctaTitle:"Choose the interface that matches the workflow",ctaText:"Use MCP for local agent tools, CLI for shell automation, API for remote applications, or the web interface for manual review.",openCli:"Read CLI and MCP documentation",
  },
  ru:{
    title:"Инструменты анализа текста для AI-агентов",
    description:"Подключайте AI-агентов к детерминированному анализу текста через OpenAPI, локальный npm CLI или MCP-сервер с восемью инструментами.",
    eyebrow:"ДЛЯ АГЕНТОВ · ДЕТЕРМИНИРОВАННО · READ-ONLY",
    deck:"Дайте агенту прозрачные инструменты частотности, плотности ключей, N-грамм, Bag of Words, TF-IDF, сравнения и сходства — без выдумывания метрик языковой моделью.",
    start:"Запустить локальный MCP",contents:"На этой странице",interfaces:"Интерфейсы",interfacesTitle:"Один движок, четыре способа использования",
    webTitle:"Web для людей",webText:"Вставляйте текст, проверяйте ограниченные таблицы, сравнивайте результаты и экспортируйте возвращённые строки в визуальном интерфейсе.",
    apiTitle:"API для приложений и агентов",apiText:"Вызывайте восемь stateless JSON-операций с OpenAPI, стабильными ошибками и без API-ключа.",
    cliTitle:"CLI для автоматизации",cliText:"Локально анализируйте файлы, URL, строки и stdin с выводом таблиц, JSON или CSV.",
    mcpTitle:"MCP для AI-агентов",mcpText:"Подключайте те же восемь локальных read-only операций как обнаруживаемые инструменты через stdio.",
    mcpSection:"Локальный MCP",mcpSectionTitle:"Подключите npm-пакет к MCP-клиенту",mcpIntro:"Команда MCP запускает локальный stdio-сервер. Переданный текст остаётся внутри процесса; сеть используется только для явно указанных публичных URL.",
    tools:"Инструменты",toolsTitle:"Восемь специализированных операций",toolsText:"У каждого инструмента есть ограниченная входная схема и структурированный результат. Агент может выбрать точную операцию вместо разбора общего отчёта.",toolMeta:"только чтение · структурированный JSON · локальное выполнение",
    contracts:"Контракты",contractsTitle:"Используйте OpenAPI, когда нужен HTTP",contractsText:"Публичный API предоставляет те же методы удалённым приложениям. Машиночитаемый контракт подходит для генерации tools, а краткая карта возможностей — для обнаружения.",
    boundaries:"Границы",boundariesTitle:"Детерминированный анализ, а не сгенерированная оценка",
    boundaryItems:["LLM не участвует в расчёте результатов.","Количество и формулы можно проверить.","Локальный текст CLI и MCP не отправляется на textanalysis.tools.","Анализ публичного URL требует сетевого запроса к странице.","Результаты — диагностика, а не гарантия ранжирования или качества."],
    ctaTitle:"Выберите интерфейс под свой процесс",ctaText:"MCP — для локальных tools агента, CLI — для shell-автоматизации, API — для удалённых приложений, Web — для ручной проверки.",openCli:"Документация CLI и MCP",
  },
  uk:{
    title:"Інструменти аналізу тексту для AI-агентів",
    description:"Підключайте AI-агентів до детермінованого аналізу тексту через OpenAPI, локальний npm CLI або MCP-сервер із вісьмома інструментами.",
    eyebrow:"ДЛЯ АГЕНТІВ · ДЕТЕРМІНОВАНО · READ-ONLY",
    deck:"Дайте агенту прозорі інструменти частотності, щільності ключів, N-грам, Bag of Words, TF-IDF, порівняння й подібності — без вигадування метрик мовною моделлю.",
    start:"Запустити локальний MCP",contents:"На цій сторінці",interfaces:"Інтерфейси",interfacesTitle:"Один рушій, чотири способи використання",
    webTitle:"Web для людей",webText:"Вставляйте текст, перевіряйте обмежені таблиці, порівнюйте результати й експортуйте повернуті рядки у візуальному інтерфейсі.",
    apiTitle:"API для програм і агентів",apiText:"Викликайте вісім stateless JSON-операцій з OpenAPI, стабільними помилками й без API-ключа.",
    cliTitle:"CLI для автоматизації",cliText:"Локально аналізуйте файли, URL, рядки та stdin із виведенням таблиць, JSON або CSV.",
    mcpTitle:"MCP для AI-агентів",mcpText:"Підключайте ті самі вісім локальних read-only операцій як доступні інструменти через stdio.",
    mcpSection:"Локальний MCP",mcpSectionTitle:"Підключіть npm-пакет до MCP-клієнта",mcpIntro:"Команда MCP запускає локальний stdio-сервер. Переданий текст залишається всередині процесу; мережа використовується лише для явно вказаних публічних URL.",
    tools:"Інструменти",toolsTitle:"Вісім спеціалізованих операцій",toolsText:"Кожен інструмент має обмежену вхідну схему та структурований результат. Агент може вибрати точну операцію замість розбору загального звіту.",toolMeta:"лише читання · структурований JSON · локальне виконання",
    contracts:"Контракти",contractsTitle:"Використовуйте OpenAPI, коли потрібен HTTP",contractsText:"Публічний API надає ті самі методи віддаленим програмам. Машиночитаний контракт підходить для генерації tools, а коротка карта можливостей — для виявлення.",
    boundaries:"Межі",boundariesTitle:"Детермінований аналіз, а не згенерована оцінка",
    boundaryItems:["LLM не бере участі в розрахунку результатів.","Кількість і формули можна перевірити.","Локальний текст CLI та MCP не надсилається на textanalysis.tools.","Аналіз публічного URL потребує мережевого запиту до сторінки.","Результати — діагностика, а не гарантія ранжування чи якості."],
    ctaTitle:"Виберіть інтерфейс під свій процес",ctaText:"MCP — для локальних tools агента, CLI — для shell-автоматизації, API — для віддалених програм, Web — для ручної перевірки.",openCli:"Документація CLI та MCP",
  },
  es:{
    title:"Herramientas de análisis de texto para agentes de IA",
    description:"Conecta agentes de IA con análisis de texto determinista mediante OpenAPI, una CLI npm local o un servidor MCP con ocho herramientas.",
    eyebrow:"PARA AGENTES · DETERMINISTA · SOLO LECTURA",
    deck:"Ofrece a un agente frecuencia, densidad, N-gramas, Bag of Words, TF-IDF, comparación y similitud transparentes sin pedir a un modelo de lenguaje que invente las métricas.",
    start:"Iniciar MCP local",contents:"En esta página",interfaces:"Interfaces",interfacesTitle:"Un motor de análisis, cuatro formas de usarlo",
    webTitle:"Web para personas",webText:"Pega texto, revisa tablas acotadas, compara resultados y exporta las filas devueltas en una interfaz visual.",
    apiTitle:"API para aplicaciones y agentes",apiText:"Llama a ocho operaciones JSON sin estado con OpenAPI, errores estables y sin clave API.",
    cliTitle:"CLI para automatización",cliText:"Analiza localmente archivos, URL, texto en línea o stdin y devuelve tablas, JSON o CSV.",
    mcpTitle:"MCP para agentes de IA",mcpText:"Expone las mismas ocho operaciones locales de solo lectura como herramientas detectables mediante stdio.",
    mcpSection:"MCP local",mcpSectionTitle:"Conecta el paquete npm a un cliente MCP",mcpIntro:"El comando MCP inicia un servidor stdio local. El texto permanece dentro del proceso; solo las URL públicas explícitas usan la red.",
    tools:"Herramientas",toolsTitle:"Ocho operaciones especializadas",toolsText:"Cada herramienta tiene un esquema de entrada acotado y salida estructurada. El agente puede elegir una operación concreta sin analizar un informe general.",toolMeta:"solo lectura · JSON estructurado · ejecución local",
    contracts:"Contratos",contractsTitle:"Usa OpenAPI cuando HTTP sea el transporte adecuado",contractsText:"La API pública ofrece los mismos métodos a aplicaciones remotas. Usa el contrato legible por máquinas para generar tools y el mapa conciso para descubrir capacidades.",
    boundaries:"Límites",boundariesTitle:"Análisis determinista, no juicio generado",
    boundaryItems:["Ningún LLM calcula los resultados.","Los recuentos y fórmulas se pueden inspeccionar.","El texto local de CLI y MCP no se envía a textanalysis.tools.","Las URL públicas requieren una solicitud de red a la página.","Los resultados son diagnósticos, no garantías de posicionamiento o calidad."],
    ctaTitle:"Elige la interfaz adecuada para el flujo",ctaText:"MCP para tools locales de agentes, CLI para automatización shell, API para aplicaciones remotas y Web para revisión manual.",openCli:"Documentación de CLI y MCP",
  },
};

const toolNames=["analyze_text","word_frequency","keyword_density","ngram_analysis","bag_of_words","compare_texts","tfidf","text_similarity"];

const agentRecipes=[
  {
    title:"Repetition and density audit",
    tools:"keyword_density → ngram_analysis → analyze_text",
    goal:"Find repeated tracked phrases, recurring wording, and terms that sit well above the fitted frequency model.",
    steps:[
      "Call keyword_density with the phrases the draft is expected to cover.",
      "Call ngram_analysis with ngramSize 2 or 3 to surface unplanned repetition.",
      "Use analyze_text to inspect above-model terms, then cite counts and rates instead of inventing a quality score.",
    ],
  },
  {
    title:"Draft versus baseline regression",
    tools:"compare_texts",
    goal:"Detect vocabulary, length, and recurring-phrase changes between an approved baseline and a new draft.",
    steps:[
      "Send the approved document as a and the new draft as b with the same language and stop-word settings.",
      "Rank wordChanges and bigramChanges by absolute shareDelta, not raw count alone.",
      "Report the changed metric, both source values, and the normalized delta; route intentional editorial changes for human approval.",
    ],
  },
  {
    title:"Duplicate and near-duplicate detection",
    tools:"text_similarity → compare_texts",
    goal:"Screen a candidate against an existing document, then explain why a pair looks similar.",
    steps:[
      "Call text_similarity with method tfidf and a project-calibrated threshold; do not treat one universal cutoff as ground truth.",
      "For flagged pairs, call compare_texts to expose shared and changed vocabulary rather than relying on the score alone.",
      "Persist the cosine score, method, input identifiers, and top contributing terms, then send borderline cases to human review.",
    ],
  },
];

export function agentMetadata(locale:UiLang){
  const copy=AGENT_COPY[locale];
  return localizedMetadata({locale,path:"/agents",title:copy.title,description:copy.description,type:"article"});
}

export default function AgentPage({locale}:{locale:UiLang}){
  const copy=AGENT_COPY[locale];
  const mcpConfig=`{
  "mcpServers": {
    "textanalysis": {
      "command": "npx",
      "args": ["--yes", "textanalysis-tools@${cliPackage.version}", "mcp"]
    }
  }
}`;
  const schema={"@context":"https://schema.org","@graph":[{"@type":"TechArticle",headline:copy.title,description:copy.description,inLanguage:locale,mainEntityOfPage:`${SITE_URL}${localizedPath(locale,"/agents")}`,publisher:{"@type":"Organization",name:SITE_NAME,url:SITE_URL}},{"@type":"SoftwareApplication",name:"textanalysis-tools MCP server",applicationCategory:"DeveloperApplication",operatingSystem:"Node.js",softwareVersion:cliPackage.version,isAccessibleForFree:true}]};
  return <main className="article-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale={locale} active="agents" languagePaths={languagePaths("/agents")}/>
    <article>
      <div className="article-hero"><nav className="breadcrumbs" aria-label={copy.contents}><Link href={localizedPath(locale,"/")}>textanalysis.tools</Link><span>/</span><span>{copy.title}</span></nav><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="article-deck">{copy.deck}</p><div className="article-actions"><a className="primary-article-cta" href="#mcp">{copy.start}</a><a href="/openapi.json">OpenAPI →</a><a href="/llms.txt">llms.txt →</a></div></div>
      <div className="article-layout"><aside className="article-toc" aria-label={copy.contents}><b>{copy.contents}</b><a href="#interfaces">{copy.interfaces}</a><a href="#mcp">{copy.mcpSection}</a><a href="#tools">{copy.tools}</a>{locale==="en"&&<a href="#recipes">Agent recipes</a>}<a href="#contracts">{copy.contracts}</a><a href="#boundaries">{copy.boundaries}</a></aside><div className="article-body api-docs-body">
        <section id="interfaces"><p className="section-number">01</p><h2>{copy.interfacesTitle}</h2><div className="cli-command-grid"><div><code>WEB</code><h3>{copy.webTitle}</h3><p>{copy.webText}</p></div><div><code>HTTP</code><h3>{copy.apiTitle}</h3><p>{copy.apiText}</p></div><div><code>CLI</code><h3>{copy.cliTitle}</h3><p>{copy.cliText}</p></div><div><code>MCP</code><h3>{copy.mcpTitle}</h3><p>{copy.mcpText}</p></div></div></section>
        <section id="mcp"><p className="section-number">02</p><h2>{copy.mcpSectionTitle}</h2><p>{copy.mcpIntro}</p><pre className="api-code"><code>{`npx --yes textanalysis-tools@${cliPackage.version} mcp`}</code></pre><pre className="api-code"><code>{mcpConfig}</code></pre></section>
        <section id="tools"><p className="section-number">03</p><h2>{copy.toolsTitle}</h2><p>{copy.toolsText}</p><div className="feature-list">{toolNames.map(name=><div key={name}><h3>{name}</h3><p>{copy.toolMeta}</p></div>)}</div></section>
        {locale==="en"&&<section id="recipes"><p className="section-number">04</p><h2>Three practical agent recipes</h2><p>Use these sequences as auditable building blocks. Keep source identifiers beside every result and make decisions from measured fields, not generated impressions.</p><div className="cli-command-grid">{agentRecipes.map(recipe=><div key={recipe.title}><code>{recipe.tools}</code><h3>{recipe.title}</h3><p>{recipe.goal}</p><ol className="question-list">{recipe.steps.map(step=><li key={step}>{step}</li>)}</ol></div>)}</div></section>}
        <section id="contracts"><p className="section-number">{locale==="en"?"05":"04"}</p><h2>{copy.contractsTitle}</h2><p>{copy.contractsText}</p><div className="article-callout"><b>Machine-readable discovery</b><p><a href="/openapi.json">{SITE_URL}/openapi.json</a><br/><a href="/llms.txt">{SITE_URL}/llms.txt</a></p></div></section>
        <section id="boundaries"><p className="section-number">{locale==="en"?"06":"05"}</p><h2>{copy.boundariesTitle}</h2><ul className="question-list">{copy.boundaryItems.map(item=><li key={item}>{item}</li>)}</ul></section>
        <section className="article-final-cta"><p className="eyebrow">WEB · API · CLI · MCP</p><h2>{copy.ctaTitle}</h2><p>{copy.ctaText}</p><Link href={localizedPath(locale,"/cli")}>{copy.openCli} <span>→</span></Link></section>
      </div></div>
    </article>
    <SiteFooter locale={locale}/>
  </main>;
}
