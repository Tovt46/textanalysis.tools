/** Redirect-only Cloudflare Worker for the retired ChatGPT Sites address. */
const worker = {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const destination = new URL(`${url.pathname}${url.search}`, "https://textanalysis.tools");
    return Response.redirect(destination.toString(), 308);
  },
};

export default worker;
