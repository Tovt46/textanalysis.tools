import ToolShell from "../../ToolShell";
export const revalidate=300;

export default function ToolsLayout({children}:{children:React.ReactNode}){
  return <ToolShell locale="en">{children}</ToolShell>;
}
