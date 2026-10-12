import { cleanAnalysisText, tokenizeAnalysisTerms } from "./analyze";
import { DEFAULT_STOPWORD_LISTS, type TextLanguage } from "./stopwords";

export type ContextIndexOptions = {
  language: TextLanguage;
  keepStopwords?: boolean;
  keepNumbers?: boolean;
  minimumTokenLength?: number;
  stopwordLists?: Partial<Record<TextLanguage, string[]>>;
};

export type ContextToken = { term: string; start: number; end: number };

export type TermContextIndex = {
  /** The engine's cleaned text, with its original spelling and capitalization. */
  text: string;
  /** Offsets use UTF-16 positions in text, as String.slice does. */
  tokens: ContextToken[];
  keepStopwords: boolean;
  stopwords: ReadonlySet<string>;
  tokenization: { keepNumbers?: boolean; minimumTokenLength?: number };
};

export type TermContextSnippet = {
  before: string;
  match: string;
  after: string;
  start: number;
  end: number;
};

export type TermContexts = {
  total: number;
  snippets: TermContextSnippet[];
  hasMore: boolean;
  offset: number;
};

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function normalizedWithOffsets(text: string) {
  const parts: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];

  // A grapheme may expand (ﬃ → ffi) or compose (e + ◌́ → é). Every
  // normalized character retains the complete source grapheme's span.
  for (const { segment, index } of graphemes.segment(text)) {
    const normalized = segment.normalize("NFKC").toLowerCase().replaceAll("’", "'");
    parts.push(normalized);
    for (let position = 0; position < normalized.length; position += 1) {
      starts.push(index);
      ends.push(index + segment.length);
    }
  }
  return { normalized: parts.join(""), starts, ends };
}

export function buildContextIndex(rawText: string, options: ContextIndexOptions): TermContextIndex {
  const text = cleanAnalysisText(rawText);
  const suppliedStopwords = options.stopwordLists?.[options.language];
  const stopwords = new Set(suppliedStopwords
    ? suppliedStopwords.map(word => word.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_STOPWORD_LISTS[options.language]);
  const tokenization = {
    keepNumbers: options.keepNumbers,
    minimumTokenLength: options.minimumTokenLength,
  };
  const keepStopwords = Boolean(options.keepStopwords);
  const { normalized, starts, ends } = normalizedWithOffsets(text);
  const tokens: ContextToken[] = [];

  for (const match of normalized.matchAll(/[a-záéíóúüñа-яёіїєґ0-9']+/gi)) {
    // Use the analysis tokenizer for trimming and length/number rules.
    const [term] = tokenizeAnalysisTerms(match[0], tokenization);
    if (!term || (!keepStopwords && stopwords.has(term))) continue;
    const leadingQuotes = match[0].length - match[0].replace(/^'+/, "").length;
    const trailingQuotes = match[0].length - match[0].replace(/'+$/, "").length;
    const normalizedStart = match.index + leadingQuotes;
    const normalizedEnd = match.index + match[0].length - trailingQuotes;
    tokens.push({ term, start: starts[normalizedStart], end: ends[normalizedEnd - 1] });
  }

  return { text, tokens, keepStopwords, stopwords, tokenization };
}

function boundedInteger(value: number | undefined, fallback: number, maximum: number) {
  return value === undefined || !Number.isFinite(value)
    ? fallback
    : Math.max(0, Math.min(maximum, Math.floor(value)));
}

function contextStart(text: string, start: number) {
  const code = text.charCodeAt(start);
  const preceding = text.charCodeAt(start - 1);
  return code >= 0xdc00 && code <= 0xdfff && preceding >= 0xd800 && preceding <= 0xdbff ? start - 1 : start;
}

function contextEnd(text: string, end: number) {
  const code = text.charCodeAt(end - 1);
  const following = text.charCodeAt(end);
  return code >= 0xd800 && code <= 0xdbff && following >= 0xdc00 && following <= 0xdfff ? end + 1 : end;
}

export function findTermContexts(
  index: TermContextIndex,
  term: string,
  options: { limit?: number; offset?: number; contextChars?: number } = {},
): TermContexts {
  const limit = boundedInteger(options.limit, 20, 100);
  const offset = boundedInteger(options.offset, 0, Number.MAX_SAFE_INTEGER);
  const contextChars = boundedInteger(options.contextChars, 60, 500);
  const phrase = tokenizeAnalysisTerms(term, index.tokenization)
    .filter(token => index.keepStopwords || !index.stopwords.has(token));
  const snippets: TermContextSnippet[] = [];
  if (!phrase.length) return { total: 0, snippets, hasMore: false, offset };

  // KMP keeps overlapping phrase counts exact in a single pass, while only
  // materializing the requested page of source snippets.
  const prefix = new Array<number>(phrase.length).fill(0);
  for (let position = 1, matched = 0; position < phrase.length; position += 1) {
    while (matched && phrase[position] !== phrase[matched]) matched = prefix[matched - 1];
    if (phrase[position] === phrase[matched]) matched += 1;
    prefix[position] = matched;
  }

  let total = 0;
  let matched = 0;
  for (let position = 0; position < index.tokens.length; position += 1) {
    const token = index.tokens[position];
    while (matched && token.term !== phrase[matched]) matched = prefix[matched - 1];
    if (token.term === phrase[matched]) matched += 1;
    if (matched !== phrase.length) continue;

    if (total >= offset && snippets.length < limit) {
      const start = index.tokens[position - phrase.length + 1].start;
      const end = token.end;
      const beforeStart = contextStart(index.text, Math.max(0, start - contextChars));
      const afterEnd = contextEnd(index.text, Math.min(index.text.length, end + contextChars));
      snippets.push({
        before: index.text.slice(beforeStart, start),
        match: index.text.slice(start, end),
        after: index.text.slice(end, afterEnd),
        start,
        end,
      });
    }
    total += 1;
    matched = prefix[matched - 1];
  }

  return { total, snippets, hasMore: offset + snippets.length < total, offset };
}
