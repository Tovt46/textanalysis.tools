import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo-metadata";

const languages={en:`${SITE_URL}/`,ru:`${SITE_URL}/ru`,uk:`${SITE_URL}/uk`,"x-default":`${SITE_URL}/`};
const articleLanguages={en:`${SITE_URL}/bag-of-words-model`,ru:`${SITE_URL}/ru/bag-of-words-model`,uk:`${SITE_URL}/uk/bag-of-words-model`,"x-default":`${SITE_URL}/bag-of-words-model`};

export default function sitemap():MetadataRoute.Sitemap {
  return [
    {url:`${SITE_URL}/`,changeFrequency:"monthly",priority:1,alternates:{languages}},
    {url:`${SITE_URL}/bag-of-words-model`,changeFrequency:"monthly",priority:.8,alternates:{languages:articleLanguages}},
    {url:`${SITE_URL}/ru`,changeFrequency:"monthly",priority:1,alternates:{languages}},
    {url:`${SITE_URL}/uk`,changeFrequency:"monthly",priority:1,alternates:{languages}},
    {url:`${SITE_URL}/ru/bag-of-words-model`,changeFrequency:"monthly",priority:.8,alternates:{languages:articleLanguages}},
    {url:`${SITE_URL}/uk/bag-of-words-model`,changeFrequency:"monthly",priority:.8,alternates:{languages:articleLanguages}},
  ];
}
