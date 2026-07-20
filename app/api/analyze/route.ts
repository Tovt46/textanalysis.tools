import { analyzeText } from "../../lib/analyze";
import { translate, type UiLang } from "../../i18n";
import { fetchRemoteText,MAX_TEXT_CHARS } from "../../lib/public-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    return Response.json(analyzeText({
      text,
      language: body.language,
      focus: body.focus,
      top: body.top,
      tolerance: body.tolerance,
      keepStopwords: body.keepStopwords,
      stopwordLists: body.stopwordLists,
      uiLanguage,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
