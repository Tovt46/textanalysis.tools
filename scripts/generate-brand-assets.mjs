// Rebuild the approved native vector identity. The outlined lettering avoids
// system-font differences; no image-generation service or font install is needed.
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import sharp from "sharp";
import {BRAND_CORAL,BRAND_GRAPHITE,BRAND_IVORY,BRAND_PATHS,BRAND_VERSION} from "../app/brand.ts";

const root=fileURLToPath(new URL("../",import.meta.url));
const lettering=JSON.parse(await readFile(`${root}assets/brand/lettering.json`,"utf8"));
const mark=(ink)=>`<g fill="${ink}">${BRAND_PATHS.map(d=>`<path d="${d}"/>`).join("")}</g><circle cx="125" cy="53" r="11" fill="${BRAND_CORAL}"/>`;
const text=(key,x,baseline,size,ink)=>{
  const scale=size/lettering.unitsPerEm;
  return `<g transform="translate(${x} ${baseline}) scale(${scale} ${-scale})">${lettering[key].glyphs.map(g=>g.accent?`<circle cx="${g.x+115.5}" cy="73.5" r="73.5" fill="${BRAND_CORAL}"/>`:`<path transform="translate(${g.x} ${g.y})" fill="${ink}" d="${g.d}"/>`).join("")}</g>`;
};
const svg=(width,height,body,label="textanalysis.tools")=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">${body}</svg>\n`;
const lockup=(ink)=>{
  const size=76;const width=Math.ceil(167+lettering.wordmark.width*size/lettering.unitsPerEm);
  return svg(width,112,`<g transform="translate(0 4)">${mark(ink)}</g>${text("wordmark",167,82,size,ink)}`);
};
const icon=(rounded=true)=>svg(512,512,`<rect width="512" height="512" rx="${rounded?108:0}" fill="${BRAND_GRAPHITE}"/><g transform="translate(70 114) scale(2.7353)">${mark(BRAND_IVORY)}</g>`);

await mkdir(`${root}public/brand`,{recursive:true});
await writeFile(`${root}public/brand/logo-on-light.svg`,lockup(BRAND_GRAPHITE));
await writeFile(`${root}public/brand/logo-on-dark.svg`,lockup(BRAND_IVORY));
await writeFile(`${root}public/brand/symbol-on-light.svg`,svg(136,104,mark(BRAND_GRAPHITE)));
await writeFile(`${root}public/brand/symbol-on-dark.svg`,svg(136,104,mark(BRAND_IVORY)));
await writeFile(`${root}public/favicon.svg`,icon());

for(const [name,size,rounded] of [
  ["favicon-16x16.png",16,true],["favicon-32x32.png",32,true],
  ["apple-touch-icon.png",180,false],["android-chrome-192x192.png",192,false],["android-chrome-512x512.png",512,false],
]) await sharp(Buffer.from(icon(rounded))).resize(size,size).png().toFile(`${root}public/${name}`);

// ICO supports PNG payloads, keeping every favicon size lossless.
const sizes=[16,32,48];
const images=await Promise.all(sizes.map(size=>sharp(Buffer.from(icon())).resize(size,size).png().toBuffer()));
const header=Buffer.alloc(6+sizes.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
sizes.forEach((size,i)=>{const n=6+i*16;header[n]=size;header[n+1]=size;header.writeUInt16LE(1,n+4);header.writeUInt16LE(32,n+6);header.writeUInt32LE(images[i].length,n+8);header.writeUInt32LE(offset,n+12);offset+=images[i].length;});
await writeFile(`${root}public/favicon.ico`,Buffer.concat([header,...images]));

const social=svg(1200,630,
  `<rect width="1200" height="630" fill="${BRAND_GRAPHITE}"/>`+
  `<g transform="translate(76 76) scale(.59)">${mark(BRAND_IVORY)}</g>`+
  text("wordmark",177,122,43,BRAND_IVORY)+
  `<path d="M76 186H1124" stroke="#303137"/>`+
  text("headline",72,331,88,BRAND_IVORY)+
  text("audience",76,404,29,"#a5a6ad")+
  `<path d="M76 493H1124" stroke="#303137"/>`+
  text("capabilities",76,550,13,"#a5a6ad")+
  `<circle cx="1114" cy="545" r="6" fill="${BRAND_CORAL}"/>`,
  "textanalysis.tools — Every word in focus");
await writeFile(`${root}public/brand/social-card.svg`,social);
const socialPng=await sharp(Buffer.from(social)).png().toBuffer();
await writeFile(`${root}public/og.png`,socialPng);
await writeFile(`${root}public/social-card.png`,socialPng);
console.log(`Brand ${BRAND_VERSION}: 5 SVG masters, favicon SVG/ICO, 5 PNG icons, and 2 social images generated.`);
