import {randomUUID} from "node:crypto";

export type ApiOperation=
  |"analyze"
  |"bag-of-words"
  |"compare"
  |"health"
  |"keyword-density"
  |"ngram-analyzer"
  |"similarity"
  |"tf-idf"
  |"word-frequency";

export type ApiRequestLog={
  event:"api_request";
  timestamp:string;
  requestId:string;
  operation:ApiOperation;
  method:string;
  status:number;
  durationMs:number;
  responseBytes:number;
  errorClass:string|null;
};

type ObservabilityOptions={
  now?:()=>number;
  requestId?:()=>string;
  writeLog?:(line:string)=>void;
};

const responseErrorClasses=new WeakMap<Response,string>();

export function markApiResponseErrorClass(response:Response,errorClass:string){
  const safeClass=/^[a-z][a-z0-9_]{0,63}$/.test(errorClass)?errorClass:"http_error";
  responseErrorClasses.set(response,safeClass);
  return response;
}

function classifyResponse(status:number){
  if(status<400)return null;
  if(status===400)return "invalid_request";
  if(status===404)return "not_found";
  if(status===408)return "request_timeout";
  if(status===413)return "resource_limit";
  if(status===415)return "unsupported_media_type";
  if(status===422)return "unprocessable_input";
  if(status===429)return "rate_limit";
  if(status>=500)return "server_error";
  return "http_error";
}

function safeMethod(method:string){
  return /^[A-Z]{1,12}$/.test(method)?method:"UNKNOWN";
}

function exposeRequestId(headers:Headers){
  const exposed=(headers.get("Access-Control-Expose-Headers")||"")
    .split(",")
    .map(value=>value.trim())
    .filter(Boolean);
  if(!exposed.some(value=>value.toLowerCase()==="x-request-id"))exposed.push("X-Request-ID");
  headers.set("Access-Control-Expose-Headers",exposed.join(", "));
}

function observedResponse(response:Response,onComplete:(bytes:number,errorClass?:string)=>void){
  const headers=new Headers(response.headers);
  if(!response.body){
    onComplete(0);
    return new Response(null,{status:response.status,statusText:response.statusText,headers});
  }

  const reader=response.body.getReader();
  let bytes=0;
  let finished=false;
  const finish=(errorClass?:string)=>{
    if(finished)return;
    finished=true;
    onComplete(bytes,errorClass);
  };
  const body=new ReadableStream<Uint8Array>({
    async pull(controller){
      try{
        const next=await reader.read();
        if(next.done){
          finish();
          controller.close();
          return;
        }
        bytes+=next.value.byteLength;
        controller.enqueue(next.value);
      }catch(error){
        finish("response_stream_error");
        controller.error(error);
      }
    },
    async cancel(reason){
      finish("response_cancelled");
      await reader.cancel(reason).catch(()=>undefined);
    },
  });
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

/**
 * Adds a correlation ID and emits one privacy-safe JSON log after the response
 * body has been written. The log deliberately has no request URL, network
 * address, input, result terms, headers, or exception message.
 */
export async function observeApiRequest(
  request:Request,
  operation:ApiOperation,
  handler:()=>Response|Promise<Response>,
  options:ObservabilityOptions={},
){
  const now=options.now??Date.now;
  const requestId=(options.requestId??randomUUID)();
  const writeLog=options.writeLog??(line=>console.info(line));
  const startedAt=now();
  const timestamp=new Date(startedAt).toISOString();
  let logged=false;
  const log=(status:number,responseBytes:number,errorClass=classifyResponse(status))=>{
    if(logged)return;
    logged=true;
    const event:ApiRequestLog={
      event:"api_request",
      timestamp,
      requestId,
      operation,
      method:safeMethod(request.method.toUpperCase()),
      status,
      durationMs:Math.max(0,Math.round(now()-startedAt)),
      responseBytes:Math.max(0,responseBytes),
      errorClass,
    };
    try{writeLog(JSON.stringify(event));}catch{
      // Logging must never change the API response.
    }
  };

  try{
    const response=await handler();
    const responseErrorClass=responseErrorClasses.get(response)??classifyResponse(response.status);
    const headers=new Headers(response.headers);
    headers.set("X-Request-ID",requestId);
    exposeRequestId(headers);
    const responseWithHeaders=new Response(response.body,{
      status:response.status,
      statusText:response.statusText,
      headers,
    });
    return observedResponse(responseWithHeaders,(bytes,streamErrorClass)=>{
      log(response.status,bytes,streamErrorClass??responseErrorClass);
    });
  }catch(error){
    log(500,0,"unexpected_exception");
    throw error;
  }
}
