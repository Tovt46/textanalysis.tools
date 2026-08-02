import Link from "next/link";
import type { Metadata } from "next";
import type { UiLang } from "./i18n";
import { languagePaths,localizedMetadata,localizedPath } from "./localization";
import { SiteFooter,SiteHeader } from "./SiteChrome";
import { SITE_NAME,SITE_URL,toolWebApplicationSchema } from "./seo-metadata";
import WordFrequencyTool from "./WordFrequencyTool";
import KeywordDensityTool from "./KeywordDensityTool";
import TextComparisonTool from "./TextComparisonTool";
import NgramAnalyzerTool from "./NgramAnalyzerTool";
import BagOfWordsGeneratorTool from "./BagOfWordsGeneratorTool";
import TfIdfCalculatorTool from "./TfIdfCalculatorTool";
import TextSimilarityCalculatorTool from "./TextSimilarityCalculatorTool";

export const LOCALIZED_TOOL_SLUGS=[
  "word-frequency-counter",
  "keyword-density-checker",
  "text-analysis-comparison",
  "ngram-analyzer",
  "bag-of-words-generator",
  "tf-idf-calculator",
  "text-similarity-calculator",
] as const;

export type LocalizedToolSlug=(typeof LOCALIZED_TOOL_SLUGS)[number];

type Feature={title:string;description:string};
type ToolPageCopy={
  title:string;
  description:string;
  schemaName:string;
  schemaFeatures:string[];
  calculationEye:string;
  calculationTitle:string;
  calculation:string[];
  formulas?:Array<{label:string;value:string}>;
  workflowEye:string;
  workflowTitle:string;
  features:Feature[];
  limitsEye:string;
  limitsTitle:string;
  limits:string[];
  nextEye:string;
  nextTitle:string;
  nextText:string;
  links:Array<{path:string;label:string}>;
};

const RU:Record<LocalizedToolSlug,ToolPageCopy>={
  "word-frequency-counter":{
    title:"Бесплатный счётчик частотности слов для текста и URL",
    description:"Посчитайте частотность слов в тексте или на веб-странице. Ищите и сортируйте количество, проценты и частоту на 1 000 слов, редактируйте стоп-слова и экспортируйте CSV или JSON.",
    schemaName:"Счётчик частотности слов",
    schemaFeatures:["Полная таблица частотности","Количество, проценты и частота на 1 000 слов","Редактируемые стоп-слова","Текст и URL","Экспорт CSV и JSON"],
    calculationEye:"КАК РАБОТАЕТ РАСЧЁТ",calculationTitle:"Как счётчик рассчитывает частотность слов",
    calculation:["Инструмент приводит текст к нижнему регистру, удаляет HTML-разметку и пунктуацию, а затем объединяет одинаковые токены. Токены, состоящие только из цифр, не учитываются. По умолчанию распространённые русские, украинские или английские стоп-слова исключаются с помощью списка, который можно проверить и изменить.","Оба нормализованных показателя используют число слов, оставшихся после выбранного правила стоп-слов. Поэтому все строки таблицы имеют общий знаменатель и корректно сравниваются между собой."],
    formulas:[{label:"Процент",value:"(количество слова ÷ слов в анализе) × 100"},{label:"На 1 000 слов",value:"(количество слова ÷ слов в анализе) × 1 000"}],
    workflowEye:"КАК ИСПОЛЬЗОВАТЬ",workflowTitle:"Сравнивайте частотность без выдуманного SEO-балла",
    features:[{title:"Поиск и сортировка",description:"Найдите термин или отсортируйте возвращённые строки словаря по слову, количеству, проценту либо нормализованной частоте."},{title:"Редактируемые стоп-слова",description:"Используйте стандартные списки EN, UKR и RU или адаптируйте их к своему проекту."},{title:"Текст и URL",description:"Анализируйте вставленный материал локально либо загрузите читаемый текст публичной страницы."},{title:"CSV и JSON",description:"Сохраните возвращённые строки для таблицы, скрипта или повторяемого редакционного процесса."}],
    limitsEye:"ОГРАНИЧЕНИЯ",limitsTitle:"Частота показывает повторение, а не качество",
    limits:["Количество отвечает на вопрос «сколько раз?», а процент и частота на 1 000 слов помогают сопоставлять документы разной длины. Эти показатели выявляют доминирующую лексику и случайные повторы, но один процент не доказывает релевантность, полезность или вероятность ранжирования."],
    nextEye:"СЛЕДУЮЩИЙ ШАГ",nextTitle:"Перейдите от одной таблицы к более широкому анализу",nextText:"Изучите формулу подробнее, проверьте плотность точных фраз или откройте Bag of Words-анализатор с биграммами и распределением Ципфа.",
    links:[{path:"/how-to-calculate-word-frequency",label:"Гайд по частотности слов"},{path:"/tools/keyword-density-checker",label:"Проверить плотность ключей"},{path:"/tools/bag-of-words-analyzer",label:"Открыть Bag of Words-анализатор"}],
  },
  "keyword-density-checker":{
    title:"Бесплатный анализатор плотности ключевых слов для текста и URL",
    description:"Проверяйте плотность слов, биграмм и триграмм в тексте или по URL. Отслеживайте точные фразы, сравнивайте две страницы и экспортируйте количество, проценты и частоту на 1 000 слов.",
    schemaName:"Анализатор плотности ключевых слов",
    schemaFeatures:["Плотность униграмм, биграмм и триграмм","Контрольные точные фразы","Текст и URL","A/B-сравнение плотности","Экспорт CSV и JSON"],
    calculationEye:"ФОРМУЛА",calculationTitle:"Как рассчитывается плотность ключевых слов",
    calculation:["Каждая таблица использует одну формулу: число точных вхождений термина делится на общее количество слов и умножается на 100. Фраза, которая встретилась 4 раза в тексте из 1 000 слов, имеет плотность вхождений 0,4% и частоту 4 на 1 000 слов.","Инструмент не умножает число вхождений на длину фразы. Благодаря этому значения униграмм, биграмм и триграмм остаются сопоставимыми, а формулу легко проверить."],
    formulas:[{label:"Плотность",value:"(точные вхождения ÷ общее число слов) × 100"},{label:"На 1 000 слов",value:"(точные вхождения ÷ общее число слов) × 1 000"}],
    workflowEye:"АНАЛИЗ ФРАЗ",workflowTitle:"Проверяйте слова, биграммы и триграммы отдельно",
    features:[{title:"Контрольные ключи",description:"Проверяйте важные точные фразы, даже если они не входят в число самых частотных строк."},{title:"Минимальная частота",description:"Скрывайте единичные термины и экспортируйте строки возвращённой таблицы."},{title:"Черновик и страница",description:"Сохраните результат A и сравните его с B при одинаковых настройках."},{title:"URL или вставленный текст",description:"Загрузите публичную страницу либо проверьте черновик локально до публикации."}],
    limitsEye:"ОГРАНИЧЕНИЯ",limitsTitle:"Плотность — диагностический показатель, а не цель оптимизации",
    limits:["Процент показывает, что страница повторяет, но не оценивает поисковый интент, фактическую пользу, оригинальность, читаемость и полноту темы. Универсального «идеального» процента нет: используйте данные для поиска неестественных повторов и сравнения версий."],
    nextEye:"СВЯЗАННЫЕ МАТЕРИАЛЫ",nextTitle:"Используйте частотность в контексте",nextText:"Прочитайте разбор формулы, откройте простой счётчик слов или выполните более широкий Bag of Words-анализ.",
    links:[{path:"/keyword-density-formula",label:"Формула и ограничения плотности"},{path:"/tools/word-frequency-counter",label:"Счётчик частотности слов"},{path:"/tools/bag-of-words-analyzer",label:"Bag of Words-анализатор"}],
  },
  "text-analysis-comparison":{
    title:"Бесплатное сравнение текстов по изменениям частотности слов",
    description:"Сравните два текста или веб-страницы по объёму, словарю, нормализованной частотности слов, биграммам и показателям Ципфа. Найдите и экспортируйте точные различия A/B.",
    schemaName:"Сравнение текстов",
    schemaFeatures:["Нормализованное сравнение частотности","Изменения биграмм","Метрики словаря и длины","Текст и URL","Экспорт CSV и JSON"],
    calculationEye:"НОРМАЛИЗОВАННОЕ СРАВНЕНИЕ",calculationTitle:"Сравнивайте тексты разной длины не только по количеству",
    calculation:["Более длинная версия обычно содержит больше вхождений почти каждого слова. Поэтому инструмент показывает как изменение количества, так и долю термина среди анализируемых слов. Разница долей выражается в процентных пунктах и остаётся сопоставимой при разной длине A и B.","К обоим источникам применяется один язык и одно правило стоп-слов. Для биграмм знаменателем служит число доступных позиций из двух слов."],
    formulas:[{label:"Доля термина",value:"количество термина ÷ слов в анализе"},{label:"Изменение доли",value:"(доля B − доля A) × 100 п.п."}],
    workflowEye:"РАБОТА С РЕДАКЦИЕЙ",workflowTitle:"Проверяйте изменения между черновиком и новой версией",
    features:[{title:"Черновик и редакция",description:"Найдите лексику, которую добавили, удалили или стали повторять чаще."},{title:"Страница и конкурент",description:"Сравнивайте публичные страницы осторожно: меню и шаблонные блоки влияют на извлечённый текст."},{title:"Локальный режим",description:"Если оба источника вставлены вручную, расчёт полностью выполняется в браузере."},{title:"Сравнение URL",description:"Если используется URL, API получает и сравнивает источники без их сохранения."}],
    limitsEye:"ОГРАНИЧЕНИЯ",limitsTitle:"Изменение частотности не равно смысловому сходству",
    limits:["Таблица показывает изменения поверхностной лексики. Она не определяет, одинаков ли смысл фрагментов, верна ли редакция фактически и какая версия будет лучше ранжироваться. Направление изменения — диагностический сигнал, а не рекомендация по оптимизации."],
    nextEye:"СВЯЗАННЫЕ СЦЕНАРИИ",nextTitle:"Изучите метод или автоматизируйте сравнение",nextText:"Прочитайте пошаговый процесс, проверьте один словарь или вызовите тот же контракт через API.",
    links:[{path:"/compare-texts-by-word-frequency",label:"Гайд по сравнению частотности"},{path:"/tools/word-frequency-counter",label:"Счётчик частотности слов"},{path:"/api-docs#compare",label:"API сравнения"}],
  },
  "ngram-analyzer":{
    title:"Бесплатный анализатор N-грамм для текста и URL",
    description:"Находите повторяющиеся последовательности слов и сравнивайте концентрацию фраз в тексте или на публичной странице. Сортируйте, ищите и экспортируйте ограниченные таблицы N-грамм.",
    schemaName:"Анализатор N-грамм",
    schemaFeatures:["N-граммы длиной от 1 до 10 токенов","Количество, процент и частота на 1 000","Фильтр минимальной частоты","Текст и URL","Экспорт CSV и JSON"],
    calculationEye:"КАК РАБОТАЕТ РАСЧЁТ",calculationTitle:"Как считаются N-граммы",
    calculation:["Анализатор превращает текст в нормализованные слова, а затем строит перекрывающиеся окна длины n. При n=2 каждая соседняя пара становится биграммой, при n=3 — каждая последовательная тройка становится триграммой.","Знаменателем служит количество окон, а не число отдельных слов. Для текста из m токенов существует m−n+1 возможных окон длины n."],
    formulas:[{label:"Процент фразы",value:"(вхождения фразы ÷ число окон) × 100"},{label:"На 1 000 окон",value:"(вхождения фразы ÷ число окон) × 1 000"}],
    workflowEye:"НАСТРОЙКИ",workflowTitle:"Выбирайте n и фильтрацию по задаче анализа",
    features:[{title:"Размер N-граммы",description:"n=1 показывает слова, n=2 — короткие фразы, n=3 и больше — специфичные последовательности."},{title:"Стоп-слова",description:"Исключите служебный шум или оставьте его, если важна точная поверхность текста."},{title:"Минимальное количество",description:"Скройте единичные окна и экспортируйте возвращённые строки."},{title:"Текст и URL",description:"Текст обрабатывается локально, а для URL извлекается читаемое содержимое страницы."}],
    limitsEye:"ОГРАНИЧЕНИЯ",limitsTitle:"N-граммы диагностируют повторение, но не понимают смысл",
    limits:["Таблица показывает поверхностные последовательности и локальный порядок слов. Она не доказывает поисковый интент, семантическую полноту или качество текста. Проверяйте найденные паттерны вручную."],
    nextEye:"ЧТО ДАЛЬШЕ",nextTitle:"Перейдите от частотности фраз к более широкому анализу",nextText:"Изучите устройство N-грамм, получите частотный словарь или сравните две версии текста.",
    links:[{path:"/what-are-n-grams",label:"Гайд по N-граммам"},{path:"/tools/word-frequency-counter",label:"Счётчик частотности слов"},{path:"/tools/text-analysis-comparison",label:"Сравнение текстов"}],
  },
  "bag-of-words-generator":{
    title:"Бесплатный генератор Bag of Words для текста и URL",
    description:"Постройте ограниченный вектор терминов из текста или публичной страницы с количеством, частотой и нормализованными показателями. Экспортируйте возвращённые строки для дальнейшего анализа.",
    schemaName:"Генератор Bag of Words",
    schemaFeatures:["Полные векторы терминов","Количество и нормализованная частота","Редактируемые стоп-слова","Текст и URL","Экспорт CSV и JSON"],
    calculationEye:"РЕЗУЛЬТАТ",calculationTitle:"Стройте понятные векторы терминов",
    calculation:["Генератор возвращает каждый проанализированный токен один раз вместе с количеством, относительной частотой, процентом и значением на 1 000 слов. При одинаковом языке и настройках стоп-слов повторные запуски дают воспроизводимые строки.","Позиция вектора соответствует видимому термину, поэтому каждое значение можно проверить по исходному тексту."],
    formulas:[{label:"Частота",value:"количество термина ÷ слов в анализе"},{label:"Покрытие",value:"(количество термина ÷ всех слов) × 100"}],
    workflowEye:"РАБОЧИЙ ПРОЦЕСС",workflowTitle:"Используйте локальный режим для черновиков и URL для опубликованных страниц",
    features:[{title:"Локальный текст",description:"Вставленный материал анализируется сразу, без сетевого запроса."},{title:"Публичный URL",description:"После очистки HTML применяется тот же контракт вектора."},{title:"Стоп-слова",description:"Исключите служебные слова или оставьте их для словарного профиля."},{title:"CSV и JSON",description:"Передайте возвращённые строки в скрипты сравнения, классификации или кластеризации."}],
    limitsEye:"ОГРАНИЧЕНИЯ",limitsTitle:"Вектор частот не моделирует значение слов",
    limits:["Bag of Words сохраняет термины и их веса, но теряет большую часть порядка, грамматики и контекста. Синонимы остаются разными координатами, а одинаковые слова считаются связанными независимо от смысла употребления."],
    nextEye:"СЛЕДУЮЩИЕ ИНСТРУМЕНТЫ",nextTitle:"Перейдите от векторов к взвешиванию и сходству",nextText:"Примените TF-IDF, чтобы снизить влияние общих терминов, или вычислите косинусное сходство документов.",
    links:[{path:"/tools/tf-idf-calculator",label:"Калькулятор TF-IDF"},{path:"/tools/text-similarity-calculator",label:"Калькулятор сходства"},{path:"/bag-of-words-model",label:"Как работает Bag of Words"}],
  },
  "tf-idf-calculator":{
    title:"Бесплатный калькулятор TF-IDF для текста и URL",
    description:"Сравните 2–10 документов с помощью обратной документной частоты. TF-IDF уменьшает вес общих терминов и подчёркивает слова, которые лучше различают документы.",
    schemaName:"Калькулятор TF-IDF",
    schemaFeatures:["TF-IDF для 2–10 документов","Сглаженная обратная документная частота","Взвешенные таблицы по каждому документу","Текст и URL","Экспорт CSV и JSON"],
    calculationEye:"КАК РАБОТАЕТ TF-IDF",calculationTitle:"Частота и редкость объединяются в одном весе",
    calculation:["TF-IDF сочетает частоту термина внутри документа с обратной документной частотой во всём выбранном корпусе. Термины, встречающиеся повсеместно, получают меньший вес; термины, сосредоточенные в меньшем числе документов, — больший.","Все документы используют единую предварительную обработку, поэтому IDF рассчитывается по сопоставимому словарю."],
    formulas:[{label:"TF",value:"частота термина ÷ слов в документе"},{label:"IDF",value:"ln((N + 1) ÷ (df + 1)) + 1"}],
    workflowEye:"ОБЩИЙ КОРПУС",workflowTitle:"Проверяйте каждый документ в одной модели весов",
    features:[{title:"Корпус",description:"Добавьте от 2 до 10 текстов или публичных URL и примените общие настройки."},{title:"Сильные термины",description:"Ограничьте таблицу воспроизводимым числом терминов с наибольшим весом."},{title:"Глобальный IDF",description:"Посмотрите, какие термины лучше различают документы корпуса."},{title:"Экспорт",description:"Сохраните векторы всех документов и общие метаданные расчёта."}],
    limitsEye:"ОГРАНИЧЕНИЯ",limitsTitle:"Вес зависит от выбранного корпуса",
    limits:["Тот же термин получает другой IDF при изменении состава корпуса. Высокий вес означает редкость в этих документах, а не общую важность, качество или поисковую ценность слова."],
    nextEye:"СЛЕДУЮЩИЙ ШАГ",nextTitle:"Перейдите от взвешенных признаков к сходству",nextText:"Изучите точную формулу или используйте те же представления для косинусного сравнения двух документов.",
    links:[{path:"/tf-idf-formula",label:"Гайд по формуле TF-IDF"},{path:"/tools/text-similarity-calculator",label:"Калькулятор сходства"},{path:"/api-docs#weighted",label:"API TF-IDF"}],
  },
  "text-similarity-calculator":{
    title:"Бесплатный калькулятор сходства текстов и URL",
    description:"Измерьте сходство двух текстов с помощью косинусной меры по векторам Bag of Words или TF-IDF. Изучите вклад терминов и экспортируйте результаты.",
    schemaName:"Калькулятор сходства текстов",
    schemaFeatures:["Косинусное сходство от 0 до 1","Режимы Bag of Words и TF-IDF","Таблица вклада терминов","Текст и URL","Экспорт CSV и JSON"],
    calculationEye:"МОДЕЛЬ ИЗМЕРЕНИЯ",calculationTitle:"Косинусное сходство по явным векторам признаков",
    calculation:["Инструмент оценивает совпадение векторов весов терминов. Режим Bag of Words показывает исходное лексическое пересечение, а TF-IDF уменьшает влияние терминов, общих для обоих документов.","Итоговая оценка нормализует скалярное произведение по длине двух векторов. Поэтому важен не только общий объём, но и направление распределения весов."],
    formulas:[{label:"Косинусное сходство",value:"Σ(aᵢ × bᵢ) ÷ (||a|| × ||b||)"},{label:"Вклад термина",value:"aᵢ × bᵢ"}],
    workflowEye:"ДИАГНОСТИКА",workflowTitle:"Изучайте вклад терминов, а не только одну оценку",
    features:[{title:"Два режима",description:"BoW измеряет исходное пересечение, TF-IDF учитывает редкость терминов."},{title:"Таблица вклада",description:"Показывает веса каждого общего термина и его вклад в итог."},{title:"Текст и URL",description:"Вставленный текст обрабатывается локально, а URL — через публичный API."},{title:"Экспорт",description:"Сохраните оценку и строки пересечения для дополнительной проверки."}],
    limitsEye:"ОГРАНИЧЕНИЯ",limitsTitle:"Лексическое сходство не равно тождеству смысла",
    limits:["Два текста могут использовать одинаковые слова с разным значением или выражать одну мысль разной лексикой. Косинусная оценка полезна для проверки редакций и предварительного поиска дубликатов, но не заменяет семантическую и фактическую проверку."],
    nextEye:"КОГДА ИСПОЛЬЗОВАТЬ",nextTitle:"Проверяйте оценку вместе с детальной таблицей",nextText:"Прочитайте разбор косинусной меры или сравните точные изменения частотности между версиями.",
    links:[{path:"/cosine-similarity-for-text",label:"Гайд по косинусному сходству"},{path:"/tools/text-analysis-comparison",label:"Сравнение текстов"},{path:"/api-docs#weighted",label:"API сходства"}],
  },
};

const UK:Record<LocalizedToolSlug,ToolPageCopy>={
  "word-frequency-counter":{
    title:"Безкоштовний лічильник частотності слів для тексту та URL",
    description:"Порахуйте частотність слів у тексті або на вебсторінці. Шукайте й сортуйте кількість, відсотки та частоту на 1 000 слів, редагуйте стоп-слова й експортуйте CSV або JSON.",
    schemaName:"Лічильник частотності слів",schemaFeatures:["Повна таблиця частотності","Кількість, відсотки й частота на 1 000 слів","Редаговані стоп-слова","Текст і URL","Експорт CSV та JSON"],
    calculationEye:"ЯК ПРАЦЮЄ РОЗРАХУНОК",calculationTitle:"Як лічильник обчислює частотність слів",
    calculation:["Інструмент переводить текст у нижній регістр, видаляє HTML-розмітку й пунктуацію, а потім об’єднує однакові токени. Токени лише з цифр не враховуються. За замовчуванням поширені українські, російські чи англійські стоп-слова виключаються за допомогою списку, який можна перевірити й змінити.","Обидва нормалізовані показники використовують кількість слів, що залишилася після вибраного правила стоп-слів. Тому всі рядки таблиці мають спільний знаменник."],
    formulas:[{label:"Відсоток",value:"(кількість слова ÷ слів в аналізі) × 100"},{label:"На 1 000 слів",value:"(кількість слова ÷ слів в аналізі) × 1 000"}],
    workflowEye:"ЯК ВИКОРИСТОВУВАТИ",workflowTitle:"Порівнюйте частотність без вигаданого SEO-бала",
    features:[{title:"Пошук і сортування",description:"Знайдіть термін або відсортуйте повернуті рядки словника за словом, кількістю, відсотком чи нормалізованою частотою."},{title:"Редаговані стоп-слова",description:"Використовуйте стандартні списки EN, UKR і RU або адаптуйте їх до проєкту."},{title:"Текст і URL",description:"Аналізуйте вставлений матеріал локально або завантажте читабельний текст публічної сторінки."},{title:"CSV і JSON",description:"Збережіть повернуті рядки для таблиці, скрипту чи повторюваного редакційного процесу."}],
    limitsEye:"ОБМЕЖЕННЯ",limitsTitle:"Частота показує повторення, а не якість",limits:["Кількість відповідає на запитання «скільки разів?», а відсоток і частота на 1 000 слів допомагають зіставляти документи різної довжини. Один відсоток не доводить релевантність, корисність чи ймовірність ранжування."],
    nextEye:"НАСТУПНИЙ КРОК",nextTitle:"Перейдіть від однієї таблиці до ширшого аналізу",nextText:"Вивчіть формулу, перевірте щільність точних фраз або відкрийте Bag of Words-аналізатор із біграмами та розподілом Ципфа.",
    links:[{path:"/how-to-calculate-word-frequency",label:"Гайд із частотності слів"},{path:"/tools/keyword-density-checker",label:"Перевірити щільність ключів"},{path:"/tools/bag-of-words-analyzer",label:"Відкрити Bag of Words-аналізатор"}],
  },
  "keyword-density-checker":{
    title:"Безкоштовний аналізатор щільності ключових слів для тексту та URL",description:"Перевіряйте щільність слів, біграм і триграм у тексті або за URL. Відстежуйте точні фрази, порівнюйте дві сторінки й експортуйте кількість, відсотки та частоту на 1 000 слів.",
    schemaName:"Аналізатор щільності ключових слів",schemaFeatures:["Щільність уніграм, біграм і триграм","Контрольні точні фрази","Текст і URL","A/B-порівняння щільності","Експорт CSV та JSON"],
    calculationEye:"ФОРМУЛА",calculationTitle:"Як розраховується щільність ключових слів",calculation:["Кожна таблиця використовує одну формулу: кількість точних входжень терміна ділиться на загальну кількість слів і множиться на 100. Фраза, що трапилася 4 рази в тексті з 1 000 слів, має щільність 0,4% і частоту 4 на 1 000 слів.","Інструмент не множить кількість входжень на довжину фрази. Завдяки цьому значення уніграм, біграм і триграм залишаються порівнюваними."],
    formulas:[{label:"Щільність",value:"(точні входження ÷ загальна кількість слів) × 100"},{label:"На 1 000 слів",value:"(точні входження ÷ загальна кількість слів) × 1 000"}],
    workflowEye:"АНАЛІЗ ФРАЗ",workflowTitle:"Перевіряйте слова, біграми й триграми окремо",features:[{title:"Контрольні ключі",description:"Перевіряйте важливі точні фрази, навіть якщо їх немає серед найчастотніших рядків."},{title:"Мінімальна частота",description:"Приховуйте одиничні терміни й експортуйте рядки повернутої таблиці."},{title:"Чернетка та сторінка",description:"Збережіть результат A і порівняйте його з B за однакових налаштувань."},{title:"URL або текст",description:"Завантажте публічну сторінку чи перевірте чернетку локально до публікації."}],
    limitsEye:"ОБМЕЖЕННЯ",limitsTitle:"Щільність — діагностичний показник, а не ціль оптимізації",limits:["Відсоток показує повторення, але не оцінює пошуковий намір, фактичну користь, оригінальність, читабельність і повноту теми. Універсального «ідеального» відсотка не існує."],
    nextEye:"ПОВ’ЯЗАНІ МАТЕРІАЛИ",nextTitle:"Використовуйте частотність у контексті",nextText:"Прочитайте розбір формули, відкрийте простий лічильник слів або виконайте ширший Bag of Words-аналіз.",
    links:[{path:"/keyword-density-formula",label:"Формула й обмеження щільності"},{path:"/tools/word-frequency-counter",label:"Лічильник частотності слів"},{path:"/tools/bag-of-words-analyzer",label:"Bag of Words-аналізатор"}],
  },
  "text-analysis-comparison":{
    title:"Безкоштовне порівняння текстів за змінами частотності слів",description:"Порівняйте два тексти або вебсторінки за обсягом, словником, нормалізованою частотністю слів, біграмами й показниками Ципфа. Знайдіть та експортуйте точні відмінності A/B.",
    schemaName:"Порівняння текстів",schemaFeatures:["Нормалізоване порівняння частотності","Зміни біграм","Метрики словника й довжини","Текст і URL","Експорт CSV та JSON"],
    calculationEye:"НОРМАЛІЗОВАНЕ ПОРІВНЯННЯ",calculationTitle:"Порівнюйте тексти різної довжини не лише за кількістю",calculation:["Довша версія зазвичай містить більше входжень майже кожного слова. Тому інструмент показує як зміну кількості, так і частку терміна серед проаналізованих слів. Різниця часток у відсоткових пунктах залишається порівнюваною за різної довжини A і B.","До обох джерел застосовується одна мова й одне правило стоп-слів. Для біграм знаменником є кількість доступних позицій із двох слів."],
    formulas:[{label:"Частка терміна",value:"кількість терміна ÷ слів в аналізі"},{label:"Зміна частки",value:"(частка B − частка A) × 100 в.п."}],
    workflowEye:"РОБОТА З РЕДАКЦІЄЮ",workflowTitle:"Перевіряйте зміни між чернеткою та новою версією",features:[{title:"Чернетка й редакція",description:"Знайдіть лексику, яку додали, видалили або почали повторювати частіше."},{title:"Сторінка й конкурент",description:"Порівнюйте публічні сторінки обережно: меню та шаблони впливають на текст."},{title:"Локальний режим",description:"Якщо обидва джерела вставлено вручну, розрахунок виконується у браузері."},{title:"Порівняння URL",description:"API отримує й порівнює джерела без їх збереження."}],
    limitsEye:"ОБМЕЖЕННЯ",limitsTitle:"Зміна частотності не дорівнює смисловій подібності",limits:["Таблиця показує зміни поверхневої лексики. Вона не визначає, чи однаковий зміст, чи правильна редакція фактично й яка версія краще ранжуватиметься."],
    nextEye:"ПОВ’ЯЗАНІ СЦЕНАРІЇ",nextTitle:"Вивчіть метод або автоматизуйте порівняння",nextText:"Прочитайте покроковий процес, перевірте один словник або викличте той самий контракт через API.",
    links:[{path:"/compare-texts-by-word-frequency",label:"Гайд із порівняння частотності"},{path:"/tools/word-frequency-counter",label:"Лічильник частотності слів"},{path:"/api-docs#compare",label:"API порівняння"}],
  },
  "ngram-analyzer":{
    title:"Безкоштовний аналізатор N-грам для тексту та URL",description:"Знаходьте повторювані послідовності слів і порівнюйте концентрацію фраз у тексті або на публічній сторінці. Сортуйте, шукайте й експортуйте обмежені таблиці N-грам.",
    schemaName:"Аналізатор N-грам",schemaFeatures:["N-грами від 1 до 10 токенів","Кількість, відсоток і частота на 1 000","Фільтр мінімальної частоти","Текст і URL","Експорт CSV та JSON"],
    calculationEye:"ЯК ПРАЦЮЄ РОЗРАХУНОК",calculationTitle:"Як рахуються N-грами",calculation:["Аналізатор перетворює текст на нормалізовані слова, а потім будує перекривні вікна довжини n. За n=2 кожна сусідня пара стає біграмою, за n=3 — кожна послідовна трійка стає триграмою.","Знаменником є кількість вікон, а не окремих слів. Для тексту з m токенів існує m−n+1 можливих вікон довжини n."],
    formulas:[{label:"Відсоток фрази",value:"(входження фрази ÷ кількість вікон) × 100"},{label:"На 1 000 вікон",value:"(входження фрази ÷ кількість вікон) × 1 000"}],
    workflowEye:"НАЛАШТУВАННЯ",workflowTitle:"Вибирайте n і фільтрацію відповідно до завдання",features:[{title:"Розмір N-грами",description:"n=1 показує слова, n=2 — короткі фрази, n=3 і більше — специфічні послідовності."},{title:"Стоп-слова",description:"Виключіть службовий шум або залиште його для точної поверхні тексту."},{title:"Мінімальна кількість",description:"Приховайте одиничні вікна й експортуйте повернуті рядки."},{title:"Текст і URL",description:"Текст обробляється локально, а з URL витягується читабельний вміст."}],
    limitsEye:"ОБМЕЖЕННЯ",limitsTitle:"N-грами діагностують повторення, але не розуміють зміст",limits:["Таблиця показує поверхневі послідовності й локальний порядок слів. Вона не доводить пошуковий намір, семантичну повноту чи якість тексту."],
    nextEye:"ЩО ДАЛІ",nextTitle:"Перейдіть від частотності фраз до ширшого аналізу",nextText:"Вивчіть будову N-грам, отримайте частотний словник або порівняйте дві версії тексту.",
    links:[{path:"/what-are-n-grams",label:"Гайд із N-грам"},{path:"/tools/word-frequency-counter",label:"Лічильник частотності слів"},{path:"/tools/text-analysis-comparison",label:"Порівняння текстів"}],
  },
  "bag-of-words-generator":{
    title:"Безкоштовний генератор Bag of Words для тексту та URL",description:"Побудуйте обмежений вектор термінів із тексту або публічної сторінки з кількістю, частотою та нормалізованими показниками. Експортуйте повернуті рядки для подальшого аналізу.",
    schemaName:"Генератор Bag of Words",schemaFeatures:["Повні вектори термінів","Кількість і нормалізована частота","Редаговані стоп-слова","Текст і URL","Експорт CSV та JSON"],
    calculationEye:"РЕЗУЛЬТАТ",calculationTitle:"Будуйте зрозумілі вектори термінів",calculation:["Генератор повертає кожен проаналізований токен один раз разом із кількістю, відносною частотою, відсотком і значенням на 1 000 слів. За однакової мови та налаштувань повторні запуски дають відтворювані рядки.","Позиція вектора відповідає видимому терміну, тому кожне значення можна перевірити за початковим текстом."],
    formulas:[{label:"Частота",value:"кількість терміна ÷ слів в аналізі"},{label:"Покриття",value:"(кількість терміна ÷ усіх слів) × 100"}],
    workflowEye:"РОБОЧИЙ ПРОЦЕС",workflowTitle:"Використовуйте локальний режим для чернеток і URL для сторінок",features:[{title:"Локальний текст",description:"Вставлений матеріал аналізується одразу, без мережевого запиту."},{title:"Публічний URL",description:"Після очищення HTML застосовується той самий контракт вектора."},{title:"Стоп-слова",description:"Виключіть службові слова або залиште їх для словникового профілю."},{title:"CSV і JSON",description:"Передайте повернуті рядки у скрипти порівняння, класифікації чи кластеризації."}],
    limitsEye:"ОБМЕЖЕННЯ",limitsTitle:"Вектор частот не моделює значення слів",limits:["Bag of Words зберігає терміни та їхні ваги, але втрачає більшу частину порядку, граматики й контексту. Синоніми залишаються різними координатами."],
    nextEye:"НАСТУПНІ ІНСТРУМЕНТИ",nextTitle:"Перейдіть від векторів до зважування й подібності",nextText:"Застосуйте TF-IDF, щоб зменшити вплив спільних термінів, або обчисліть косинусну подібність.",
    links:[{path:"/tools/tf-idf-calculator",label:"Калькулятор TF-IDF"},{path:"/tools/text-similarity-calculator",label:"Калькулятор подібності"},{path:"/bag-of-words-model",label:"Як працює Bag of Words"}],
  },
  "tf-idf-calculator":{
    title:"Безкоштовний калькулятор TF-IDF для тексту та URL",description:"Порівняйте 2–10 документів за допомогою оберненої документної частоти. TF-IDF зменшує вагу спільних термінів і підкреслює слова, що краще розрізняють документи.",
    schemaName:"Калькулятор TF-IDF",schemaFeatures:["TF-IDF для 2–10 документів","Згладжена обернена документна частота","Зважені таблиці кожного документа","Текст і URL","Експорт CSV та JSON"],
    calculationEye:"ЯК ПРАЦЮЄ TF-IDF",calculationTitle:"Частота й рідкість об’єднуються в одній вазі",calculation:["TF-IDF поєднує частоту терміна в документі з оберненою документною частотою в усьому корпусі. Терміни, що трапляються всюди, отримують меншу вагу; терміни в меншій кількості документів — більшу.","Усі документи використовують однакову попередню обробку, тому IDF розраховується за порівнюваним словником."],
    formulas:[{label:"TF",value:"частота терміна ÷ слів у документі"},{label:"IDF",value:"ln((N + 1) ÷ (df + 1)) + 1"}],
    workflowEye:"СПІЛЬНИЙ КОРПУС",workflowTitle:"Перевіряйте кожен документ в одній моделі ваг",features:[{title:"Корпус",description:"Додайте від 2 до 10 текстів або URL і застосуйте спільні налаштування."},{title:"Сильні терміни",description:"Обмежте таблицю відтворюваною кількістю термінів із найбільшою вагою."},{title:"Глобальний IDF",description:"Перегляньте, які терміни краще розрізняють документи корпусу."},{title:"Експорт",description:"Збережіть вектори всіх документів і спільні метадані розрахунку."}],
    limitsEye:"ОБМЕЖЕННЯ",limitsTitle:"Вага залежить від вибраного корпусу",limits:["Той самий термін отримує інший IDF при зміні складу корпусу. Висока вага означає рідкість у цих документах, а не загальну важливість чи пошукову цінність."],
    nextEye:"НАСТУПНИЙ КРОК",nextTitle:"Перейдіть від зважених ознак до подібності",nextText:"Вивчіть точну формулу або використайте ті самі подання для косинусного порівняння.",
    links:[{path:"/tf-idf-formula",label:"Гайд із формули TF-IDF"},{path:"/tools/text-similarity-calculator",label:"Калькулятор подібності"},{path:"/api-docs#weighted",label:"API TF-IDF"}],
  },
  "text-similarity-calculator":{
    title:"Безкоштовний калькулятор подібності текстів і URL",description:"Виміряйте подібність двох текстів за косинусною мірою на векторах Bag of Words або TF-IDF. Перегляньте внесок термінів і експортуйте результати.",
    schemaName:"Калькулятор подібності текстів",schemaFeatures:["Косинусна подібність від 0 до 1","Режими Bag of Words і TF-IDF","Таблиця внеску термінів","Текст і URL","Експорт CSV та JSON"],
    calculationEye:"МОДЕЛЬ ВИМІРЮВАННЯ",calculationTitle:"Косинусна подібність за явними векторами ознак",calculation:["Інструмент оцінює перетин векторів ваг термінів. Bag of Words показує початковий лексичний перетин, а TF-IDF зменшує вплив термінів, спільних для обох документів.","Підсумкова оцінка нормалізує скалярний добуток за довжиною двох векторів. Тому важливий не лише обсяг, а й напрямок розподілу ваг."],
    formulas:[{label:"Косинусна подібність",value:"Σ(aᵢ × bᵢ) ÷ (||a|| × ||b||)"},{label:"Внесок терміна",value:"aᵢ × bᵢ"}],
    workflowEye:"ДІАГНОСТИКА",workflowTitle:"Переглядайте внесок термінів, а не лише одну оцінку",features:[{title:"Два режими",description:"BoW вимірює початковий перетин, TF-IDF враховує рідкість термінів."},{title:"Таблиця внеску",description:"Показує ваги кожного спільного терміна та його внесок у підсумок."},{title:"Текст і URL",description:"Вставлений текст обробляється локально, а URL — через публічний API."},{title:"Експорт",description:"Збережіть оцінку й рядки перетину для додаткової перевірки."}],
    limitsEye:"ОБМЕЖЕННЯ",limitsTitle:"Лексична подібність не дорівнює тотожності змісту",limits:["Два тексти можуть використовувати однакові слова з різним значенням або висловлювати одну думку різною лексикою. Косинусна оцінка не замінює семантичну й фактичну перевірку."],
    nextEye:"КОЛИ ВИКОРИСТОВУВАТИ",nextTitle:"Перевіряйте оцінку разом із детальною таблицею",nextText:"Прочитайте розбір косинусної міри або порівняйте точні зміни частотності.",
    links:[{path:"/cosine-similarity-for-text",label:"Гайд із косинусної подібності"},{path:"/tools/text-analysis-comparison",label:"Порівняння текстів"},{path:"/api-docs#weighted",label:"API подібності"}],
  },
};

const ES:Record<LocalizedToolSlug,ToolPageCopy>={
  "word-frequency-counter":{
    title:"Contador gratuito de frecuencia de palabras para texto y URL",
    description:"Cuenta la frecuencia de palabras en un texto o una página web. Busca y ordena cantidades, porcentajes y frecuencia por 1.000 palabras, edita las palabras vacías y exporta CSV o JSON.",
    schemaName:"Contador de frecuencia de palabras",
    schemaFeatures:["Tabla acotada de frecuencias","Cantidad, porcentaje y frecuencia por 1.000","Palabras vacías editables","Texto y URL","Exportación CSV y JSON"],
    calculationEye:"CÓMO SE CALCULA",calculationTitle:"Cómo calcula la frecuencia de palabras",
    calculation:["La herramienta convierte el texto a minúsculas, elimina el marcado HTML y la puntuación, y agrupa los tokens iguales. Los tokens formados solo por números no se cuentan. De forma predeterminada se excluyen palabras vacías comunes del español, inglés, ucraniano o ruso mediante una lista que puedes revisar y modificar.","Los dos valores normalizados usan como denominador las palabras que quedan después de aplicar la regla elegida. Así, todas las filas de la tabla se pueden comparar de forma coherente."],
    formulas:[{label:"Porcentaje",value:"(cantidad del término ÷ palabras analizadas) × 100"},{label:"Por 1.000 palabras",value:"(cantidad del término ÷ palabras analizadas) × 1.000"}],
    workflowEye:"CÓMO USARLO",workflowTitle:"Compara frecuencias sin inventar una puntuación SEO",
    features:[{title:"Búsqueda y ordenación",description:"Busca un término u ordena las filas devueltas por palabra, cantidad, porcentaje o frecuencia normalizada."},{title:"Palabras vacías editables",description:"Usa las listas de EN, UKR, RU y ES o adáptalas a tu proyecto."},{title:"Texto y URL",description:"Analiza localmente un texto pegado u obtén el contenido legible de una página pública."},{title:"CSV y JSON",description:"Guarda las filas devueltas para una hoja de cálculo, un script o un proceso editorial repetible."}],
    limitsEye:"LIMITACIONES",limitsTitle:"La frecuencia muestra repetición, no calidad",limits:["La cantidad responde «¿cuántas veces?», mientras que el porcentaje y la frecuencia por 1.000 permiten comparar documentos de distinta longitud. Ninguna de estas métricas demuestra por sí sola relevancia, utilidad o probabilidad de posicionamiento."],
    nextEye:"SIGUIENTE PASO",nextTitle:"Amplía el análisis más allá de una sola tabla",nextText:"Consulta la fórmula, revisa la densidad de frases exactas o abre el analizador Bag of Words con bigramas y distribución de Zipf.",
    links:[{path:"/how-to-calculate-word-frequency",label:"Guía de frecuencia de palabras"},{path:"/tools/keyword-density-checker",label:"Comprobar densidad de palabras clave"},{path:"/tools/bag-of-words-analyzer",label:"Abrir el analizador Bag of Words"}],
  },
  "keyword-density-checker":{
    title:"Analizador gratuito de densidad de palabras clave para texto y URL",description:"Comprueba la densidad de palabras, bigramas y trigramas en un texto o URL. Controla frases exactas, compara dos páginas y exporta cantidades, porcentajes y frecuencia por 1.000 palabras.",
    schemaName:"Analizador de densidad de palabras clave",schemaFeatures:["Densidad de unigramas, bigramas y trigramas","Control de frases exactas","Texto y URL","Comparación A/B","Exportación CSV y JSON"],
    calculationEye:"FÓRMULA",calculationTitle:"Cómo se calcula la densidad de palabras clave",calculation:["Cada tabla usa la misma fórmula: divide la cantidad de coincidencias exactas entre el total de palabras y multiplica por 100. Una frase que aparece 4 veces en 1.000 palabras tiene una densidad del 0,4% y una frecuencia de 4 por 1.000.","La herramienta no multiplica las apariciones por la longitud de la frase. Así, unigramas, bigramas y trigramas siguen siendo comparables."],
    formulas:[{label:"Densidad",value:"(coincidencias exactas ÷ palabras totales) × 100"},{label:"Por 1.000 palabras",value:"(coincidencias exactas ÷ palabras totales) × 1.000"}],
    workflowEye:"ANÁLISIS DE FRASES",workflowTitle:"Revisa por separado palabras, bigramas y trigramas",features:[{title:"Palabras controladas",description:"Comprueba frases exactas importantes aunque no estén entre las filas más frecuentes."},{title:"Frecuencia mínima",description:"Oculta términos únicos y exporta las filas de la tabla devuelta."},{title:"Borrador y página",description:"Guarda el resultado A y compáralo con B usando los mismos ajustes."},{title:"URL o texto",description:"Carga una página pública o revisa un borrador local antes de publicarlo."}],
    limitsEye:"LIMITACIONES",limitsTitle:"La densidad es un diagnóstico, no un objetivo",limits:["El porcentaje muestra repetición, pero no evalúa intención de búsqueda, utilidad, originalidad, legibilidad ni cobertura temática. No existe un porcentaje «ideal» universal."],
    nextEye:"MATERIALES RELACIONADOS",nextTitle:"Interpreta la frecuencia en contexto",nextText:"Lee la explicación de la fórmula, abre el contador simple o realiza un análisis Bag of Words más amplio.",
    links:[{path:"/keyword-density-formula",label:"Fórmula y límites de la densidad"},{path:"/tools/word-frequency-counter",label:"Contador de frecuencia"},{path:"/tools/bag-of-words-analyzer",label:"Analizador Bag of Words"}],
  },
  "text-analysis-comparison":{
    title:"Comparación gratuita de textos por cambios de frecuencia",description:"Compara dos textos o páginas por longitud, vocabulario, frecuencia normalizada, bigramas y métricas de Zipf. Busca y exporta las diferencias exactas entre A y B.",
    schemaName:"Comparación de textos",schemaFeatures:["Comparación de frecuencia normalizada","Cambios de bigramas","Métricas de vocabulario y longitud","Texto y URL","Exportación CSV y JSON"],
    calculationEye:"COMPARACIÓN NORMALIZADA",calculationTitle:"Compara textos de distinta longitud, no solo cantidades",calculation:["Una versión más larga suele contener más apariciones de casi todas las palabras. Por eso se muestran tanto el cambio de cantidad como la proporción del término entre las palabras analizadas. La diferencia en puntos porcentuales sigue siendo comparable cuando A y B tienen longitudes distintas.","Se aplica el mismo idioma y la misma regla de palabras vacías a las dos fuentes. Para los bigramas, el denominador es el número de posiciones disponibles de dos palabras."],
    formulas:[{label:"Proporción del término",value:"cantidad del término ÷ palabras analizadas"},{label:"Cambio de proporción",value:"(proporción B − proporción A) × 100 p.p."}],
    workflowEye:"FLUJO EDITORIAL",workflowTitle:"Revisa los cambios entre un borrador y una nueva versión",features:[{title:"Borrador y revisión",description:"Encuentra vocabulario añadido, eliminado o repetido con mayor frecuencia."},{title:"Página y competencia",description:"Compara páginas públicas con cautela: menús y plantillas afectan el texto extraído."},{title:"Modo local",description:"Si pegas las dos fuentes, todo el cálculo se ejecuta en el navegador."},{title:"Comparación de URL",description:"La API obtiene y compara las fuentes sin almacenarlas."}],
    limitsEye:"LIMITACIONES",limitsTitle:"Un cambio de frecuencia no equivale a similitud semántica",limits:["La tabla muestra cambios de vocabulario superficial. No determina si el significado es el mismo, si la revisión es correcta ni qué versión posicionará mejor."],
    nextEye:"CASOS RELACIONADOS",nextTitle:"Estudia el método o automatiza la comparación",nextText:"Lee el proceso paso a paso, analiza un solo vocabulario o usa el mismo contrato mediante la API.",
    links:[{path:"/compare-texts-by-word-frequency",label:"Guía de comparación de frecuencias"},{path:"/tools/word-frequency-counter",label:"Contador de frecuencia"},{path:"/api-docs#compare",label:"API de comparación"}],
  },
  "ngram-analyzer":{
    title:"Analizador gratuito de N-gramas para texto y URL",description:"Encuentra secuencias de palabras repetidas y compara la concentración de frases en un texto o una página pública. Ordena, busca y exporta tablas acotadas de N-gramas.",
    schemaName:"Analizador de N-gramas",schemaFeatures:["N-gramas de 1 a 10 tokens","Cantidad, porcentaje y frecuencia por 1.000","Filtro de frecuencia mínima","Texto y URL","Exportación CSV y JSON"],
    calculationEye:"CÓMO SE CALCULA",calculationTitle:"Cómo se cuentan los N-gramas",calculation:["El analizador convierte el texto en palabras normalizadas y construye ventanas superpuestas de longitud n. Con n=2, cada pareja contigua es un bigrama; con n=3, cada trío consecutivo es un trigrama.","El denominador es el número de ventanas, no la cantidad de palabras. Un texto de m tokens contiene m−n+1 ventanas posibles de longitud n."],
    formulas:[{label:"Porcentaje de frase",value:"(apariciones ÷ número de ventanas) × 100"},{label:"Por 1.000 ventanas",value:"(apariciones ÷ número de ventanas) × 1.000"}],
    workflowEye:"AJUSTES",workflowTitle:"Elige n y los filtros según la tarea",features:[{title:"Tamaño del N-grama",description:"n=1 muestra palabras, n=2 frases cortas y n=3 o más secuencias específicas."},{title:"Palabras vacías",description:"Excluye ruido funcional o consérvalo para revisar la superficie exacta del texto."},{title:"Cantidad mínima",description:"Oculta ventanas únicas en la interfaz sin eliminarlas de la exportación."},{title:"Texto y URL",description:"El texto se procesa localmente y de las URL se extrae el contenido legible."}],
    limitsEye:"LIMITACIONES",limitsTitle:"Los N-gramas detectan repetición, no significado",limits:["La tabla muestra secuencias superficiales y orden local de palabras. No demuestra intención de búsqueda, cobertura semántica ni calidad del texto."],
    nextEye:"QUÉ HACER DESPUÉS",nextTitle:"Pasa de las frases a un análisis más amplio",nextText:"Aprende cómo se forman los N-gramas, genera un vocabulario de frecuencias o compara dos versiones.",
    links:[{path:"/what-are-n-grams",label:"Guía de N-gramas"},{path:"/tools/word-frequency-counter",label:"Contador de frecuencia"},{path:"/tools/text-analysis-comparison",label:"Comparación de textos"}],
  },
  "bag-of-words-generator":{
    title:"Generador gratuito Bag of Words para texto y URL",description:"Crea un vector acotado de términos desde un texto o una página pública con cantidad, frecuencia y valores normalizados. Exporta las filas devueltas para análisis posteriores.",
    schemaName:"Generador Bag of Words",schemaFeatures:["Filas acotadas del vector","Cantidad y frecuencia normalizada","Palabras vacías editables","Texto y URL","Exportación CSV y JSON"],
    calculationEye:"RESULTADO",calculationTitle:"Crea vectores de términos comprensibles",calculation:["El generador devuelve cada token analizado una vez, con su cantidad, frecuencia relativa, porcentaje y valor por 1.000 palabras. Con el mismo idioma y los mismos ajustes, las ejecuciones repetidas producen filas reproducibles.","Cada posición del vector corresponde a un término visible, por lo que sus valores se pueden comprobar en el texto original."],
    formulas:[{label:"Frecuencia",value:"cantidad del término ÷ palabras analizadas"},{label:"Cobertura",value:"(cantidad del término ÷ todas las palabras) × 100"}],
    workflowEye:"FLUJO DE TRABAJO",workflowTitle:"Usa texto local para borradores y URL para páginas",features:[{title:"Texto local",description:"El contenido pegado se analiza de inmediato, sin solicitud de red."},{title:"URL pública",description:"Tras limpiar el HTML se aplica el mismo contrato de vector."},{title:"Palabras vacías",description:"Excluye palabras funcionales o consérvalas para un perfil completo."},{title:"CSV y JSON",description:"Pasa el vector a scripts de comparación, clasificación o agrupación."}],
    limitsEye:"LIMITACIONES",limitsTitle:"Un vector de frecuencia no modela el significado",limits:["Bag of Words conserva términos y pesos, pero pierde gran parte del orden, la gramática y el contexto. Los sinónimos permanecen como coordenadas distintas."],
    nextEye:"SIGUIENTES HERRAMIENTAS",nextTitle:"Pasa de vectores a ponderación y similitud",nextText:"Aplica TF-IDF para reducir términos comunes o calcula la similitud coseno.",
    links:[{path:"/tools/tf-idf-calculator",label:"Calculadora TF-IDF"},{path:"/tools/text-similarity-calculator",label:"Calculadora de similitud"},{path:"/bag-of-words-model",label:"Cómo funciona Bag of Words"}],
  },
  "tf-idf-calculator":{
    title:"Calculadora TF-IDF gratuita para texto y URL",description:"Compara de 2 a 10 documentos mediante frecuencia inversa de documento. TF-IDF reduce el peso de términos comunes y destaca los que mejor distinguen cada documento.",
    schemaName:"Calculadora TF-IDF",schemaFeatures:["TF-IDF para 2–10 documentos","Frecuencia inversa suavizada","Tablas ponderadas por documento","Texto y URL","Exportación CSV y JSON"],
    calculationEye:"CÓMO FUNCIONA TF-IDF",calculationTitle:"La frecuencia y la rareza se combinan en un peso",calculation:["TF-IDF combina la frecuencia de un término dentro de un documento con su frecuencia inversa en todo el corpus. Los términos presentes en todas partes reciben menos peso; los que aparecen en menos documentos, más.","Todos los documentos usan el mismo preprocesamiento, de modo que el IDF se calcula sobre un vocabulario comparable."],
    formulas:[{label:"TF",value:"cantidad del término ÷ palabras del documento"},{label:"IDF",value:"ln((N + 1) ÷ (df + 1)) + 1"}],
    workflowEye:"CORPUS COMPARTIDO",workflowTitle:"Revisa cada documento con un único modelo de pesos",features:[{title:"Corpus",description:"Añade de 2 a 10 textos o URL y aplica ajustes compartidos."},{title:"Términos principales",description:"Limita cada tabla a una cantidad reproducible de términos con mayor peso."},{title:"IDF global",description:"Comprueba qué términos distinguen mejor los documentos del corpus."},{title:"Exportación",description:"Guarda los vectores y los metadatos comunes del cálculo."}],
    limitsEye:"LIMITACIONES",limitsTitle:"El peso depende del corpus elegido",limits:["El mismo término recibe otro IDF cuando cambia el corpus. Un peso alto significa rareza en estos documentos, no importancia universal ni valor de búsqueda."],
    nextEye:"SIGUIENTE PASO",nextTitle:"Pasa de funciones ponderadas a similitud",nextText:"Consulta la fórmula exacta o usa las mismas representaciones para una comparación coseno.",
    links:[{path:"/tf-idf-formula",label:"Guía de la fórmula TF-IDF"},{path:"/tools/text-similarity-calculator",label:"Calculadora de similitud"},{path:"/api-docs#weighted",label:"API TF-IDF"}],
  },
  "text-similarity-calculator":{
    title:"Calculadora gratuita de similitud para textos y URL",description:"Mide la similitud coseno entre dos textos con vectores Bag of Words o TF-IDF. Revisa la contribución de los términos y exporta los resultados.",
    schemaName:"Calculadora de similitud de textos",schemaFeatures:["Similitud coseno de 0 a 1","Modos Bag of Words y TF-IDF","Tabla de contribución","Texto y URL","Exportación CSV y JSON"],
    calculationEye:"MODELO DE MEDICIÓN",calculationTitle:"Similitud coseno sobre vectores explícitos",calculation:["La herramienta mide la intersección de vectores de pesos. Bag of Words refleja la coincidencia léxica directa; TF-IDF reduce la influencia de los términos comunes en ambos documentos.","El resultado normaliza el producto escalar según la longitud de los dos vectores. Por eso importa la dirección de los pesos y no solo la cantidad de texto."],
    formulas:[{label:"Similitud coseno",value:"Σ(aᵢ × bᵢ) ÷ (||a|| × ||b||)"},{label:"Contribución del término",value:"aᵢ × bᵢ"}],
    workflowEye:"DIAGNÓSTICO",workflowTitle:"Revisa los términos, no solo una puntuación",features:[{title:"Dos modos",description:"BoW mide la coincidencia directa y TF-IDF incorpora la rareza."},{title:"Tabla de contribución",description:"Muestra el peso de cada término compartido y su aporte al resultado."},{title:"Texto y URL",description:"El texto pegado se procesa localmente; las URL, mediante la API pública."},{title:"Exportación",description:"Guarda la puntuación y las filas de intersección para revisarlas."}],
    limitsEye:"LIMITACIONES",limitsTitle:"La similitud léxica no equivale a significado idéntico",limits:["Dos textos pueden usar las mismas palabras con sentidos distintos o expresar una idea con vocabularios diferentes. La medida coseno no sustituye una revisión semántica y factual."],
    nextEye:"CUÁNDO USARLO",nextTitle:"Interpreta la puntuación junto con la tabla",nextText:"Lee cómo funciona la similitud coseno o compara cambios exactos de frecuencia.",
    links:[{path:"/cosine-similarity-for-text",label:"Guía de similitud coseno"},{path:"/tools/text-analysis-comparison",label:"Comparación de textos"},{path:"/api-docs#weighted",label:"API de similitud"}],
  },
};

export function isLocalizedToolSlug(value:string):value is LocalizedToolSlug{
  return (LOCALIZED_TOOL_SLUGS as readonly string[]).includes(value);
}

function copyFor(locale:Exclude<UiLang,"en">,slug:LocalizedToolSlug){
  return locale==="ru"?RU[slug]:locale==="uk"?UK[slug]:ES[slug];
}

export function localizedToolMetadata(locale:Exclude<UiLang,"en">,slug:LocalizedToolSlug):Metadata{
  const copy=copyFor(locale,slug);
  return localizedMetadata({locale,path:`/tools/${slug}`,title:copy.title,description:copy.description});
}

const COMPONENTS={
  "word-frequency-counter":WordFrequencyTool,
  "keyword-density-checker":KeywordDensityTool,
  "text-analysis-comparison":TextComparisonTool,
  "ngram-analyzer":NgramAnalyzerTool,
  "bag-of-words-generator":BagOfWordsGeneratorTool,
  "tf-idf-calculator":TfIdfCalculatorTool,
  "text-similarity-calculator":TextSimilarityCalculatorTool,
} satisfies Record<LocalizedToolSlug,React.ComponentType<{uiLang?:UiLang}>>;

export default function LocalizedToolPage({locale,slug}:{locale:Exclude<UiLang,"en">;slug:LocalizedToolSlug}){
  const copy=copyFor(locale,slug);
  const path=`/tools/${slug}`;
  const canonical=localizedPath(locale,path);
  const Tool=COMPONENTS[slug];
  const schema=toolWebApplicationSchema({
    name:copy.schemaName,
    description:copy.description,
    path:canonical,
    inLanguage:locale,
    featureList:copy.schemaFeatures,
  });
  const articleSchema={"@context":"https://schema.org","@type":"TechArticle",headline:copy.calculationTitle,description:copy.description,inLanguage:locale,mainEntityOfPage:`${SITE_URL}${canonical}`,publisher:{"@type":"Organization",name:SITE_NAME,url:SITE_URL}};

  return <main className="tool-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleSchema)}}/>
    <SiteHeader locale={locale} active="tools" languagePaths={languagePaths(path)}/>
    <Tool uiLang={locale}/>
    <article className="tool-explainer">
      <section>
        <p className="section-number">{copy.calculationEye}</p>
        <h2>{copy.calculationTitle}</h2>
        {copy.calculation.map(paragraph=><p key={paragraph}>{paragraph}</p>)}
        {copy.formulas&&<div className="formula-grid">{copy.formulas.map(formula=><div key={formula.label}><span>{formula.label}</span><code>{formula.value}</code></div>)}</div>}
      </section>
      <section>
        <p className="section-number">{copy.workflowEye}</p>
        <h2>{copy.workflowTitle}</h2>
        <div className="feature-list">{copy.features.map(feature=><div key={feature.title}><h3>{feature.title}</h3><p>{feature.description}</p></div>)}</div>
      </section>
      <section>
        <p className="section-number">{copy.limitsEye}</p>
        <h2>{copy.limitsTitle}</h2>
        {copy.limits.map(paragraph=><p key={paragraph}>{paragraph}</p>)}
      </section>
      <section className="tool-next-links">
        <p className="section-number">{copy.nextEye}</p>
        <h2>{copy.nextTitle}</h2>
        <p>{copy.nextText}</p>
        <div>{copy.links.map(link=><Link href={localizedPath(locale,link.path)} key={link.path}>{link.label} <span>→</span></Link>)}</div>
      </section>
    </article>
    <SiteFooter locale={locale}/>
  </main>;
}
