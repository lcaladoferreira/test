import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import coreHandler from "../x402/web-extract/index";

const PAY_TO = "0xe100c45ad23fa81aeca03ce61871e2ea3cf8e9eb" as `0x${string}`;
const FACILITATOR_URL = "https://facilitator.payai.network";
const NETWORK = "eip155:8453" as const;

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme());

const routes = {
  "POST /api/web-extract": {
    accepts: [
      {
        scheme: "exact" as const,
        price: "$0.003",
        network: NETWORK,
        payTo: PAY_TO,
      },
    ],
    description: "Real-time public web extraction and normalization for autonomous AI agents. Returns clean text or markdown, links, metadata, JSON-LD and provenance.",
    mimeType: "application/json",
  },
};

const app = new Hono();

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Headers", "Content-Type, PAYMENT-SIGNATURE, X-PAYMENT, MCP-Protocol-Version, Mcp-Method, Mcp-Name");
  c.header("Access-Control-Expose-Headers", "PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, EXTENSION-RESPONSES");
  c.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

app.use("*", paymentMiddleware(routes, resourceServer));

app.post("*", async (c) => coreHandler(c.req.raw));

app.all("*", (c) => c.json({
  success: false,
  error: { code: "METHOD_NOT_ALLOWED", message: "POST required" },
}, 405));

export default {
  fetch(request: Request) {
    return app.fetch(request);
  },
};
