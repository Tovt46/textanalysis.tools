import type { Metadata } from "next";
import HomePage from "../../HomePage";
import { homeMetadata } from "../../seo-metadata";

export const metadata:Metadata=homeMetadata("ru");
export const revalidate=300;

export default function RussianPage(){return <HomePage locale="ru"/>;}
