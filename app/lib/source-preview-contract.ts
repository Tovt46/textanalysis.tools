export type ContentScope="main"|"page";

export type SourcePreview={
  text:string;
  requestedScope:ContentScope;
  usedScope:ContentScope|"plain";
  /** True only when the requested main region was unavailable and page text was used. */
  fallback:boolean;
  title?:string;
};

export type SourcePreviewResponse={
  apiVersion:string;
  storage:"none";
  source:SourcePreview;
};
