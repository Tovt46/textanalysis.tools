"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Zone = "above" | "within" | "below" | "sparse-tail";
type ZipfRow = { rank:number; term:string; actualCount:number; expectedCount:number; ratio:number; zone:Zone };
type FocusRow = { term:string; count:number; per1000:number };
type Analysis = {
  language:string; tokenCount:number; vocabularySize:number; fittedExponent:number; rSquared:number;
  rows:ZipfRow[]; bigrams:{ term:string; count:number; share:number }[]; focusCoverage:FocusRow[]; stopwordCount:number; notes:string[];
};
type SavedResult = { result:Analysis; savedAt:string; label:string };
type Lang = "ru"|"uk"|"en";

const CACHE_KEY = "bow-zipf-baseline-v2";
const STOPWORDS_KEY = "bow-zipf-stopwords-v1";
const DEFAULT_STOPWORDS:Record<Lang,string> = {
  ru:"а, без, бы, был, была, были, быть, в, вам, вас, вы, где, да, для, до, его, ее, ей, если, есть, еще, за, и, из, или, их, как, к, когда, ли, меня, мне, мы, на, над, не, него, нее, нет, ни, но, о, он, она, они, от, по, под, при, с, со, так, то, ты, у, уже, что, чтобы, это, я",
  uk:"а, або, але, б, без, би, був, була, були, бути, в, вам, вас, ви, від, він, вона, вони, все, всіх, де, до, за, з, зі, й, і, із, його, її, їх, коли, ми, мене, мені, мною, на, над, не, ні, ним, нього, неї, о, по, про, під, при, та, так, ти, то, у, усе, це, цей, ця, ці, що, щоб, як",
  en:"a, an, and, are, as, at, be, been, by, for, from, had, has, have, he, her, hers, him, his, i, if, in, into, is, it, its, me, my, of, on, or, our, ours, she, so, that, the, their, them, they, this, to, us, was, we, were, what, when, where, which, who, why, will, with, you, your, yours",
};
const SAMPLE = `Онлайн-расклад Таро помогает внимательнее посмотреть на отношения, чувства и возможные сценарии развития ситуации. Карты не принимают решение за вас, но могут подсветить скрытые эмоции и вопросы, которые стоит обсудить с партнёром. Сформулируйте ясный вопрос, выберите карты и прочитайте толкование спокойно — как повод для размышления, а не неизбежный прогноз.`;

function Tip({ children }: { children:React.ReactNode }) {
  return <span className="tip" title={String(children)} aria-label={String(children)}>?</span>;
}

function Metric({ label, value, explanation }: { label:string; value:string; explanation:string }) {
  return <div className="metric simple-metric"><span>{label}<Tip>{explanation}</Tip></span><strong>{value}</strong><small>{explanation}</small></div>;
}

function ZoneBadge({ zone }: { zone:Zone }) {
  const labels:Record<Zone,string> = { above:"выше модели", within:"в пределах", below:"ниже модели", "sparse-tail":"редкий хвост" };
  return <span className={`zone zone-${zone}`}>{labels[zone]}</span>;
}

function ZipfChart({ rows }: { rows:ZipfRow[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || rows.length < 2) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.scale(dpr,dpr);
      const w=rect.width,h=rect.height,p={l:42,r:16,t:18,b:30},pw=w-p.l-p.r,ph=h-p.t-p.b;
      const maxRank=Math.max(...rows.map(r=>r.rank)),maxCount=Math.max(...rows.map(r=>r.actualCount));
      const x=(rank:number)=>p.l+(Math.log(rank)/Math.log(maxRank))*pw;
      const y=(count:number)=>p.t+(1-Math.log(Math.max(count,1))/Math.log(Math.max(maxCount,2)))*ph;
      ctx.clearRect(0,0,w,h); ctx.strokeStyle="#dfe3dc"; ctx.lineWidth=1;
      for(let i=0;i<=4;i++){const gy=p.t+(ph/4)*i;ctx.beginPath();ctx.moveTo(p.l,gy);ctx.lineTo(w-p.r,gy);ctx.stroke();}
      const line=(key:"actualCount"|"expectedCount",color:string,dash=false)=>{ctx.beginPath();rows.forEach((r,i)=>i?ctx.lineTo(x(r.rank),y(r[key])):ctx.moveTo(x(r.rank),y(r[key])));ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(dash?[6,5]:[]);ctx.stroke();ctx.setLineDash([]);};
      line("expectedCount","#a6ada3",true); line("actualCount","#175c4b");
      rows.forEach(r=>{ctx.beginPath();ctx.arc(x(r.rank),y(r.actualCount),3,0,Math.PI*2);ctx.fillStyle=r.zone==="above"?"#d26b45":"#175c4b";ctx.fill();});
      ctx.fillStyle="#747b74";ctx.font="10px ui-monospace, monospace";ctx.fillText("частота",2,12);ctx.fillText("ранг →",w-54,h-6);
    };
    draw(); const observer=new ResizeObserver(draw);observer.observe(canvas);return()=>observer.disconnect();
  },[rows]);
  return <canvas ref={ref} className="chart compact-chart" aria-label="Фактическая и ожидаемая частота слов" />;
}

function FrequencyComparisonTable({ title, a, b, totalA, totalB, open=false }: { title:string; a:{term:string;count:number}[]; b:{term:string;count:number}[]; totalA:number; totalB:number; open?:boolean }) {
  const terms=[...new Set([...a.map(row=>row.term),...b.map(row=>row.term)])];
  const rows=terms.map(term=>{const av=a.find(row=>row.term===term),bv=b.find(row=>row.term===term);const ar=av?(av.count/totalA)*1000:null,br=bv?(bv.count/totalB)*1000:null;return{term,av,bv,ar,br,weight:Math.max(ar||0,br||0)};}).sort((x,y)=>y.weight-x.weight).slice(0,30);
  const cell=(item:{count:number}|undefined,rate:number|null)=><>{item?<><b>{item.count} раз</b><small>{rate?.toFixed(1)} на 1000</small></>:<><b>—</b><small>вне показанного top</small></>}</>;
  return <details className="ab-frequency" open={open}><summary>{title}<span>{rows.length} строк</span></summary><div className="ab-table-scroll"><table className="ab-table"><thead><tr><th>Термин</th><th>Результат A</th><th>Результат B</th><th>Разница B − A</th></tr></thead><tbody>{rows.map(row=>{const delta=(row.br||0)-(row.ar||0);return <tr key={row.term}><td><b>{row.term}</b></td><td>{cell(row.av,row.ar)}</td><td>{cell(row.bv,row.br)}</td><td><span className={delta>0?"delta-up":delta<0?"delta-down":"delta-flat"}>{delta>0?"+":""}{delta.toFixed(1)}</span><small>на 1000</small></td></tr>;})}</tbody></table></div></details>;
}

function Comparison({ baseline, current, onClear }: { baseline:SavedResult; current:Analysis; onClear:()=>void }) {
  const over=(r:Analysis)=>r.rows.filter(row=>row.zone==="above").length;
  const metrics=[
    ["Слов после фильтра",baseline.result.tokenCount,current.tokenCount,"Сколько слов участвовало в расчёте после удаления коротких слов и, при необходимости, стоп-слов."],
    ["Уникальных слов",baseline.result.vocabularySize,current.vocabularySize,"Размер словаря текста: каждое слово считается один раз."],
    ["Показатель Ципфа",baseline.result.fittedExponent.toFixed(2),current.fittedExponent.toFixed(2),"Наклон частотной кривой. Около 1 — классический ориентир, но это не SEO-оценка."],
    ["Выше модели",over(baseline.result),over(current),"Слова, встречающиеся чаще модели Ципфа с учётом выбранного допуска."],
  ];
  const terms=[...new Set([...baseline.result.focusCoverage.map(r=>r.term),...current.focusCoverage.map(r=>r.term)])];
  const get=(rows:FocusRow[],term:string)=>rows.find(r=>r.term===term) || {term,count:0,per1000:0};
  return <section className="compare-section">
    <div className="compare-head"><div><p className="eyebrow">СРАВНЕНИЕ</p><h2>Результат A рядом с результатом B</h2><p>Результат A хранится только в кэше этого браузера. B — ваш последний анализ.</p></div><button className="text-button" onClick={onClear}>Удалить A</button></div>
    <div className="compare-labels"><div><span>A</span><b>{baseline.label}</b><small>сохранён {new Date(baseline.savedAt).toLocaleString("ru-RU")}</small></div><div><span>B</span><b>Текущий результат</b><small>последний запущенный анализ</small></div></div>
    <div className="compare-table">
      <div className="compare-row compare-row-head"><span>Показатель</span><b>A</b><b>B</b></div>
      {metrics.map(([label,a,b,help])=><div className="compare-row" key={String(label)}><span>{label}<Tip>{help}</Tip></span><strong>{a}</strong><strong>{b}</strong></div>)}
    </div>
    {terms.length>0&&<div className="focus-compare"><div className="focus-explainer"><h3>Контрольные фразы</h3><p><b>«На 1000 слов»</b> — это нормализованная частота для сравнения текстов разной длины. Например, 2 упоминания в тексте из 100 слов = 20 на 1000. Это не рекомендация повторить фразу 20 раз.</p></div>
      <div className="compare-table">
        <div className="compare-row compare-row-head"><span>Фраза</span><b>A</b><b>B</b></div>
        {terms.map(term=>{const a=get(baseline.result.focusCoverage,term),b=get(current.focusCoverage,term);return <div className="compare-row phrase-row" key={term}><span>«{term}»</span><strong>{a.count} {a.count===1?"раз":"раза"}<small>{a.per1000.toFixed(1)} на 1000</small></strong><strong>{b.count} {b.count===1?"раз":"раза"}<small>{b.per1000.toFixed(1)} на 1000</small></strong></div>;})}
      </div>
    </div>}
    <div className="frequency-comparison"><div className="frequency-title"><h3>Частотные таблицы A/B</h3><p>Показываем фактическое число вхождений и частоту на 1000 слов. Если термин не попал в заданный top, вместо нуля стоит «вне показанного top».</p></div>
      <FrequencyComparisonTable title="Слова" open a={baseline.result.rows.map(row=>({term:row.term,count:row.actualCount}))} b={current.rows.map(row=>({term:row.term,count:row.actualCount}))} totalA={baseline.result.tokenCount} totalB={current.tokenCount}/>
      <FrequencyComparisonTable title="Фразы из двух слов" a={baseline.result.bigrams} b={current.bigrams} totalA={Math.max(1,baseline.result.tokenCount-1)} totalB={Math.max(1,current.tokenCount-1)}/>
    </div>
  </section>;
}

export default function Home() {
  const [sourceType,setSourceType]=useState<"text"|"url">("text"); const [source,setSource]=useState(SAMPLE);
  const [language,setLanguage]=useState("auto"); const [focus,setFocus]=useState("таро онлайн, отношения, чувства");
  const [top,setTop]=useState(20); const [tolerance,setTolerance]=useState(2); const [keepStopwords,setKeepStopwords]=useState(false);
  const [stopwordEditorLang,setStopwordEditorLang]=useState<Lang>("ru"); const [stopwordLists,setStopwordLists]=useState<Record<Lang,string>>(DEFAULT_STOPWORDS);
  const [result,setResult]=useState<Analysis|null>(null); const [baseline,setBaseline]=useState<SavedResult|null>(null);
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");

  useEffect(()=>{const timer=window.setTimeout(()=>{try{const raw=localStorage.getItem(CACHE_KEY);if(raw)setBaseline(JSON.parse(raw));const savedLists=localStorage.getItem(STOPWORDS_KEY);if(savedLists)setStopwordLists(JSON.parse(savedLists));}catch{}},0);return()=>window.clearTimeout(timer);},[]);

  const parsedStopwords=Object.fromEntries(Object.entries(stopwordLists).map(([lang,value])=>[lang,[...new Set(value.toLowerCase().split(/[\s,;]+/).map(word=>word.trim()).filter(Boolean))]]));
  async function analyze(event?:FormEvent){event?.preventDefault();setLoading(true);setError("");try{const response=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sourceType,source,language,focus,top,tolerance,keepStopwords,stopwordLists:parsedStopwords})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Не удалось выполнить анализ");setResult(data);setTimeout(()=>document.getElementById("result")?.scrollIntoView({behavior:"smooth",block:"start"}),50);}catch(err){setError(err instanceof Error?err.message:"Неизвестная ошибка");}finally{setLoading(false);}}
  function updateStopwords(value:string){const next={...stopwordLists,[stopwordEditorLang]:value};setStopwordLists(next);localStorage.setItem(STOPWORDS_KEY,JSON.stringify(next));}
  function resetStopwords(){const next={...stopwordLists,[stopwordEditorLang]:DEFAULT_STOPWORDS[stopwordEditorLang]};setStopwordLists(next);localStorage.setItem(STOPWORDS_KEY,JSON.stringify(next));}
  function saveA(){if(!result)return;const saved={result,savedAt:new Date().toISOString(),label:`Анализ · ${result.tokenCount} слов`};setBaseline(saved);localStorage.setItem(CACHE_KEY,JSON.stringify(saved));}
  function clearA(){setBaseline(null);localStorage.removeItem(CACHE_KEY);}

  return <main>
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">B</span><span>BOW <i>/</i> ZIPF LAB</span></a><span className="status"><b/>данные не сохраняются на сервере</span></header>
    <section className="hero reduced" id="top"><p className="eyebrow">СРАВНЕНИЕ ЛЕКСИКИ</p><h1>Два текста.<br/><em>Одна картина.</em></h1><p className="hero-copy">Сначала сохраните анализ как A, затем запустите второй текст. Сравнение появится автоматически.</p></section>

    <form className="workspace" onSubmit={analyze}>
      <section className="input-card">
        <div className="section-head"><div><span>01</span><h2>Текст для анализа</h2></div><div className="tabs"><button type="button" className={sourceType==="text"?"active":""} onClick={()=>{setSourceType("text");setSource(SAMPLE)}}>Текст</button><button type="button" className={sourceType==="url"?"active":""} onClick={()=>{setSourceType("url");setSource("")}}>URL</button></div></div>
        {sourceType==="text"?<div className="textarea-wrap"><textarea value={source} onChange={e=>setSource(e.target.value)} placeholder="Вставьте текст или HTML…"/><span>{source.length.toLocaleString("ru-RU")} знаков</span></div>:<input className="url-input" type="url" value={source} onChange={e=>setSource(e.target.value)} placeholder="https://example.com/page" required/>}
        <label className="field wide"><span>Контрольные фразы <Tip>Слова и фразы, которые вы хотите проверить отдельно. Инструмент покажет точное число упоминаний; это не список обязательных SEO-ключей.</Tip></span><input value={focus} onChange={e=>setFocus(e.target.value)} placeholder="таро онлайн, отношения, чувства"/><small>Введите через запятую. Мы посчитаем точные упоминания каждой фразы.</small></label>
      </section>
      <aside className="settings-card">
        <div className="section-head simple"><div><span>02</span><h2>Настройки</h2></div></div>
        <label className="field"><span>Язык <Tip>Нужен для правильного списка стоп-слов. В режиме «авто» язык определяется по буквам в тексте.</Tip></span><select value={language} onChange={e=>setLanguage(e.target.value)}><option value="auto">Определить автоматически</option><option value="ru">Русский</option><option value="uk">Украинский</option><option value="en">English</option></select><small>Обычно оставляйте «автоматически».</small></label>
        <label className="field"><span>Слов в подробной таблице <Tip>Определяет только длину скрытой подробной таблицы. На сам расчёт показателей не влияет.</Tip></span><input type="number" min="5" max="100" value={top} onChange={e=>setTop(Number(e.target.value))}/><small>20 достаточно для быстрой проверки.</small></label>
        <label className="field range-field"><span><span>Чувствительность <Tip>При ×2 слово помечается как частое, если встречается более чем вдвое чаще модели Ципфа. Меньше число — больше предупреждений.</Tip></span><b>×{tolerance.toFixed(1)}</b></span><input type="range" min="1.2" max="4" step="0.1" value={tolerance} onChange={e=>setTolerance(Number(e.target.value))}/><small>×2 — спокойный базовый режим.</small></label>
        <label className="check"><input type="checkbox" checked={keepStopwords} onChange={e=>setKeepStopwords(e.target.checked)}/><span><b>Учитывать стоп-слова <Tip>Если включить, список ниже не применяется и служебные слова остаются в анализе.</Tip></b><small>{keepStopwords?"Стоп-слова сейчас остаются в тексте.":"Стоп-слова исключаются по редактируемому списку."}</small></span></label>
        <details className="stopword-editor"><summary>Редактировать стоп-слова <span>{parsedStopwords[stopwordEditorLang].length}</span></summary><div className="stopword-body"><div className="stopword-tabs">{(["ru","uk","en"] as Lang[]).map(lang=><button type="button" key={lang} className={stopwordEditorLang===lang?"active":""} onClick={()=>setStopwordEditorLang(lang)}>{lang.toUpperCase()}</button>)}</div><p>Удалите слово из списка или допишите новое через запятую. При автоопределении языка применяется соответствующий список.</p><textarea value={stopwordLists[stopwordEditorLang]} onChange={e=>updateStopwords(e.target.value)} aria-label={`Стоп-слова ${stopwordEditorLang}`}/><div className="stopword-actions"><small>{parsedStopwords[stopwordEditorLang].length} слов · сохраняются в браузере</small><button type="button" onClick={resetStopwords}>Вернуть стандартный список</button></div></div></details>
        <button className="analyze-button" disabled={loading||!source.trim()}><span>{loading?"Считаю…":baseline?"Анализировать как B":"Запустить анализ"}</span><b>→</b></button>
        {baseline&&<div className="cached-pill"><span>A</span><p><b>{baseline.label}</b><small>Сохранён в этом браузере</small></p><button type="button" onClick={clearA} aria-label="Удалить сохранённый результат">×</button></div>}
        {error&&<p className="error">{error}</p>}
      </aside>
    </form>

    {result&&<section className="results simplified" id="result">
      <div className="results-title"><div><span>03</span><h2>{baseline?"Текущий результат B":"Результат анализа"}</h2></div>{!baseline&&<button className="save-button" onClick={saveA}>Сохранить как результат A</button>}</div>
      {!baseline&&<div className="next-step"><span>Следующий шаг</span><p>Сохраните этот результат как A, замените текст сверху и запустите анализ ещё раз. Второй результат станет B.</p></div>}
      <div className="metrics-grid clean-metrics">
        <Metric label="Слов в расчёте" value={result.tokenCount.toLocaleString("ru-RU")} explanation="Количество слов после очистки текста. Это не символы и не все слова страницы."/>
        <Metric label="Уникальных слов" value={String(result.vocabularySize)} explanation="Сколько разных слов найдено. Повторы считаются один раз."/>
        <Metric label="Показатель Ципфа" value={result.fittedExponent.toFixed(2)} explanation="Форма частотного распределения. Значение около 1 — ориентир, а не оценка качества или ранжирования."/>
        <Metric label="Выше модели" value={String(result.rows.filter(r=>r.zone==="above").length)} explanation="Сколько слов превысило выбранный допуск относительно модели. Их нужно проверить в контексте, а не автоматически удалить."/>
      </div>
      <div className="plain-summary"><h3>Что это значит</h3><ol>{result.notes.slice(0,3).map((note,i)=><li key={note}><span>{i+1}</span><p>{note}</p></li>)}</ol></div>
      <details className="details-block"><summary>Показать график и подробные данные <span>необязательно для быстрого сравнения</span></summary><div className="details-content"><article className="chart-card"><div className="card-title"><div><p>Распределение слов</p><h3>Фактическая частота и модель Ципфа</h3></div><div className="legend"><span className="actual">Факт</span><span className="expected">Модель</span></div></div><ZipfChart rows={result.rows}/><p className="chart-note">По горизонтали — место слова по частоте. По вертикали — сколько раз оно встретилось. Пунктир показывает теоретическую модель.</p></article><div className="table-card compact-table"><table><thead><tr><th>#</th><th>Слово</th><th>В тексте</th><th>По модели</th><th>Статус</th></tr></thead><tbody>{result.rows.map(row=><tr key={row.rank}><td>{row.rank}</td><td><b>{row.term}</b></td><td>{row.actualCount} раз</td><td>{row.expectedCount.toFixed(1)}</td><td><ZoneBadge zone={row.zone}/></td></tr>)}</tbody></table></div></div></details>
    </section>}

    {baseline&&result&&<Comparison baseline={baseline} current={result} onClear={clearA}/>} 
    {!result&&<section className="empty-state"><span>03</span><p>Запустите анализ — здесь появится короткое объяснение результата.</p></section>}
    <footer><span>BOW / ZIPF LAB</span><p>Сохранённый результат A хранится только в вашем браузере</p></footer>
  </main>;
}
