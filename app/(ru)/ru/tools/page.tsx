import LocalizedToolsDirectory,{ localizedToolsMetadata } from "../../../LocalizedToolsDirectory";

export const metadata=localizedToolsMetadata("ru");

export default function RussianToolsPage(){
  return <LocalizedToolsDirectory locale="ru"/>;
}
