import Link from "next/link";
import HomeIntegrations from "./HomeIntegrations";
import "./home-redesign.css";
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
    title:"Free Text Analysis Tools",
    accent:"For Humans and AI Agents",
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
      {label:"AI AGENTS",title:"Connect deterministic tools",description:"Works with MCP-compatible agents such as Codex, Claude Code, and Gemini CLI. They can call precise, read-only analysis tools instead of guessing word counts.",cta:"Open agent integrations"},
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
    title:"Бесплатные инструменты анализа текста",
    accent:"Для людей и AI-агентов",
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
      {label:"AI-АГЕНТАМ",title:"Детерминированные инструменты",description:"Работает с MCP-совместимыми агентами, включая Codex, Claude Code и Gemini CLI. Они получают точные инструменты анализа вместо приблизительных подсчётов.",cta:"Открыть интеграции"},
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
    title:"Безкоштовні інструменти аналізу тексту",
    accent:"Для людей та AI-агентів",
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
      {label:"AI-АГЕНТАМ",title:"Детерміновані інструменти",description:"Працює з MCP-сумісними агентами, зокрема Codex, Claude Code і Gemini CLI. Вони отримують точні інструменти аналізу замість приблизних підрахунків.",cta:"Відкрити інтеграції"},
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
    title:"Herramientas gratuitas de análisis de texto",
    accent:"Para personas y agentes de IA",
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
      {label:"AGENTES DE IA",title:"Conecta herramientas deterministas",description:"Funciona con agentes compatibles con MCP, como Codex, Claude Code y Gemini CLI. Pueden usar herramientas de análisis precisas y de solo lectura en lugar de estimar recuentos.",cta:"Abrir integraciones"},
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

type RedesignCopy = {
  title: string; accent: string; intro: string; start: string; bringAgent: string;
  demo: string; methods: string; workspace: string; explore: string; yourTools: string;
  local: string; sample: string; words: string; word: string; count: string; density: string;
  openSample: string; formula: string; steps: [string, string, string];
  toolEye: string; toolTitle: string; toolIntro: string; agentEye: string;
  agentTitle: string; agentAccent: string; agentIntro: string; developers: string;
};
const REDESIGN: Record<UiLang, RedesignCopy> = {
  en: {
    title: "Every word", accent: "in focus", intro: "Find the patterns in your writing. Explore words, compare drafts, and see exactly how the numbers add up.", start: "Start analyzing", bringAgent: "Bring your agent",
    demo: "A clear view of what’s on the page", methods: "REAL WORDS. VISIBLE METHODS.", workspace: "Workspace", explore: "Explore the workspace", yourTools: "YOUR TOOLS", local: "Runs in your browser", sample: "English sample", words: "12 words", word: "WORD", count: "COUNT", density: "DENSITY", openSample: "Open word frequency", formula: "Density = occurrences ÷ 12 words × 100", steps: ["Paste your text", "Inspect the patterns", "Take the results with you"],
    toolEye: "A TOOL FOR THE QUESTION", toolTitle: "Go beyond the word count", toolIntro: "A focused toolkit for the way you work with language.", agentEye: "ONE ENGINE. YOUR WAY OF WORKING.", agentTitle: "Good tools.", agentAccent: "For you & your agents.", agentIntro: "Use the browser when you want to look closer. Use API, CLI, or MCP when you want to go further. The same transparent methods, wherever you work.", developers: "Read API documentation",
  },
  ru: {
    title: "Каждое слово", accent: "в фокусе", intro: "Увидьте закономерности в своём тексте. Изучайте слова, сравнивайте черновики и проверяйте, как складываются цифры.", start: "Анализировать текст", bringAgent: "Подключить агента",
    demo: "Всё, что стоит за словами", methods: "РЕАЛЬНЫЕ СЛОВА. ПОНЯТНЫЕ МЕТОДЫ.", workspace: "Рабочая область", explore: "Открыть инструмент", yourTools: "ИНСТРУМЕНТЫ", local: "Работает в браузере", sample: "Пример на английском", words: "12 слов", word: "СЛОВО", count: "ЧИСЛО", density: "ПЛОТНОСТЬ", openSample: "Открыть счётчик слов", formula: "Плотность = вхождения ÷ 12 слов × 100", steps: ["Вставьте текст", "Изучите закономерности", "Сохраните результаты"],
    toolEye: "ИНСТРУМЕНТ ПОД ЗАДАЧУ", toolTitle: "Больше, чем подсчёт слов", toolIntro: "Всё для внимательной работы с текстом — в одном наборе.", agentEye: "ОДИН ДВИЖОК. ВАШ СПОСОБ РАБОТЫ.", agentTitle: "Хорошие инструменты.", agentAccent: "Для вас и ваших агентов.", agentIntro: "Откройте браузер, чтобы рассмотреть детали. Подключите API, CLI или MCP, чтобы встроить анализ в свой процесс. Прозрачные методы в каждом интерфейсе.", developers: "Документация API",
  },
  uk: {
    title: "Кожне слово", accent: "у фокусі", intro: "Помічайте закономірності у своєму тексті. Досліджуйте слова, порівнюйте чернетки та перевіряйте, як складаються цифри.", start: "Аналізувати текст", bringAgent: "Підключити агента",
    demo: "Усе, що стоїть за словами", methods: "СПРАВЖНІ СЛОВА. ЗРОЗУМІЛІ МЕТОДИ.", workspace: "Робоча область", explore: "Відкрити інструмент", yourTools: "ІНСТРУМЕНТИ", local: "Працює у браузері", sample: "Приклад англійською", words: "12 слів", word: "СЛОВО", count: "КІЛЬКІСТЬ", density: "ЩІЛЬНІСТЬ", openSample: "Відкрити лічильник слів", formula: "Щільність = входження ÷ 12 слів × 100", steps: ["Вставте текст", "Дослідіть закономірності", "Збережіть результати"],
    toolEye: "ІНСТРУМЕНТ ДЛЯ ВАШОЇ ЗАДАЧІ", toolTitle: "Більше, ніж підрахунок слів", toolIntro: "Усе для уважної роботи з текстом — в одному наборі.", agentEye: "ОДИН РУШІЙ. ВАШ СПОСІБ РОБОТИ.", agentTitle: "Хороші інструменти.", agentAccent: "Для вас і ваших агентів.", agentIntro: "Відкрийте браузер, щоб розглянути деталі. Підключіть API, CLI або MCP, щоб додати аналіз до свого процесу. Прозорі методи в кожному інтерфейсі.", developers: "Документація API",
  },
  es: {
    title: "Cada palabra", accent: "en foco", intro: "Descubre los patrones de tu escritura. Explora palabras, compara borradores y comprueba cómo se calculan los resultados.", start: "Analizar texto", bringAgent: "Conecta tu agente",
    demo: "Una mirada clara a lo que escribes", methods: "PALABRAS REALES. MÉTODOS VISIBLES.", workspace: "Espacio de trabajo", explore: "Abrir la herramienta", yourTools: "TUS HERRAMIENTAS", local: "Funciona en tu navegador", sample: "Ejemplo en inglés", words: "12 palabras", word: "PALABRA", count: "RECUENTO", density: "DENSIDAD", openSample: "Abrir frecuencia de palabras", formula: "Densidad = apariciones ÷ 12 palabras × 100", steps: ["Pega tu texto", "Explora los patrones", "Guarda los resultados"],
    toolEye: "UNA HERRAMIENTA PARA CADA PREGUNTA", toolTitle: "Más allá de contar palabras", toolIntro: "Herramientas que se adaptan a tu forma de trabajar con el lenguaje.", agentEye: "UN MOTOR. TU FORMA DE TRABAJAR.", agentTitle: "Buenas herramientas.", agentAccent: "Para ti y tus agentes.", agentIntro: "Usa el navegador para ver los detalles. Usa API, CLI o MCP para integrar el análisis en tu trabajo. Los mismos métodos transparentes en cada interfaz.", developers: "Documentación de la API",
  },
};
const TOOL_ICONS = ["▥", "⌗", "▦", "⇄", "≋", "[ ]", "ƒ", "◉"];
const TOOL_ORDER = [0, 1, 4, 3, 2, 5, 6, 7];
const SAMPLE_ROWS = [{ term: "clear", count: 2 }, { term: "good", count: 2 }, { term: "thinking", count: 2 }, { term: "writing", count: 2 }, { term: "makes", count: 1 }];

export default function HomePage({ locale }: { locale: UiLang }) {
  const copy = COPY[locale];
  const design = REDESIGN[locale];
  const toolPaths = TOOL_PATHS.map((path, index) => index === 2 ? BOW_LANGUAGE_PATHS[locale] : localizedPath(locale, path));
  const guidePaths = GUIDE_PATHS.map(path => localizedPath(locale, path));
  return <div className="redesign-home">
    <SiteHeader locale={locale} active="home" languagePaths={HOME_PATHS}/>
    <main id="main-content" className="rh-main">
      <section className="rh-hero rh-container">
        <div className="rh-hero-copy">
          <p className="rh-eyebrow"><span className="rh-live-dot"/>{copy.title}</p>
          <h1>{design.title}{" "}<br/><span>{design.accent}</span></h1>
          <p className="rh-hero-description">{design.intro}</p>
          <div className="rh-hero-actions"><Link className="rh-button rh-primary" data-audience="people" href={toolPaths[0]}>{design.start}<span aria-hidden="true">↗</span></Link><a className="rh-quiet-link" href="#agents">{design.bringAgent}<span aria-hidden="true">→</span></a></div>
          <p className="home-hero-tagline">{copy.accent}</p>
        </div>
        <div className="rh-hero-art" aria-hidden="true">
          <div className="rh-orbital"/><div className="rh-orbital rh-orbital-two"/>
          <span className="rh-art-coordinate rh-art-top">INPUT / WORDS</span>
          <div className="rh-art-word">fo<span>c</span>us<i/></div>
          <div className="rh-art-baseline">{Array.from({ length: 12 }, (_, i) => <i key={i}/>)}</div>
          <div className="rh-art-label"><span/>COUNTS → CONTEXT → CLARITY</div>
          <span className="rh-art-coordinate rh-art-bottom">WEB · API · CLI · MCP</span>
        </div>
      </section>

      <section className="rh-demo rh-container" aria-labelledby="home-demo-title">
        <div className="rh-demo-caption"><h2 id="home-demo-title">{design.demo}</h2><span>{design.methods}</span></div>
        <div className="rh-mini-app">
          <div className="rh-mini-top"><div><span className="rh-small-symbol" aria-hidden="true">▥</span>{design.workspace}<span className="rh-slash">/</span><b>{copy.tools[0].name}</b></div><Link href={toolPaths[0]}>{design.explore}<span aria-hidden="true">↗</span></Link></div>
          <div className="rh-mini-body">
            <nav className="rh-mini-sidebar" aria-label={design.yourTools}><span className="rh-mini-label">{design.yourTools}</span>{[0, 1, 4, 3].map((index, position) => <Link key={index} className={`rh-mini-nav${position === 0 ? " selected" : ""}`} href={toolPaths[index]}><span aria-hidden="true">{TOOL_ICONS[index]}</span>{copy.tools[index].name}</Link>)}<p className="rh-mini-privacy"><span className="rh-live-dot"/>{design.local}</p></nav>
            <div className="rh-mini-editor"><div className="rh-mini-editor-title"><span>sample.txt</span><span>{design.words}</span></div><p lang="en"><mark>Good</mark> writing starts with <mark>clear</mark> thinking.<br/><br/><mark>Clear</mark> thinking makes <mark>good</mark> writing possible.</p><Link className="rh-mini-open" href={toolPaths[0]}>{design.openSample}<span aria-hidden="true">→</span></Link></div>
            <div className="rh-mini-results"><div className="rh-mini-result-heading"><span>{copy.tools[0].name}</span><span className="rh-mini-badge">{design.sample}</span></div><table><caption className="rh-sr-only">{design.demo}</caption><thead><tr><th scope="col">{design.word}</th><th scope="col">{design.count}</th><th scope="col">{design.density}</th></tr></thead><tbody>{SAMPLE_ROWS.map(row => <tr key={row.term}><th scope="row" lang="en">{row.term}</th><td>{row.count}</td><td>{new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(row.count / 12 * 100)}%<i aria-hidden="true" style={{ width: row.count * 11.5 }}/></td></tr>)}</tbody></table><p className="rh-mini-formula">{design.formula}</p></div>
          </div>
        </div>
        <div className="rh-demo-footnotes">{design.steps.map((step, index) => <span key={step}><b>0{index + 1}</b>{step}</span>)}</div>
      </section>

      <section className="rh-toolkit rh-container" id="available-tools" aria-labelledby="home-tools-title">
        <div className="rh-section-heading"><div><p className="rh-eyebrow">{design.toolEye}</p><h2 id="home-tools-title">{design.toolTitle}</h2></div><p>{design.toolIntro}</p></div>
        <div className="rh-tool-cards">{TOOL_ORDER.map(index => <Link className="rh-tool-card" href={toolPaths[index]} key={toolPaths[index]}><span className="rh-tool-icon" aria-hidden="true">{TOOL_ICONS[index]}</span><span className="rh-tool-arrow" aria-hidden="true">↗</span><h3>{copy.tools[index].name}</h3><p>{copy.tools[index].description}</p><span className="rh-tool-meta">{copy.open}<span aria-hidden="true">→</span></span></Link>)}</div>
        <div className="rh-facts" aria-label={copy.facts}><div><strong>8</strong><span>{copy.live}</span></div><div><strong>4</strong><span>{copy.languages}</span></div><p>{copy.privacy}</p></div>
      </section>

      <section className="rh-agent-section rh-container" id="agents" aria-labelledby="home-agents-title">
        <div className="rh-agent-copy"><p className="rh-eyebrow">{design.agentEye}</p><h2 id="home-agents-title">{design.agentTitle}<br/><span>{design.agentAccent}</span></h2><p>{design.agentIntro}</p><div className="rh-developer-links"><Link className="rh-agent-link" data-audience="agents" href={localizedPath(locale, "/agents")}><span>{copy.agentCta}<b aria-hidden="true">↗</b></span><small>Codex · Claude Code · Gemini CLI</small></Link><Link data-audience="developers" href={localizedPath(locale, "/api-docs")}>{design.developers}<span aria-hidden="true">→</span></Link></div></div>
        <HomeIntegrations locale={locale}/>
      </section>

      <section className="rh-methods rh-container" aria-labelledby="home-methods-title"><div className="rh-section-heading"><div><p className="rh-eyebrow">{copy.methodEye}</p><h2 id="home-methods-title">{copy.methodTitle}</h2></div></div><div className="rh-method-grid">{copy.methods.map((method, index) => <article key={method.title}><span>0{index + 1}</span><h3>{method.title}</h3><p>{method.description}</p></article>)}</div></section>
      <section className="rh-guides rh-container" aria-labelledby="home-guides-title"><div className="rh-section-heading"><div><p className="rh-eyebrow">{copy.guidesEye}</p><h2 id="home-guides-title">{copy.guidesTitle}</h2></div><Link className="rh-quiet-link" href={localizedPath(locale, "/guides")}>{copy.guidesEye}<span aria-hidden="true">↗</span></Link></div><div className="rh-guide-grid">{copy.guides.map((guide, index) => <Link href={guidePaths[index]} key={guide.title}><span>{guide.label}</span><h3>{guide.title}<b aria-hidden="true">↗</b></h3><p>{guide.description}</p></Link>)}</div></section>
    </main>
    <SiteFooter locale={locale}/>
  </div>;
}
