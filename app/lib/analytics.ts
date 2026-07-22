type EventValue=string|number|boolean;

declare global {
  interface Window {
    dataLayer?:unknown[];
    gtag?:(command:"event",eventName:string,parameters?:Record<string,EventValue>)=>void;
  }
}

export function trackEvent(eventName:string,parameters:Record<string,EventValue>={}){
  if(typeof window==="undefined")return;
  if(typeof window.gtag==="function")window.gtag("event",eventName,parameters);
  else{
    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push({event:eventName,...parameters});
  }
}
