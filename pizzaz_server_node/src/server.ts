import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

type PizzazWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");

function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found. Expected directory ${ASSETS_DIR}. Run "pnpm run build" before starting the server.`
    );
  }

  const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
  let htmlContents: string | null = null;

  if (fs.existsSync(directPath)) {
    htmlContents = fs.readFileSync(directPath, "utf8");
  } else {
    const candidates = fs
      .readdirSync(ASSETS_DIR)
      .filter(
        (file) => file.startsWith(`${componentName}-`) && file.endsWith(".html")
      )
      .sort();
    const fallback = candidates[candidates.length - 1];
    if (fallback) {
      htmlContents = fs.readFileSync(path.join(ASSETS_DIR, fallback), "utf8");
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${componentName}" not found in ${ASSETS_DIR}. Run "pnpm run build" to generate the assets.`
    );
  }

  return htmlContents;
}

function widgetMeta(widget: PizzazWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

const widgets: PizzazWidget[] = [
  {
    id: "pizza-map",
    title: "Show Pizza Map",
    templateUri: "ui://widget/pizza-map.html",
    invoking: "Hand-tossing a map",
    invoked: "Served a fresh map",
    html: readWidgetHtml("pizzaz"),
    responseText: "Rendered a pizza map!",
  },
  {
    id: "pizza-carousel",
    title: "Show Pizza Carousel",
    templateUri: "ui://widget/pizza-carousel.html",
    invoking: "Carousel some spots",
    invoked: "Served a fresh carousel",
    html: readWidgetHtml("pizzaz-carousel"),
    responseText: "Rendered a pizza carousel!",
  },
  {
    id: "pizza-albums",
    title: "Show Pizza Album",
    templateUri: "ui://widget/pizza-albums.html",
    invoking: "Hand-tossing an album",
    invoked: "Served a fresh album",
    html: readWidgetHtml("pizzaz-albums"),
    responseText: "Rendered a pizza album!",
  },
  {
    id: "pizza-list",
    title: "Show Pizza List",
    templateUri: "ui://widget/pizza-list.html",
    invoking: "Hand-tossing a list",
    invoked: "Served a fresh list",
    html: readWidgetHtml("pizzaz-list"),
    responseText: "Rendered a pizza list!",
  },
  {
    id: "star",
    title: "Retirement Estimator",
    templateUri: "ui://widget/star.html",
    invoking: "Preparing estimator…",
    invoked: "Estimator ready.",
    html: readWidgetHtml("star"),
    responseText: "Rendered retirement estimator!",
  },
  {
    id: "pizza-line-graph",
    title: "Show Pizza Line Graph",
    templateUri: "ui://widget/pizza-line-graph.html",
    invoking: "Plotting a pizza line graph",
    invoked: "Rendered a pizza line graph",
    html: readWidgetHtml("line-graph"),
    responseText: "Rendered a pizza line graph!",
  },
  {
    id: "pizza-table-card",
    title: "Show Pizza Table Card",
    templateUri: "ui://widget/pizza-table-card.html",
    invoking: "Hand-tossing a table card",
    invoked: "Served a fresh table card",
    html: readWidgetHtml("table-card"),
    responseText: "Rendered a pizza table card!",
  },
];

const widgetsById = new Map<string, PizzazWidget>();
const widgetsByUri = new Map<string, PizzazWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

const toolInputSchema = {
  type: "object",
  properties: {
    pizzaTopping: {
      type: "string",
      description: "Topping to mention when rendering the widget.",
    },
  },
  required: ["pizzaTopping"],
  additionalProperties: false,
} as const;

const toolInputParser = z.object({
  pizzaTopping: z.string(),
});

const widgetTools: Tool[] = widgets.map((widget) => ({
  name: widget.id,
  description: widget.title,
  inputSchema: toolInputSchema,
  title: widget.title,
  _meta: widgetMeta(widget),
  // To disable the approval prompt for the widgets
  annotations: {
    destructiveHint: false,
    openWorldHint: false,
    readOnlyHint: true,
  },
}));

// Star estimate tool (hydrates the star widget)
const estimateInputSchema = {
  type: "object",
  properties: {
    age: { type: "number" },
    retirementAge: { type: "number" },
    annualSalary: { type: "number" },
    currentSavings: { type: "number" },
    annualContributionPct: { type: "number" },
    employerMatch: { type: "boolean" },
    matchUpToPct: { type: "number" },
    matchRatePct: { type: "number" },
    assumedAnnualReturnPct: { type: "number" },
  },
  required: ["age", "retirementAge"],
  additionalProperties: true,
} as const;

const estimateInputParser = z.object({
  age: z.number(),
  retirementAge: z.number(),
  annualSalary: z.number().optional().default(0),
  currentSavings: z.number().optional().default(0),
  annualContributionPct: z.number().optional().default(0),
  employerMatch: z.boolean().optional().default(false),
  matchUpToPct: z.number().optional().default(0),
  matchRatePct: z.number().optional().default(0),
  assumedAnnualReturnPct: z.number().optional().default(0),
});

function estimate(payload: z.infer<typeof estimateInputParser>) {
  const age = payload.age;
  const retirementAge = payload.retirementAge;
  const annualSalary = payload.annualSalary;
  const currentSavings = payload.currentSavings;
  const contribPct = payload.annualContributionPct;
  const employerMatch = !!payload.employerMatch;
  const matchUpToPct = payload.matchUpToPct;
  const matchRatePct = payload.matchRatePct;
  const annualReturn = payload.assumedAnnualReturnPct;

  const years = Math.max(0, Math.round(retirementAge - age));
  const points: Array<{
    year: number;
    age: number;
    startBalance: number;
    employeeContribution: number;
    employerMatch: number;
    growth: number;
    endBalance: number;
  }> = [];
  let start = Math.max(0, currentSavings);
  let totalEmployeeContrib = 0;
  let totalEmployerMatch = 0;

  for (let i = 0; i < years; i++) {
    const year = i + 1;
    const ageThisYear = age + year;
    const employeeContribution = Math.max(0, annualSalary * contribPct);
    const cappedPct = Math.min(contribPct, matchUpToPct);
    const employerBase = Math.max(0, annualSalary * cappedPct);
    const employer = employerMatch ? employerBase * matchRatePct : 0;
    const growth = Math.max(0, (start + employeeContribution + employer) * annualReturn);
    const end = start + employeeContribution + employer + growth;

    points.push({
      year,
      age: ageThisYear,
      startBalance: Math.round(start),
      employeeContribution: Math.round(employeeContribution),
      employerMatch: Math.round(employer),
      growth: Math.round(growth),
      endBalance: Math.round(end),
    });

    totalEmployeeContrib += employeeContribution;
    totalEmployerMatch += employer;
    start = end;
  }

  const summary = {
    years,
    endingBalance: Math.round(start),
    totalEmployeeContrib: Math.round(totalEmployeeContrib),
    totalEmployerMatch: Math.round(totalEmployerMatch),
  };

  return { summary, points };
}

const starWidget = widgetsById.get("star");
const estimateTool: Tool = {
  name: "estimate_retirement",
  title: "Estimate Retirement",
  description: "Compute a retirement projection and render the estimator UI",
  inputSchema: estimateInputSchema,
  _meta: starWidget ? widgetMeta(starWidget) : ({} as any),
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
};

const tools: Tool[] = [...widgetTools, estimateTool];

const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

function createPizzazServer(): Server {
  const server = new Server(
    {
      name: "pizzaz-node",
      version: "0.1.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => ({
      resources,
    })
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const widget = widgetsByUri.get(request.params.uri);

      if (!widget) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: widget.html,
            _meta: widgetMeta(widget),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_request: ListResourceTemplatesRequest) => ({
      resourceTemplates,
    })
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => ({
      tools,
    })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const widget = widgetsById.get(request.params.name);
      if (!widget) throw new Error(`Unknown tool: ${request.params.name}`);
      const args = toolInputParser.parse(request.params.arguments ?? {});
      return {
        content: [{ type: "text", text: widget.responseText }],
        structuredContent: { pizzaTopping: args.pizzaTopping },
        _meta: widgetMeta(widget),
      };
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createPizzazServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (
      req.method === "OPTIONS" &&
      (url.pathname === ssePath || url.pathname === postPath)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === ssePath) {
      await handleSseRequest(res);
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    res.writeHead(404).end("Not Found");
  }
);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, () => {
  console.log(`Pizzaz MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
});
