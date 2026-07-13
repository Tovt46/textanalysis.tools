"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Zone = "above" | "within" | "below" | "sparse-tail";
type ZipfRow = {
  rank: number;
  term: string;
  actualCount: number;
  expectedCount: number;
  ratio: number;
  zone: Zone;
};
type Analysis = {
  language: string;
  tokenCount: number;
  vocabularySize: number;
  fittedExponent: number;
  rSquared: number;
  rows: ZipfRow[];
  bigrams: { term: string; count: number; share: number }[];
  focusCoverage: { term: string; count: number; per1000: number }[];
  notes: string[];
};

const SAMPLE = `Онлайн-расклад Таро помогает внимательнее посмотреть на отношения, чувства и возможные сценарии развития ситуации. Карты не принимают решение за вас, но могут подсветить скрытые эмоции, повторяющиеся patterns и вопросы, которые стоит обсудить с партнёром. Сформулируйте ясный вопрос, выберите карты и прочитайте толкование спокойно — как повод для размышления, а не неизбежный прогноз.`;

function ZoneBadge({ zone }: { zone: Zone }) {
  const labels: Record<Zone, string> = {
    above: "выше",
    within: "в норме",
    below: "ниже",
    "sparse-tail": "редкий хвост",
  };
  return <span className={`zone zone-${zone}`}>{labels[zone]}</span>;
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function ZipfChart({ rows }: { rows: ZipfRow[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows.length < 2) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;
      const pad = { left: 44, right: 18, top: 20, bottom: 34 };
      const plotW = w - pad.left - pad.right;
      const plotH = h - pad.top - pad.bottom;
      const maxRank = Math.max(...rows.map((r) => r.rank));
      const maxCount = Math.max(...rows.map((r) => r.actualCount));
      const x = (rank: number) => pad.left + (Math.log(rank) / Math.log(maxRank)) * plotW;
      const y = (count: number) => pad.top + (1 - Math.log(Math.max(count, 1)) / Math.log(Math.max(maxCount, 2))) * plotH;

      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "#dfe3dc";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const gy = pad.top + (plotH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, gy);
        ctx.lineTo(w - pad.right, gy);
        ctx.stroke();
      }

      const line = (key: "actualCount" | "expectedCount", color: string, dashed = false) => {
        ctx.beginPath();
        rows.forEach((row, index) => {
          const px = x(row.rank);
          const py = y(row[key]);
          if (index === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash(dashed ? [6, 5] : []);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      line("expectedCount", "#a6ada3", true);
      line("actualCount", "#175c4b");

      rows.forEach((row) => {
        ctx.beginPath();
        ctx.arc(x(row.rank), y(row.actualCount), 3, 0, Math.PI * 2);
        ctx.fillStyle = row.zone === "above" ? "#d26b45" : "#175c4b";
        ctx.fill();
      });

      ctx.fillStyle = "#6f756e";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText("частота", 4, 13);
      ctx.fillText("ранг →", w - 62, h - 8);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [rows]);

  return <canvas ref={canvasRef} className="chart" aria-label="График фактической и ожидаемой частоты по закону Ципфа" />;
}

export default function Home() {
  const [sourceType, setSourceType] = useState<"text" | "url">("text");
  const [source, setSource] = useState(SAMPLE);
  const [language, setLanguage] = useState("auto");
  const [focus, setFocus] = useState("таро онлайн, отношения, чувства");
  const [top, setTop] = useState(20);
  const [tolerance, setTolerance] = useState(2);
  const [keepStopwords, setKeepStopwords] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, source, language, focus, top, tolerance, keepStopwords }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось выполнить анализ");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="BOW Zipf Lab — наверх">
          <span className="brand-mark">B</span>
          <span>BOW <i>/</i> ZIPF LAB</span>
        </a>
        <span className="status"><b /> локальный анализ</span>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">ЛЕКСИЧЕСКАЯ ДИАГНОСТИКА</p>
        <h1>Проверьте текст<br />на <em>естественность.</em></h1>
        <p className="hero-copy">Частотность слов, биграммы и распределение по закону Ципфа — в одном понятном отчёте без магических SEO-баллов.</p>
      </section>

      <form className="workspace" onSubmit={analyze}>
        <section className="input-card">
          <div className="section-head">
            <div><span>01</span><h2>Источник</h2></div>
            <div className="tabs" role="tablist" aria-label="Тип источника">
              <button type="button" className={sourceType === "text" ? "active" : ""} onClick={() => { setSourceType("text"); setSource(SAMPLE); }}>Текст</button>
              <button type="button" className={sourceType === "url" ? "active" : ""} onClick={() => { setSourceType("url"); setSource(""); }}>URL</button>
            </div>
          </div>

          {sourceType === "text" ? (
            <div className="textarea-wrap">
              <textarea value={source} onChange={(e) => setSource(e.target.value)} placeholder="Вставьте текст или HTML…" aria-label="Текст для анализа" />
              <span>{source.length.toLocaleString("ru-RU")} знаков</span>
            </div>
          ) : (
            <input className="url-input" type="url" value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://example.com/page" aria-label="URL страницы" required />
          )}

          <label className="field wide">
            <span>Контрольные слова и фразы</span>
            <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="таро онлайн, отношения, чувства" />
            <small>Через запятую — проверим покрытие отдельно</small>
          </label>
        </section>

        <aside className="settings-card">
          <div className="section-head simple"><div><span>02</span><h2>Настройки</h2></div></div>
          <label className="field">
            <span>Язык</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="auto">Определить автоматически</option>
              <option value="ru">Русский</option>
              <option value="uk">Украинский</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="field">
            <span>Количество терминов</span>
            <input type="number" min="5" max="100" value={top} onChange={(e) => setTop(Number(e.target.value))} />
          </label>
          <label className="field range-field">
            <span><span>Допуск Ципфа</span><b>×{tolerance.toFixed(1)}</b></span>
            <input type="range" min="1.2" max="4" step="0.1" value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} />
            <small>Чем ниже, тем чувствительнее диагностика</small>
          </label>
          <label className="check">
            <input type="checkbox" checked={keepStopwords} onChange={(e) => setKeepStopwords(e.target.checked)} />
            <span><b>Учитывать стоп-слова</b><small>Союзы, предлоги и местоимения</small></span>
          </label>
          <button className="analyze-button" disabled={loading || !source.trim()}>
            <span>{loading ? "Считаю…" : "Запустить анализ"}</span><b>→</b>
          </button>
          {error && <p className="error" role="alert">{error}</p>}
        </aside>
      </form>

      {result ? (
        <section className="results" aria-live="polite">
          <div className="results-title"><div><span>03</span><h2>Результат</h2></div><p>Язык: <b>{result.language.toUpperCase()}</b></p></div>
          <div className="metrics-grid">
            <Metric label="Слов после фильтра" value={result.tokenCount.toLocaleString("ru-RU")} hint={`${result.vocabularySize} уникальных`} />
            <Metric label="Показатель Ципфа" value={result.fittedExponent.toFixed(2)} hint="ориентир для текста ≈ 1" />
            <Metric label="Соответствие кривой" value={`${Math.round(result.rSquared * 100)}%`} hint="коэффициент R²" />
            <Metric label="Термины выше зоны" value={String(result.rows.filter((r) => r.zone === "above").length)} hint={`допуск ×${tolerance.toFixed(1)}`} />
          </div>

          <div className="analysis-grid">
            <article className="chart-card">
              <div className="card-title"><div><p>Распределение частот</p><h3>Факт против модели</h3></div><div className="legend"><span className="actual">Факт</span><span className="expected">Ципф</span></div></div>
              <ZipfChart rows={result.rows} />
              <p className="chart-note">Логарифмическая шкала · пунктир — ожидаемая частота f(r)=f₁/r</p>
            </article>

            <article className="notes-card">
              <div className="card-title"><div><p>Редакторская проверка</p><h3>Что посмотреть</h3></div></div>
              <ol>{result.notes.map((note, index) => <li key={note}><span>{String(index + 1).padStart(2, "0")}</span><p>{note}</p></li>)}</ol>
              <div className="caution"><b>Важно</b><p>Закон Ципфа — диагностический сигнал, а не фактор ранжирования. Решение о правке всегда принимает редактор.</p></div>
            </article>
          </div>

          <article className="table-card">
            <div className="card-title"><div><p>Ранжированные униграммы</p><h3>Частотная таблица</h3></div><span className="table-count">TOP {result.rows.length}</span></div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>#</th><th>Термин</th><th>Факт</th><th>Ожидание</th><th>Отношение</th><th>Зона</th></tr></thead>
                <tbody>{result.rows.map((row) => <tr key={row.rank}><td>{String(row.rank).padStart(2, "0")}</td><td><b>{row.term}</b></td><td>{row.actualCount}</td><td>{row.expectedCount.toFixed(2)}</td><td>×{row.ratio.toFixed(2)}</td><td><ZoneBadge zone={row.zone} /></td></tr>)}</tbody>
              </table>
            </div>
          </article>

          <div className="lower-grid">
            <article className="mini-card">
              <div className="card-title"><div><p>Фразы</p><h3>Топ биграмм</h3></div></div>
              <ul className="rank-list">{result.bigrams.slice(0, 8).map((row, i) => <li key={row.term}><span>{i + 1}</span><b>{row.term}</b><em>{row.count}</em></li>)}</ul>
            </article>
            <article className="mini-card">
              <div className="card-title"><div><p>Целевое покрытие</p><h3>Контрольные фразы</h3></div></div>
              {result.focusCoverage.length ? <ul className="focus-list">{result.focusCoverage.map((row) => <li key={row.term}><div><b>{row.term}</b><small>{row.per1000.toFixed(2)} на 1000 слов</small></div><strong className={row.count ? "found" : "missing"}>{row.count ? row.count : "нет"}</strong></li>)}</ul> : <p className="empty">Добавьте контрольные слова перед запуском анализа.</p>}
            </article>
          </div>
        </section>
      ) : (
        <section className="empty-state"><span>03</span><p>Здесь появится отчёт после запуска анализа.</p></section>
      )}

      <footer><span>BOW / ZIPF LAB</span><p>Данные не сохраняются · Анализ выполняется по запросу</p></footer>
    </main>
  );
}
