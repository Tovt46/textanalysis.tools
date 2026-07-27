import { SITE_URL } from "../seo-metadata";

const content=`# Text Analysis Tools

> Free, transparent tools for word frequency, keyword density, Bag of Words analysis, and text comparison. Pasted text is processed without server storage.

## Agent API

- OpenAPI specification: ${SITE_URL}/openapi.json
- Human-readable API documentation: ${SITE_URL}/api-docs
- Analyze one input: POST ${SITE_URL}/api/v1/analyze
- Compare two inputs: POST ${SITE_URL}/api/v1/compare
- Count the complete vocabulary: POST ${SITE_URL}/api/v1/word-frequency
- Measure unigram, bigram, trigram, and tracked-phrase density: POST ${SITE_URL}/api/v1/keyword-density
- Analyze recurring phrases by n-gram length: POST ${SITE_URL}/api/v1/ngram-analyzer
- Build term-frequency vectors: POST ${SITE_URL}/api/v1/bag-of-words
- Score corpus-aware terms (TF-IDF): POST ${SITE_URL}/api/v1/tf-idf
- Measure text similarity (BoW or TF-IDF): POST ${SITE_URL}/api/v1/similarity

Requests use application/json. Supported languages are English, Russian, Ukrainian, and Spanish. The API is public, rate-limited, and requires no API key. Use it for analysis, not for claims about search-engine rankings.

## Local CLI

- CLI documentation: ${SITE_URL}/cli
- npm package: https://www.npmjs.com/package/textanalysis-tools
- Executable: textanalysis
- Commands: analyze, frequency, density, compare, ngram, bow, tfidf, similarity

The CLI accepts UTF-8 files, public HTTP(S) URLs, inline text, and piped stdin. Local files and stdin are processed on the user's machine. Results can be returned as tables, JSON, or CSV.

## Main pages

- Product homepage: ${SITE_URL}/
- Text analysis tools: ${SITE_URL}/tools
- Text analysis guide directory: ${SITE_URL}/guides
- Bag of Words analyzer: ${SITE_URL}/tools/bag-of-words-analyzer
- Word frequency counter: ${SITE_URL}/tools/word-frequency-counter
- Keyword density checker: ${SITE_URL}/tools/keyword-density-checker
- Text analysis comparison: ${SITE_URL}/tools/text-analysis-comparison
- N-gram analyzer: ${SITE_URL}/tools/ngram-analyzer
- Bag of Words generator: ${SITE_URL}/tools/bag-of-words-generator
- TF-IDF calculator: ${SITE_URL}/tools/tf-idf-calculator
- Text similarity calculator: ${SITE_URL}/tools/text-similarity-calculator
- How to calculate word frequency: ${SITE_URL}/how-to-calculate-word-frequency
- Keyword density formula and limitations: ${SITE_URL}/keyword-density-formula
- Bag of Words model guide: ${SITE_URL}/bag-of-words-model
- Bag of Words vs Word2Vec: ${SITE_URL}/bag-of-words-vs-word2vec
- TF-IDF formula and worked example: ${SITE_URL}/tf-idf-formula
- Cosine similarity for text: ${SITE_URL}/cosine-similarity-for-text
- N-gram guide: ${SITE_URL}/what-are-n-grams
- Text comparison by normalized word frequency: ${SITE_URL}/compare-texts-by-word-frequency
- Command-line interface documentation: ${SITE_URL}/cli

## Russian pages

- Главная: ${SITE_URL}/ru
- Все инструменты: ${SITE_URL}/ru/tools
- Все руководства: ${SITE_URL}/ru/guides
- Документация API: ${SITE_URL}/ru/api-docs
- Документация CLI: ${SITE_URL}/ru/cli
- Инструменты доступны по тем же путям с префиксом /ru, например ${SITE_URL}/ru/tools/tf-idf-calculator
- Руководства доступны по тем же путям с префиксом /ru, например ${SITE_URL}/ru/tf-idf-formula

## Ukrainian pages

- Головна: ${SITE_URL}/uk
- Усі інструменти: ${SITE_URL}/uk/tools
- Усі гайди: ${SITE_URL}/uk/guides
- Документація API: ${SITE_URL}/uk/api-docs
- Документація CLI: ${SITE_URL}/uk/cli
- Інструменти доступні за тими самими шляхами з префіксом /uk, наприклад ${SITE_URL}/uk/tools/tf-idf-calculator
- Гайди доступні за тими самими шляхами з префіксом /uk, наприклад ${SITE_URL}/uk/tf-idf-formula

## Spanish pages

- Inicio: ${SITE_URL}/es
- Todas las herramientas: ${SITE_URL}/es/tools
- Todas las guías: ${SITE_URL}/es/guides
- Documentación de la API: ${SITE_URL}/es/api-docs
- Documentación de CLI: ${SITE_URL}/es/cli
- Las herramientas usan las mismas rutas con el prefijo /es, por ejemplo ${SITE_URL}/es/tools/tf-idf-calculator
- Las guías usan las mismas rutas con el prefijo /es, por ejemplo ${SITE_URL}/es/tf-idf-formula
`;

export function GET(){return new Response(content,{headers:{"Content-Type":"text/plain; charset=utf-8","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}});}
export function HEAD(){return new Response(null,{headers:{"Content-Type":"text/plain; charset=utf-8","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}});}
