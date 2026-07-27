import type { Metadata } from "next";
import HomePage from "../../HomePage";
import { homeMetadata } from "../../seo-metadata";

export const metadata:Metadata=homeMetadata("es");
export const revalidate=300;

export default function SpanishPage(){return <HomePage locale="es"/>;}
