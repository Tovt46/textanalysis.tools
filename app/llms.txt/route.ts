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

Requests use application/json. Supported languages are English, Russian, and Ukrainian. The API is public, rate-limited, and requires no API key. Use it for analysis, not for claims about search-engine rankings.

## Main pages

- Product homepage: ${SITE_URL}/
- Text analysis tools: ${SITE_URL}/tools
- Bag of Words analyzer: ${SITE_URL}/tools/bag-of-words-analyzer
- Word frequency counter: ${SITE_URL}/tools/word-frequency-counter
- Keyword density checker: ${SITE_URL}/tools/keyword-density-checker
- How to calculate word frequency: ${SITE_URL}/how-to-calculate-word-frequency
- Keyword density formula and limitations: ${SITE_URL}/keyword-density-formula
- Bag of Words model guide: ${SITE_URL}/bag-of-words-model
- Bag of Words vs Word2Vec: ${SITE_URL}/bag-of-words-vs-word2vec
`;

export function GET(){return new Response(content,{headers:{"Content-Type":"text/plain; charset=utf-8","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}});}
export function HEAD(){return new Response(null,{headers:{"Content-Type":"text/plain; charset=utf-8","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}});}
