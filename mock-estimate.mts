#!/usr/bin/env -S node --enable-source-maps
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = 8787;

function send(
  res: ServerResponse,
  status: number,
  data: unknown,
  headers: Record<string, string> = {}
) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    ...headers,
  });
  res.end(data ? JSON.stringify(data) : "");
}

function sendNoContent(res: ServerResponse) {
  res.writeHead(204, {
    "access-control-allow-origin": "*",
  });
  res.end();
}

function handleCors(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    res.end();
    return true;
  }
  return false;
}

function toNumber(v: unknown, def = 0): number {
  const n = typeof v === "string" ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : def;
}

type EstimateInput = {
  age?: number;
  retirementAge?: number;
  annualSalary?: number;
  currentSavings?: number;
  annualContributionPct?: number;
  employerMatch?: boolean;
  matchUpToPct?: number;
  matchRatePct?: number;
  assumedAnnualReturnPct?: number;
};

type EstimatePoint = {
  year: number;
  age: number;
  startBalance: number;
  employeeContribution: number;
  employerMatch: number;
  growth: number;
  endBalance: number;
};

type EstimateSummary = {
  years: number;
  endingBalance: number;
  totalEmployeeContrib: number;
  totalEmployerMatch: number;
};

type EstimateResult = { summary: EstimateSummary; points: EstimatePoint[] };

function estimate(payload: EstimateInput): EstimateResult {
  const age = toNumber(payload.age);
  const retirementAge = toNumber(payload.retirementAge);
  const annualSalary = toNumber(payload.annualSalary);
  const currentSavings = toNumber(payload.currentSavings);
  const contribPct = toNumber(payload.annualContributionPct);
  const employerMatch = !!payload.employerMatch;
  const matchUpToPct = toNumber(payload.matchUpToPct);
  const matchRatePct = toNumber(payload.matchRatePct);
  const annualReturn = toNumber(payload.assumedAnnualReturnPct);

  const years = Math.max(0, Math.round(retirementAge - age));
  const rows: EstimatePoint[] = [];
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

    rows.push({
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

  const summary: EstimateSummary = {
    years,
    endingBalance: Math.round(start),
    totalEmployeeContrib: Math.round(totalEmployeeContrib),
    totalEmployerMatch: Math.round(totalEmployerMatch),
  };

  return { summary, points: rows };
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    if (handleCors(req, res)) return;

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "POST" && url.pathname === "/mock-estimate") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const raw = Buffer.concat(chunks).toString("utf8");
      let json: unknown;
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        send(res, 400, { error: "Invalid JSON" });
        return;
      }
      const result = estimate((json as EstimateInput) || {});
      send(res, 200, result);
      return;
    }

    // Best-effort storage stubs used by local preview
    if (req.method === "GET" && url.pathname === "/storage/estimates") {
      sendNoContent(res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/storage/prefs") {
      sendNoContent(res);
      return;
    }

    send(res, 404, { error: "Not Found" });
  } catch (err) {
    send(res, 500, { error: (err && err.message) || "Internal Error" });
  }
});

server.listen(PORT, () => {
  console.log(`Mock estimate server listening on http://localhost:${PORT}`);
  console.log(`POST /mock-estimate`);
});


