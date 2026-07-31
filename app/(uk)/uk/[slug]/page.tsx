import { notFound } from "next/navigation";
import LocalizedInfoPage,{ isLocalizedInfoSlug,LOCALIZED_INFO_SLUGS,localizedInfoMetadata } from "../../../LocalizedInfoPage";

export const revalidate=300;

export function generateStaticParams(){
  return LOCALIZED_INFO_SLUGS.map(slug=>({slug}));
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!isLocalizedInfoSlug(slug))return {};
  return localizedInfoMetadata("uk",slug);
}

export default async function UkrainianInfoPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!isLocalizedInfoSlug(slug))notFound();
  return <LocalizedInfoPage locale="uk" slug={slug}/>;
}
