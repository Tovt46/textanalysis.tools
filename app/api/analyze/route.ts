import { analyzeText } from "../../lib/analyze";
import { translate, type UiLang } from "../../i18n";
import { fetchRemoteText,MAX_TEXT_CHARS } from "../../lib/public-api";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const uiLanguage: UiLang = ["ru", "en", "uk"].includes(body.uiLanguage) ? body.uiLanguage : "ru";
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
      language: body.language,
      focus: body.focus,
      top: body.top,
      tolerance: body.tolerance,
      keepStopwords: body.keepStopwords,
      stopwordLists: body.stopwordLists,
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
