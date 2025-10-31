import React from "react";
import { createRoot } from "react-dom/client";
import "../star/star.css";

// Currency formatting utilities
function currency(n) {
  return Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatCurrency(value) {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(num);
}

function parseCurrencyToNumber(str) {
  if (typeof str !== "string") return Number(str);
  const cleaned = str.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function App() {
  // Form state
  const [annualIncome, setAnnualIncome] = React.useState(80000);
  const [monthlyDebt, setMonthlyDebt] = React.useState(0);
  const [creditScore, setCreditScore] = React.useState(715);
  const [downPayment, setDownPayment] = React.useState(20000);
  const [showAssumptions, setShowAssumptions] = React.useState(false);

  // Calculated values
  const pricePoint = React.useMemo(() => {
    // Simplified home affordability calculation
    // Rule of thumb: home price = (annual income * 3) + down payment - (monthly debt * 12 * 5)
    const basePrice = annualIncome * 3;
    const debtImpact = monthlyDebt * 12 * 5; // 5 years of debt payments
    const affordablePrice = basePrice + downPayment - debtImpact;
    return Math.max(0, Math.round(affordablePrice));
  }, [annualIncome, monthlyDebt, downPayment]);

  const monthlyPayment = React.useMemo(() => {
    // Estimate monthly payment (28% of gross monthly income is typical)
    const monthlyIncome = annualIncome / 12;
    const payment = Math.round(monthlyIncome * 0.28);
    return payment;
  }, [annualIncome]);

  const handleReset = () => {
    setAnnualIncome(80000);
    setMonthlyDebt(0);
    setCreditScore(715);
    setDownPayment(20000);
    setShowAssumptions(false);
  };

  return (
    <div className="mds-card" style={{ maxWidth: "800px", margin: "20px auto" }}>
      <div className="mds-header">
        <div>
          <div className="mds-title">RetireAbility Calculator</div>
        </div>
      </div>

      {/* Price Point Display */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "32px", fontWeight: "700", marginBottom: "16px" }}>
          Price Point: {currency(pricePoint)}
        </div>

        {/* Slider */}
        <div style={{ position: "relative", marginBottom: "12px" }}>
          <input
            type="range"
            min="0"
            max="300000"
            step="1000"
            value={annualIncome}
            onChange={(e) => setAnnualIncome(Number(e.target.value))}
            style={{
              width: "100%",
              height: "6px",
              borderRadius: "3px",
              background: `linear-gradient(to right, #000 0%, #000 ${(annualIncome / 300000) * 100}%, #e0e0e0 ${(annualIncome / 300000) * 100}%, #e0e0e0 100%)`,
              outline: "none",
              WebkitAppearance: "none",
              appearance: "none",
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: white;
              cursor: pointer;
              border: 2px solid #ddd;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            input[type="range"]::-moz-range-thumb {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: white;
              cursor: pointer;
              border: 2px solid #ddd;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            @media (prefers-color-scheme: dark) {
              input[type="range"] {
                background: linear-gradient(to right, #fff 0%, #fff ${(annualIncome / 300000) * 100}%, #444 ${(annualIncome / 300000) * 100}%, #444 100%) !important;
              }
            }
          `}</style>
        </div>

        {/* Monthly Payment Display */}
        <div style={{ fontSize: "16px", marginTop: "16px" }}>
          I'm comfortable spending <span style={{
            fontWeight: "600",
            borderBottom: "2px solid currentColor"
          }}>{currency(monthlyPayment)}</span> per month
        </div>
      </div>

      {/* Assumptions Section */}
      <div>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px"
        }}>
          <div style={{ fontSize: "16px", fontWeight: "600" }}>Assumptions</div>
          <button
            className="mds-btn"
            style={{
              minHeight: "32px",
              padding: "6px 12px",
              fontSize: "14px"
            }}
            onClick={() => setShowAssumptions(!showAssumptions)}
          >
            {showAssumptions ? "Reset" : "Edit"}
          </button>
        </div>

        {!showAssumptions ? (
          // Collapsed view
          <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
            <div>{currency(annualIncome)} income · {currency(downPayment)} down payment</div>
            <div>{currency(monthlyDebt)}/mo debt · {creditScore} credit score</div>
          </div>
        ) : (
          // Expanded form view
          <form className="mds-form" style={{
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "16px"
          }}>
            <div className="mds-field">
              <label className="mds-label" htmlFor="annualIncome">Annual income</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--muted)"
                }}>$</span>
                <input
                  id="annualIncome"
                  className="mds-input"
                  type="text"
                  inputMode="numeric"
                  value={formatCurrency(annualIncome)}
                  onChange={(e) => setAnnualIncome(parseCurrencyToNumber(e.target.value))}
                  style={{ paddingLeft: "24px" }}
                />
              </div>
            </div>

            <div className="mds-field">
              <label className="mds-label" htmlFor="monthlyDebt">Monthly debt</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--muted)"
                }}>$</span>
                <input
                  id="monthlyDebt"
                  className="mds-input"
                  type="text"
                  inputMode="numeric"
                  value={formatCurrency(monthlyDebt)}
                  onChange={(e) => setMonthlyDebt(parseCurrencyToNumber(e.target.value))}
                  style={{ paddingLeft: "24px" }}
                />
              </div>
            </div>

            <div className="mds-field">
              <label className="mds-label" htmlFor="creditScore">Credit score</label>
              <input
                id="creditScore"
                className="mds-input"
                type="number"
                min="300"
                max="850"
                value={creditScore}
                onChange={(e) => setCreditScore(Number(e.target.value))}
              />
            </div>

            <div className="mds-field">
              <label className="mds-label" htmlFor="downPayment">Down payment</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--muted)"
                }}>$</span>
                <input
                  id="downPayment"
                  className="mds-input"
                  type="text"
                  inputMode="numeric"
                  value={formatCurrency(downPayment)}
                  onChange={(e) => setDownPayment(parseCurrencyToNumber(e.target.value))}
                  style={{ paddingLeft: "24px" }}
                />
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
              <button
                type="button"
                className="mds-btn primary"
                onClick={() => setShowAssumptions(false)}
                style={{ width: "100%" }}
              >
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const el = document.getElementById("star-form-root");
if (el) {
  createRoot(el).render(<App />);
}

export { App };
export default App;