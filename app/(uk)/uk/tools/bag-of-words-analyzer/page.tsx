import type { Metadata } from "next";
import BowApp from "../../../../BowApp";
import { bowMetadata } from "../../../../seo-metadata";

export const metadata:Metadata=bowMetadata("uk");

export default function UkrainianBowAnalyzerPage(){return <BowApp uiLang="uk"/>;}
