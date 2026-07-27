import { notFound } from "next/navigation";
import LocalizedToolPage,{ isLocalizedToolSlug,LOCALIZED_TOOL_SLUGS,localizedToolMetadata } from "../../../../LocalizedToolPage";

export function generateStaticParams(){
  return LOCALIZED_TOOL_SLUGS.map(slug=>({slug}));
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!isLocalizedToolSlug(slug))return {};
  return localizedToolMetadata("ru",slug);
}

export default async function RussianToolPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!isLocalizedToolSlug(slug))notFound();
  return <LocalizedToolPage locale="ru" slug={slug}/>;
}
