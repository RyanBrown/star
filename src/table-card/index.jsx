import React from "react";
import { createRoot } from "react-dom/client";
import mock from "./mock.json";

function Cell({ children, className = "" }) {
  return (
    <div className={"w-full p-3 sm:p-4 " + className}>
      {children}
    </div>
  );
}

function Row({ children, className = "" }) {
  return <div className={"flex flex-col sm:flex-row " + className}>{children}</div>;
}

export default function TableCard({ rows = mock?.rows }) {
  return (
    <div className="antialiased w-full text-black border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl bg-white dark:bg-black/20">
      <div className="flex flex-col">
        {/* Row 1: single full-width cell */}
        <div className="p-4 flex justify-between">
          <div className="text-sm sm:text-base font-medium">Savings Rate Scenarios</div>
          <div className="text-xs sm:text-sm text-black/60 mt-1">Target Retirement Age: <input type="number" min="0" max="100" defaultValue="65" className="w-16" /></div>
        </div>

        <Row>
          <Cell>
            <div className="text-sm font-medium">Saving Rate</div>
          </Cell>
          <Cell>
            <div className="text-sm font-medium">Retirement Income</div>
          </Cell>
          <Cell>
            <div className="text-sm font-medium">Retirement Lifestyle</div>
          </Cell>
        </Row>

        {/* Rows 2-4: three cells each */}
        {(rows || []).map((r, idx) => (
          <Row key={idx} className="border-t border-black/10 dark:border-white/10">
            <Cell>
              <div className="text-[23px] font-medium">{r?.savingRate}</div>
              <div className="text-xs text-black/90 mt-0.5">of your current gross income</div>
            </Cell>
            <Cell className="border-l border-r border-black/10 dark:border-white/10">
              <div className="text-[23px] font-medium">{r?.income}</div>
              <div className="text-xs text-black/90 mt-0.5">Annually</div>
            </Cell>
            <Cell>
              <div className="text-[23px] font-medium">{r?.lifestyle}</div>
              <div className="text-xs text-black/90 mt-0.5">
                {idx === 0 ? "80% of your take home pay" : idx === 1 ? "100% of your take home pay" : "120% of your take home pay"}
              </div>
            </Cell>
          </Row>
        ))}
      </div>
    </div>
  );
}

// Auto-mount if a root element exists (safe no-op otherwise)
const el = document.getElementById("table-card-root");
if (el) {
  createRoot(el).render(
    <TableCard rows={mock?.rows} />
  );
}


