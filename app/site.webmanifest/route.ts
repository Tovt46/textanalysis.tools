const manifest={
  name:"Text Analysis Tools",
  short_name:"Text Tools",
  icons:[
    {src:"/android-chrome-192x192.png",sizes:"192x192",type:"image/png"},
    {src:"/android-chrome-512x512.png",sizes:"512x512",type:"image/png"},
  ],
  theme_color:"#175c4b",
  background_color:"#f4f4ef",
  display:"standalone",
};

const body=JSON.stringify(manifest);
const headers={
  "Content-Type":"application/manifest+json; charset=utf-8",
  "Cache-Control":"public, max-age=86400, s-maxage=86400",
  "Content-Length":String(new TextEncoder().encode(body).length),
};

export function GET(){
  return new Response(body,{status:200,headers});
}

export function HEAD(){
  return new Response(null,{status:200,headers});
}
