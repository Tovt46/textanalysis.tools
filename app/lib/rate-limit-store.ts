import {createHash,randomBytes} from "node:crypto";
import {mkdir,open,readFile,rename,stat,unlink,writeFile} from "node:fs/promises";
import {isAbsolute,join} from "node:path";

export type RateLimitWindow={startedAt:number;count:number};

export interface RateLimitStore{
  increment(key:string,cost:number,now:number,windowMs:number):Promise<RateLimitWindow>;
  probe(now:number):Promise<unknown>;
}

export type RateLimitBackendStatus="shared"|"local"|"degraded";

export type ResilientRateLimitStoreOptions={
  retryBaseMs?:number;
  retryMaximumMs?:number;
  probeTimeoutMs?:number;
  writeLog?:(line:string,level:"info"|"warn")=>void;
};

function defaultStoreLog(line:string,level:"info"|"warn"){
  if(level==="warn")console.warn(line);
  else console.info(line);
}

/**
 * Uses a shared primary store when configured and a bounded process-local
 * fallback during an outage. Failed primary probes use exponential backoff so
 * a lock or filesystem outage cannot add its timeout to every API request.
 */
export class ResilientRateLimitStore implements RateLimitStore{
  private backendStatus:RateLimitBackendStatus;
  private consecutiveFailures=0;
  private retryAt=0;
  private probeInFlight=false;
  private readonly retryBaseMs:number;
  private readonly retryMaximumMs:number;
  private readonly probeTimeoutMs:number;
  private readonly writeLog:(line:string,level:"info"|"warn")=>void;
  private activeHealthProbe:Promise<RateLimitBackendStatus>|null=null;

  constructor(
    private readonly primary:RateLimitStore|null,
    private readonly fallback:RateLimitStore,
    options:ResilientRateLimitStoreOptions={},
  ){
    this.backendStatus=primary?"shared":"local";
    this.retryBaseMs=Math.max(100,Math.floor(options.retryBaseMs??5_000));
    this.retryMaximumMs=Math.max(this.retryBaseMs,Math.floor(options.retryMaximumMs??300_000));
    this.probeTimeoutMs=Math.max(100,Math.floor(options.probeTimeoutMs??2_500));
    this.writeLog=options.writeLog??defaultStoreLog;
  }

  status(){return this.backendStatus;}

  private emit(event:"rate_limit_store_degraded"|"rate_limit_store_recovered",now:number,retryAfterMs?:number){
    const details={
      event,
      timestamp:new Date(now).toISOString(),
      backend:"shared",
      fallback:"memory",
      ...(retryAfterMs===undefined?{}:{retryAfterMs}),
    };
    try{this.writeLog(JSON.stringify(details),event.endsWith("degraded")?"warn":"info");}catch{
      // Store diagnostics must never change quota enforcement.
    }
  }

  private degrade(now:number){
    if(this.backendStatus==="degraded"&&now<this.retryAt)return;
    this.backendStatus="degraded";
    this.consecutiveFailures=Math.min(16,this.consecutiveFailures+1);
    const retryAfterMs=Math.min(this.retryMaximumMs,this.retryBaseMs*(2**(this.consecutiveFailures-1)));
    this.retryAt=now+retryAfterMs;
    this.emit("rate_limit_store_degraded",now,retryAfterMs);
  }

  async probe(now=Date.now()):Promise<RateLimitBackendStatus>{
    if(!this.primary)return "local";
    const primary=this.primary;
    if(this.backendStatus==="degraded"&&(now<this.retryAt||this.probeInFlight))return "degraded";
    if(this.activeHealthProbe)return this.activeHealthProbe;
    this.activeHealthProbe=(async()=>{
      let timeout:ReturnType<typeof setTimeout>|undefined;
      try{
        await Promise.race([
          primary.probe(now),
          new Promise<never>((_resolve,reject)=>{
            timeout=setTimeout(()=>reject(new Error("Shared rate-limit probe timed out.")),this.probeTimeoutMs);
          }),
        ]);
        if(this.backendStatus==="degraded")this.emit("rate_limit_store_recovered",now);
        this.backendStatus="shared";
        this.consecutiveFailures=0;
        this.retryAt=0;
        return "shared";
      }catch{
        this.degrade(now);
        return "degraded";
      }finally{
        if(timeout)clearTimeout(timeout);
        this.activeHealthProbe=null;
      }
    })();
    return this.activeHealthProbe;
  }

  async increment(key:string,cost:number,now:number,windowMs:number){
    if(!this.primary)return this.fallback.increment(key,cost,now,windowMs);
    let ownsProbe=false;
    if(this.backendStatus==="degraded"){
      if(now<this.retryAt||this.probeInFlight||this.activeHealthProbe)return this.fallback.increment(key,cost,now,windowMs);
      this.probeInFlight=true;
      ownsProbe=true;
    }
    try{
      const result=await this.primary.increment(key,cost,now,windowMs);
      if(this.backendStatus==="degraded")this.emit("rate_limit_store_recovered",now);
      this.backendStatus="shared";
      this.consecutiveFailures=0;
      this.retryAt=0;
      return result;
    }catch{
      this.degrade(now);
      return this.fallback.increment(key,cost,now,windowMs);
    }finally{
      if(ownsProbe)this.probeInFlight=false;
    }
  }
}

const OVERFLOW_KEY="__overflow__";

export class MemoryRateLimitStore implements RateLimitStore{
  private readonly windows=new Map<string,RateLimitWindow>();

  constructor(private readonly maximumKeys=5_000){}

  async probe(){}

  async increment(key:string,cost:number,now:number,windowMs:number){
    let resolvedKey=key;
    let current=this.windows.get(resolvedKey);
    if(!current&&this.windows.size>=this.maximumKeys){
      for(const [candidate,window] of this.windows){
        if(now-window.startedAt>=windowMs)this.windows.delete(candidate);
      }
      current=this.windows.get(resolvedKey);
      if(!current&&this.windows.size>=this.maximumKeys){
        resolvedKey=OVERFLOW_KEY;
        current=this.windows.get(resolvedKey);
        if(!current){
          const oldestKey=this.windows.keys().next().value as string|undefined;
          if(oldestKey)this.windows.delete(oldestKey);
        }
      }
    }
    if(!current||now-current.startedAt>=windowMs){
      const window={startedAt:now,count:cost};
      this.windows.set(resolvedKey,window);
      return {...window};
    }
    current.count+=cost;
    return {...current};
  }
}

type BucketState={entries:Record<string,RateLimitWindow>};

const sleep=(milliseconds:number)=>new Promise(resolve=>setTimeout(resolve,milliseconds));

function errorCode(error:unknown){
  return error&&typeof error==="object"&&"code" in error?String(error.code):"";
}

function validWindow(value:unknown):value is RateLimitWindow{
  return Boolean(
    value&&typeof value==="object"&&
    Number.isSafeInteger((value as RateLimitWindow).startedAt)&&
    Number.isSafeInteger((value as RateLimitWindow).count)&&
    (value as RateLimitWindow).startedAt>=0&&
    (value as RateLimitWindow).count>=0,
  );
}

export type FileRateLimitStoreOptions={
  bucketCount?:number;
  maximumKeys?:number;
  lockTimeoutMs?:number;
  staleLockMs?:number;
};

/**
 * A bounded, process-shared rate-limit store for a persistent local filesystem.
 * Each bucket is protected by an atomic exclusive lock file and replaced
 * atomically, so multiple Node workers can safely share the same directory.
 */
export class FileRateLimitStore implements RateLimitStore{
  private readonly bucketCount:number;
  private readonly maximumKeysPerBucket:number;
  private readonly lockTimeoutMs:number;
  private readonly staleLockMs:number;
  private ready:Promise<void>|null=null;

  constructor(private readonly directory:string,options:FileRateLimitStoreOptions={}){
    if(!isAbsolute(directory))throw new TypeError("RATE_LIMIT_STORE_PATH must be an absolute path.");
    this.bucketCount=Math.max(1,Math.min(4_096,Math.floor(options.bucketCount??256)));
    const maximumKeys=Math.max(this.bucketCount,Math.floor(options.maximumKeys??5_000));
    this.maximumKeysPerBucket=Math.max(1,Math.ceil(maximumKeys/this.bucketCount));
    this.lockTimeoutMs=Math.max(100,Math.floor(options.lockTimeoutMs??2_000));
    this.staleLockMs=Math.max(this.lockTimeoutMs*2,Math.floor(options.staleLockMs??30_000));
  }

  private ensureDirectory(){
    this.ready??=mkdir(this.directory,{recursive:true})
      .then(()=>undefined)
      .catch(error=>{
        this.ready=null;
        throw error;
      });
    return this.ready;
  }

  private bucketFor(key:string){
    const digest=createHash("sha256").update(key).digest();
    const bucket=digest.readUInt32BE(0)%this.bucketCount;
    return {bucket,keyHash:digest.toString("hex")};
  }

  private async acquireLock(lockPath:string){
    const deadline=Date.now()+this.lockTimeoutMs;
    let delay=8;
    while(true){
      try{
        const handle=await open(lockPath,"wx",0o600);
        try{
          await handle.writeFile(`${process.pid}:${Date.now()}`);
          return handle;
        }catch(error){
          await handle.close().catch(()=>undefined);
          await unlink(lockPath).catch(()=>undefined);
          throw error;
        }
      }catch(error){
        if(errorCode(error)!=="EEXIST")throw error;
        try{
          const details=await stat(lockPath);
          if(Date.now()-details.mtimeMs>this.staleLockMs){
            await unlink(lockPath).catch(()=>undefined);
            continue;
          }
        }catch(staleError){
          if(errorCode(staleError)==="ENOENT")continue;
        }
        if(Date.now()>=deadline)throw new Error("Timed out waiting for the shared rate-limit store lock.");
        await sleep(delay);
        delay=Math.min(64,delay*2);
      }
    }
  }

  private async readBucket(path:string):Promise<BucketState>{
    try{
      const parsed=JSON.parse(await readFile(path,"utf8")) as {entries?:unknown};
      if(!parsed.entries||typeof parsed.entries!=="object"||Array.isArray(parsed.entries))return{entries:{}};
      const entries:Record<string,RateLimitWindow>={};
      for(const [key,value] of Object.entries(parsed.entries))if(validWindow(value))entries[key]=value;
      return{entries};
    }catch(error){
      if(errorCode(error)==="ENOENT"||error instanceof SyntaxError)return{entries:{}};
      throw error;
    }
  }

  async increment(key:string,cost:number,now:number,windowMs:number){
    await this.ensureDirectory();
    const {bucket,keyHash}=this.bucketFor(key);
    const bucketPath=join(this.directory,`bucket-${bucket}.json`);
    const lockPath=`${bucketPath}.lock`;
    const lock=await this.acquireLock(lockPath);
    try{
      const state=await this.readBucket(bucketPath);
      for(const [candidate,window] of Object.entries(state.entries)){
        if(now-window.startedAt>=windowMs)delete state.entries[candidate];
      }
      let resolvedKey=keyHash;
      let current=state.entries[resolvedKey];
      if(!current&&Object.keys(state.entries).length>=this.maximumKeysPerBucket){
        resolvedKey=OVERFLOW_KEY;
        current=state.entries[resolvedKey];
      }
      const next=!current||now-current.startedAt>=windowMs
        ?{startedAt:now,count:cost}
        :{startedAt:current.startedAt,count:current.count+cost};
      state.entries[resolvedKey]=next;
      const temporaryPath=`${bucketPath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
      try{
        await writeFile(temporaryPath,JSON.stringify(state),{encoding:"utf8",mode:0o600});
        await rename(temporaryPath,bucketPath);
      }finally{
        await unlink(temporaryPath).catch(()=>undefined);
      }
      return {...next};
    }finally{
      await lock.close().catch(()=>undefined);
      await unlink(lockPath).catch(()=>undefined);
    }
  }

  async probe(now=Date.now()){
    await this.ensureDirectory();
    const probePath=join(this.directory,"health.json");
    const lockPath=`${probePath}.lock`;
    const lock=await this.acquireLock(lockPath);
    try{
      const temporaryPath=`${probePath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
      try{
        await writeFile(temporaryPath,JSON.stringify({ok:true,checkedAt:now}),{encoding:"utf8",mode:0o600});
        await rename(temporaryPath,probePath);
      }finally{
        await unlink(temporaryPath).catch(()=>undefined);
      }
    }finally{
      await lock.close().catch(()=>undefined);
      await unlink(lockPath).catch(()=>undefined);
    }
  }
}

class UnavailableRateLimitStore implements RateLimitStore{
  async increment():Promise<RateLimitWindow>{throw new Error("Shared rate-limit store is unavailable.");}
  async probe():Promise<void>{throw new Error("Shared rate-limit store is unavailable.");}
}

export function createConfiguredRateLimitStore(
  directory:string|undefined,
  options:{maximumKeys?:number;file?:FileRateLimitStoreOptions;resilient?:ResilientRateLimitStoreOptions}={},
){
  const local=new MemoryRateLimitStore(options.maximumKeys??5_000);
  const configured=directory?.trim();
  if(!configured)return new ResilientRateLimitStore(null,local,options.resilient);
  let shared:RateLimitStore;
  try{
    shared=new FileRateLimitStore(configured,{maximumKeys:options.maximumKeys,...options.file});
  }catch{
    shared=new UnavailableRateLimitStore();
  }
  return new ResilientRateLimitStore(shared,local,options.resilient);
}
