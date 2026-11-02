import {setTimeout as pause} from "node:timers/promises";
import {pathToFileURL} from "node:url";

function boundedInteger(value,fallback,name,min,max){
  const parsed=value===undefined?fallback:Number(value);
  if(!Number.isInteger(parsed)||parsed<min||parsed>max){
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }
  return parsed;
}

// Wait only for rollout identity. Once it appears, the caller runs regression
// checks once so a flaky or failing deployment cannot turn green through retries.
export async function waitForDeployment({
  baseUrl="https://textanalysis.tools/",
  expectedRevision,
  attempts=12,
  intervalMs=30_000,
  timeoutMs=10_000,
  request=fetch,
  pause:wait=pause,
  log=console.log,
}={}){
  const expected=String(expectedRevision??"").trim().toLowerCase();
  if(!/^[0-9a-f]{7,64}$/.test(expected)){
    throw new Error("EXPECT_DEPLOYMENT_REVISION must be a hexadecimal revision of 7 to 64 characters.");
  }
  const origin=new URL(baseUrl);
  if(!["http:","https:"].includes(origin.protocol)||origin.username||origin.password){
    throw new Error("SMOKE_BASE_URL must be an HTTP(S) URL without credentials.");
  }
  const checks=boundedInteger(attempts,12,"DEPLOYMENT_WAIT_ATTEMPTS",1,60);
  const interval=boundedInteger(intervalMs,30_000,"DEPLOYMENT_WAIT_INTERVAL_MS",0,60_000);
  const timeout=boundedInteger(timeoutMs,10_000,"DEPLOYMENT_WAIT_TIMEOUT_MS",1,30_000);
  const healthUrl=new URL("/api/health",origin);
  let observed="no response";
  for(let attempt=1;attempt<=checks;attempt+=1){
    try{
      const response=await request(healthUrl,{
        redirect:"manual",
        cache:"no-store",
        headers:{Accept:"application/json"},
        signal:AbortSignal.timeout(timeout),
      });
      if(response.status===200){
        const health=await response.json();
        observed=`revision ${String(health.revision??"(missing)")}`;
        if(health.revision===expected){
          log(`Deployment ready: ${expected} at ${healthUrl.origin}.`);
          return health;
        }
      }else{
        observed=`HTTP ${response.status}`;
        await response.body?.cancel();
      }
    }catch(error){
      observed=`${error.name??"Error"}: ${error.message??String(error)}`;
    }
    log(`Deployment wait ${attempt}/${checks}: ${observed}; expected ${expected}.`);
    if(attempt<checks)await wait(interval);
  }
  throw new Error(`Deployment ${expected} did not become available after ${checks} health checks. Last observation: ${observed}.`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    await waitForDeployment({
      baseUrl:process.env.SMOKE_BASE_URL,
      expectedRevision:process.env.EXPECT_DEPLOYMENT_REVISION,
      attempts:process.env.DEPLOYMENT_WAIT_ATTEMPTS,
      intervalMs:process.env.DEPLOYMENT_WAIT_INTERVAL_MS,
      timeoutMs:process.env.DEPLOYMENT_WAIT_TIMEOUT_MS,
    });
  }catch(error){
    console.error(error.message??String(error));
    process.exitCode=1;
  }
}
