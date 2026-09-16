import { extractWeb, type ExtractInput } from "./extract.js";
import { HttpError } from "./errors.js";

export const MCP_VERSION="2026-07-28";
export const TOOL_NAME="extract_web";
export const toolSchema={ name:TOOL_NAME, title:"Real-time Web Extractor", description:"Fetch a public HTTP(S) URL in real time and return normalized readable content, links, metadata and provenance.", inputSchema:{ type:"object", properties:{ url:{type:"string",format:"uri"}, format:{type:"string",enum:["json","text","markdown"],default:"json"}, includeLinks:{type:"boolean",default:true}, includeMetadata:{type:"boolean",default:true}, maxChars:{type:"integer",minimum:500,maximum:100000,default:30000} }, required:["url"], additionalProperties:false }, outputSchema:{type:"object"} };

type Rpc={jsonrpc?:string;id?:string|number|null;method?:string;params?:any;_meta?:Record<string,unknown>};
function result(id:Rpc["id"], value:unknown,status=200){return Response.json({jsonrpc:"2.0",id:id??null,result:value},{status,headers:{"MCP-Protocol-Version":MCP_VERSION,"cache-control":"no-store"}})}
function failure(id:Rpc["id"],code:number,message:string,data?:unknown,status=400){return Response.json({jsonrpc:"2.0",id:id??null,error:{code,message,...(data===undefined?{}:{data})}},{status,headers:{"MCP-Protocol-Version":MCP_VERSION,"cache-control":"no-store"}})}

export function isPaidMcpCall(rpc: Rpc){return rpc.method === "tools/call" && rpc.params?.name === TOOL_NAME;}
export async function handleMcp(req:Request,rpc:Rpc){
  const version=req.headers.get("MCP-Protocol-Version"); if(version && version!==MCP_VERSION) return failure(rpc.id,-32022,"Unsupported protocol version",{supported:[MCP_VERSION]},400);
  const routed=req.headers.get("Mcp-Method"); if(routed && routed!==rpc.method) return failure(rpc.id,-32020,"Mcp-Method header mismatch",undefined,400);
  if(rpc.method==="server/discover") return result(rpc.id,{resultType:"complete",supportedVersions:[MCP_VERSION],capabilities:{tools:{}},instructions:"Call extract_web for paid real-time web extraction.",_meta:{"io.modelcontextprotocol/serverInfo":{name:"agent-web-extract",version:"1.0.0"}}});
  if(rpc.method==="tools/list") return result(rpc.id,{resultType:"complete",tools:[toolSchema],_meta:{"io.modelcontextprotocol/serverInfo":{name:"agent-web-extract",version:"1.0.0"}}});
  if(rpc.method==="tools/call"){
    if(rpc.params?.name!==TOOL_NAME) return failure(rpc.id,-32602,"Unknown tool",{supported:[TOOL_NAME]},400);
    const routedName=req.headers.get("Mcp-Name"); if(routedName && routedName!==TOOL_NAME) return failure(rpc.id,-32020,"Mcp-Name header mismatch",undefined,400);
    try{const out=await extractWeb((rpc.params?.arguments||{}) as ExtractInput); return result(rpc.id,{resultType:"complete",content:[{type:"text",text:JSON.stringify(out.result)}],structuredContent:out.result,isError:false,_meta:{"io.modelcontextprotocol/serverInfo":{name:"agent-web-extract",version:"1.0.0"}}});}
    catch(e){const err=e instanceof HttpError?e:new HttpError(500,"INTERNAL_ERROR","Unexpected extraction error"); return failure(rpc.id,-32050,err.message,{code:err.code},err.status);}
  }
  return failure(rpc.id,-32601,"Method not found",undefined,404);
}
