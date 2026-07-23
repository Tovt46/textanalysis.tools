import type { Metadata } from "next";
import HomePage from "../../HomePage";
import { homeMetadata } from "../../seo-metadata";

export const metadata:Metadata=homeMetadata("uk");
export const revalidate=300;

export default function UkrainianPage(){return <HomePage locale="uk"/>;}
