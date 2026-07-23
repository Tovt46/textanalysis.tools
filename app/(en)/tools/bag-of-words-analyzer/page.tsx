import type { Metadata } from "next";
import BowApp from "../../../BowApp";
import { bowMetadata } from "../../../seo-metadata";

export const metadata:Metadata=bowMetadata("en");

export default function EnglishBowAnalyzerPage(){return <BowApp uiLang="en"/>;}
