import {hostedMcpCard} from "../../../lib/hosted-mcp";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, HEAD, OPTIONS","Cache-Control":"public, max-age=3600"};
export function GET(){return Response.json(hostedMcpCard,{headers});}
export function HEAD(){return new Response(null,{headers:{...headers,"Content-Type":"application/json"}});}
export function OPTIONS(){return new Response(null,{status:204,headers});}
