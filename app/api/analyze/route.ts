import { analyzeText } from "../../lib/analyze";
import { translate, type UiLang } from "../../i18n";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const uiLanguage: UiLang = ["ru", "en", "uk"].includes(body.uiLanguage) ? body.uiLanguage : "ru";
    let text = String(body.source || "").trim();
    if (!text) return Response.json({ error: translate(uiLanguage, "addSource") }, { status: 400 });

    if (body.sourceType === "url") {
      let url: URL;
      try {
        url = new URL(text);
      } catch {
        return Response.json({ error: translate(uiLanguage, "badUrl") }, { status: 400 });
      }
      if (!/^https?:$/.test(url.protocol)) return Response.json({ error: translate(uiLanguage, "badProtocol") }, { status: 400 });
      const response = await fetch(url, {
        headers: { "User-Agent": "BOW-Zipf-Lab/1.0" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) return Response.json({ error: translate(uiLanguage, "pageStatus", { status: response.status }) }, { status: 422 });
      text = await response.text();
      if (text.length > 2_000_000) return Response.json({ error: translate(uiLanguage, "tooLarge") }, { status: 413 });
    }

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
