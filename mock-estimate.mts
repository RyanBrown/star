#!/usr/bin/env -S node --enable-source-maps
import { createServer } from "node:http";

const PORT = 8787;

function send(res, status, data, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    ...headers,
  });
  res.end(data ? JSON.stringify(data) : "");
}

function sendNoContent(res) {
  res.writeHead(204, {
    "access-control-allow-origin": "*",
  });
  res.end();
}

function handleCors(req, res) {
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

function toNumber(v, def = 0) {
  const n = typeof v === "string" ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : def;
}

function estimate(payload) {
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
  const rows = [];
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

  const summary = {
    years,
    endingBalance: Math.round(start),
    totalEmployeeContrib: Math.round(totalEmployeeContrib),
    totalEmployerMatch: Math.round(totalEmployerMatch),
  };

  return { summary, points: rows };
}

const server = createServer(async (req, res) => {
  try {
    if (handleCors(req, res)) return;

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "POST" && url.pathname === "/mock-estimate") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");
      let json;
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        send(res, 400, { error: "Invalid JSON" });
        return;
      }
      const result = estimate(json || {});
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


