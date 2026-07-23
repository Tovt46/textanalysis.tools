import Link from "next/link";
import type { UiLang } from "./i18n";
import { BOW_LANGUAGE_PATHS } from "./seo-metadata";
import { SiteFooter,SiteHeader } from "./SiteChrome";

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
};

const COPY:Record<UiLang,HomeCopy>={
  en:{
    eyebrow:"TEXT ANALYSIS, WITHOUT BLACK BOXES",
    title:"Free text analysis tools.",
    accent:"Count. Compare. Understand.",
    intro:"Inspect word frequency, keyword density, and differences between texts with calculations you can see and results you can export.",
    primary:"Choose a tool",
    secondary:"Explore the API",
    privacy:"Pasted text is processed without server storage.",
    live:"live tools",
    languages:"analysis languages",
    storage:"submitted text stored",
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
    ],
    methodEye:"WHY THIS TOOLKIT",
    methodTitle:"Useful numbers, with the method left visible",
    methods:[
      {title:"Transparent calculations",description:"Counts, percentages, and per-1,000 rates stay visible so you can verify what each result means."},
      {title:"Private by design",description:"Pasted text is analyzed in the browser. Public URLs are fetched only when you ask the tool to analyze one."},
      {title:"Made for comparison",description:"Normalize texts of different lengths and compare drafts, pages, or versions using the same settings."},
      {title:"No optimization score",description:"The tools expose patterns and repetition without pretending that one percentage determines content quality."},
    ],
    guidesEye:"LEARN THE METHODS",
    guidesTitle:"Formulas, examples, and limitations",
    guides:[
      {label:"GUIDE",title:"How to Calculate Word Frequency",description:"Counts, percentages, per-1,000 rates, tokenization, and a worked example."},
      {label:"GUIDE",title:"Keyword Density Formula",description:"Exact phrase calculations, comparison rules, and why density is not a ranking score."},
      {label:"NLP GUIDE",title:"Bag of Words Model",description:"How frequency tables become document vectors and machine-learning features."},
    ],
    apiEye:"FOR DEVELOPERS",
    apiTitle:"Use the same analysis in your own workflow",
    apiCopy:"The stateless JSON API analyzes text or public URLs and compares two inputs. OpenAPI documentation is available without an account.",
    apiCta:"Read API documentation",
  },
  ru:{
    eyebrow:"АНАЛИЗ ТЕКСТА БЕЗ ЧЁРНОГО ЯЩИКА",
    title:"Бесплатные инструменты анализа текста.",
    accent:"Считайте. Сравнивайте. Понимайте.",
    intro:"Проверяйте частотность слов, плотность ключевых фраз и различия между текстами с понятными расчётами и экспортируемыми результатами.",
    primary:"Выбрать инструмент",
    secondary:"Открыть API",
    privacy:"Вставленный текст обрабатывается без хранения на сервере.",
    live:"рабочих инструмента",
    languages:"языка анализа",
    storage:"текста сохраняется",
    available:"ДОСТУПНО СЕЙЧАС",
    choose:"Начните с вопроса, на который нужен ответ",
    chooseCopy:"У каждого инструмента — отдельный сценарий, видимые формулы и проверяемый результат вместо непрозрачной оценки.",
    open:"Открыть",
    english:"Интерфейс EN",
    tools:[
      {name:"Счётчик частотности слов",description:"Посчитайте все слова, найдите нужный термин, отсортируйте словарь и экспортируйте CSV или JSON."},
      {name:"Анализатор плотности ключей",description:"Измерьте слова, биграммы и триграммы, проверьте точные фразы и сравните изменения между результатами."},
      {name:"Bag of Words-анализатор",description:"Проверьте лексику, биграммы, контрольные фразы и распределение Ципфа, затем сравните результаты A и B."},
      {name:"Сравнение двух текстов",description:"Сопоставьте два текста или URL по объёму, словарю, нормализованной частотности, биграммам и показателям Ципфа."},
    ],
    methodEye:"ПОЧЕМУ ЭТОТ НАБОР",
    methodTitle:"Полезные цифры с понятной методикой",
    methods:[
      {title:"Прозрачные расчёты",description:"Количество, проценты и частота на 1 000 слов видны в результате — их можно проверить вручную."},
      {title:"Приватность по умолчанию",description:"Вставленный текст анализируется в браузере. Публичный URL загружается только по вашему запросу."},
      {title:"Создано для сравнения",description:"Сопоставляйте черновики, страницы и версии разной длины с одинаковыми настройками."},
      {title:"Без выдуманного SEO-балла",description:"Инструменты показывают повторы и закономерности, не выдавая один процент за оценку качества текста."},
    ],
    guidesEye:"РАЗОБРАТЬСЯ В МЕТОДЕ",
    guidesTitle:"Формулы, примеры и ограничения",
    guides:[
      {label:"ГАЙД · EN",title:"Как рассчитать частотность слов",description:"Количество, проценты, частота на 1 000 слов, токенизация и пример расчёта."},
      {label:"ГАЙД · EN",title:"Формула плотности ключей",description:"Расчёт точных фраз, правила сравнения и ограничения показателя."},
      {label:"NLP-ГАЙД",title:"Модель Bag of Words",description:"Как таблица частот превращается в векторы документов и признаки для машинного обучения."},
    ],
    apiEye:"ДЛЯ РАЗРАБОТЧИКОВ",
    apiTitle:"Добавьте тот же анализ в свой процесс",
    apiCopy:"JSON API без хранения данных анализирует текст или публичные URL и сравнивает два источника. OpenAPI доступен без аккаунта.",
    apiCta:"Открыть документацию API",
  },
  uk:{
    eyebrow:"АНАЛІЗ ТЕКСТУ БЕЗ ЧОРНОЇ СКРИНЬКИ",
    title:"Безкоштовні інструменти аналізу тексту.",
    accent:"Рахуйте. Порівнюйте. Розумійте.",
    intro:"Перевіряйте частотність слів, щільність ключових фраз і відмінності між текстами з прозорими розрахунками та експортом результатів.",
    primary:"Вибрати інструмент",
    secondary:"Відкрити API",
    privacy:"Вставлений текст обробляється без зберігання на сервері.",
    live:"робочі інструменти",
    languages:"мови аналізу",
    storage:"тексту зберігається",
    available:"ДОСТУПНО ЗАРАЗ",
    choose:"Почніть із запитання, на яке потрібна відповідь",
    chooseCopy:"Кожен інструмент має окремий сценарій, видимі формули та результат, який можна перевірити замість непрозорої оцінки.",
    open:"Відкрити",
    english:"Інтерфейс EN",
    tools:[
      {name:"Лічильник частотності слів",description:"Порахуйте всі слова, знайдіть потрібний термін, відсортуйте словник і експортуйте CSV або JSON."},
      {name:"Аналізатор щільності ключів",description:"Виміряйте слова, біграми й триграми, перевірте точні фрази та порівняйте зміни між результатами."},
      {name:"Bag of Words-аналізатор",description:"Перевірте лексику, біграми, контрольні фрази й розподіл Ципфа, а потім порівняйте результати A і B."},
      {name:"Порівняння двох текстів",description:"Зіставте два тексти або URL за обсягом, словником, нормалізованою частотністю, біграмами й показниками Ципфа."},
    ],
    methodEye:"ЧОМУ ЦЕЙ НАБІР",
    methodTitle:"Корисні числа з прозорою методикою",
    methods:[
      {title:"Прозорі розрахунки",description:"Кількість, відсотки й частота на 1 000 слів залишаються видимими — їх можна перевірити вручну."},
      {title:"Приватність за замовчуванням",description:"Вставлений текст аналізується у браузері. Публічний URL завантажується лише за вашим запитом."},
      {title:"Створено для порівняння",description:"Зіставляйте чернетки, сторінки й версії різної довжини з однаковими налаштуваннями."},
      {title:"Без вигаданого SEO-бала",description:"Інструменти показують повтори й закономірності, не видаючи один відсоток за оцінку якості тексту."},
    ],
    guidesEye:"ЗРОЗУМІТИ МЕТОД",
    guidesTitle:"Формули, приклади й обмеження",
    guides:[
      {label:"ГАЙД · EN",title:"Як розрахувати частотність слів",description:"Кількість, відсотки, частота на 1 000 слів, токенізація та приклад розрахунку."},
      {label:"ГАЙД · EN",title:"Формула щільності ключів",description:"Розрахунок точних фраз, правила порівняння й обмеження показника."},
      {label:"NLP-ГАЙД",title:"Модель Bag of Words",description:"Як таблиця частот перетворюється на вектори документів і ознаки для машинного навчання."},
    ],
    apiEye:"ДЛЯ РОЗРОБНИКІВ",
    apiTitle:"Додайте той самий аналіз у свій процес",
    apiCopy:"JSON API без зберігання даних аналізує текст або публічні URL і порівнює два джерела. OpenAPI доступний без акаунта.",
    apiCta:"Відкрити документацію API",
  },
};

const HOME_PATHS:Record<UiLang,string>={en:"/",ru:"/ru",uk:"/uk"};
const TOOL_PATHS=["/tools/word-frequency-counter","/tools/keyword-density-checker"] as const;
const COMPARISON_PATH="/tools/text-analysis-comparison";
const GUIDE_PATHS=["/how-to-calculate-word-frequency","/keyword-density-formula","/bag-of-words-model"] as const;

export default function HomePage({locale}:{locale:UiLang}){
  const copy=COPY[locale];
  const toolPaths=[...TOOL_PATHS,BOW_LANGUAGE_PATHS[locale],COMPARISON_PATH];
  const guidePaths=[GUIDE_PATHS[0],GUIDE_PATHS[1],locale==="en"?GUIDE_PATHS[2]:`/${locale}/bag-of-words-model`];
  return <main className="home-page">
    <SiteHeader locale={locale} active="home" languagePaths={HOME_PATHS}/>
    <section className="home-hero">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}<br/><em>{copy.accent}</em></h1>
      <div className="home-hero-aside">
        <p>{copy.intro}</p>
        <div className="home-actions"><a className="home-primary" href="#available-tools">{copy.primary}<span>↓</span></a><Link href="/api-docs">{copy.secondary}<span>→</span></Link></div>
        <span className="privacy-note"><b/>{copy.privacy}</span>
      </div>
    </section>
    <section className="home-stats" aria-label="Product facts"><div><strong>4</strong><span>{copy.live}</span></div><div><strong>3</strong><span>{copy.languages}</span></div><div><strong>0</strong><span>{copy.storage}</span></div></section>
    <section className="home-section home-tools" id="available-tools" aria-labelledby="home-tools-title">
      <div className="home-section-heading"><p className="section-number">{copy.available}</p><h2 id="home-tools-title">{copy.choose}</h2><p>{copy.chooseCopy}</p></div>
      <div className="home-tool-grid">{copy.tools.map((tool,index)=><Link className={`home-tool-card tool-${index+1}`} href={toolPaths[index]} key={tool.name}><div className="home-tool-card-top"><span>0{index+1} · LIVE</span>{locale!=="en"&&index!==2?<small>{copy.english}</small>:null}</div><h3>{tool.name}</h3><p>{tool.description}</p><strong>{copy.open}<b>→</b></strong></Link>)}</div>
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
      <div><p>{copy.apiCopy}</p><Link href="/api-docs">{copy.apiCta}<span>→</span></Link></div>
    </section>
    <SiteFooter locale={locale}/>
  </main>;
}
