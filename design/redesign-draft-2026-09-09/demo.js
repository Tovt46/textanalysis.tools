/* Standalone design draft. Calculations use the locally bundled production engine. */
(() => {
  const $ = (id) => document.getElementById(id);
  const sample = `Sustainable travel starts with a simple question: what makes a journey worth taking? For many travelers, the answer is time. Slow travel gives people more time to explore a place, meet local residents, and notice the details that a packed itinerary can hide.

A sustainable travel guide should make practical choices easier. Explain how to arrive by train, where to find local food, and which walking routes connect the main sights. Good travel writing gives readers useful details without turning every paragraph into a list of recommendations.

Local businesses can help a destination keep its character. Choose a neighborhood cafe, book a small guesthouse, and ask local guides about the places they enjoy. Sustainable travel is also about curiosity: listen before making assumptions, and leave room for plans to change.

Editors can make a travel guide more useful by checking repeated claims and vague language. Does the article explain what sustainable means in this particular place? Are the travel options clear? Can a reader compare time, cost, and convenience?

The best guide supports a thoughtful journey. It gives travelers enough information to choose for themselves, while keeping the writing clear, specific, and grounded in the local experience.`;
  let result = null;
  let source = '';
  let stale = false;
  const languageNames = { en: 'English', ru: 'Russian', uk: 'Ukrainian', es: 'Spanish' };
  const announce = (message) => { $('analysis-status').textContent = message; };
  const setExports = (disabled) => ['export-csv', 'copy-results'].forEach((id) => { $(id).disabled = disabled; });
  const matchedRows = () => (result?.rows || []).filter((row) => row.term.includes($('term-search').value.trim().toLowerCase()));
  function updateSourceMeta() {
    $('source-meta').textContent = `${$('source-text').value.length.toLocaleString()} characters · processed in your browser`;
  }
  function showContext(term) {
    const holder = $('term-context');
    holder.replaceChildren();
    const label = document.createElement('strong');
    label.textContent = `“${term}” in context`;
    holder.append(label);
    const escaped = term.split(' ').map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
    const expression = new RegExp(`(?<![\\p{L}\\p{N}'])${escaped}(?![\\p{L}\\p{N}'])`, 'giu');
    const matches = Array.from(source.matchAll(expression)).slice(0, 3);
    for (const match of matches) {
      const paragraph = document.createElement('p');
      const start = Math.max(0, match.index - 75);
      const end = Math.min(source.length, match.index + match[0].length + 95);
      paragraph.append(document.createTextNode(`${start ? '…' : ''}${source.slice(start, match.index)}`));
      const mark = document.createElement('mark');
      mark.textContent = match[0];
      paragraph.append(mark, document.createTextNode(`${source.slice(match.index + match[0].length, end)}${end < source.length ? '…' : ''}`));
      holder.append(paragraph);
    }
    if (!matches.length) holder.append(document.createTextNode(' The analysis normalizes punctuation and HTML; no literal match was found in the source.'));
    holder.hidden = false;
  }
  function renderRows() {
    const rows = matchedRows();
    setExports(stale || !rows.length);
    $('term-rows').replaceChildren();
    for (const row of rows.slice(0, 12)) {
      const tr = document.createElement('tr');
      const termCell = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'term-link';
      button.textContent = row.term;
      button.setAttribute('aria-label', `Show ${row.term} in context`);
      button.addEventListener('click', () => showContext(row.term));
      const bar = document.createElement('span');
      bar.className = 'term-bar';
      bar.style.width = `${row.count / Math.max(1, result.rows[0]?.count || 1) * 100}%`;
      bar.setAttribute('aria-hidden', 'true');
      termCell.append(button, bar);
      const count = document.createElement('td');
      count.textContent = row.count.toLocaleString();
      const density = document.createElement('td');
      density.textContent = `${row.percentage.toFixed(2)}%`;
      tr.append(termCell, count, density);
      $('term-rows').append(tr);
    }
    if (!rows.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.textContent = result ? 'No terms match this filter.' : 'Add text and run an analysis.';
      row.append(cell);
      $('term-rows').append(row);
    }
    $('result-summary').textContent = result
      ? `${Math.min(rows.length, 12)} of ${rows.length} terms · density: count ÷ ${result.denominator.toLocaleString()} ${result.n === 1 ? 'source words' : `${result.n}-word windows`}`
      : 'Your results will appear here.';
  }
  function renderChart() {
    const holder = $('distribution-chart');
    holder.replaceChildren();
    if (!result?.rows.length) return;
    const namespace = 'http://www.w3.org/2000/svg';
    const element = (name, attributes, text) => {
      const node = document.createElementNS(namespace, name);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const svg = element('svg', { viewBox: '0 0 560 190', role: 'img', 'aria-label': 'Actual counts for the ten most frequent terms, ordered by rank' });
    svg.append(element('title', {}, 'Term frequency by rank'));
    const top = result.rows.slice(0, 10);
    const maximum = top[0].count;
    for (let level = 0; level <= 3; level += 1) {
      const y = 20 + level * 43;
      svg.append(element('line', { x1: 34, y1: y, x2: 538, y2: y, stroke: 'currentColor', opacity: '.1' }));
      svg.append(element('text', { x: 22, y: y + 4, 'text-anchor': 'end', fill: 'currentColor', opacity: '.5', 'font-size': 10 }, Math.round(maximum * (1 - level / 3))));
    }
    const points = top.map((row, index) => [34 + index * 504 / Math.max(1, top.length - 1), 149 - row.count / maximum * 129]);
    svg.append(element('path', { d: `M ${points.map((point) => point.join(' ')).join(' L ')} L ${points.at(-1)[0]} 149 L 34 149 Z`, fill: 'var(--accent, #a7ed81)', opacity: '.07' }));
    svg.append(element('polyline', { points: points.map((point) => point.join(',')).join(' '), fill: 'none', stroke: 'var(--accent, #a7ed81)', 'stroke-width': 2 }));
    points.forEach(([x, y], index) => {
      const dot = element('circle', { cx: x, cy: y, r: 3, fill: 'var(--accent, #a7ed81)' });
      dot.append(element('title', {}, `${top[index].term}: ${top[index].count}`));
      svg.append(dot, element('text', { x, y: 172, 'text-anchor': 'middle', fill: 'currentColor', opacity: '.5', 'font-size': 10 }, index + 1));
    });
    holder.append(svg);
  }
  function run() {
    if ($('source-text').value.length > 50000) { announce('This draft accepts up to 50,000 characters. Shorten the text to continue.'); setExports(true); return; }
    source = $('source-text').value;
    if (!source.trim()) { clear(); return; }
    const n = Number($('ngram-size').value);
    const input = { text: source, language: $('analysis-language').value, keepStopwords: !$('exclude-stopwords').checked };
    const base = DraftEngine.analyzeKeywordDensity(input);
    const phrases = n > 1 ? DraftEngine.analyzeNgram(input, n) : null;
    result = { rows: phrases?.rows || base.unigrams, denominator: phrases?.ngramCount ?? base.wordCount, n };
    $('word-total').textContent = base.wordCount.toLocaleString();
    $('unique-total').textContent = DraftEngine.analyzeKeywordDensity({ ...input, keepStopwords: true }).vocabularySize.toLocaleString();
    $('character-total').textContent = source.length.toLocaleString();
    $('reading-total').textContent = base.wordCount ? `${Math.max(1, Math.round(base.wordCount / 200))} min` : '0 min';
    $('term-context').hidden = true;
    ['tab-frequency', 'tab-phrases'].forEach((id, index) => {
      const selected = index === 0 ? n === 1 : n > 1;
      $(id).classList.toggle('active', selected);
      $(id).setAttribute('aria-pressed', String(selected));
    });
    stale = false;
    setExports(!result.rows.length);
    renderRows(); renderChart(); updateSourceMeta();
    announce(`${languageNames[base.language]} · analyzed locally${input.keepStopwords ? '' : ' · stop words filtered'}`);
  }
  function clear() {
    $('source-text').value = ''; source = ''; result = null; stale = false;
    ['word-total', 'unique-total', 'character-total'].forEach((id) => { $(id).textContent = '0'; });
    $('reading-total').textContent = '0 min';
    $('term-context').hidden = true;
    renderRows(); renderChart(); updateSourceMeta(); setExports(true);
    announce('Paste your text to begin.');
  }
  function loadExample() { $('source-text').value = sample; $('term-search').value = ''; $('analysis-language').value = 'auto'; run(); }
  $('analyze-button').addEventListener('click', run);
  $('load-example').addEventListener('click', loadExample);
  $('clear-text').addEventListener('click', clear);
  $('term-search').addEventListener('input', renderRows);
  ['ngram-size', 'exclude-stopwords', 'analysis-language'].forEach((id) => $(id).addEventListener('change', run));
  $('source-text').addEventListener('input', () => {
    stale = true; setExports(true); updateSourceMeta();
    announce($('source-text').value.length > 50000 ? 'Character limit exceeded: use up to 50,000 characters.' : 'Text changed. Click Analyze to update these results.');
  });
  $('tab-frequency').addEventListener('click', () => { $('ngram-size').value = '1'; run(); });
  $('tab-phrases').addEventListener('click', () => { $('ngram-size').value = '2'; run(); });
  $('export-csv').addEventListener('click', () => {
    if (!result || stale) return;
    const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [['Term', 'Count', 'Density (%)'], ...matchedRows().map((row) => [row.term, row.count, row.percentage.toFixed(4)])].map((row) => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'textanalysis-frequency.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce(`Exported ${matchedRows().length} matching terms as CSV.`);
  });
  $('copy-results').addEventListener('click', async () => {
    if (!result || stale) return;
    const summary = `${result.n}-word frequency · denominator: ${result.denominator} ${result.n === 1 ? 'source words' : 'source n-gram windows'}`;
    const text = `${summary}\nTerm\tCount\tDensity (%)\n${matchedRows().map((row) => `${row.term}\t${row.count}\t${row.percentage.toFixed(2)}%`).join('\n')}`;
    try { await navigator.clipboard.writeText(text); announce('Results copied to clipboard.'); }
    catch { announce('Clipboard access was denied. Use Export CSV to save the results.'); }
  });
  window.draftAnalysis = { loadExample, run, clear };
  loadExample();
})();
