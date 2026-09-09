import { BRAND_GRAPHITE,BRAND_IVORY,BRAND_VERSION } from "../brand";

const manifest={
  name:"Text Analysis Tools",
  short_name:"textanalysis",
  icons:[
    {src:`/android-chrome-192x192.png?v=${BRAND_VERSION}`,sizes:"192x192",type:"image/png"},
    {src:`/android-chrome-512x512.png?v=${BRAND_VERSION}`,sizes:"512x512",type:"image/png"},
  ],
  theme_color:BRAND_GRAPHITE,
  background_color:BRAND_IVORY,
  display:"standalone",
};

const body=JSON.stringify(manifest);
const headers={
  "Content-Type":"application/manifest+json; charset=utf-8",
  "Cache-Control":"public, max-age=300, s-maxage=300",
  "Content-Length":String(new TextEncoder().encode(body).length),
};

export function GET(){
  return new Response(body,{status:200,headers});
}

export function HEAD(){
  return new Response(null,{status:200,headers});
}
