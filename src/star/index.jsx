import React from "react";
import { createRoot } from "react-dom/client";
import "./star.css";

/**
 * @typedef {Object} Point
 * @property {number} year
 * @property {number} age
 * @property {number} startBalance
 * @property {number} employeeContribution
 * @property {number} employerMatch
 * @property {number} growth
 * @property {number} endBalance
 */

/**
 * @typedef {Object} Summary
 * @property {number} years
 * @property {number} endingBalance
 * @property {number} totalEmployeeContrib
 * @property {number} totalEmployerMatch
 */

// Minimal utilities for currency formatting and canvas chart rendering
function currency(n) {
  return Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatCurrencyUSD2(value) {
  // Return empty string for non-numeric inputs so empty fields stay blank
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function parseCurrencyToNumber(str) {
  // Strip formatting (e.g., $, commas) and parse to number; fallback to 0
  if (typeof str !== "string") return Number(str);
  const cleaned = str.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Point[]} series
 */
function drawChart(canvas, series) {
  // Simple line chart using CSS variables for theme-aware colors
  const ctx = canvas.getContext("2d");
  const w = (canvas.width = canvas.clientWidth);
  const h = (canvas.height = canvas.clientHeight);

  ctx.clearRect(0, 0, w, h);

  const padding = 28;
  const ys = series.map((p) => p.endBalance);
  const minY = 0;
  const maxY = Math.max(...ys, 1) * 1.05;

  const styles = getComputedStyle(document.documentElement);
  const gridColor = styles.getPropertyValue("--grid")?.trim() || "#e5e5e5";
  const accentColor = styles.getPropertyValue("--accent")?.trim() || "#10a37f";

  // grid
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + ((h - 2 * padding) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(w - padding, y);
    ctx.stroke();
  }

  // line
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < series.length; i++) {
    const t = i / Math.max(series.length - 1, 1);
    const x = padding + t * (w - 2 * padding);
    const yVal = series[i].endBalance;
    const y = h - padding - ((yVal - minY) / (maxY - minY)) * (h - 2 * padding);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function App() {
  // Form state (defaults unset/blank; blanks coerce to 0 when building payload)
  const [age, setAge] = React.useState("");
  const [retirementAge, setRetirementAge] = React.useState("");
  const [annualSalaryInput, setAnnualSalaryInput] = React.useState("");
  const [currentSavingsInput, setCurrentSavingsInput] = React.useState("");
  const [annualContributionPct, setAnnualContributionPct] = React.useState("");
  const [assumedAnnualReturnPct, setAssumedAnnualReturnPct] = React.useState("");
  const [employerMatchEnabled, setEmployerMatchEnabled] = React.useState(true);
  const [matchUpToPct, setMatchUpToPct] = React.useState("");
  const [matchRatePct, setMatchRatePct] = React.useState("");

  // Results state
  /** @type {[Point[], React.Dispatch<React.SetStateAction<Point[]>>]} */
  const [rows, setRows] = React.useState([]);
  /** @type {[Summary|null, React.Dispatch<React.SetStateAction<Summary|null>>]} */
  const [summary, setSummary] = React.useState(null);
  const [isEstimating, setIsEstimating] = React.useState(false);
  /** @type {[ReturnType<typeof buildPayloadFromForm>|null, React.Dispatch<React.SetStateAction<ReturnType<typeof buildPayloadFromForm>|null>>]} */
  const [lastEstimated, setLastEstimated] = React.useState(null);

  // Canvas ref
  /** @type {React.MutableRefObject<HTMLCanvasElement|null>} */
  const canvasRef = React.useRef(null);

  function fillDefaults() {
    // Populate sample inputs for quick testing
    setAge("35");
    setRetirementAge("65");
    setAnnualSalaryInput(formatCurrencyUSD2(120000));
    setCurrentSavingsInput(formatCurrencyUSD2(50000));
    setAnnualContributionPct("10");
    setAssumedAnnualReturnPct("6");
    setEmployerMatchEnabled(true);
    setMatchUpToPct("6");
    setMatchRatePct("5");
  }

  // Hydrate from Apps host payload if present (ChatGPT Developer Mode)
  React.useEffect(() => {
    const incoming = window.OPENAI_WIDGET_DATA || null;
    if (incoming && incoming.points && incoming.summary) {
      setSummary(incoming.summary);
      setRows(Array.isArray(incoming.points) ? incoming.points : []);
      // Best-effort: ping storage
      try {
        fetch("/storage/estimates", { method: "GET" });
      } catch { }
      // Establish baseline so button shows Re-estimate after edits
      try {
        setLastEstimated(buildPayloadFromForm());
      } catch { }
    }
  }, []);

  // Redraw the chart whenever the data rows change
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (rows && rows.length > 0) {
      drawChart(canvas, rows);
    } else {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [rows]);

  /**
   * @returns {{
   *   age: number;
   *   retirementAge: number;
   *   annualSalary: number;
   *   currentSavings: number;
   *   annualContributionPct: number;
   *   employerMatch: boolean;
   *   matchUpToPct: number;
   *   matchRatePct: number;
   *   assumedAnnualReturnPct: number;
   * }}
   */
  function buildPayloadFromForm() {
    // Convert UI strings to numbers; interpret percentages as fractions
    return {
      age: Number(age) || 0,
      retirementAge: Number(retirementAge) || 0,
      annualSalary: parseCurrencyToNumber(annualSalaryInput),
      currentSavings: parseCurrencyToNumber(currentSavingsInput),
      annualContributionPct: (Number(annualContributionPct) || 0) / 100,
      employerMatch: !!employerMatchEnabled,
      matchUpToPct: (Number(matchUpToPct) || 0) / 100,
      matchRatePct: (Number(matchRatePct) || 0) / 100,
      assumedAnnualReturnPct: (Number(assumedAnnualReturnPct) || 0) / 100,
    };
  }

  async function handleEstimate() {
    // In ChatGPT, the Apps host handles this via data-call-tool; skip local fetch
    if (window.OPENAI_WIDGET_DATA) return;

    setIsEstimating(true);
    const payload = buildPayloadFromForm();
    try {
      // Local preview endpoint for running outside ChatGPT
      const res = await fetch("http://localhost:8787/mock-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setSummary(json.summary || null);
      setRows(Array.isArray(json.points) ? json.points : []);
      setLastEstimated(payload);
      try {
        // Best-effort preference save; non-fatal
        fetch("/storage/prefs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastInputs: payload }),
        });
      } catch { }
    } catch {
      alert(
        "Local preview endpoint not running. Start the dev server to test, or connect via Apps SDK."
      );
    } finally {
      setIsEstimating(false);
    }
  }

  function handleReset() {
    // Clear results and reset all fields except age and retirement age
    setRows([]);
    setSummary(null);
    setAnnualSalaryInput("");
    setCurrentSavingsInput("");
    setAnnualContributionPct("");
    setAssumedAnnualReturnPct("");
    setEmployerMatchEnabled(false);
    setMatchUpToPct("");
    setMatchRatePct("");
    setLastEstimated(null);
  }

  // Currency input helpers
  /**
   * @param {string} value
   * @param {(next: string) => void} setValue
   */
  function onCurrencyBlur(value, setValue) {
    // Format valid numbers; keep empty string if user cleared the input
    const n = parseCurrencyToNumber(value);
    setValue(n || n === 0 ? formatCurrencyUSD2(n) : "");
  }

  return (
    <div className="mds-card" data-widget="star-retirement">
      <div className="mds-header">
        <div className="mds-title" id="star-title">Retirement Estimator</div>
        <div className="flex items-center gap-2">
          <div className="mds-badge">ChatGPT-native UI</div>
          <button
            type="button"
            className="inline-flex items-center rounded-full bg-[#F46C21] text-white px-2.5 py-1 text-xs font-medium ring ring-black/5 hover:opacity-90 active:opacity-100"
            onClick={fillDefaults}
          >
            Fill defaults
          </button>
        </div>
      </div>

      <form id="star-form" className="mds-form" aria-labelledby="star-title" onSubmit={(e) => e.preventDefault()}>
        <div className="mds-field">
          <label className="mds-label" htmlFor="age">Current Age</label>
          <input
            id="age"
            className="mds-input"
            name="age"
            type="number"
            min="0"
            placeholder="e.g., 35"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <div className="mds-field">
          <label className="mds-label" htmlFor="retirementAge">Retirement Age</label>
          <input
            id="retirementAge"
            className="mds-input"
            name="retirementAge"
            type="number"
            min="0"
            placeholder="e.g., 65"
            value={retirementAge}
            onChange={(e) => setRetirementAge(e.target.value)}
            aria-describedby="retire-note"
          />
          <div className="mds-footnote" id="retire-note">We'll mark this on the chart.</div>
        </div>
        <div className="mds-field">
          <label className="mds-label" htmlFor="annualSalary">Annual Salary (USD)</label>
          <input
            id="annualSalary"
            className="mds-input"
            name="annualSalary"
            type="text"
            inputMode="decimal"
            placeholder="$120,000.00"
            value={annualSalaryInput}
            onChange={(e) => setAnnualSalaryInput(e.target.value)}
            onBlur={() => onCurrencyBlur(annualSalaryInput, setAnnualSalaryInput)}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
        <div className="mds-field">
          <label className="mds-label" htmlFor="currentSavings">Current Retirement Savings (USD)</label>
          <input
            id="currentSavings"
            className="mds-input"
            name="currentSavings"
            type="text"
            inputMode="decimal"
            placeholder="$50,000.00"
            value={currentSavingsInput}
            onChange={(e) => setCurrentSavingsInput(e.target.value)}
            onBlur={() => onCurrencyBlur(currentSavingsInput, setCurrentSavingsInput)}
            onFocus={(e) => e.currentTarget.select()}
            aria-describedby="savings-note"
          />
          <div className="mds-footnote" id="savings-note">401(k), IRA, etc.</div>
        </div>
        <div className="mds-field">
          <label className="mds-label" htmlFor="annualContributionPct">Employee Contribution (% of salary)</label>
          <input
            id="annualContributionPct"
            className="mds-input"
            name="annualContributionPct"
            type="number"
            min="0"
            max="100"
            step="1"
            placeholder="e.g., 10"
            value={annualContributionPct}
            onChange={(e) => setAnnualContributionPct(e.target.value)}
          />
        </div>
        <div className="mds-field">
          <label className="mds-label" htmlFor="assumedAnnualReturnPct">Assumed Annual Return (%)</label>
          <input
            id="assumedAnnualReturnPct"
            className="mds-input"
            name="assumedAnnualReturnPct"
            type="number"
            min="0"
            max="20"
            step="0.5"
            placeholder="e.g., 6"
            value={assumedAnnualReturnPct}
            onChange={(e) => setAssumedAnnualReturnPct(e.target.value)}
          />
        </div>

        <div className="mds-field" style={{ gridColumn: "span 3" }}>
          <div className="mds-switch-row">
            <label className="mds-toggle" htmlFor="employerMatch">
              <input
                className="mds-switch"
                id="employerMatch"
                name="employerMatch"
                type="checkbox"
                checked={employerMatchEnabled}
                onChange={(e) => setEmployerMatchEnabled(e.target.checked)}
              />
              <span className="mds-toggle-track"><span className="mds-toggle-thumb"></span></span>
              <span className="mds-toggle-text">Employer Match</span>
            </label>
          </div>
        </div>
        {employerMatchEnabled && (
          // Group employer match fields in a lightly elevated section
          <fieldset className="antialiased w-full text-black bg-black/3 dark:bg-white/3 rounded-lg p-3" aria-labelledby="employer-match-legend">
            <legend id="employer-match-legend" className="mds-label">Employer match options</legend>
            <div className="mds-field">
              <label className="mds-label" htmlFor="matchUpToPct">Matches up to (% of salary)</label>
              <input
                id="matchUpToPct"
                className="mds-input"
                name="matchUpToPct"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="e.g., 6"
                value={matchUpToPct}
                onChange={(e) => setMatchUpToPct(e.target.value)}
              />
            </div>
            <div className="mds-field">
              <label className="mds-label" htmlFor="matchRatePct">Match Rate (%)</label>
              <input
                id="matchRatePct"
                className="mds-input"
                name="matchRatePct"
                type="number"
                min="0"
                max="200"
                step="1"
                placeholder="e.g., 5"
                value={matchRatePct}
                onChange={(e) => setMatchRatePct(e.target.value)}
              />
            </div>
          </fieldset>
        )}
      </form>

      <div className="mds-actions">
        <button
          id="estimateBtn"
          className="mds-btn primary"
          data-call-tool="estimate_retirement"
          type="button"
          onClick={handleEstimate}
          disabled={isEstimating}
        >
          {lastEstimated && (JSON.stringify(buildPayloadFromForm()) !== JSON.stringify(lastEstimated)) ? "Re-estimate" : "Estimate"}
        </button>
        <button id="resetBtn" className="mds-btn" type="button" onClick={handleReset}>Reset</button>
      </div>

      <div id="summary" className="mds-summary" aria-live="polite" aria-busy={isEstimating}>
        {summary && (
          <>
            <div className="mds-kpi"><div className="k">Years to Retirement</div><div className="v">{summary.years}</div></div>
            <div className="mds-kpi"><div className="k">Ending Balance</div><div className="v">{currency(summary.endingBalance)}</div></div>
            <div className="mds-kpi"><div className="k">Employee Contributions</div><div className="v">{currency(summary.totalEmployeeContrib)}</div></div>
            <div className="mds-kpi"><div className="k">Employer Match</div><div className="v">{currency(summary.totalEmployerMatch)}</div></div>
          </>
        )}
      </div>

      <div className={"mds-chart " + (rows.length === 0 ? "hidden" : "")} aria-hidden={rows.length === 0}>
        <canvas id="chart" ref={canvasRef} role="img" aria-label="Retirement savings projection line chart"></canvas>
      </div>

      <table id="table" className="mds-table" role="table" aria-label="Retirement projection table">
        {rows.length > 0 && (
          <>
            <caption className="mds-footnote">Annual balances and contributions by year</caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Age</th>
                <th scope="col">Start</th>
                <th scope="col">Employee</th>
                <th scope="col">Employer</th>
                <th scope="col">Growth</th>
                <th scope="col">End</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.year}</td>
                  <td>{r.age}</td>
                  <td>{currency(r.startBalance)}</td>
                  <td>{currency(r.employeeContribution)}</td>
                  <td>{currency(r.employerMatch)}</td>
                  <td>{currency(r.growth)}</td>
                  <td>{currency(r.endBalance)}</td>
                </tr>
              ))}
            </tbody>
          </>
        )}
      </table>

      <div className="mds-footnote">
        Assumptions: annual compounding at end of year; contributions once per year; match applies to the smaller of employee % vs match-up-to %. Values are illustrative.
      </div>
    </div>
  );
}

createRoot(document.getElementById("star-root")).render(<App />);

export { App };
export default App;


