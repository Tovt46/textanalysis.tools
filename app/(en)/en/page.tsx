import type { Metadata } from "next";
import BowApp from "../../BowApp";
import { pageMetadata } from "../../seo-metadata";

export const metadata:Metadata=pageMetadata("en");

export default function EnglishPage(){return <BowApp uiLang="en"/>;}
