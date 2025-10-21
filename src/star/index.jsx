import React from "react";
import { createRoot } from "react-dom/client";
import "./star.css";

function App() {
  const [employerMatchEnabled, setEmployerMatchEnabled] = React.useState(true);

  return (
    <div className="mds-card" data-widget="star-retirement">
      <div className="mds-header">
        <div className="mds-title">starGPT • Retirement Estimator</div>
        <div className="mds-badge">ChatGPT-native UI</div>
      </div>

      <form id="star-form" className="mds-form">
        <div className="mds-field">
          <label className="mds-label" htmlFor="age">Current Age</label>
          <input id="age" className="mds-input" name="age" type="number" min="0" defaultValue={35} />
        </div>
        <div className="mds-field">
          <label className="mds-label" htmlFor="retirementAge">Retirement Age</label>
          <input id="retirementAge" className="mds-input" name="retirementAge" type="number" min="0" defaultValue={65} />
          <div className="mds-footnote">We\'ll mark this on the chart.</div>
        </div>
        <div className="mds-field">
          <label className="mds-label" htmlFor="annualSalary">Annual Salary (USD)</label>
          <input id="annualSalary" className="mds-input" name="annualSalary" type="text" inputMode="decimal" defaultValue="120000" />
        </div>
        <div className="mds-field">
          <label className="mds-label" htmlFor="currentSavings">Current Retirement Savings (USD)</label>
          <input id="currentSavings" className="mds-input" name="currentSavings" type="text" inputMode="decimal" defaultValue="50000" />
          <div className="mds-footnote">401(k), IRA, etc.</div>
        </div>
        <div className="mds-field">
          <label className="mds-label" htmlFor="annualContributionPct">Employee Contribution (% of salary)</label>
          <input id="annualContributionPct" className="mds-input" name="annualContributionPct" type="number" min="0" max="100" step="1" defaultValue={10} />
        </div>
        <div className="mds-field">
          <label className="mds-label" htmlFor="assumedAnnualReturnPct">Assumed Annual Return (%)</label>
          <input id="assumedAnnualReturnPct" className="mds-input" name="assumedAnnualReturnPct" type="number" min="0" max="20" step="0.5" defaultValue={6} />
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
        <div id="matchFields" style={{ display: employerMatchEnabled ? "contents" : "none" }}>
          <div className="mds-field">
            <label className="mds-label" htmlFor="matchUpToPct">Matches up to (% of salary)</label>
            <input id="matchUpToPct" className="mds-input" name="matchUpToPct" type="number" min="0" max="100" step="1" defaultValue={6} />
          </div>
          <div className="mds-field">
            <label className="mds-label" htmlFor="matchRatePct">Match Rate (%)</label>
            <input id="matchRatePct" className="mds-input" name="matchRatePct" type="number" min="0" max="200" step="1" defaultValue={5} />
          </div>
        </div>
      </form>

      <div className="mds-actions">
        {/* Apps SDK will wire this through the MCP tool; we also attach JS handler for local preview */}
        <button id="estimateBtn" className="mds-btn primary" data-call-tool="estimate_retirement" type="button">Estimate</button>
        <button id="resetBtn" className="mds-btn" type="button">Reset</button>
      </div>

      <div id="summary" className="mds-summary" aria-live="polite" aria-busy={false}></div>
      <div className="mds-chart hidden"><canvas id="chart"></canvas></div>

      <table id="table" className="mds-table" role="table" aria-label="Retirement projection table"></table>

      <div className="mds-footnote">
        Assumptions: annual compounding at end of year; contributions once per year; match applies to the smaller of employee % vs match-up-to %. Values are illustrative.
      </div>
    </div>
  );
}

createRoot(document.getElementById("star-root")).render(<App />);

export { App };
export default App;


