import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

async function load(entry) {
  const output = await build({
    entryPoints: [new URL(entry, import.meta.url).pathname],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    write: false,
  });
  return import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
}

const { buildContextIndex, findTermContexts } = await load("../app/lib/term-contexts.ts");
const { analyzeWordFrequency, analyzeText, analyzeKeywordDensity, cleanAnalysisText } = await load("../app/lib/analyze.ts");

function assertSourceSpans(index, contexts) {
  for (const snippet of contexts.snippets) {
    assert.equal(snippet.match, index.text.slice(snippet.start, snippet.end));
    assert.ok(snippet.start >= 0 && snippet.end <= index.text.length);
    assert.ok(snippet.start < snippet.end);
  }
}

function assertEngineCounts(text, options) {
  const index = buildContextIndex(text, options);
  const frequency = analyzeWordFrequency({ text, ...options });
  assert.equal(index.tokens.length, frequency.tokenCount);
  for (const row of frequency.rows) {
    const contexts = findTermContexts(index, row.term);
    assert.equal(contexts.total, row.count, row.term);
    assertSourceSpans(index, contexts);
  }
  if (index.tokens.length >= 3) {
    const analysis = analyzeText({ text, ...options, top: 100 });
    for (const row of analysis._allBigrams) {
      const contexts = findTermContexts(index, row.term);
      assert.equal(contexts.total, row.count, row.term);
      assertSourceSpans(index, contexts);
    }
  }
  return index;
}

test("contexts use the same case-insensitive words and bigrams as the analysis engine", () => {
  const index = assertEngineCounts("Alpha, beta! ALPHA beta. Alphabet alphabet; alpha BETA.", { language: "en" });
  const contexts = findTermContexts(index, "alpha");
  assert.equal(contexts.total, 3);
  assert.deepEqual(contexts.snippets.map(snippet => snippet.match), ["Alpha", "ALPHA", "alpha"]);
  assert.equal(findTermContexts(index, "alp").total, 0);
});

test("Unicode normalization retains source spelling, ligatures, apostrophes and grapheme offsets", () => {
  const index = assertEngineCounts("🧭 'ＡＬＰＨＡ' Alpha ﬃ FFI WOMEN’S women's café cafe\u0301 İ I.", {
    language: "en",
    keepStopwords: true,
  });
  assert.deepEqual(findTermContexts(index, "alpha").snippets.map(snippet => snippet.match), ["ＡＬＰＨＡ", "Alpha"]);
  assert.deepEqual(findTermContexts(index, "ffi").snippets.map(snippet => snippet.match), ["ﬃ", "FFI"]);
  assert.deepEqual(findTermContexts(index, "women's").snippets.map(snippet => snippet.match), ["WOMEN’S", "women's"]);
  assert.deepEqual(findTermContexts(index, "café").snippets.map(snippet => snippet.match), ["café", "cafe\u0301"]);
  assert.deepEqual(findTermContexts(index, "i").snippets.map(snippet => snippet.match), ["İ", "I"]);
});

test("Cyrillic, Ukrainian apostrophes and Spanish accented tokens agree with engine counts", () => {
  for (const [text, language] of [
    ["Текст и слова. ТЕКСТ, слова. Ёж ёж; ясный текст.", "ru"],
    ["Пам’ять і пам'ять. Ґрунт, ЇЖА та ґрунт.", "uk"],
    ["El café y el CAFÉ. Más niños, NIÑOS y acción.", "es"],
  ]) assertEngineCounts(text, { language });
});

test("numbers and minimum length use the engine's rules, including retained short numbers", () => {
  const text = "a an go GO editor editors 7 12 123 7 a1 a1 editor";
  const index = assertEngineCounts(text, { language: "en", keepNumbers: true, minimumTokenLength: 3 });
  assert.equal(findTermContexts(index, "7").total, 2);
  assert.equal(findTermContexts(index, "go").total, 0);
  assert.equal(findTermContexts(index, "a1").total, 0);
  assertEngineCounts(text, { language: "en", keepNumbers: false, minimumTokenLength: 1 });
  assertEngineCounts(text, { language: "en", minimumTokenLength: 0 });
});

test("filtered-stream phrases highlight intervening removed stopwords and punctuation", () => {
  const text = "Alpha and beta; alpha / beta. ALPHA the, beta. gamma.";
  const index = assertEngineCounts(text, { language: "en" });
  const contexts = findTermContexts(index, "alpha beta", { contextChars: 0 });
  assert.equal(contexts.total, 3);
  assert.deepEqual(contexts.snippets.map(snippet => snippet.match), ["Alpha and beta", "alpha / beta", "ALPHA the, beta"]);
  assert.ok(contexts.snippets.every(snippet => snippet.before === "" && snippet.after === ""));
});

test("custom stopword lists replace defaults with the same trim and lowercase rules", () => {
  const text = "Alpha bridge beta the alpha BRIDGE beta alpha and beta.";
  const index = assertEngineCounts(text, {
    language: "en",
    stopwordLists: { en: [" BRIDGE ", "", "bridge"] },
  });
  assert.equal(findTermContexts(index, "alpha beta").total, 2);
  assert.equal(findTermContexts(index, "the").total, 1);
  assert.equal(findTermContexts(index, "bridge").total, 0);
  assertEngineCounts(text, { language: "en", stopwordLists: { en: [] } });
});

test("density contexts retain raw-stream words and agree with tracked phrase and n-gram counts", () => {
  const text = "SEO and content. SEO content; seo and content. keyword density keyword density.";
  const options = { language: "en", keepStopwords: false };
  const density = analyzeKeywordDensity({ text, ...options }, ["seo and content", "seo content", "keyword density", "and"]);
  const index = buildContextIndex(text, { ...options, keepStopwords: true });
  for (const row of [...density.trackedKeywords, ...density.unigrams, ...density.bigrams, ...density.trigrams]) {
    assert.equal(findTermContexts(index, row.term).total, row.count, row.term);
  }
  assert.equal(findTermContexts(index, "seo content").total, 1);
});

test("HTML and entity cleanup is shared, removes hidden content and returns text only", () => {
  const text = "<p>Alpha&nbsp;&amp; beta</p><script>alpha alpha</script><style>alpha</style><p>&#65;lpha &#x62;eta &#x1F9ED; WOMEN&rsquo;S &unknown; &lt;img src=x&gt;</p>";
  const index = assertEngineCounts(text, { language: "en" });
  assert.equal(index.text, cleanAnalysisText(text));
  assert.equal(findTermContexts(index, "alpha").total, 2);
  assert.equal(findTermContexts(index, "women's").snippets[0].match, "WOMEN’S");
  assert.match(index.text, /<img src=x>/);
  assert.doesNotMatch(index.text, /<script|<style|<p>/);
});

test("overlapping phrases have exact totals with bounded pagination", () => {
  const index = buildContextIndex("alpha alpha alpha alpha alpha", { language: "en" });
  const first = findTermContexts(index, "alpha alpha", { limit: 2, contextChars: 0 });
  const second = findTermContexts(index, "alpha alpha", { limit: 2, offset: 2, contextChars: 0 });
  assert.equal(first.total, 4);
  assert.equal(first.hasMore, true);
  assert.equal(second.total, 4);
  assert.equal(second.hasMore, false);
  assert.equal(second.offset, 2);
  assert.equal(second.snippets.length, 2);
  assert.deepEqual([...first.snippets, ...second.snippets].map(snippet => snippet.start), [0, 6, 12, 18]);
  assert.equal(findTermContexts(index, "alpha alpha alpha").total, 3);

  const many = buildContextIndex("alpha ".repeat(1000), { language: "en" });
  const bounded = findTermContexts(many, "alpha", { limit: 10000 });
  assert.equal(bounded.total, 1000);
  assert.equal(bounded.snippets.length, 100);
  assert.equal(bounded.hasMore, true);
});

test("empty and out-of-range requests are safe and context boundaries do not split emoji", () => {
  const index = buildContextIndex("🧭alpha🧭 beta", { language: "en" });
  const contexts = findTermContexts(index, "alpha", { contextChars: 1 });
  assert.equal(contexts.snippets[0].before, "🧭");
  assert.equal(contexts.snippets[0].after, "🧭");
  assertSourceSpans(index, contexts);
  assert.deepEqual(findTermContexts(index, "the"), { total: 0, snippets: [], hasMore: false, offset: 0 });
  assert.deepEqual(findTermContexts(index, ""), { total: 0, snippets: [], hasMore: false, offset: 0 });
  const beyond = findTermContexts(index, "alpha", { offset: 100, limit: 1 });
  assert.equal(beyond.total, 1);
  assert.equal(beyond.snippets.length, 0);
  assert.equal(beyond.hasMore, false);
  const zero = findTermContexts(index, "alpha", { offset: -5, limit: 0 });
  assert.equal(zero.offset, 0);
  assert.equal(zero.total, 1);
  assert.equal(zero.snippets.length, 0);
  assert.equal(zero.hasMore, true);
  assert.equal(findTermContexts(index, "alpha", { limit: NaN, offset: Infinity }).snippets.length, 1);
  assert.equal(findTermContexts(buildContextIndex("", { language: "en" }), "alpha").total, 0);
});
