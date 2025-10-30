import React from "react";
import { createRoot } from "react-dom/client";
import TableCard from "../table-card";
import LineGraph from "../line-graph";

function TableGraph({ rows }) {
  return (
    <div className="antialiased w-full text-black">
      <div className="flex flex-col gap-4">
        <TableCard rows={rows} />
        <div className="rounded-2xl sm:rounded-3xl border border-black/10 dark:border-white/10 overflow-hidden">
          <LineGraph />
        </div>
      </div>
    </div>
  );
}

export default TableGraph;

const el = document.getElementById("table-graph-root");
if (el) {
  createRoot(el).render(<TableGraph />);
}


