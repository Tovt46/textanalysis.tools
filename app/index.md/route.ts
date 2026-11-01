import {homeMarkdown} from "../home-markdown";
const headers={"Content-Type":"text/markdown; charset=utf-8","Cache-Control":"public, max-age=300","Access-Control-Allow-Origin":"*"};
export function GET(){return new Response(homeMarkdown,{headers});}
export function HEAD(){return new Response(null,{headers});}
