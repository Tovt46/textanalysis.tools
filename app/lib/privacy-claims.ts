// Match an asserted privacy practice, rather than an isolated topic or personality trait.
const PRIVACY_CLAIM_PATTERNS=[
  /\b(?:protect(?:s|ed|ing)?|safeguard(?:s|ed|ing)?|respect(?:s|ed|ing)?|guarantee(?:s|d|ing)?)\s+(?:your|users?'|customers?'|clients?'|complete|total|absolute)\s+privacy\b/i,
  /\b(?:your\s+)?privacy\s+(?:(?:is|will be|remains?)\s+)?(?:protected|guaranteed|safeguarded|assured)\b/i,
  /\b(?:confidential|private|secure|encrypted)\s+(?:readings?|sessions?|chats?|conversations?|personal (?:data|details|information))\b/i,
  /\b(?:personal (?:data|details|information)|your (?:data|details|information)|readings?|sessions?|chats?|conversations?)\s+(?:(?:are|is|will be|remain|remains|stay|stays)\s+)(?:(?:not|always|strictly|completely|fully|kept|100%)\s+){0,3}(?:confidential|private|secure|protected|encrypted)\b/i,
  /\bwe\s+(?:(?:will|never|do not|don't|may|only)\s+){0,2}(?:share|sell|disclose|collect|store|encrypt|protect)\s+(?:your\s+)?(?:personal (?:data|details|information)|your (?:data|details|information))\b/i,
  /\bwe\s+keep\s+(?:your\s+)?(?:personal (?:data|details|information)|your (?:data|details|information)|readings?|sessions?|chats?|conversations?)\s+(?:confidential|private|secure|encrypted)\b/i,
  /\b(?:personal (?:data|details|information)|your (?:data|details|information))\s+(?:is|are|will be)\s+(?:never|not)\s+(?:shared|sold|disclosed)\b/i,
];

export function isPrivacyClaim(value:string):boolean{
  return PRIVACY_CLAIM_PATTERNS.some(pattern=>pattern.test(value));
}
