import { notFound } from "next/navigation";
import LocalizedInfoPage,{ isLocalizedInfoSlug,LOCALIZED_INFO_SLUGS,localizedInfoMetadata } from "../../../LocalizedInfoPage";

export function generateStaticParams(){
  return LOCALIZED_INFO_SLUGS.map(slug=>({slug}));
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!isLocalizedInfoSlug(slug))return {};
  return localizedInfoMetadata("ru",slug);
}

export default async function RussianInfoPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!isLocalizedInfoSlug(slug))notFound();
  return <LocalizedInfoPage locale="ru" slug={slug}/>;
}
