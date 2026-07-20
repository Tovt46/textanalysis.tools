import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo-metadata";

const languages={en:`${SITE_URL}/`,ru:`${SITE_URL}/ru`,uk:`${SITE_URL}/uk`,"x-default":`${SITE_URL}/`};
const articleLanguages={en:`${SITE_URL}/bag-of-words-model`,ru:`${SITE_URL}/ru/bag-of-words-model`,uk:`${SITE_URL}/uk/bag-of-words-model`,"x-default":`${SITE_URL}/bag-of-words-model`};
const lastModified=new Date("2026-07-19T03:57:45.000Z");

export default function sitemap():MetadataRoute.Sitemap {
  return [
    {url:`${SITE_URL}/`,lastModified,alternates:{languages}},
    {url:`${SITE_URL}/ru`,lastModified,alternates:{languages}},
    {url:`${SITE_URL}/uk`,lastModified,alternates:{languages}},
    {url:`${SITE_URL}/bag-of-words-model`,lastModified,alternates:{languages:articleLanguages}},
    {url:`${SITE_URL}/ru/bag-of-words-model`,lastModified,alternates:{languages:articleLanguages}},
    {url:`${SITE_URL}/uk/bag-of-words-model`,lastModified,alternates:{languages:articleLanguages}},
  ];
}
