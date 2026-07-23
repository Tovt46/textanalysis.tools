import { SITE_URL } from "../seo-metadata";

export function GET() {
  return Response.redirect(new URL("/",SITE_URL),308);
}
