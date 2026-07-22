import { translate, type UiLang } from "../i18n";

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
  uiLanguage?: UiLang;
};

function detectLanguage(text: string): Lang {
  const lower = text.toLowerCase();
  const cyrillic = (lower.match(/[а-яёіїєґ]/g) || []).length;
  const latin = (lower.match(/[a-z]/g) || []).length;
  if (cyrillic > latin) return /[іїєґ]/.test(lower) ? "uk" : "ru";
  return "en";
}

function cleanHtml(raw: string) {
  const namedEntities: Record<string, string> = {
    amp: "&", apos: "'", bull: " • ", copy: " © ", gt: ">", hellip: "…",
    laquo: "«", ldquo: "“", lsquo: "‘", lt: "<", mdash: "—", middot: " · ",
    nbsp: " ", ndash: "–", quot: '"', raquo: "»", rdquo: "”", reg: " ® ",
    rsquo: "’", trade: " ™ ",
  };
  const decodeEntity = (_match: string, entity: string) => {
    if (entity.startsWith("#")) {
      const hexadecimal = entity[1]?.toLowerCase() === "x";
      const value = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (Number.isInteger(value) && value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)) {
        return String.fromCodePoint(value);
      }
      return " ";
    }
    return namedEntities[entity.toLowerCase()] ?? " ";
  };

  return raw
    .replace(/<(script|style|noscript|svg|canvas)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi, decodeEntity)
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string, lang: Lang, keepStopwords: boolean, stopwords = STOPWORDS[lang]) {
  const matches = text.normalize("NFKC").toLowerCase().replaceAll("’", "'").match(/[a-zа-яёіїєґ0-9']+/gi) || [];
  return matches
    .map((token) => token.replace(/^'+|'+$/g, ""))
    .filter((token) => token.length > 0 && !/^\d+$/.test(token))
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
  const uiLanguage = input.uiLanguage || "ru";
  const plain = cleanHtml(input.text);
  const language = input.language === "auto" || !input.language ? detectLanguage(plain) : input.language;
  const suppliedStopwords = input.stopwordLists?.[language];
  const activeStopwords = suppliedStopwords ? new Set(suppliedStopwords.map((word) => word.trim().toLowerCase()).filter(Boolean)) : STOPWORDS[language];
  const tokens = tokenize(plain, language, Boolean(input.keepStopwords), activeStopwords);
  if (tokens.length < 3) throw new Error(translate(uiLanguage, "tooLittle"));
  const unigramCounts = countTerms(tokens);
  const bigramCounts = countTerms(tokens, 2);
  const top = Math.max(5, Math.min(Number(input.top) || 20, 100));
  const tolerance = Math.max(1.2, Math.min(Number(input.tolerance) || 2, 4));
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

  const allRows = unigramCounts.map(([term, actualCount], index) => {
    const rank = index + 1;
    const expectedCount = Math.exp(intercept + slope * Math.log(rank));
    const ratio = actualCount / expectedCount;
    let zone: "above" | "within" | "below" | "sparse-tail" = "within";
    if (expectedCount < 1) zone = "sparse-tail";
    else if (ratio > tolerance) zone = "above";
    else if (ratio < 1 / tolerance) zone = "below";
    return { rank, term, actualCount, expectedCount, ratio, zone };
  });
  const rows = allRows.slice(0, top);

  const focusTerms = (input.focus || "").split(",").map((term) => term.trim().toLowerCase()).filter(Boolean);
  const focusCoverage = focusTerms.map((term) => {
    const phraseTokens = tokenize(term, language, true);
    let count = 0;
    if (phraseTokens.length) {
      for (let index = 0; index <= tokens.length - phraseTokens.length; index += 1) {
        if (phraseTokens.every((token, offset) => tokens[index + offset] === token)) count += 1;
      }
    }
    return { term, count, per1000: tokens.length ? (count / tokens.length) * 1000 : 0 };
  });

  const zoneCounts = {
    above: allRows.filter((row) => row.zone === "above").length,
    within: allRows.filter((row) => row.zone === "within").length,
    below: allRows.filter((row) => row.zone === "below").length,
    sparseTail: allRows.filter((row) => row.zone === "sparse-tail").length,
  };
  const above = allRows.filter((row) => row.zone === "above");
  const missingFocus = focusCoverage.filter((row) => row.count === 0);
  const notes: string[] = [];
  if (tokens.length < 100) notes.push(translate(uiLanguage, "shortNote"));
  if (above.length) notes.push(translate(uiLanguage, "aboveNote", { terms: above.slice(0, 3).map((row) => `“${row.term}”`).join(", ") }));
  else notes.push(translate(uiLanguage, "noneAbove"));
  if (missingFocus.length) notes.push(translate(uiLanguage, "missingFocus", { terms: missingFocus.slice(0, 3).map((row) => `“${row.term}”`).join(", ") }));
  else if (focusCoverage.length) notes.push(translate(uiLanguage, "allFocus"));
  notes.push(translate(uiLanguage, "templateNote"));

  return {
    language,
    tokenCount: tokens.length,
    vocabularySize: unigramCounts.length,
    fittedExponent: -slope,
    rSquared,
    zoneCounts,
    rows,
    bigrams: bigramCounts.slice(0, top).map(([term, count]) => ({ term, count, share: count / Math.max(tokens.length - 1, 1) })),
    focusCoverage,
    stopwordCount: activeStopwords.size,
    notes,
    _allUnigrams: unigramCounts.map(([term, count]) => ({ term, count })),
    _allBigrams: bigramCounts.map(([term, count]) => ({ term, count })),
  };
}
