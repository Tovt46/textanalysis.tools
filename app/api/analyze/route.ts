import { analyzeText } from "../../lib/analyze";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let text = String(body.source || "").trim();
    if (!text) return Response.json({ error: "Добавьте текст или URL" }, { status: 400 });

    if (body.sourceType === "url") {
      let url: URL;
      try {
        url = new URL(text);
      } catch {
        return Response.json({ error: "Проверьте формат URL" }, { status: 400 });
      }
      if (!/^https?:$/.test(url.protocol)) return Response.json({ error: "Поддерживаются только HTTP и HTTPS URL" }, { status: 400 });
      const response = await fetch(url, {
        headers: { "User-Agent": "BOW-Zipf-Lab/1.0" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) return Response.json({ error: `Страница вернула статус ${response.status}` }, { status: 422 });
      text = await response.text();
      if (text.length > 2_000_000) return Response.json({ error: "Страница слишком большая для анализа" }, { status: 413 });
    }

    return Response.json(analyzeText({
      text,
      language: body.language,
      focus: body.focus,
      top: body.top,
      tolerance: body.tolerance,
      keepStopwords: body.keepStopwords,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось выполнить анализ";
    return Response.json({ error: message }, { status: 500 });
  }
}
