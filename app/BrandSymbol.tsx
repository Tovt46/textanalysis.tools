import { BRAND_CORAL,BRAND_PATHS,BRAND_VIEWBOX } from "./brand";

export default function BrandSymbol(){
  return <svg className="brand-symbol" viewBox={BRAND_VIEWBOX} width="32" height="25" fill="currentColor" aria-hidden="true" focusable="false">
    {BRAND_PATHS.map(path=><path key={path} d={path}/>)}
    <circle cx="125" cy="53" r="11" fill={BRAND_CORAL}/>
  </svg>;
}
