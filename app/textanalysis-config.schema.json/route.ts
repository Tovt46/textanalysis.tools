import schema from "../../packages/cli/schema/textanalysis.config.schema.json";

export function GET(){
  return Response.json(schema,{
    headers:{
      "Access-Control-Allow-Origin":"*",
      "Cache-Control":"public, max-age=300, s-maxage=300",
    },
  });
}
