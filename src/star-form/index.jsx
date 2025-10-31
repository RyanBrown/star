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
  const [age, setAge] = React.useState(40);
  const [income, setIncome] = React.useState(100000);
  const [savingsPerPaycheck, setSavingsPerPaycheck] = React.useState(500);
  const [retirementAge, setRetirementAge] = React.useState(65);
  const [showAssumptions, setShowAssumptions] = React.useState(false);

  // Calculated values
  const pricePoint = React.useMemo(() => {
    // Simplified retirement savings calculation
    const yearsToRetirement = retirementAge - age;
    const paychecksPerYear = 26; // bi-weekly
    const annualSavings = savingsPerPaycheck * paychecksPerYear;
    const totalSavings = annualSavings * yearsToRetirement;
    // Simple projection without growth
    return Math.max(0, Math.round(totalSavings));
  }, [age, savingsPerPaycheck, retirementAge]);

  const monthlyPayment = React.useMemo(() => {
    // Monthly contribution based on bi-weekly savings
    const paychecksPerYear = 26;
    const annualSavings = savingsPerPaycheck * paychecksPerYear;
    const monthlyContribution = Math.round(annualSavings / 12);
    return monthlyContribution;
  }, [savingsPerPaycheck]);

  const handleReset = () => {
    setAge(40);
    setIncome(100000);
    setSavingsPerPaycheck(500);
    setRetirementAge(65);
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
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            style={{
              width: "100%",
              height: "6px",
              borderRadius: "3px",
              background: `linear-gradient(to right, #000 0%, #000 ${(income / 300000) * 100}%, #e0e0e0 ${(income / 300000) * 100}%, #e0e0e0 100%)`,
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
                background: linear-gradient(to right, #fff 0%, #fff ${(income / 300000) * 100}%, #444 ${(income / 300000) * 100}%, #444 100%) !important;
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
            <div>Age {age} · Income {currency(income)}</div>
            <div>Savings per paycheck {currency(savingsPerPaycheck)} · Retirement age {retirementAge}</div>
          </div>
        ) : (
          // Expanded form view
          <form className="mds-form" style={{
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "16px"
          }}>
            <div className="mds-field">
              <label className="mds-label" htmlFor="age">Age</label>
              <input
                id="age"
                className="mds-input"
                type="number"
                min="18"
                max="100"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
              />
            </div>

            <div className="mds-field">
              <label className="mds-label" htmlFor="income">Income</label>
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
                  id="income"
                  className="mds-input"
                  type="text"
                  inputMode="numeric"
                  value={formatCurrency(income)}
                  onChange={(e) => setIncome(parseCurrencyToNumber(e.target.value))}
                  style={{ paddingLeft: "24px" }}
                />
              </div>
            </div>

            <div className="mds-field">
              <label className="mds-label" htmlFor="savingsPerPaycheck">Savings per paycheck</label>
              <input
                id="savingsPerPaycheck"
                className="mds-input"
                type="number"
                min="0"
                step="50"
                value={savingsPerPaycheck}
                onChange={(e) => setSavingsPerPaycheck(Number(e.target.value))}
              />
            </div>

            <div className="mds-field">
              <label className="mds-label" htmlFor="retirementAge">Retirement Age</label>
              <input
                id="retirementAge"
                className="mds-input"
                type="number"
                min="50"
                max="100"
                value={retirementAge}
                onChange={(e) => setRetirementAge(Number(e.target.value))}
              />
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