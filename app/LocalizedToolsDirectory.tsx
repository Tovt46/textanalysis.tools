import Link from "next/link";
import type { Metadata } from "next";
import type { UiLang } from "./i18n";
import { languagePaths,localizedMetadata,localizedPath } from "./localization";
import { SiteFooter,SiteHeader } from "./SiteChrome";
import { SITE_NAME,SITE_URL } from "./seo-metadata";

type LocalizedLocale=Exclude<UiLang,"en">;

const TOOL_PATHS=[
  "/tools/word-frequency-counter",
  "/tools/keyword-density-checker",
  "/tools/bag-of-words-analyzer",
  "/tools/text-analysis-comparison",
  "/tools/ngram-analyzer",
  "/tools/bag-of-words-generator",
  "/tools/tf-idf-calculator",
  "/tools/text-similarity-calculator",
];

const GUIDE_PATHS=[
  "/how-to-calculate-word-frequency",
  "/keyword-density-formula",
  "/bag-of-words-model",
  "/bag-of-words-vs-word2vec",
  "/tf-idf-formula",
  "/cosine-similarity-for-text",
  "/what-are-n-grams",
  "/compare-texts-by-word-frequency",
];

const COPY={
  ru:{
    title:"Все бесплатные инструменты анализа текста",
    description:"Бесплатные браузерные инструменты для частотности слов, плотности ключей, N-грамм, сравнения текстов, Bag of Words, TF-IDF и косинусного сходства.",
    home:"Главная",tools:"Инструменты",eyebrow:"ПОЛНЫЙ КАТАЛОГ ИНСТРУМЕНТОВ",heading:"Все инструменты анализа текста",intro:"Выберите отдельный сценарий для частотности слов, плотности ключей, векторизации или сравнения документов. Каждый инструмент показывает методику и не сохраняет вставленный текст на сервере.",
    liveEye:"8 РАБОЧИХ ИНСТРУМЕНТОВ",liveTitle:"Выберите нужный тип анализа",open:"Открыть инструмент",
    toolNames:["Счётчик частотности слов","Анализатор плотности ключей","Bag of Words-анализатор","Сравнение текстов","Анализатор N-грамм","Генератор Bag of Words","Калькулятор TF-IDF","Калькулятор сходства текстов"],
    toolDescriptions:["Полный словарь, поиск, сортировка, стоп-слова и экспорт CSV/JSON.","Слова, биграммы, триграммы, точные фразы и сравнение результатов A/B.","Словарь, контрольные фразы, биграммы, распределение Ципфа и сравнение A/B.","Нормализованные различия слов и биграмм между двумя текстами или URL.","Повторяющиеся последовательности длиной от 1 до 10 слов.","Воспроизводимый вектор терминов с количеством и нормализованными частотами.","Корпусные веса терминов для 2–10 документов с общей таблицей IDF.","Косинусное сходство по BoW или TF-IDF с таблицей вклада терминов."],
    guidesEye:"ИЗУЧИТЬ МЕТОДЫ",guidesTitle:"Формулы, примеры и ограничения",read:"Читать гайд",
    guideNames:["Как рассчитать частотность слов","Формула плотности ключей","Модель Bag of Words","Bag of Words и Word2Vec","Формула TF-IDF","Косинусное сходство текстов","Что такое N-граммы","Сравнение текстов по частотности"],
    guideDescriptions:["Количество, проценты, частота на 1 000 и токенизация.","Точные вхождения, правила сравнения и ограничения показателя.","Как таблица частот превращается в вектор признаков.","Счётчики терминов и обученные семантические векторы.","Нормированный TF, сглаженный IDF и пример расчёта.","Формула, вклад терминов и интерпретация оценки 0–1.","Окна слов, знаменатели и фильтрация последовательностей.","Пошаговая проверка нормализованных изменений словаря."],
    developerEye:"АВТОМАТИЗАЦИЯ",developerTitle:"Те же методы через API или терминал",developerText:"Используйте публичный JSON API в приложении или запускайте восемь локальных команд из npm.",api:"Документация API",cli:"Документация CLI",breadcrumb:"Навигационная цепочка",live:"РАБОТАЕТ",guide:"ГАЙД",publicApi:"ПУБЛИЧНЫЙ · БЕЗ КЛЮЧА",
  },
  uk:{
    title:"Усі безкоштовні інструменти аналізу тексту",
    description:"Безкоштовні браузерні інструменти для частотності слів, щільності ключів, N-грам, порівняння текстів, Bag of Words, TF-IDF і косинусної подібності.",
    home:"Головна",tools:"Інструменти",eyebrow:"ПОВНИЙ КАТАЛОГ ІНСТРУМЕНТІВ",heading:"Усі інструменти аналізу тексту",intro:"Виберіть окремий сценарій для частотності слів, щільності ключів, векторизації чи порівняння документів. Кожен інструмент показує методику й не зберігає вставлений текст на сервері.",
    liveEye:"8 РОБОЧИХ ІНСТРУМЕНТІВ",liveTitle:"Виберіть потрібний тип аналізу",open:"Відкрити інструмент",
    toolNames:["Лічильник частотності слів","Аналізатор щільності ключів","Bag of Words-аналізатор","Порівняння текстів","Аналізатор N-грам","Генератор Bag of Words","Калькулятор TF-IDF","Калькулятор подібності текстів"],
    toolDescriptions:["Повний словник, пошук, сортування, стоп-слова й експорт CSV/JSON.","Слова, біграми, триграми, точні фрази та порівняння результатів A/B.","Словник, контрольні фрази, біграми, розподіл Ципфа й порівняння A/B.","Нормалізовані відмінності слів і біграм між двома текстами або URL.","Повторювані послідовності довжиною від 1 до 10 слів.","Відтворюваний вектор термінів із кількістю й нормалізованими частотами.","Корпусні ваги термінів для 2–10 документів зі спільною таблицею IDF.","Косинусна подібність за BoW або TF-IDF із таблицею внеску термінів."],
    guidesEye:"ВИВЧИТИ МЕТОДИ",guidesTitle:"Формули, приклади й обмеження",read:"Читати гайд",
    guideNames:["Як розрахувати частотність слів","Формула щільності ключів","Модель Bag of Words","Bag of Words і Word2Vec","Формула TF-IDF","Косинусна подібність текстів","Що таке N-грами","Порівняння текстів за частотністю"],
    guideDescriptions:["Кількість, відсотки, частота на 1 000 і токенізація.","Точні входження, правила порівняння й обмеження показника.","Як таблиця частот перетворюється на вектор ознак.","Лічильники термінів і навчені семантичні вектори.","Нормований TF, згладжений IDF і приклад розрахунку.","Формула, внесок термінів і тлумачення оцінки 0–1.","Вікна слів, знаменники й фільтрація послідовностей.","Покрокова перевірка нормалізованих змін словника."],
    developerEye:"АВТОМАТИЗАЦІЯ",developerTitle:"Ті самі методи через API або термінал",developerText:"Використовуйте публічний JSON API у програмі або запускайте вісім локальних команд із npm.",api:"Документація API",cli:"Документація CLI",breadcrumb:"Навігаційний ланцюжок",live:"ПРАЦЮЄ",guide:"ГАЙД",publicApi:"ПУБЛІЧНИЙ · БЕЗ КЛЮЧА",
  },
  es:{
    title:"Todas las herramientas gratuitas de análisis de texto",
    description:"Herramientas gratuitas en el navegador para frecuencia de palabras, densidad, N-gramas, comparación de textos, Bag of Words, TF-IDF y similitud coseno.",
    home:"Inicio",tools:"Herramientas",eyebrow:"CATÁLOGO COMPLETO DE HERRAMIENTAS",heading:"Todas las herramientas de análisis de texto",intro:"Elige una tarea concreta para analizar frecuencias, densidad, vectores o comparar documentos. Cada herramienta explica el método y no almacena en el servidor el texto que pegas.",
    liveEye:"8 HERRAMIENTAS ACTIVAS",liveTitle:"Elige el tipo de análisis",open:"Abrir herramienta",
    toolNames:["Contador de frecuencia de palabras","Analizador de densidad de palabras clave","Analizador Bag of Words","Comparación de textos","Analizador de N-gramas","Generador Bag of Words","Calculadora TF-IDF","Calculadora de similitud de textos"],
    toolDescriptions:["Vocabulario completo, búsqueda, ordenación, palabras vacías y exportación CSV/JSON.","Palabras, bigramas, trigramas, frases exactas y comparación A/B.","Vocabulario, frases controladas, bigramas, distribución de Zipf y comparación A/B.","Diferencias normalizadas de palabras y bigramas entre dos textos o URL.","Secuencias repetidas de 1 a 10 palabras.","Vector reproducible de términos con cantidades y frecuencias normalizadas.","Pesos de términos para corpus de 2–10 documentos con tabla IDF común.","Similitud coseno con BoW o TF-IDF y tabla de contribución."],
    guidesEye:"APRENDER LOS MÉTODOS",guidesTitle:"Fórmulas, ejemplos y limitaciones",read:"Leer guía",
    guideNames:["Cómo calcular la frecuencia de palabras","Fórmula de densidad de palabras clave","Modelo Bag of Words","Bag of Words frente a Word2Vec","Fórmula TF-IDF","Similitud coseno para textos","Qué son los N-gramas","Comparar textos por frecuencia"],
    guideDescriptions:["Cantidad, porcentajes, frecuencia por 1.000 y tokenización.","Coincidencias exactas, reglas de comparación y límites de la métrica.","Cómo una tabla de frecuencias se convierte en un vector.","Contadores de términos frente a vectores semánticos entrenados.","TF normalizado, IDF suavizado y ejemplo de cálculo.","Fórmula, contribución de términos e interpretación de 0 a 1.","Ventanas de palabras, denominadores y filtrado de secuencias.","Proceso paso a paso para revisar cambios normalizados."],
    developerEye:"AUTOMATIZACIÓN",developerTitle:"Los mismos métodos mediante API o terminal",developerText:"Usa la API JSON pública en tu aplicación o ejecuta ocho comandos locales desde npm.",api:"Documentación de la API",cli:"Documentación de CLI",breadcrumb:"Migas de pan",live:"ACTIVA",guide:"GUÍA",publicApi:"PÚBLICA · SIN CLAVE",
  },
} satisfies Record<LocalizedLocale,Record<string,string|string[]>>;

export function localizedToolsMetadata(locale:LocalizedLocale):Metadata{
  const copy=COPY[locale];
  return localizedMetadata({locale,path:"/tools",title:copy.title as string,description:copy.description as string});
}

export default function LocalizedToolsDirectory({locale}:{locale:LocalizedLocale}){
  const copy=COPY[locale];
  const toolNames=copy.toolNames as string[];
  const toolDescriptions=copy.toolDescriptions as string[];
  const guideNames=copy.guideNames as string[];
  const guideDescriptions=copy.guideDescriptions as string[];
  const schema={"@context":"https://schema.org","@type":"CollectionPage",name:copy.title,description:copy.description,inLanguage:locale,url:`${SITE_URL}${localizedPath(locale,"/tools")}`,isPartOf:{"@type":"WebSite",name:SITE_NAME,url:SITE_URL},mainEntity:{"@type":"ItemList",itemListElement:TOOL_PATHS.map((path,index)=>({"@type":"ListItem",position:index+1,name:toolNames[index],url:`${SITE_URL}${localizedPath(locale,path)}`}))}};

  return <main className="tool-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <SiteHeader locale={locale} active="tools" languagePaths={languagePaths("/tools")}/>
    <section className="tools-directory-hero"><nav className="breadcrumbs" aria-label={copy.breadcrumb}><Link href={localizedPath(locale,"/")}>{copy.home}</Link><span>/</span><span>{copy.tools}</span></nav><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.heading}</h1><p>{copy.intro}</p></section>
    <section className="tools-directory" aria-labelledby="localized-live-tools"><div className="directory-heading"><p className="section-number">{copy.liveEye}</p><h2 id="localized-live-tools">{copy.liveTitle}</h2></div><div className="directory-grid">{TOOL_PATHS.map((path,index)=><Link className="directory-card featured" href={localizedPath(locale,path)} key={path}><div><span>{String(index+1).padStart(2,"0")} · {copy.live}</span><b>↗</b></div><h2>{toolNames[index]}</h2><p>{toolDescriptions[index]}</p><strong>{copy.open} →</strong></Link>)}</div></section>
    <section className="tools-directory learning-directory" aria-labelledby="localized-guides"><div className="directory-heading"><p className="section-number">{copy.guidesEye}</p><h2 id="localized-guides">{copy.guidesTitle}</h2></div><div className="learning-grid">{GUIDE_PATHS.map((path,index)=><Link href={localizedPath(locale,path)} key={path}><span>{index===3?"NLP":copy.guide}</span><h3>{guideNames[index]}</h3><p>{guideDescriptions[index]}</p><strong>{copy.read} →</strong></Link>)}</div></section>
    <section className="tools-directory planned-tools" aria-labelledby="localized-developer"><div className="directory-heading"><p className="section-number">{copy.developerEye}</p><h2 id="localized-developer">{copy.developerTitle}</h2><p>{copy.developerText}</p></div><div className="planned-grid developer-grid"><Link href={localizedPath(locale,"/api-docs")}><span>{copy.publicApi}</span><h3>{copy.api}</h3></Link><Link href={localizedPath(locale,"/cli")}><span>NPM · MIT</span><h3>{copy.cli}</h3></Link></div></section>
    <SiteFooter locale={locale}/>
  </main>;
}
