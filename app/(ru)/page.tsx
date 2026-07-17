import type { Metadata } from "next";
import BowApp from "../BowApp";
import { pageMetadata } from "../seo-metadata";

export const metadata:Metadata=pageMetadata("ru");

export default function RussianPage(){return <BowApp uiLang="ru"/>;}
