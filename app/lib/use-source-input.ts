import { useState } from "react";

export type SourceType = "text" | "url";
export type SourceDrafts = Record<SourceType, string>;

export function useSourceInput() {
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [drafts, setDrafts] = useState<SourceDrafts>({ text: "", url: "" });

  function setSource(value: string) {
    setDrafts(current => ({ ...current, [sourceType]: value }));
  }

  function loadText(value: string) {
    setDrafts(current => ({ ...current, text: value }));
    setSourceType("text");
  }

  return { sourceType, setSourceType, source: drafts[sourceType], setSource, loadText };
}
