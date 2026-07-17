import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo-metadata";

const languages={ru:`${SITE_URL}/`,en:`${SITE_URL}/en`,uk:`${SITE_URL}/uk`,"x-default":`${SITE_URL}/en`};

export default function sitemap():MetadataRoute.Sitemap {
  return [
    {url:`${SITE_URL}/`,changeFrequency:"monthly",priority:1,alternates:{languages}},
    {url:`${SITE_URL}/en`,changeFrequency:"monthly",priority:1,alternates:{languages}},
    {url:`${SITE_URL}/uk`,changeFrequency:"monthly",priority:1,alternates:{languages}},
  ];
}
