"use client";

import { useId,useState } from "react";
import type { UiLang } from "./i18n";

export type ToolExampleKey=
  |"word-frequency"
  |"keyword-density"
  |"bag-of-words-analyzer"
  |"text-comparison"
  |"ngram"
  |"bag-of-words-generator"
  |"tf-idf"
  |"text-similarity";

export type ToolExample={
  sources:string[];
  focus:string;
  tracked:string;
  ngramSize:number;
  hint:string;
};

type ExampleLanguage={
  single:string;
  comparison:[string,string];
  corpus:[string,string,string];
  focus:string;
  hints:Record<ToolExampleKey,string>;
};

const EXAMPLES:Record<UiLang,ExampleLanguage>={
  en:{
    single:"Clear text analysis helps editors review evidence before revising a draft. Text analysis shows repeated words, recurring phrases, and vocabulary patterns. A careful editor uses text analysis to compare versions, not to chase a magic score. The draft should sound natural, answer the reader's question, and repeat important terms only when they make the explanation clearer. Clear evidence supports better editorial decisions.",
    comparison:[
      "Our text analysis workflow counts repeated words and recurring phrases. Editors inspect the frequency table, compare the evidence, and revise the draft. The workflow is transparent, practical, and designed for a careful content review.",
      "Our updated text analysis workflow counts words, highlights recurring phrases, and compares normalized frequencies. Editors can inspect the evidence, preserve useful terminology, remove distracting repetition, and explain every revision with a transparent result.",
    ],
    corpus:[
      "Text analysis helps an editor count repeated words, inspect vocabulary, and review a draft with transparent evidence.",
      "Search analysis helps a researcher compare queries, identify recurring topics, and explain patterns with measurable evidence.",
      "Product analysis helps a team compare feedback, group repeated requests, and prioritize decisions with shared evidence.",
    ],
    focus:"text analysis, transparent evidence",
    hints:{
      "word-frequency":"Expect “analysis” and “text” near the top of the frequency table.",
      "keyword-density":"The tracked phrase “text analysis” appears three times and should be listed separately.",
      "bag-of-words-analyzer":"Expect a compact vocabulary report, tracked-phrase coverage, and a Zipf distribution.",
      "text-comparison":"Result B adds revision language; the table should expose normalized changes from A.",
      ngram:"With two-word phrases, “text analysis” should be the leading repeated n-gram.",
      "bag-of-words-generator":"Expect a term vector led by the repeated analysis vocabulary.",
      "tf-idf":"Shared “analysis” language gets less weight than terms unique to editing, search, or product feedback.",
      "text-similarity":"The two related drafts should have a non-zero cosine similarity and visible contribution terms.",
    },
  },
  ru:{
    single:"Понятный анализ текста помогает редактору проверять факты перед доработкой черновика. Анализ текста показывает повторяющиеся слова, устойчивые фразы и особенности словаря. Внимательный редактор использует анализ текста для сравнения версий, а не для погони за магической оценкой. Черновик должен естественно отвечать на вопрос читателя, а важные термины стоит повторять только ради ясности. Проверяемые данные помогают принимать лучшие редакционные решения.",
    comparison:[
      "Наш анализ текста считает повторяющиеся слова и устойчивые фразы. Редактор изучает таблицу частот, сравнивает данные и дорабатывает черновик. Процесс остаётся понятным, практичным и пригодным для внимательной проверки контента.",
      "Обновлённый анализ текста считает слова, выделяет устойчивые фразы и сравнивает нормализованную частотность. Редактор может проверить данные, сохранить полезные термины, убрать лишние повторы и объяснить каждое изменение прозрачным результатом.",
    ],
    corpus:[
      "Анализ текста помогает редактору считать повторы, изучать словарь и проверять черновик по понятным данным.",
      "Анализ поиска помогает исследователю сравнивать запросы, находить общие темы и объяснять закономерности по данным.",
      "Анализ продукта помогает команде сравнивать отзывы, группировать повторяющиеся запросы и выбирать решения по данным.",
    ],
    focus:"анализ текста, понятные данные",
    hints:{
      "word-frequency":"Слова «анализ» и «текста» должны оказаться среди лидеров таблицы.",
      "keyword-density":"Контрольная фраза «анализ текста» встречается три раза и появится отдельно.",
      "bag-of-words-analyzer":"Появятся словарь, охват контрольных фраз и распределение Ципфа.",
      "text-comparison":"Вариант B добавляет лексику редактирования; таблица покажет нормализованные изменения.",
      ngram:"Для фраз из двух слов лидером должен стать «анализ текста».",
      "bag-of-words-generator":"Вектор терминов возглавит повторяющаяся лексика анализа.",
      "tf-idf":"Общее слово «анализ» получит меньший вес, чем уникальные темы редактуры, поиска и продукта.",
      "text-similarity":"У связанных черновиков будет ненулевое косинусное сходство и видимые термины-вклады.",
    },
  },
  uk:{
    single:"Зрозумілий аналіз тексту допомагає редактору перевіряти факти перед доопрацюванням чернетки. Аналіз тексту показує повторювані слова, сталі фрази та особливості словника. Уважний редактор використовує аналіз тексту для порівняння версій, а не для гонитви за магічною оцінкою. Чернетка має природно відповідати на запитання читача, а важливі терміни варто повторювати лише заради ясності. Перевірені дані допомагають ухвалювати кращі редакційні рішення.",
    comparison:[
      "Наш аналіз тексту рахує повторювані слова та сталі фрази. Редактор вивчає таблицю частот, порівнює дані й допрацьовує чернетку. Процес залишається зрозумілим, практичним і придатним для уважної перевірки контенту.",
      "Оновлений аналіз тексту рахує слова, виділяє сталі фрази та порівнює нормалізовану частотність. Редактор може перевірити дані, зберегти корисні терміни, прибрати зайві повтори й пояснити кожну зміну прозорим результатом.",
    ],
    corpus:[
      "Аналіз тексту допомагає редактору рахувати повтори, вивчати словник і перевіряти чернетку за зрозумілими даними.",
      "Аналіз пошуку допомагає досліднику порівнювати запити, знаходити спільні теми й пояснювати закономірності за даними.",
      "Аналіз продукту допомагає команді порівнювати відгуки, групувати повторювані запити й обирати рішення за даними.",
    ],
    focus:"аналіз тексту, зрозумілі дані",
    hints:{
      "word-frequency":"Слова «аналіз» і «тексту» мають бути серед лідерів таблиці.",
      "keyword-density":"Контрольна фраза «аналіз тексту» трапляється тричі й з'явиться окремо.",
      "bag-of-words-analyzer":"З'являться словник, покриття контрольних фраз і розподіл Ципфа.",
      "text-comparison":"Варіант B додає лексику редагування; таблиця покаже нормалізовані зміни.",
      ngram:"Для фраз із двох слів лідером має стати «аналіз тексту».",
      "bag-of-words-generator":"Вектор термінів очолить повторювана лексика аналізу.",
      "tf-idf":"Спільне слово «аналіз» матиме меншу вагу, ніж унікальні теми редагування, пошуку й продукту.",
      "text-similarity":"Пов'язані чернетки матимуть ненульову косинусну подібність і видимі терміни-внески.",
    },
  },
  es:{
    single:"Un análisis de texto claro ayuda a los editores a revisar datos antes de corregir un borrador. El análisis de texto muestra palabras repetidas, frases recurrentes y patrones de vocabulario. Un editor cuidadoso usa el análisis de texto para comparar versiones, no para perseguir una puntuación mágica. El borrador debe responder con naturalidad a la pregunta del lector y repetir términos importantes solo cuando aporten claridad. Los datos verificables respaldan mejores decisiones editoriales.",
    comparison:[
      "Nuestro análisis de texto cuenta palabras repetidas y frases recurrentes. El editor revisa la tabla de frecuencias, compara los datos y corrige el borrador. El proceso es transparente, práctico y adecuado para una revisión cuidadosa del contenido.",
      "El análisis de texto actualizado cuenta palabras, destaca frases recurrentes y compara frecuencias normalizadas. El editor puede revisar los datos, conservar términos útiles, quitar repeticiones innecesarias y explicar cada cambio con un resultado transparente.",
    ],
    corpus:[
      "El análisis de texto ayuda a contar repeticiones, revisar vocabulario y evaluar un borrador con datos transparentes.",
      "El análisis de búsquedas ayuda a comparar consultas, detectar temas recurrentes y explicar patrones con datos medibles.",
      "El análisis de producto ayuda a comparar opiniones, agrupar peticiones repetidas y priorizar decisiones con datos compartidos.",
    ],
    focus:"análisis de texto, datos transparentes",
    hints:{
      "word-frequency":"“análisis” y “texto” deberían aparecer entre los primeros términos.",
      "keyword-density":"La frase controlada “análisis de texto” aparece tres veces y se mostrará por separado.",
      "bag-of-words-analyzer":"Verás el vocabulario, la cobertura de frases y la distribución de Zipf.",
      "text-comparison":"B añade vocabulario de revisión; la tabla mostrará los cambios normalizados respecto a A.",
      ngram:"Con frases de dos palabras, “análisis de texto” debería ser el n-grama repetido principal.",
      "bag-of-words-generator":"El vector estará encabezado por el vocabulario repetido del análisis.",
      "tf-idf":"El término común “análisis” pesará menos que los temas propios de edición, búsqueda o producto.",
      "text-similarity":"Los borradores relacionados tendrán similitud coseno distinta de cero y términos de contribución visibles.",
    },
  },
};

const ACTION_COPY:Record<UiLang,{load:string;copy:string;copied:string;failed:string}>={
  en:{load:"Load example",copy:"Copy result",copied:"Copied",failed:"Copy failed"},
  ru:{load:"Загрузить пример",copy:"Скопировать результат",copied:"Скопировано",failed:"Не удалось скопировать"},
  uk:{load:"Завантажити приклад",copy:"Скопіювати результат",copied:"Скопійовано",failed:"Не вдалося скопіювати"},
  es:{load:"Cargar ejemplo",copy:"Copiar resultado",copied:"Copiado",failed:"No se pudo copiar"},
};

function exampleFor(tool:ToolExampleKey,locale:UiLang):ToolExample{
  const source=EXAMPLES[locale];
  return {
    sources:tool==="tf-idf"?source.corpus:tool==="text-comparison"||tool==="text-similarity"?source.comparison:[source.single],
    focus:source.focus,
    tracked:source.focus,
    ngramSize:2,
    hint:source.hints[tool],
  };
}

export function ExampleAction({tool,locale,onLoad}:{tool:ToolExampleKey;locale:UiLang;onLoad:(example:ToolExample)=>void}){
  const hintId=useId();
  const example=exampleFor(tool,locale);
  return <div className="tool-example-action">
    <button type="button" data-testid={`load-example-${tool}`} aria-describedby={hintId} onClick={()=>onLoad(example)}>{ACTION_COPY[locale].load}<span aria-hidden="true">↘</span></button>
    <small id={hintId}>{example.hint}</small>
  </div>;
}

async function writeClipboard(text:string){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return;}
  const textarea=document.createElement("textarea");
  textarea.value=text;
  textarea.setAttribute("readonly","");
  textarea.style.position="fixed";
  textarea.style.opacity="0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied=document.execCommand("copy");
  textarea.remove();
  if(!copied)throw new Error("copy failed");
}

export function CopyResultAction({tool,locale,value}:{tool:ToolExampleKey;locale:UiLang;value:unknown}){
  const [copyState,setCopyState]=useState<{value:unknown;status:"copied"|"failed"}|null>(null);
  const status=copyState&&copyState.value===value?copyState.status:"idle";
  async function copy(){
    try{
      await writeClipboard(JSON.stringify(value,null,2));
      setCopyState({value,status:"copied"});
    }catch{
      setCopyState({value,status:"failed"});
    }
  }
  const label=status==="copied"?ACTION_COPY[locale].copied:status==="failed"?ACTION_COPY[locale].failed:ACTION_COPY[locale].copy;
  return <button className="copy-result-button" type="button" data-testid={`copy-result-${tool}`} onClick={copy} aria-live="polite">{label}</button>;
}
