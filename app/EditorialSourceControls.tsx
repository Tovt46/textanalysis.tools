"use client";

import type {UiLang} from "./i18n";
import {formatNumber} from "./localization";
import type {ContentScope,SourcePreview} from "./lib/source-preview-contract";
import "./editorial-workflow.css";

export const SOURCE_WORKFLOW_COPY={
  en:{scope:"Page content",main:"Main material",page:"Whole page",help:"Main material uses article or main-page markup and excludes navigation, sidebars, and footer text.",preview:"Preview page text",previewBoth:"Preview URL sources",loading:"Loading page text…",heading:"Page text to analyze",review:"Review the extracted text, then run the analysis.",mainUsed:"Main material found",pageUsed:"Whole-page text",plainUsed:"Plain-text source",fallback:"Main material could not be identified. This preview uses the whole page. Review it or paste the article text instead.",characters:"characters",text:"Extracted page text",privacy:"Pasted text stays in your browser. URL sources are fetched through the stateless API."},
  ru:{scope:"Содержимое страницы",main:"Основной материал",page:"Вся страница",help:"Основной материал определяется по разметке article или main; меню, боковые блоки и футер исключаются.",preview:"Посмотреть текст страницы",previewBoth:"Посмотреть тексты URL",loading:"Загрузка текста страницы…",heading:"Текст страницы для анализа",review:"Проверьте извлечённый текст, затем запустите анализ.",mainUsed:"Основной материал найден",pageUsed:"Текст всей страницы",plainUsed:"Текстовый источник",fallback:"Основной материал определить не удалось. Показан текст всей страницы. Проверьте его или вставьте текст статьи вручную.",characters:"знаков",text:"Извлечённый текст страницы",privacy:"Вставленные тексты остаются в браузере. URL загружаются через API без хранения документов."},
  uk:{scope:"Вміст сторінки",main:"Основний матеріал",page:"Уся сторінка",help:"Основний матеріал визначається за розміткою article або main; меню, бічні блоки та футер виключаються.",preview:"Переглянути текст сторінки",previewBoth:"Переглянути тексти URL",loading:"Завантаження тексту сторінки…",heading:"Текст сторінки для аналізу",review:"Перевірте витягнутий текст, потім запустіть аналіз.",mainUsed:"Основний матеріал знайдено",pageUsed:"Текст усієї сторінки",plainUsed:"Текстове джерело",fallback:"Основний матеріал визначити не вдалося. Показано текст усієї сторінки. Перевірте його або вставте текст статті вручну.",characters:"символів",text:"Витягнутий текст сторінки",privacy:"Вставлені тексти залишаються в браузері. URL завантажуються через API без зберігання документів."},
  es:{scope:"Contenido de la página",main:"Contenido principal",page:"Página completa",help:"El contenido principal usa las etiquetas article o main y excluye la navegación, las barras laterales y el pie de página.",preview:"Ver texto de la página",previewBoth:"Ver textos de las URL",loading:"Cargando el texto de la página…",heading:"Texto de la página para analizar",review:"Revisa el texto extraído y después ejecuta el análisis.",mainUsed:"Contenido principal encontrado",pageUsed:"Texto de la página completa",plainUsed:"Fuente de texto plano",fallback:"No se pudo identificar el contenido principal. Se muestra el texto de la página completa. Revísalo o pega el texto del artículo.",characters:"caracteres",text:"Texto extraído de la página",privacy:"El texto pegado permanece en tu navegador. Las URL se obtienen mediante la API sin almacenar documentos."},
} satisfies Record<UiLang,Record<string,string>>;

export function EditorialSourceControls({scope,onScopeChange,preview,locale="en",label}: {
  scope:ContentScope;onScopeChange:(value:ContentScope)=>void;preview:SourcePreview|null;locale?:UiLang;label?:string;
}){
  const copy=SOURCE_WORKFLOW_COPY[locale];
  return <div className="editorial-source-controls">
    <label className="field"><span>{label?`${label} · ${copy.scope}`:copy.scope}</span><select value={scope} onChange={event=>onScopeChange(event.target.value as ContentScope)}><option value="main">{copy.main}</option><option value="page">{copy.page}</option></select><small>{copy.help}</small></label>
    {preview?<section className="source-preview" aria-label={label?`${label} · ${copy.heading}`:copy.heading} data-testid={label?`source-preview-${label.toLowerCase()}`:"source-preview"}>
      <div className="source-preview-head"><strong>{preview.usedScope==="main"?copy.mainUsed:preview.usedScope==="plain"?copy.plainUsed:copy.pageUsed}</strong><span>{formatNumber(preview.text.length,locale)} {copy.characters}</span></div>
      {preview.title?<p className="source-preview-title">{preview.title}</p>:null}
      {preview.fallback?<p className="source-preview-fallback" role="note">{copy.fallback}</p>:null}
      <label><span className="source-preview-label">{label?`${label} · ${copy.text}`:copy.text}</span><textarea readOnly value={preview.text} aria-label={label?`${label} · ${copy.text}`:copy.text} spellCheck={false}/></label>
      <p className="source-preview-review" role="status">{copy.review}</p>
    </section>:null}
  </div>;
}
