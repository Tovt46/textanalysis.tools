type ServerEventValue=string|number|boolean;

export async function sendServerAnalyticsEvent(name:string,params:Record<string,ServerEventValue>={}){
  const measurementId=(process.env.GA_MEASUREMENT_ID||process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)?.trim();
  const apiSecret=process.env.GA_API_SECRET?.trim();
  if(!measurementId||!apiSecret)return;
  try{
    await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({client_id:crypto.randomUUID(),events:[{name,params:{...params,engagement_time_msec:1}}]}),
      signal:AbortSignal.timeout(1500),
    });
  }catch{
    // Analytics must never break the API response.
  }
}
