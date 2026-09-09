"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import type { UiLang } from "./i18n";
import { localizedPath } from "./localization";

const INTERFACES = ["CLI", "API", "MCP"] as const;
type Interface = (typeof INTERFACES)[number];
const EXAMPLES: Record<Interface, { code: string; path: string }> = {
  CLI: {
    code: "npx --yes textanalysis-tools frequency article.txt\n\nnpx --yes textanalysis-tools frequency article.txt \\\n  --format json",
    path: "/cli",
  },
  API: {
    code: "curl https://textanalysis.tools/api/v1/analyze \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"source\":\"Good writing starts with clear thinking.\",\"language\":\"en\"}'",
    path: "/api-docs",
  },
  MCP: {
    code: '{\n  "mcpServers": {\n    "textanalysis": {\n      "command": "npx",\n      "args": ["--yes", "textanalysis-tools", "mcp"]\n    }\n  }\n}',
    path: "/agents",
  },
};
const LABELS: Record<UiLang, { tabs: string; engine: string; results: string; docs: string }> = {
  en: { tabs: "Integration examples", engine: "ONE ENGINE", results: "Inspectable results", docs: "Read the docs" },
  ru: { tabs: "Примеры интеграции", engine: "ОДИН ДВИЖОК", results: "Проверяемые результаты", docs: "Документация" },
  uk: { tabs: "Приклади інтеграції", engine: "ОДИН РУШІЙ", results: "Результати для перевірки", docs: "Документація" },
  es: { tabs: "Ejemplos de integración", engine: "UN MOTOR", results: "Resultados verificables", docs: "Documentación" },
};

export default function HomeIntegrations({ locale }: { locale: UiLang }) {
  const [selected, setSelected] = useState<Interface>("CLI");
  const copy = LABELS[locale];
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
    setSelected(INTERFACES[next]);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }
  return <div className="rh-code-card">
    <div className="rh-code-tabs" role="tablist" aria-label={copy.tabs}>
      {INTERFACES.map((name, index) => <button key={name} id={`home-tab-${name}`} type="button" role="tab" aria-selected={selected === name} aria-controls={`home-panel-${name}`} tabIndex={selected === name ? 0 : -1} onClick={() => setSelected(name)} onKeyDown={event => onKeyDown(event, index)}>{name}</button>)}
      <span aria-hidden="true">{copy.engine}</span>
    </div>
    {INTERFACES.map(name => <div key={name} id={`home-panel-${name}`} role="tabpanel" aria-labelledby={`home-tab-${name}`} hidden={selected !== name} tabIndex={0}>
      <pre><code>{EXAMPLES[name].code}</code></pre>
      <div className="rh-code-bottom"><span><b className="rh-live-dot"/>{copy.results}</span><Link href={localizedPath(locale, EXAMPLES[name].path)}>{copy.docs} <span aria-hidden="true">↗</span></Link></div>
    </div>)}
  </div>;
}
