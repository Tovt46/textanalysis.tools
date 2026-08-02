import Link from "next/link";
import type { UiLang } from "./i18n";
import { BOW_LANGUAGE_PATHS } from "./seo-metadata";
import { SiteFooter,SiteHeader } from "./SiteChrome";
import { localizedPath } from "./localization";

type HomeCopy={
  eyebrow:string;
  title:string;
  accent:string;
  intro:string;
  primary:string;
  secondary:string;
  privacy:string;
  live:string;
  languages:string;
  storage:string;
  facts:string;
  audienceLabel:string;
  audiences:Array<{label:string;title:string;description:string;cta:string}>;
  status:string;
  available:string;
  choose:string;
  chooseCopy:string;
  open:string;
  english:string;
  tools:Array<{name:string;description:string}>;
  methodEye:string;
  methodTitle:string;
  methods:Array<{title:string;description:string}>;
  guidesEye:string;
  guidesTitle:string;
  guides:Array<{label:string;title:string;description:string}>;
  apiEye:string;
  apiTitle:string;
  apiCopy:string;
  apiCta:string;
  cliCta:string;
  agentCta:string;
};

const COPY:Record<UiLang,HomeCopy>={
  en:{
    eyebrow:"WEB · API · CLI · MCP",
    title:"Free text analysis tools.",
    accent:"For people, code, and AI agents.",
    intro:"Use transparent text analysis in the browser, automate it through a stateless API, or run the same deterministic methods locally from a terminal or AI agent.",
    primary:"Choose a tool",
    secondary:"For AI agents",
    privacy:"Pasted text is processed without server storage.",
    live:"live tools",
    languages:"analysis languages",
    storage:"submitted text stored",
    facts:"Product facts",
    audienceLabel:"Choose your entry path",
    audiences:[
      {label:"PEOPLE",title:"Analyze in the browser",description:"Load an example, paste your text, and inspect a transparent result without writing code.",cta:"Browse the eight tools"},
      {label:"DEVELOPERS",title:"Automate with API or CLI",description:"Use stable JSON endpoints or the local-first npm CLI in scripts, CI, and editorial workflows.",cta:"Read developer docs"},
      {label:"AI AGENTS",title:"Connect deterministic tools",description:"Give agents typed, read-only analysis operations through MCP instead of asking them to estimate counts.",cta:"Open agent integrations"},
    ],
    status:"LIVE",
    available:"AVAILABLE NOW",
    choose:"Start with the question you need to answer",
    chooseCopy:"Each tool has a focused workflow, visible formulas, and a result you can inspect instead of a single opaque score.",
    open:"Open tool",
    english:"",
    tools:[
      {name:"Word Frequency Counter",description:"Count every word, search and sort the full vocabulary, edit stop words, and export CSV or JSON."},
      {name:"Keyword Density Checker",description:"Measure words, bigrams, and trigrams, track exact phrases, and compare density changes between two results."},
      {name:"Bag of Words Analyzer",description:"Review vocabulary, bigrams, tracked phrases, and Zipf distribution, then compare result A with result B."},
      {name:"Text Analysis Comparison",description:"Compare two texts or webpages by word count, vocabulary, normalized word frequency, bigrams, and Zipf diagnostics."},
      {name:"N-gram Analyzer",description:"Analyze recurring phrases of custom length (including bigrams and trigrams) in text or a public webpage."},
      {name:"Bag of Words Generator",description:"Build raw term vectors from text or a URL and inspect term frequencies, percentages, and export-ready rows."},
      {name:"TF-IDF Calculator",description:"Calculate corpus-aware TF-IDF scores for 2–10 documents and compare weighted term influence."},
      {name:"Text Similarity Calculator",description:"Measure cosine similarity between two texts with BoW or TF-IDF, then inspect top contribution terms."},
    ],
    methodEye:"WHY THIS TOOLKIT",
    methodTitle:"Useful numbers, with the method left visible",
    methods:[
      {title:"Transparent calculations",description:"Counts, percentages, and per-1,000 rates stay visible so you can verify what each result means."},
      {title:"Private by design",description:"Text-only work stays in your browser. If a workflow includes a public URL, required inputs use the stateless API and are not stored."},
      {title:"Made for comparison",description:"Normalize texts of different lengths and compare drafts, pages, or versions using the same settings."},
      {title:"No optimization score",description:"The tools expose patterns and repetition without pretending that one percentage determines content quality."},
    ],
    guidesEye:"LEARN THE METHODS",
    guidesTitle:"Formulas, examples, and limitations",
    guides:[
      {label:"GUIDE",title:"How to Calculate Word Frequency",description:"Counts, percentages, per-1,000 rates, tokenization, and a worked example."},
      {label:"GUIDE",title:"Keyword Density Formula",description:"Exact phrase calculations, comparison rules, and why density is not a ranking score."},
      {label:"NLP GUIDE",title:"Bag of Words Model",description:"How frequency tables become document vectors and machine-learning features."},
      {label:"NLP GUIDE",title:"TF-IDF Formula",description:"Term frequency, smoothed inverse document frequency, corpus effects, and a worked example."},
      {label:"NLP GUIDE",title:"Cosine Similarity for Text",description:"How document vectors become a 0–1 overlap score and what that score cannot prove."},
      {label:"NLP GUIDE",title:"What Are N-grams?",description:"Unigrams through longer phrase windows, denominators, filtering, and practical uses."},
      {label:"WORKFLOW GUIDE",title:"Compare Texts by Word Frequency",description:"Measure normalized vocabulary changes without confusing them with a character diff."},
    ],
    apiEye:"ONE ENGINE · MULTIPLE INTERFACES",
    apiTitle:"Use the same analysis from code, a terminal, or an AI agent",
    apiCopy:"Call the stateless JSON API, run eight local-first npm commands, or expose the same read-only operations through MCP. Every interface uses the same transparent analysis methods.",
    apiCta:"Read API documentation",
    cliCta:"Open CLI documentation",
    agentCta:"Explore agent integrations",
  },
  ru:{
    eyebrow:"WEB · API · CLI · MCP",
    title:"Бесплатные инструменты анализа текста.",
    accent:"Для людей, кода и AI-агентов.",
    intro:"Используйте прозрачный анализ в браузере, автоматизируйте его через API или запускайте те же детерминированные методы локально из терминала и AI-агентов.",
    primary:"Выбрать инструмент",
    secondary:"Для AI-агентов",
    privacy:"Вставленный текст обрабатывается без хранения на сервере.",
    live:"рабочих инструмента",
    languages:"языка анализа",
    storage:"текста сохраняется",
    facts:"Факты о продукте",
    audienceLabel:"Выберите свой сценарий",
    audiences:[
      {label:"ЛЮДЯМ",title:"Анализ в браузере",description:"Загрузите пример, вставьте текст и изучите прозрачный результат без программирования.",cta:"Открыть восемь инструментов"},
      {label:"РАЗРАБОТЧИКАМ",title:"Автоматизация через API или CLI",description:"Используйте стабильный JSON API или локальный npm CLI в скриптах, CI и редакционных процессах.",cta:"Открыть документацию"},
      {label:"AI-АГЕНТАМ",title:"Детерминированные инструменты",description:"Подключайте типизированные read-only операции через MCP вместо приблизительных подсчётов моделью.",cta:"Открыть интеграции"},
    ],
    status:"РАБОТАЕТ",
    available:"ДОСТУПНО СЕЙЧАС",
    choose:"Начните с вопроса, на который нужен ответ",
    chooseCopy:"У каждого инструмента — отдельный сценарий, видимые формулы и проверяемый результат вместо непрозрачной оценки.",
    open:"Открыть",
    english:"",
    tools:[
      {name:"Счётчик частотности слов",description:"Посчитайте все слова, найдите нужный термин, отсортируйте словарь и экспортируйте CSV или JSON."},
      {name:"Анализатор плотности ключей",description:"Измерьте слова, биграммы и триграммы, проверьте точные фразы и сравните изменения между результатами."},
      {name:"Bag of Words-анализатор",description:"Проверьте лексику, биграммы, контрольные фразы и распределение Ципфа, затем сравните результаты A и B."},
      {name:"Сравнение двух текстов",description:"Сопоставьте два текста или URL по объёму, словарю, нормализованной частотности, биграммам и показателям Ципфа."},
      {name:"N-gram анализатор",description:"Анализируйте повторяющиеся фразы длиной от одного до десяти слов в тексте или на публичной странице."},
      {name:"Генератор Bag of Words",description:"Создавайте исходные векторы документов из текста или URL и сохраняйте таблицу частот для дальнейшего анализа."},
      {name:"Калькулятор TF-IDF",description:"Рассчитывайте веса TF-IDF для 2–10 документов, чтобы уменьшить влияние терминов, общих для всего корпуса."},
      {name:"Калькулятор сходства текстов",description:"Измеряйте косинусное сходство двух текстов на основе BoW или TF-IDF и изучайте вклад отдельных терминов."},
    ],
    methodEye:"ПОЧЕМУ ЭТОТ НАБОР",
    methodTitle:"Полезные цифры с понятной методикой",
    methods:[
      {title:"Прозрачные расчёты",description:"Количество, проценты и частота на 1 000 слов видны в результате — их можно проверить вручную."},
      {title:"Приватность по умолчанию",description:"Работа только с текстом остаётся в браузере. Если в сценарии есть публичный URL, необходимые входные данные обрабатываются API без сохранения."},
      {title:"Создано для сравнения",description:"Сопоставляйте черновики, страницы и версии разной длины с одинаковыми настройками."},
      {title:"Без выдуманного SEO-балла",description:"Инструменты показывают повторы и закономерности, не выдавая один процент за оценку качества текста."},
    ],
    guidesEye:"РАЗОБРАТЬСЯ В МЕТОДЕ",
    guidesTitle:"Формулы, примеры и ограничения",
    guides:[
      {label:"ГАЙД",title:"Как рассчитать частотность слов",description:"Количество, проценты, частота на 1 000 слов, токенизация и пример расчёта."},
      {label:"ГАЙД",title:"Формула плотности ключей",description:"Расчёт точных фраз, правила сравнения и ограничения показателя."},
      {label:"NLP-ГАЙД",title:"Модель Bag of Words",description:"Как таблица частот превращается в векторы документов и признаки для машинного обучения."},
      {label:"NLP-ГАЙД",title:"Формула TF-IDF",description:"Частота термина, сглаженный IDF, влияние корпуса и пример расчёта."},
      {label:"NLP-ГАЙД",title:"Косинусное сходство текстов",description:"Как векторы документов превращаются в оценку от 0 до 1 и как её интерпретировать."},
      {label:"NLP-ГАЙД",title:"Что такое N-граммы?",description:"Последовательности слов, знаменатели, фильтрация и практические сценарии."},
      {label:"ГАЙД",title:"Сравнение текстов по частотности",description:"Нормализованные изменения словаря без подмены анализа посимвольным diff."},
    ],
    apiEye:"ОДИН ДВИЖОК · НЕСКОЛЬКО ИНТЕРФЕЙСОВ",
    apiTitle:"Используйте анализ из кода, терминала или AI-агента",
    apiCopy:"Вызывайте JSON API, запускайте восемь локальных npm-команд или подключайте те же read-only операции через MCP. Везде используются одинаковые прозрачные методы.",
    apiCta:"Открыть документацию API",
    cliCta:"Открыть документацию CLI",
    agentCta:"Интеграции для агентов",
  },
  uk:{
    eyebrow:"WEB · API · CLI · MCP",
    title:"Безкоштовні інструменти аналізу тексту.",
    accent:"Для людей, коду й AI-агентів.",
    intro:"Використовуйте прозорий аналіз у браузері, автоматизуйте його через API або запускайте ті самі детерміновані методи локально з термінала й AI-агентів.",
    primary:"Вибрати інструмент",
    secondary:"Для AI-агентів",
    privacy:"Вставлений текст обробляється без зберігання на сервері.",
    live:"робочі інструменти",
    languages:"мови аналізу",
    storage:"тексту зберігається",
    facts:"Відомості про продукт",
    audienceLabel:"Оберіть свій сценарій",
    audiences:[
      {label:"ЛЮДЯМ",title:"Аналіз у браузері",description:"Завантажте приклад, вставте текст і перегляньте прозорий результат без програмування.",cta:"Відкрити вісім інструментів"},
      {label:"РОЗРОБНИКАМ",title:"Автоматизація через API або CLI",description:"Використовуйте стабільний JSON API або локальний npm CLI у скриптах, CI та редакційних процесах.",cta:"Відкрити документацію"},
      {label:"AI-АГЕНТАМ",title:"Детерміновані інструменти",description:"Підключайте типізовані read-only операції через MCP замість приблизних підрахунків моделлю.",cta:"Відкрити інтеграції"},
    ],
    status:"ПРАЦЮЄ",
    available:"ДОСТУПНО ЗАРАЗ",
    choose:"Почніть із запитання, на яке потрібна відповідь",
    chooseCopy:"Кожен інструмент має окремий сценарій, видимі формули та результат, який можна перевірити замість непрозорої оцінки.",
    open:"Відкрити",
    english:"",
    tools:[
      {name:"Лічильник частотності слів",description:"Порахуйте всі слова, знайдіть потрібний термін, відсортуйте словник і експортуйте CSV або JSON."},
      {name:"Аналізатор щільності ключів",description:"Виміряйте слова, біграми й триграми, перевірте точні фрази та порівняйте зміни між результатами."},
      {name:"Bag of Words-аналізатор",description:"Перевірте лексику, біграми, контрольні фрази й розподіл Ципфа, а потім порівняйте результати A і B."},
      {name:"Порівняння двох текстів",description:"Зіставте два тексти або URL за обсягом, словником, нормалізованою частотністю, біграмами й показниками Ципфа."},
      {name:"Аналізатор N-грам",description:"Аналізуйте повторювані фрази різної довжини (від біграм до триграм) для тексту або публічного URL."},
      {name:"Генератор Bag of Words",description:"Побудуйте сирі вектори термінів із тексту або URL та перегляньте частоти, відсотки й значення для експорту."},
      {name:"Калькулятор TF-IDF",description:"Розрахуйте TF-IDF ваги для 2–10 документів і зосередьтеся на термінах з найвищою розрізнювальною здатністю."},
      {name:"Калькулятор подібності текстів",description:"Оцініть косинусну подібність текстів через BoW або TF-IDF і перегляньте внески ключових термінів."},
    ],
    methodEye:"ЧОМУ ЦЕЙ НАБІР",
    methodTitle:"Корисні числа з прозорою методикою",
    methods:[
      {title:"Прозорі розрахунки",description:"Кількість, відсотки й частота на 1 000 слів залишаються видимими — їх можна перевірити вручну."},
      {title:"Приватність за замовчуванням",description:"Робота лише з текстом залишається у браузері. Якщо у сценарії є публічний URL, потрібні вхідні дані обробляються API без збереження."},
      {title:"Створено для порівняння",description:"Зіставляйте чернетки, сторінки й версії різної довжини з однаковими налаштуваннями."},
      {title:"Без вигаданого SEO-бала",description:"Інструменти показують повтори й закономірності, не видаючи один відсоток за оцінку якості тексту."},
    ],
    guidesEye:"ЗРОЗУМІТИ МЕТОД",
    guidesTitle:"Формули, приклади й обмеження",
    guides:[
      {label:"ГАЙД",title:"Як розрахувати частотність слів",description:"Кількість, відсотки, частота на 1 000 слів, токенізація та приклад розрахунку."},
      {label:"ГАЙД",title:"Формула щільності ключів",description:"Розрахунок точних фраз, правила порівняння й обмеження показника."},
      {label:"NLP-ГАЙД",title:"Модель Bag of Words",description:"Як таблиця частот перетворюється на вектори документів і ознаки для машинного навчання."},
      {label:"NLP-ГАЙД",title:"Формула TF-IDF",description:"Частота терміна, згладжений IDF, вплив корпусу та приклад розрахунку."},
      {label:"NLP-ГАЙД",title:"Косинусна подібність текстів",description:"Як вектори документів перетворюються на оцінку від 0 до 1 та як її тлумачити."},
      {label:"NLP-ГАЙД",title:"Що таке N-грами?",description:"Послідовності слів, знаменники, фільтрація та практичні сценарії."},
      {label:"ГАЙД",title:"Порівняння текстів за частотністю",description:"Нормалізовані зміни словника без підміни аналізу посимвольним diff."},
    ],
    apiEye:"ОДИН РУШІЙ · КІЛЬКА ІНТЕРФЕЙСІВ",
    apiTitle:"Використовуйте аналіз із коду, термінала або AI-агента",
    apiCopy:"Викликайте JSON API, запускайте вісім локальних npm-команд або підключайте ті самі read-only операції через MCP. Усі інтерфейси використовують однакові прозорі методи.",
    apiCta:"Відкрити документацію API",
    cliCta:"Відкрити документацію CLI",
    agentCta:"Інтеграції для агентів",
  },
  es:{
    eyebrow:"WEB · API · CLI · MCP",
    title:"Herramientas gratuitas de análisis de texto.",
    accent:"Para personas, código y agentes de IA.",
    intro:"Usa análisis transparente en el navegador, automatízalo mediante la API o ejecuta los mismos métodos deterministas localmente desde una terminal o un agente de IA.",
    primary:"Elegir una herramienta",
    secondary:"Para agentes de IA",
    privacy:"El texto pegado se procesa sin almacenarse en el servidor.",
    live:"herramientas activas",
    languages:"idiomas de análisis",
    storage:"texto enviado almacenado",
    facts:"Datos del producto",
    audienceLabel:"Elige tu punto de entrada",
    audiences:[
      {label:"PERSONAS",title:"Analiza en el navegador",description:"Carga un ejemplo, pega tu texto y revisa un resultado transparente sin programar.",cta:"Ver las ocho herramientas"},
      {label:"DESARROLLADORES",title:"Automatiza con API o CLI",description:"Usa endpoints JSON estables o el CLI npm local en scripts, CI y flujos editoriales.",cta:"Leer la documentación"},
      {label:"AGENTES DE IA",title:"Conecta herramientas deterministas",description:"Ofrece operaciones tipadas y de solo lectura mediante MCP en lugar de estimar recuentos con el modelo.",cta:"Abrir integraciones"},
    ],
    status:"ACTIVA",
    available:"DISPONIBLE AHORA",
    choose:"Empieza por la pregunta que necesitas responder",
    chooseCopy:"Cada herramienta ofrece un flujo específico, fórmulas visibles y un resultado verificable en lugar de una puntuación opaca.",
    open:"Abrir herramienta",
    english:"",
    tools:[
      {name:"Contador de frecuencia de palabras",description:"Cuenta todas las palabras, busca y ordena el vocabulario completo, edita palabras vacías y exporta CSV o JSON."},
      {name:"Analizador de densidad de palabras clave",description:"Mide palabras, bigramas y trigramas, sigue frases exactas y compara cambios de densidad entre dos resultados."},
      {name:"Analizador Bag of Words",description:"Revisa vocabulario, bigramas, frases controladas y distribución de Zipf; después compara los resultados A y B."},
      {name:"Comparador de textos",description:"Compara dos textos o páginas por extensión, vocabulario, frecuencia normalizada, bigramas y métricas de Zipf."},
      {name:"Analizador de N-gramas",description:"Analiza frases repetidas de 1 a 10 palabras en un texto o una página web pública."},
      {name:"Generador Bag of Words",description:"Crea vectores de términos a partir de texto o URL y consulta frecuencias, porcentajes y filas exportables."},
      {name:"Calculadora TF-IDF",description:"Calcula pesos TF-IDF para un corpus de 2 a 10 documentos y compara la influencia de cada término."},
      {name:"Calculadora de similitud de textos",description:"Mide la similitud coseno con BoW o TF-IDF y examina los términos que más contribuyen al resultado."},
    ],
    methodEye:"POR QUÉ ESTE CONJUNTO",
    methodTitle:"Cifras útiles con una metodología visible",
    methods:[
      {title:"Cálculos transparentes",description:"Los recuentos, porcentajes y tasas por 1.000 permanecen visibles para que puedas verificar cada resultado."},
      {title:"Privacidad por diseño",description:"El trabajo solo con texto permanece en el navegador. Si el flujo incluye una URL pública, la API procesa sin guardar las entradas necesarias."},
      {title:"Creado para comparar",description:"Normaliza textos de distinta longitud y compara borradores, páginas o versiones con los mismos ajustes."},
      {title:"Sin puntuaciones inventadas",description:"Las herramientas muestran patrones y repeticiones sin presentar un único porcentaje como medida de calidad."},
    ],
    guidesEye:"ENTENDER EL MÉTODO",
    guidesTitle:"Fórmulas, ejemplos y limitaciones",
    guides:[
      {label:"GUÍA",title:"Cómo calcular la frecuencia de palabras",description:"Recuentos, porcentajes, frecuencia por 1.000 palabras, tokenización y ejemplo resuelto."},
      {label:"GUÍA",title:"Fórmula de densidad de palabras clave",description:"Cálculo de frases exactas, reglas de comparación y limitaciones de la métrica."},
      {label:"GUÍA NLP",title:"Modelo Bag of Words",description:"Cómo una tabla de frecuencias se convierte en vectores de documentos y variables para aprendizaje automático."},
      {label:"GUÍA NLP",title:"Fórmula TF-IDF",description:"Frecuencia del término, IDF suavizado, efecto del corpus y ejemplo de cálculo."},
      {label:"GUÍA NLP",title:"Similitud coseno entre textos",description:"Cómo los vectores se convierten en una puntuación de 0 a 1 y cómo interpretarla."},
      {label:"GUÍA NLP",title:"¿Qué son los N-gramas?",description:"Secuencias de palabras, denominadores, filtrado y usos prácticos."},
      {label:"GUÍA",title:"Comparar textos por frecuencia",description:"Cambios normalizados de vocabulario sin confundirlos con un diff carácter por carácter."},
    ],
    apiEye:"UN MOTOR · VARIAS INTERFACES",
    apiTitle:"Usa el análisis desde código, una terminal o un agente de IA",
    apiCopy:"Llama a la API JSON, ejecuta ocho comandos npm locales o expón las mismas operaciones de solo lectura mediante MCP. Todas las interfaces usan los mismos métodos transparentes.",
    apiCta:"Leer la documentación de la API",
    cliCta:"Abrir la documentación de CLI",
    agentCta:"Integraciones para agentes",
  },
};

const HOME_PATHS:Record<UiLang,string>={en:"/",ru:"/ru",uk:"/uk",es:"/es"};
const TOOL_PATHS=[
  "/tools/word-frequency-counter",
  "/tools/keyword-density-checker",
  "/tools/bag-of-words-analyzer",
  "/tools/text-analysis-comparison",
  "/tools/ngram-analyzer",
  "/tools/bag-of-words-generator",
  "/tools/tf-idf-calculator",
  "/tools/text-similarity-calculator",
] as const;
const GUIDE_PATHS=[
  "/how-to-calculate-word-frequency",
  "/keyword-density-formula",
  "/bag-of-words-model",
  "/tf-idf-formula",
  "/cosine-similarity-for-text",
  "/what-are-n-grams",
  "/compare-texts-by-word-frequency",
] as const;

export default function HomePage({locale}:{locale:UiLang}){
  const copy=COPY[locale];
  const toolPaths=[
    localizedPath(locale,TOOL_PATHS[0]),
    localizedPath(locale,TOOL_PATHS[1]),
    BOW_LANGUAGE_PATHS[locale],
    localizedPath(locale,TOOL_PATHS[3]),
    localizedPath(locale,TOOL_PATHS[4]),
    localizedPath(locale,TOOL_PATHS[5]),
    localizedPath(locale,TOOL_PATHS[6]),
    localizedPath(locale,TOOL_PATHS[7]),
  ];
  const guidePaths=GUIDE_PATHS.map(path=>localizedPath(locale,path));
  return <main className="home-page">
    <SiteHeader locale={locale} active="home" languagePaths={HOME_PATHS}/>
    <section className="home-hero">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}<br/><em>{copy.accent}</em></h1>
      <div className="home-hero-aside">
        <p>{copy.intro}</p>
        <div className="home-actions"><a className="home-primary" href="#available-tools">{copy.primary}<span>↓</span></a><Link href={localizedPath(locale,"/agents")}>{copy.secondary}<span>→</span></Link></div>
        <span className="privacy-note"><b/>{copy.privacy}</span>
      </div>
    </section>
    <section className="home-stats" aria-label={copy.facts}><div><strong>8</strong><span>{copy.live}</span></div><div><strong>4</strong><span>{copy.languages}</span></div><div><strong>0</strong><span>{copy.storage}</span></div></section>
    <section className="home-audiences" aria-label={copy.audienceLabel}>
      {copy.audiences.map((audience,index)=>{
        const href=index===0?"#available-tools":localizedPath(locale,index===1?"/api-docs":"/agents");
        return <Link href={href} key={audience.label} data-audience={index===0?"people":index===1?"developers":"agents"}><span>{audience.label}</span><h2>{audience.title}</h2><p>{audience.description}</p><strong>{audience.cta}<b>→</b></strong></Link>;
      })}
    </section>
    <section className="home-section home-tools" id="available-tools" aria-labelledby="home-tools-title">
      <div className="home-section-heading"><p className="section-number">{copy.available}</p><h2 id="home-tools-title">{copy.choose}</h2><p>{copy.chooseCopy}</p></div>
      <div className="home-tool-grid">{copy.tools.map((tool,index)=><Link className={`home-tool-card tool-${index+1}`} href={toolPaths[index]} key={tool.name}><div className="home-tool-card-top"><span>0{index+1} · {copy.status}</span></div><h3>{tool.name}</h3><p>{tool.description}</p><strong>{copy.open}<b>→</b></strong></Link>)}</div>
    </section>
    <section className="home-method">
      <div className="home-section-heading"><p className="section-number">{copy.methodEye}</p><h2>{copy.methodTitle}</h2></div>
      <div className="home-method-grid">{copy.methods.map((method,index)=><article key={method.title}><span>0{index+1}</span><h3>{method.title}</h3><p>{method.description}</p></article>)}</div>
    </section>
    <section className="home-section home-guides">
      <div className="home-section-heading"><p className="section-number">{copy.guidesEye}</p><h2>{copy.guidesTitle}</h2></div>
      <div className="learning-grid">{copy.guides.map((guide,index)=><Link href={guidePaths[index]} key={guide.title}><span>{guide.label}</span><h3>{guide.title}</h3><p>{guide.description}</p></Link>)}</div>
    </section>
    <section className="home-api">
      <div><p className="eyebrow">{copy.apiEye}</p><h2>{copy.apiTitle}</h2></div>
      <div><p>{copy.apiCopy}</p><div className="home-developer-links"><Link href={localizedPath(locale,"/api-docs")}>{copy.apiCta}<span>→</span></Link><Link href={localizedPath(locale,"/cli")}>{copy.cliCta}<span>→</span></Link><Link href={localizedPath(locale,"/agents")}>{copy.agentCta}<span>→</span></Link></div></div>
    </section>
    <SiteFooter locale={locale}/>
  </main>;
}
