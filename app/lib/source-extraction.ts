import {parse,type DefaultTreeAdapterTypes} from "parse5";
import {countAnalysisTokens} from "./analyze";
import {
  fetchPinnedRemote,
  fetchRemoteText,
  MAX_ANALYSIS_TOKENS,
  MAX_REMOTE_CHARS,
  MAX_TEXT_CHARS,
  PublicApiError,
  type RemoteFetchContext,
} from "./public-api";
import type {ContentScope,SourcePreview} from "./source-preview-contract";

type Node=DefaultTreeAdapterTypes.Node;
type Element=DefaultTreeAdapterTypes.Element;

const excludedTags=new Set(["head","script","style","noscript","svg","canvas","template"]);
const mainExcludedTags=new Set(["nav","footer","aside"]);
const mainExcludedRoles=new Set(["navigation","banner","contentinfo","complementary"]);
const blockTags=new Set([
  "address","article","aside","blockquote","br","dd","div","dl","dt","fieldset",
  "figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","header",
  "hr","li","main","nav","ol","p","pre","section","table","tbody","td","th",
  "thead","tr","ul",
]);

function isElement(node:Node):node is Element{
  return "tagName" in node;
}

function attribute(element:Element,name:string){
  return element.attrs.find(attr=>attr.name===name)?.value;
}

function roles(element:Element){
  return (attribute(element,"role")??"").toLowerCase().trim().split(/\s+/);
}

function isExcluded(element:Element,scope:ContentScope,inContentRegion=false){
  if(excludedTags.has(element.tagName))return true;
  if(element.attrs.some(attr=>attr.name==="hidden"))return true;
  if(attribute(element,"aria-hidden")?.trim().toLowerCase()==="true")return true;
  // Inline visibility is knowable without executing stylesheets or page scripts.
  if(/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse))\s*(?:!important\s*)?(?:;|$)/i.test(attribute(element,"style")??""))return true;
  // A header inside a selected main/article may carry its title and lead. Headers
  // outside those regions are skipped while finding content; explicit banner
  // roles are still page chrome even when nested inside a content region.
  return scope==="main"&&(mainExcludedTags.has(element.tagName)
    ||(element.tagName==="header"&&!inContentRegion)
    ||roles(element).some(role=>mainExcludedRoles.has(role)));
}

function children(node:Node):readonly Node[]{
  return "childNodes" in node?node.childNodes:[];
}

function normalizeText(value:string){
  return value.replace(/\r\n?/g,"\n").replace(/[^\S\n]+/g," ").replace(/ *\n */g,"\n").replace(/\n+/g,"\n").trim();
}

/** DOM order is preserved; boundaries separate blocks without splitting inline words. */
function regionText(root:Node,scope:ContentScope){
  const parts:string[]=[];
  const stack:Array<{node:Node;closing?:boolean}>=[{node:root}];
  while(stack.length){
    const item=stack.pop()!;
    const {node}=item;
    if(item.closing){parts.push("\n");continue;}
    if(node.nodeName==="#text"&&"value" in node){
      parts.push(node.value.replace(/\s+/g," "));
      continue;
    }
    if(isElement(node)){
      if(isExcluded(node,scope,true))continue;
      if(blockTags.has(node.tagName)){
        parts.push("\n");
        stack.push({node,closing:true});
      }
    }
    const childNodes=children(node);
    for(let index=childNodes.length-1;index>=0;index-=1)stack.push({node:childNodes[index]});
  }
  return normalizeText(parts.join(""));
}

function findRegions(root:Node,predicate:(element:Element)=>boolean){
  const regions:Element[]=[];
  const stack:Node[]=[root];
  while(stack.length){
    const node=stack.pop()!;
    if(isElement(node)){
      if(isExcluded(node,"main"))continue;
      // Stop descending into a matched region so nested article/main markup is not duplicated.
      if(predicate(node)){regions.push(node);continue;}
    }
    const childNodes=children(node);
    for(let index=childNodes.length-1;index>=0;index-=1)stack.push(childNodes[index]);
  }
  return regions;
}

function pageTitle(document:Node){
  const stack:Node[]=[document];
  while(stack.length){
    const node=stack.pop()!;
    if(isElement(node)&&node.tagName==="title"){
      const text=normalizeText(children(node).filter(child=>child.nodeName==="#text"&&"value" in child).map(child=>"value" in child?child.value:"").join(""));
      return text?text.slice(0,300):undefined;
    }
    const childNodes=children(node);
    for(let index=childNodes.length-1;index>=0;index-=1)stack.push(childNodes[index]);
  }
}

function assertPreviewLimits(text:string){
  if(!text){
    throw new PublicApiError(422,"INSUFFICIENT_TEXT","The page has no readable text in its server response. It may require JavaScript. Paste the text instead.");
  }
  if(text.length>MAX_TEXT_CHARS){
    throw new PublicApiError(413,"TEXT_TOO_LARGE",`Extracted text is limited to ${MAX_TEXT_CHARS.toLocaleString("en-US")} characters.`);
  }
  // The preview is already plain text. Protect literal angle brackets/entities
  // from the analysis counter's HTML-cleaning boundary before counting it.
  const analysisText=text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  if(countAnalysisTokens(analysisText,MAX_ANALYSIS_TOKENS+1,{keepNumbers:true})>MAX_ANALYSIS_TOKENS){
    throw new PublicApiError(413,"ANALYSIS_TOO_LARGE",`Each source is limited to ${MAX_ANALYSIS_TOKENS.toLocaleString("en-US")} analyzable words.`);
  }
}

function looksLikeHtml(raw:string){
  return /<!doctype\s+html\b|<\/?(?:html|head|body|title|main|article|section|div|p|h[1-6]|nav|header|footer|aside|script|style|noscript|svg|canvas|template|span|a|ul|ol|li|table|br)\b[^>]*>/i.test(raw);
}

/** This is semantic-markup extraction, not a browser renderer or Readability heuristic. */
export function extractSourcePreview(raw:string,requestedScope:ContentScope,contentType?:string):SourcePreview{
  if(raw.length>MAX_REMOTE_CHARS){
    throw new PublicApiError(413,"REMOTE_CONTENT_TOO_LARGE","The remote page is too large to process.");
  }
  const type=contentType?.split(";",1)[0].trim().toLowerCase();
  const isHtml=type?type==="text/html"||type==="application/xhtml+xml":looksLikeHtml(raw);
  if(!isHtml){
    const text=normalizeText(raw);
    assertPreviewLimits(text);
    return {text,requestedScope,usedScope:"plain",fallback:false};
  }

  const document=parse(raw);
  const title=pageTitle(document);
  let text="";
  let usedScope:ContentScope="page";
  if(requestedScope==="main"){
    const mainRegions=findRegions(document,element=>element.tagName==="main"||roles(element).includes("main"));
    text=mainRegions.map(region=>regionText(region,"main")).filter(Boolean).join("\n");
    if(!text){
      const articleRegions=findRegions(document,element=>element.tagName==="article");
      text=articleRegions.map(region=>regionText(region,"main")).filter(Boolean).join("\n");
    }
    if(text)usedScope="main";
  }
  if(!text)text=regionText(document,"page");
  assertPreviewLimits(text);
  return {text,requestedScope,usedScope,fallback:requestedScope==="main"&&usedScope==="page",...(title?{title}:{})};
}

export function parseSourcePreviewRequest(body:Record<string,unknown>){
  if(typeof body.source!=="string"||!body.source.trim()){
    throw new PublicApiError(400,"MISSING_SOURCE","source is required.");
  }
  const source=body.source.trim();
  if(source.length>2048)throw new PublicApiError(400,"INVALID_URL","The URL is too long.");
  if(body.contentScope!=="main"&&body.contentScope!=="page"){
    throw new PublicApiError(400,"INVALID_ARGUMENT","contentScope must be main or page.");
  }
  return {source,contentScope:body.contentScope as ContentScope};
}

export async function fetchSourcePreview(source:string,scope:ContentScope,context:RemoteFetchContext={}):Promise<SourcePreview>{
  let contentType:string|undefined;
  const fetchImpl=context.fetchImpl??fetchPinnedRemote;
  const raw=await fetchRemoteText(source,{
    ...context,
    fetchImpl:async(url,init,address)=>{
      const response=await fetchImpl(url,init,address);
      if(response.ok)contentType=response.headers.get("content-type")||undefined;
      return response;
    },
  });
  return extractSourcePreview(raw,scope,contentType);
}
