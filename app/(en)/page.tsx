import type { Metadata } from "next";
import HomePage from "../HomePage";
import { homeMetadata } from "../seo-metadata";

export const metadata:Metadata=homeMetadata("en");
export const revalidate=300;

export default function EnglishPage(){return <HomePage locale="en"/>;}
