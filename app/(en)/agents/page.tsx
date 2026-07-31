import AgentPage,{agentMetadata} from "../../AgentPage";

export const metadata=agentMetadata("en");
export const revalidate=300;

export default function EnglishAgentPage(){
  return <AgentPage locale="en"/>;
}
