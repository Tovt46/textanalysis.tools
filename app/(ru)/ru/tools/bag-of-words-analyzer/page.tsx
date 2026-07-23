import type { Metadata } from "next";
import BowApp from "../../../../BowApp";
import { bowMetadata } from "../../../../seo-metadata";

export const metadata:Metadata=bowMetadata("ru");

export default function RussianBowAnalyzerPage(){return <BowApp uiLang="ru"/>;}
