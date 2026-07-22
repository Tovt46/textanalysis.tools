import { SITE_URL } from "../seo-metadata";

const content=`# BOW Analyzer

> Free, stateless Bag of Words analysis for text and public webpages. Measures word and bigram frequency, percentages, focus-phrase coverage, vocabulary size, and Zipf-distribution diagnostics. Compares two inputs without storing submitted content.

## Agent API

- OpenAPI specification: ${SITE_URL}/openapi.json
- Human-readable API documentation: ${SITE_URL}/api-docs
- Analyze one input: POST ${SITE_URL}/api/v1/analyze
- Compare two inputs: POST ${SITE_URL}/api/v1/compare

Requests use application/json. Supported languages are English, Russian, and Ukrainian. The API is public, rate-limited, and requires no API key. Use it for analysis, not for claims about search-engine rankings.

## Main pages

- Free analyzer: ${SITE_URL}/
- Text analysis tools: ${SITE_URL}/tools
- Word frequency counter: ${SITE_URL}/tools/word-frequency-counter
- Bag of Words model guide: ${SITE_URL}/bag-of-words-model
- Bag of Words vs Word2Vec: ${SITE_URL}/bag-of-words-vs-word2vec
`;

export function GET(){return new Response(content,{headers:{"Content-Type":"text/plain; charset=utf-8","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}});}
export function HEAD(){return new Response(null,{headers:{"Content-Type":"text/plain; charset=utf-8","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}});}
