import Script from "next/script";

export default function Analytics(){
  const measurementId=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if(!measurementId)return null;
  const setup=`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(measurementId)},{anonymize_ip:true});`;
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} strategy="afterInteractive"/>
    <Script id="ga4-setup" strategy="afterInteractive" dangerouslySetInnerHTML={{__html:setup}}/>
  </>;
}
