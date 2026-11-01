import {NextResponse,type NextRequest} from "next/server";
import {homeMarkdown} from "./app/home-markdown";

export function proxy(request:NextRequest){
  const types=(request.headers.get("accept")??"").split(",").map(part=>{
    const [type,...parameters]=part.trim().split(";");
    const quality=parameters.find(value=>value.trim().startsWith("q="));
    return {type:type.toLowerCase(),q:quality?Number(quality.trim().slice(2)):1};
  });
  const markdown=types.find(value=>value.type==="text/markdown");
  const html=types.find(value=>value.type==="text/html");
  const response=markdown&&markdown.q>0&&markdown.q>=(html?.q??0)&&["GET","HEAD"].includes(request.method)
    ?new NextResponse(request.method==="HEAD"?null:homeMarkdown,{headers:{"Content-Type":"text/markdown; charset=utf-8"}})
    :NextResponse.next();
  response.headers.set("Vary","Accept");
  response.headers.set("Link",'<https://textanalysis.tools/llms.txt>; rel="describedby"; type="text/plain", <https://textanalysis.tools/index.md>; rel="alternate"; type="text/markdown"');
  return response;
}
export const config={matcher:"/"};
