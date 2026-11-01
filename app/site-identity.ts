import {SITE_NAME,SITE_URL} from "./seo-metadata";

export const CONTACT_EMAIL="alextovt2@gmail.com";
export const PROJECT_PROFILES=["https://github.com/Tovt46/textanalysis.tools","https://www.npmjs.com/package/textanalysis-tools"];
export function homeSchema(path="/",language="en"){
  return {"@context":"https://schema.org","@graph":[
    {"@type":"Organization","@id":`${SITE_URL}/#organization`,name:SITE_NAME,url:SITE_URL,description:"Free text analysis tools for people, developers, and AI agents.",logo:`${SITE_URL}/android-chrome-192x192.png`,email:CONTACT_EMAIL,sameAs:PROJECT_PROFILES,contactPoint:{"@type":"ContactPoint",contactType:"customer support",email:CONTACT_EMAIL,url:`${SITE_URL}/contact`}},
    {"@type":"WebSite","@id":`${SITE_URL}/#website`,name:SITE_NAME,url:SITE_URL,publisher:{"@id":`${SITE_URL}/#organization`},inLanguage:["en","ru","uk","es"]},
    {"@type":"WebPage","@id":`${SITE_URL}${path}#webpage`,url:`${SITE_URL}${path}`,name:SITE_NAME,inLanguage:language,isPartOf:{"@id":`${SITE_URL}/#website`},about:{"@id":`${SITE_URL}/#application`}},
    {"@type":"WebApplication","@id":`${SITE_URL}/#application`,name:SITE_NAME,url:SITE_URL,applicationCategory:"UtilitiesApplication",operatingSystem:"Any",isAccessibleForFree:true,offers:{"@type":"Offer",price:"0",priceCurrency:"USD"},provider:{"@id":`${SITE_URL}/#organization`},featureList:["Word frequency","Keyword density","N-grams","Bag of Words","TF-IDF","Text similarity"]},
  ]};
}
