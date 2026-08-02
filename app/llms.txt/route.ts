import { SITE_URL } from "../seo-metadata";

const content=`# Text Analysis Tools

> Free, transparent tools for word frequency, keyword density, Bag of Words analysis, and text comparison. Text-only web workflows run in the browser; the stateless API does not store submitted content.

## Agent API

- OpenAPI specification: ${SITE_URL}/openapi.json
- Human-readable API documentation: ${SITE_URL}/api-docs
- API health: GET ${SITE_URL}/api/health
- Analyze one input: POST ${SITE_URL}/api/v1/analyze
- Compare two inputs: POST ${SITE_URL}/api/v1/compare
- Count bounded vocabulary rows with explicit truncation metadata: POST ${SITE_URL}/api/v1/word-frequency
- Measure unigram, bigram, trigram, and tracked-phrase density: POST ${SITE_URL}/api/v1/keyword-density
- Analyze recurring phrases by n-gram length: POST ${SITE_URL}/api/v1/ngram-analyzer
- Build term-frequency vectors: POST ${SITE_URL}/api/v1/bag-of-words
- Score corpus-aware terms (TF-IDF): POST ${SITE_URL}/api/v1/tf-idf
- Measure text similarity (BoW or TF-IDF): POST ${SITE_URL}/api/v1/similarity

Requests use application/json. Supported languages are English, Russian, Ukrainian, and Spanish. Pasted source fields are limited to 500,000 characters; remote downloads may contain up to 2,000,000 bytes or characters; every resolved source is limited to 100,000 analyzable words. Compound operations also have aggregate budgets. Word-frequency, Bag-of-Words, n-gram, density, comparison, TF-IDF, and TF-IDF similarity tables accept limit and offset. Follow nextOffset or nextIdfOffset until null to retrieve a complete ordered table. Analyze uses top. Serialized responses are capped at 5 MB. The API is public, dynamically rate-limited by workload, and requires no API key. Every API response includes a random X-Request-ID. Operational logs contain only that ID, operation, method, status, duration, response size, and a coarse error class; they exclude submitted content, analyzed URLs, and result terms. Use the API for analysis, not for claims about search-engine rankings.

## Local CLI

- CLI documentation: ${SITE_URL}/cli
- Agent integration guide: ${SITE_URL}/agents
- npm package: https://www.npmjs.com/package/textanalysis-tools
- Executable: textanalysis
- Analysis commands: analyze, frequency, density, compare, ngram, bow, tfidf, similarity
- Repeatable workflow checks: textanalysis check article.md --format ci
- Version 1 check schema: ${SITE_URL}/textanalysis-config.schema.json
- Importable ESM TypeScript API: import analysis functions from textanalysis-tools
- Local MCP server: npx --yes textanalysis-tools mcp

The CLI accepts UTF-8 files, public HTTP(S) URLs, inline text, and piped stdin. Local files and stdin are processed on the user's machine. Results can be returned as tables, JSON, or CSV. The check command enforces project-defined phrase, density, length, and baseline-similarity rules with stable exit codes. The package also exports the same deterministic analysis core directly to ESM applications with TypeScript declarations.

## Local MCP

The npm package exposes the same eight deterministic analysis operations as read-only MCP tools over stdio. Start it with \`npx --yes textanalysis-tools mcp\`. Text arguments stay in the local process; explicit URL inputs require a request to that public page.

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
- AI agent and MCP documentation: ${SITE_URL}/agents
- Privacy and data handling: ${SITE_URL}/privacy

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
