import type { Metadata } from "next";
import HomePage from "../../HomePage";
import { homeMetadata } from "../../seo-metadata";

export const metadata:Metadata=homeMetadata("ru");

export default function RussianPage(){return <HomePage locale="ru"/>;}
