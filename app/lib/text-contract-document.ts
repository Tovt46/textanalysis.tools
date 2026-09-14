import {parse,parseFragment,type DefaultTreeAdapterMap} from "parse5";

type Node=DefaultTreeAdapterMap["node"];
type Element=DefaultTreeAdapterMap["element"];
const BLOCKS=new Set("address article aside blockquote br dd div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr li main nav ol p pre section table td th tr ul".split(" "));
const SKIP_TEXT=new Set(["script","style","template","noscript"]);
export const normalizeText=(value:string)=>value.replace(/\s+/gu," ").trim();
export function canonical(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  if(value&&typeof value==="object")return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
function attrs(node:Element){return Object.fromEntries(node.attrs.map(attr=>[attr.name,attr.value]));}
function hidden(node:Element){const a=attrs(node);return SKIP_TEXT.has(node.tagName)||"hidden" in a||a["aria-hidden"]==="true"||/(?:display\s*:\s*none|visibility\s*:\s*hidden)/iu.test(a.style??"");}
function visibleText(node:Node):string{
  if("tagName" in node&&hidden(node))return "";
  if("value" in node)return node.value;
  if(!("childNodes" in node))return "";
  const content=node.childNodes.map(visibleText).join("");
  return "tagName" in node&&BLOCKS.has(node.tagName)?` ${content} `:content;
}
function rawText(node:Node):string{return "value" in node?node.value:"childNodes" in node?node.childNodes.map(rawText).join(""):"";}
function isCta(node:Element){const a=attrs(node);return node.tagName==="a"&&(/(?:^|[\s_-])(?:cta|button|btn)(?:[\s_-]|$)/iu.test(a.class??"")||a.role==="button"||Object.keys(a).some(key=>key.startsWith("data-cta")));}
export function numericTokens(text:string){
  const pattern=/(?<![\p{L}\p{N}_])(?:[$€£₴]\s*)?\d+(?:[.,]\d+)*(?:[kmb])?\+?(?:(?:\s*%|(?:\s+|-)\s*(?:free\s+)?(?:minutes?|mins?|hours?|days?|weeks?|months?|years?|stars?|advisors?|users?)\b|\s*\/\s*(?:5\b|min(?:ute)?\b|hour\b|day\b|month\b|year\b)))?/giu;
  return [...new Set([...text.replace(/https?:\/\/[^\s<>"']+/giu,"").matchAll(pattern)].map(match=>normalizeText(match[0]).toLowerCase()))].sort();
}
/** Parse without executing HTML. Locations expose omitted closing headings even when the DOM repairs them. */
export function inspectDocument(source:string){
  const isHtml=/<\/?[a-z][^>]*>|<!--/iu.test(source),errors:string[]=[];
  const options={sourceCodeLocationInfo:true,onParseError:(error:{code:string})=>{if(error.code!=="missing-doctype")errors.push(error.code);}};
  const tree=/<!doctype|<html\b/iu.test(source)?parse(source,options):parseFragment(source,options);
  const elements:Element[]=[],visible:Element[]=[];
  const visit=(node:Node,invisible=false)=>{
    if("tagName" in node){elements.push(node);invisible=invisible||hidden(node);if(!invisible)visible.push(node);if("content" in node)visit(node.content as Node,true);}
    if("childNodes" in node)node.childNodes.forEach(child=>visit(child,invisible));
  };
  visit(tree);
  const text=isHtml?normalizeText(visibleText(tree)):source;
  const links=visible.filter(node=>node.tagName==="a"&&node.attrs.some(attr=>attr.name==="href")).map(node=>attrs(node).href).sort();
  const plainUrls=[...new Set([...text.matchAll(/https?:\/\/[^\s<>"']+/giu)].map(match=>match[0].replace(/[),.;]+$/u,"")))].sort();
  const attributes=elements.filter(node=>node.attrs.length).map(node=>canonical({tag:node.tagName,attributes:attrs(node)})).sort();
  const ctas=visible.filter(isCta).map(node=>canonical({attributes:attrs(node),label:normalizeText(visibleText(node))})).sort();
  const headings=elements.filter(node=>/^h[1-6]$/u.test(node.tagName)).map(node=>`${node.tagName}:${Boolean(node.sourceCodeLocation?.endTag)}`).sort();
  const jsonld:string[]=[],resources:string[]=[];
  for(const node of elements){
    if(node.tagName==="script"&&attrs(node).type?.toLowerCase()==="application/ld+json"){
      try{const value:unknown=JSON.parse(rawText(node));if(!value||typeof value!=="object")throw new Error("object required");jsonld.push(canonical(value));}catch{errors.push("invalid-jsonld");}
    }else if(node.tagName==="script"||node.tagName==="style")resources.push(canonical({tag:node.tagName,attributes:attrs(node),content:rawText(node)}));
  }
  const microdata=elements.filter(node=>node.attrs.some(attr=>["itemscope","itemtype","itemprop","itemid","itemref"].includes(attr.name))).map(node=>canonical({tag:node.tagName,attributes:Object.fromEntries(node.attrs.filter(attr=>attr.name.startsWith("item")).map(attr=>[attr.name,attr.value]))})).sort();
  return{isHtml,text,numbers:numericTokens(text),links,plainUrls,attributes,ctas,headings,jsonld:jsonld.sort(),microdata,resources:resources.sort(),errors:[...new Set(errors)]};
}
export type DocumentInspection=ReturnType<typeof inspectDocument>;
