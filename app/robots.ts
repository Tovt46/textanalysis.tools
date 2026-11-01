import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo-metadata";

export default function robots():MetadataRoute.Robots {
  return {
    rules:{userAgent:"*",allow:"/",other:{"Content-Signal":"search=yes, ai-train=no"}},
    sitemap:`${SITE_URL}/sitemap.xml`,
  };
}
