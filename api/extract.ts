import { Hono } from "hono";
import { extractWeb } from "../src/extract.js";
import { errorResponse } from "../src/errors.js";
import { createPaidMiddleware, extractDiscovery } from "../src/payment.js";

const app=new Hono();
app.use("*",async(c,next)=>{c.header("Access-Control-Allow-Origin","*");c.header("Access-Control-Allow-Headers","Content-Type,PAYMENT-SIGNATURE,X-PAYMENT");c.header("Access-Control-Expose-Headers","PAYMENT-REQUIRED,PAYMENT-RESPONSE,X-PAYMENT-RESPONSE,EXTENSION-RESPONSES");c.header("Access-Control-Allow-Methods","POST,OPTIONS");if(c.req.method==="OPTIONS")return c.body(null,204);await next();});
app.use("*",createPaidMiddleware(["/api/extract"],"Real-time public web extraction and normalization for autonomous AI agents.",extractDiscovery));
app.post("*",async(c)=>{let body:unknown;try{body=await c.req.json();}catch{return c.json({success:false,error:{code:"INVALID_JSON",message:"Request body must be valid JSON"}},400);}try{const out=await extractWeb(body as any);if(out.format==="text")return c.text(out.representation,200,{"cache-control":"no-store","x-source-url":out.result.finalUrl});if(out.format==="markdown")return c.body(out.representation,200,{"content-type":"text/markdown; charset=utf-8","cache-control":"no-store","x-source-url":out.result.finalUrl});return c.json(out.result,200,{"cache-control":"no-store"});}catch(e){return errorResponse(e);}});
app.all("*",c=>c.json({success:false,error:{code:"METHOD_NOT_ALLOWED",message:"POST required"}},405));
export default {fetch:(request:Request)=>app.fetch(request)};
