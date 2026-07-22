import type { Metadata } from "next";
import BowApp from "../../BowApp";
import { pageMetadata } from "../../seo-metadata";

export const metadata:Metadata=pageMetadata("uk");

export default function UkrainianPage(){return <BowApp uiLang="uk"/>;}
