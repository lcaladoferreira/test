import { Hono } from "hono";
import { createPaidMiddleware, extractDiscovery } from "../src/payment.js";
import { handleMcp, isPaidMcpCall, TOOL_NAME } from "../src/mcp.js";

const app=new Hono();
const paid=createPaidMiddleware(["/mcp","/api/mcp"],`Paid MCP tool ${TOOL_NAME}: real-time public web extraction and normalization.`,extractDiscovery);
app.use("*",async(c,next)=>{c.header("Access-Control-Allow-Origin","*");c.header("Access-Control-Allow-Headers","Content-Type,Accept,PAYMENT-SIGNATURE,X-PAYMENT,MCP-Protocol-Version,Mcp-Method,Mcp-Name");c.header("Access-Control-Expose-Headers","PAYMENT-REQUIRED,PAYMENT-RESPONSE,X-PAYMENT-RESPONSE,EXTENSION-RESPONSES,MCP-Protocol-Version");c.header("Access-Control-Allow-Methods","POST,OPTIONS");if(c.req.method==="OPTIONS")return c.body(null,204);if(c.req.method!=="POST")return next();let rpc:any;try{rpc=await c.req.raw.clone().json();}catch{return next();}if(isPaidMcpCall(rpc))return paid(c,next);return next();});
app.post("*",async(c)=>{let rpc:any;try{rpc=await c.req.json();}catch{return c.json({jsonrpc:"2.0",id:null,error:{code:-32700,message:"Parse error"}},400);}return handleMcp(c.req.raw,rpc);});
app.all("*",c=>c.json({jsonrpc:"2.0",id:null,error:{code:-32600,message:"POST required"}},405));
export default {fetch:(request:Request)=>app.fetch(request)};
