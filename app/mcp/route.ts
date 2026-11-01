import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {WebStandardStreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import * as z from "zod/v4";
import {POST as analyze} from "../api/v1/analyze/route";
import {apiErrorResponse,enforceRateLimit,readJsonBody} from "../lib/public-api";
import {HOSTED_MCP_INFO} from "../lib/hosted-mcp";

export const runtime="nodejs";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, GET, HEAD, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Accept, MCP-Protocol-Version","Cache-Control":"no-store"};
function withCors(response:Response){for(const [key,value] of Object.entries(cors))response.headers.set(key,value);return response;}
export function OPTIONS(){return new Response(null,{status:204,headers:cors});}
export function GET(){return new Response(null,{status:405,headers:{...cors,Allow:"POST, OPTIONS"}});}
export const HEAD=GET;
export async function POST(request:Request){
  // Reject cross-origin browser invocations; non-browser MCP clients have no Origin.
  const origin=request.headers.get("origin");
  if(origin&&origin!==new URL(request.url).origin)return withCors(new Response("Forbidden origin",{status:403}));
  try{
    await enforceRateLimit(request);
    const body=await readJsonBody(request);
    const server=new McpServer(HOSTED_MCP_INFO);
    server.registerTool("analyze_text",{
      description:"Measure word frequency, keyword density, and vocabulary in text or a public URL. Content is processed on the server without document storage; results do not verify facts or rankings.",
      inputSchema:{source:z.string().min(1).max(500_000),sourceType:z.enum(["text","url"]).default("text"),language:z.enum(["auto","en","ru","uk","es"]).default("auto"),top:z.number().int().min(5).max(100).default(20),keepStopwords:z.boolean().default(false)},
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true},
    },async input=>{
      const headers=new Headers(request.headers);
      headers.set("content-type","application/json");
      headers.delete("content-length");
      const response=await analyze(new Request(new URL("/api/v1/analyze",request.url),{method:"POST",headers,body:JSON.stringify(input),signal:request.signal}));
      return {content:[{type:"text" as const,text:await response.text()}],isError:!response.ok};
    });
    const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
    await server.connect(transport);
    try{return withCors(await transport.handleRequest(request,{parsedBody:body}));}
    finally{await server.close();}
  }catch(error){return withCors(apiErrorResponse(error));}
}
