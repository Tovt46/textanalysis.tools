type Lang = "en" | "ru" | "uk";

const STOPWORDS: Record<Lang, Set<string>> = {
  en: new Set("a an and are as at be been by for from had has have he her hers him his i if in into is it its me my of on or our ours she so that the their them they this to us was we were what when where which who why will with you your yours".split(" ")),
  ru: new Set("а без бы был была были быть в вам вас вы где да для до его ее ей если есть еще за и из или их как к когда ли меня мне мы на над не него нее нет ни но о он она они от по под при с со так то ты у уже что чтобы это я".split(" ")),
  uk: new Set("а або але б без би був була були бути в вам вас ви від він вона вони все всіх де до за з зі й і із його її їх коли ми мене мені мною на над не ні ним нього неї о по про під при та так ти то у усе це цей ця ці що щоб як".split(" ")),
};

export type AnalyzeInput = {
  text: string;
  language?: "auto" | Lang;
  focus?: string;
  top?: number;
  tolerance?: number;
  keepStopwords?: boolean;
  stopwordLists?: Partial<Record<Lang, string[]>>;
};

function detectLanguage(text: string): Lang {
  const lower = text.toLowerCase();
  const cyrillic = (lower.match(/[а-яёіїєґ]/g) || []).length;
  const latin = (lower.match(/[a-z]/g) || []).length;
  if (cyrillic > latin) return /[іїєґ]/.test(lower) ? "uk" : "ru";
  return "en";
}

function cleanHtml(raw: string) {
  return raw
    .replace(/<(script|style|noscript|svg|canvas)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string, lang: Lang, keepStopwords: boolean, stopwords = STOPWORDS[lang]) {
  const matches = text.normalize("NFKC").toLowerCase().replaceAll("’", "'").match(/[a-zа-яёіїєґ0-9']+/gi) || [];
  return matches
    .map((token) => token.replace(/^'+|'+$/g, ""))
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token))
    .filter((token) => keepStopwords || !stopwords.has(token));
}

function countTerms(tokens: string[], n = 1) {
  const counts = new Map<string, number>();
  for (let i = 0; i <= tokens.length - n; i++) {
    const term = tokens.slice(i, i + n).join(" ");
    counts.set(term, (counts.get(term) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function analyzeText(input: AnalyzeInput) {
  const plain = cleanHtml(input.text);
  const language = input.language === "auto" || !input.language ? detectLanguage(plain) : input.language;
  const suppliedStopwords = input.stopwordLists?.[language];
  const activeStopwords = suppliedStopwords ? new Set(suppliedStopwords.map((word) => word.trim().toLowerCase()).filter(Boolean)) : STOPWORDS[language];
  const tokens = tokenize(plain, language, Boolean(input.keepStopwords), activeStopwords);
  if (tokens.length < 3) throw new Error("В источнике слишком мало текста для анализа");
  const unigramCounts = countTerms(tokens);
  const bigramCounts = countTerms(tokens, 2);
  const top = Math.max(5, Math.min(Number(input.top) || 20, 100));
  const tolerance = Math.max(1.2, Math.min(Number(input.tolerance) || 2, 4));
  const topCount = unigramCounts[0][1];

  const logRanks = unigramCounts.map((_, i) => Math.log(i + 1));
  const logCounts = unigramCounts.map(([, count]) => Math.log(count));
  const meanX = logRanks.reduce((a, b) => a + b, 0) / logRanks.length;
  const meanY = logCounts.reduce((a, b) => a + b, 0) / logCounts.length;
  const varianceX = logRanks.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  const covariance = logRanks.reduce((sum, x, i) => sum + (x - meanX) * (logCounts[i] - meanY), 0);
  const slope = varianceX ? covariance / varianceX : 0;
  const intercept = meanY - slope * meanX;
  const totalVariance = logCounts.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
  const residualVariance = logCounts.reduce((sum, y, i) => sum + (y - (intercept + slope * logRanks[i])) ** 2, 0);
  const rSquared = totalVariance ? Math.max(0, 1 - residualVariance / totalVariance) : 0;

  const rows = unigramCounts.slice(0, top).map(([term, actualCount], index) => {
    const rank = index + 1;
    const expectedCount = topCount / rank;
    const ratio = actualCount / expectedCount;
    let zone: "above" | "within" | "below" | "sparse-tail" = "within";
    if (expectedCount < 1) zone = "sparse-tail";
    else if (ratio > tolerance) zone = "above";
    else if (ratio < 1 / tolerance) zone = "below";
    return { rank, term, actualCount, expectedCount, ratio, zone };
  });

  const focusTerms = (input.focus || "").split(",").map((term) => term.trim().toLowerCase()).filter(Boolean);
  const focusCoverage = focusTerms.map((term) => {
    const phraseTokens = tokenize(term, language, true);
    const haystack = tokens.join(" ");
    const needle = phraseTokens.join(" ");
    const count = needle ? haystack.split(needle).length - 1 : 0;
    return { term, count, per1000: tokens.length ? (count / tokens.length) * 1000 : 0 };
  });

  const above = rows.filter((row) => row.zone === "above");
  const missingFocus = focusCoverage.filter((row) => row.count === 0);
  const notes: string[] = [];
  if (tokens.length < 100) notes.push("Текст короткий: распределение нестабильно. Используйте результат как ориентир, а не как норму.");
  if (above.length) notes.push(`Проверьте повторение ${above.slice(0, 3).map((row) => `«${row.term}»`).join(", ")}: эти слова выше выбранной зоны.`);
  else notes.push("В верхней части распределения нет слов, заметно превышающих выбранный допуск.");
  if (missingFocus.length) notes.push(`Не найдены контрольные фразы: ${missingFocus.slice(0, 3).map((row) => `«${row.term}»`).join(", ")}. Добавляйте только если они соответствуют интенту.`);
  else if (focusCoverage.length) notes.push("Все контрольные фразы присутствуют; проверьте, естественно ли они встроены в контекст.");
  notes.push("Перед правкой проверьте меню, повторяющиеся блоки и шаблонный текст: они часто искажают частотность страницы.");

  return {
    language,
    tokenCount: tokens.length,
    vocabularySize: unigramCounts.length,
    fittedExponent: -slope,
    rSquared,
    rows,
    bigrams: bigramCounts.slice(0, top).map(([term, count]) => ({ term, count, share: count / Math.max(tokens.length - 1, 1) })),
    focusCoverage,
    stopwordCount: activeStopwords.size,
    notes,
  };
}
