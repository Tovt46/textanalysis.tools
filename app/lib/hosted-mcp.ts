export const HOSTED_MCP_INFO={name:"textanalysis-tools-http",version:"0.2.0"};
export const hostedMcpCard={
  version:"1.0",
  protocolVersion:"2025-03-26",
  serverInfo:HOSTED_MCP_INFO,
  description:"Stateless, read-only text analysis through the public Text Analysis Tools API. Submitted content is processed on the server without document storage.",
  documentationUrl:"https://textanalysis.tools/agents",
  transport:{type:"streamable-http",endpoint:"https://textanalysis.tools/mcp"},
  capabilities:{tools:{listChanged:true}},
};
