import { analyzeText, type AnalyzeInput } from "../../lib/analyze";
import { translate, type UiLang } from "../../i18n";
import { fetchRemoteText,MAX_TEXT_CHARS } from "../../lib/public-api";

function readStopwordLists(value: unknown): AnalyzeInput["stopwordLists"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const output: NonNullable<AnalyzeInput["stopwordLists"]> = {};
  for (const language of ["en", "uk", "ru"] as const) {
    const words = source[language];
    if (Array.isArray(words) && words.length <= 1000 && words.every((word) => typeof word === "string")) {
      output[language] = words;
    }
  }
  return output;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const uiLanguageValue = body.uiLanguage;
    const uiLanguage: UiLang = uiLanguageValue === "en" || uiLanguageValue === "uk" || uiLanguageValue === "ru"
      ? uiLanguageValue
      : "ru";
    const languageValue = body.language;
    const language: AnalyzeInput["language"] = languageValue === "en" || languageValue === "uk" || languageValue === "ru" || languageValue === "auto"
      ? languageValue
      : "auto";
    let text = String(body.source || "").trim();
    if (!text) return Response.json({ error: translate(uiLanguage, "addSource") }, { status: 400 });

    if (body.sourceType === "url") {
      try {
        text = await fetchRemoteText(text);
      } catch {
        return Response.json({ error: translate(uiLanguage, "badUrl") }, { status: 400 });
      }
    } else if (text.length > MAX_TEXT_CHARS) return Response.json({ error: translate(uiLanguage, "tooLarge") }, { status: 413 });

    const result = analyzeText({
      text,
      language,
      focus: typeof body.focus === "string" ? body.focus : "",
      top: typeof body.top === "number" ? body.top : undefined,
      tolerance: typeof body.tolerance === "number" ? body.tolerance : undefined,
      keepStopwords: body.keepStopwords === true,
      stopwordLists: readStopwordLists(body.stopwordLists),
      uiLanguage,
    });
    const {_allUnigrams,_allBigrams,...publicResult}=result;
    void _allUnigrams;void _allBigrams;
    return Response.json(publicResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return Response.json({ error: message }, { status: 422 });
  }
}
