import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { FACILITATOR_URL, NETWORK, PAY_TO, PRICE } from "./config.js";

const client = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
export const resourceServer = new x402ResourceServer(client).register(NETWORK, new ExactEvmScheme());

export function createPaidMiddleware(paths: string[], description: string, discovery: { input: Record<string,unknown>; inputSchema: Record<string,unknown>; output: Record<string,unknown> }) {
  const route = {
    accepts: [{ scheme:"exact" as const, price:PRICE, network:NETWORK, payTo:PAY_TO }],
    description,
    mimeType:"application/json",
    extensions: { ...declareDiscoveryExtension(discovery) },
  };
  const routes: Record<string, typeof route> = {};
  for (const path of paths) routes[`POST ${path}`] = route;
  return paymentMiddleware(routes, resourceServer);
}

export const extractDiscovery = {
  input: { url:"https://example.com/article", format:"json", includeLinks:true, includeMetadata:true, maxChars:30000 },
  inputSchema: { type:"object", properties:{ url:{type:"string",format:"uri"}, format:{type:"string",enum:["json","text","markdown"]}, includeLinks:{type:"boolean"}, includeMetadata:{type:"boolean"}, maxChars:{type:"integer",minimum:500,maximum:100000} }, required:["url"] },
  output: { example:{ success:true, sourceUrl:"https://example.com/article", finalUrl:"https://example.com/article", contentType:"text/html", text:"..." }, schema:{ type:"object", properties:{ success:{type:"boolean"}, sourceUrl:{type:"string"}, finalUrl:{type:"string"}, text:{type:"string"}, links:{type:"array"}, metadata:{type:"object"}, stats:{type:"object"} } } },
};
