import React from "react";
import { createRoot } from "react-dom/client";
import { useOpenAiGlobal } from "../use-openai-global";
import { useMaxHeight } from "../use-max-height";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Morningstar Product-inspired brand tokens
const BRAND = {
  color: {
    // Primary Morningstar red (approx.) and supporting palette
    primary: "#D81E05",
    orange: "#F97316",
    amber: "#FDBA4D",
    surface: "#FFFFFF",
    text: "rgba(0,0,0,0.84)",
    subtext: "rgba(0,0,0,0.6)",
    grid: "rgba(0,0,0,0.08)",
    gridMajor: "rgba(0,0,0,0.16)",
    border: "rgba(0,0,0,0.12)",
  },
  strokeWidth: 2.5,
};

function futureValuesByAge({
  startAge = 35,
  endAge = 65,
  startSalary = 80000,
  contribRate = 0.05,
  growth = 0.07,
  salaryGrowth = 0.03,
}) {
  const labels = Array.from({ length: endAge - startAge + 1 }, (_, i) => startAge + i);
  let balance = 0;
  let salary = startSalary;
  const values = labels.map(() => {
    const yearlyContrib = salary * contribRate;
    balance = (balance + yearlyContrib) * (1 + growth);
    salary = salary * (1 + salaryGrowth);
    return balance;
  });
  return { labels, values };
}

function getDefaultData({
  startAge = 35,
  endAge = 65,
  contributionRates = [0.1, 0.15, 0.18],
} = {}) {
  const labels = Array.from({ length: endAge - startAge + 1 }, (_, i) => startAge + i);
  const palette = [BRAND.color.amber, BRAND.color.orange, BRAND.color.primary];
  const series = contributionRates.map((rate, idx) => {
    const r = typeof rate === "number" ? rate : Number(rate);
    const normalized = isFinite(r) ? (r > 1 ? r / 100 : r) : 0;
    const { values } = futureValuesByAge({ startAge, endAge, contribRate: normalized });
    const pct = Math.round((normalized || 0) * 100);
    return {
      name: `${pct}% contribution`,
      color: palette[idx % palette.length],
      values,
    };
  });
  return { labels, series };
}

function LineGraph({ labels, series, height = 420, title, subtitle, yTickStart, yTickStep, yMaxOverride }) {
  const padding = { top: 24, right: 24, bottom: 48, left: 64 };
  const width = 800; // the SVG viewBox width; the outer container will scale
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const [hover, setHover] = React.useState(null); // { si, i }

  const numPoints = labels.length;
  const minAge = Math.min(...labels);
  const maxAge = Math.max(...labels);
  const allValues = series.flatMap((s) => s.values);
  const minValue = 0;
  const maxValue = Math.max(...allValues);

  // Y range
  const yMin = Math.max(0, Math.floor(minValue));
  const yMax = Number.isFinite(yMaxOverride) && yMaxOverride > 0 ? yMaxOverride : Math.ceil(maxValue * 1.05);

  const xForAge = (age) => {
    if (maxAge === minAge) return innerWidth / 2;
    const t = (age - minAge) / (maxAge - minAge);
    return t * innerWidth;
  };
  const yForValue = (v) => {
    if (yMax === yMin) return innerHeight / 2;
    const t = (v - yMin) / (yMax - yMin);
    return innerHeight - t * innerHeight;
  };

  // Income ticks (dynamic with defaults)
  const yScaleFactor = yMax >= 1_000_000 ? 1_000_000 : 1;
  const incomeTickStart = Number.isFinite(yTickStart) ? yTickStart : 50_000;
  const incomeTickStep = Number.isFinite(yTickStep) && yTickStep > 0 ? yTickStep : 50_000;
  const yTickValues = [];
  for (let y = incomeTickStart; y <= yMax + 1e-6; y += incomeTickStep) {
    yTickValues.push(y);
  }

  // Fixed X ticks: 50k..300k evenly spaced
  const xTickValues = [50_000, 100_000, 150_000, 200_000, 250_000, 300_000];
  const xForTickIndex = (i) => {
    if (xTickValues.length <= 1) return 0;
    return (i / (xTickValues.length - 1)) * innerWidth;
  };

  function buildPath(values) {
    return values
      .map((v, i) => `${i === 0 ? "M" : "L"}${xForAge(labels[i])},${yForValue(v)}`)
      .join(" ");
  }

  function getPoint(si, i) {
    const s = series[si];
    const age = labels[i];
    const value = clamp(s.values[i], yMin, yMax);
    return {
      x: xForAge(age),
      y: yForValue(value),
      age,
      value: s.values[i],
      color: s.color,
      name: s.name,
    };
  }

  function buildBandPath(topValues, bottomValues) {
    const top = topValues.map((v) => clamp(v, yMin, yMax));
    const bot = bottomValues.map((v) => clamp(v, yMin, yMax));
    const parts = [];
    for (let i = 0; i < labels.length; i++) {
      const cmd = i === 0 ? "M" : "L";
      parts.push(`${cmd}${xForAge(labels[i])},${yForValue(top[i])}`);
    }
    for (let i = labels.length - 1; i >= 0; i--) {
      parts.push(`L${xForAge(labels[i])},${yForValue(bot[i])}`);
    }
    parts.push("Z");
    return parts.join(" ");
  }

  function buildFillToBaseline(values) {
    const clamped = values.map((v) => clamp(v, yMin, yMax));
    const parts = clamped.map((v, i) => `${i === 0 ? "M" : "L"}${xForAge(labels[i])},${yForValue(v)}`);
    const lastX = xForAge(labels[labels.length - 1]);
    const firstX = xForAge(labels[0]);
    parts.push(`L${lastX},${innerHeight}`);
    parts.push(`L${firstX},${innerHeight}`);
    parts.push("Z");
    return parts.join(" ");
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      role="img"
      aria-label="Line graph"
    >
      {/* Background */}
      <rect x="0" y="0" width={width} height={height} fill={BRAND.color.surface} />

      {/* Band gradients (between lines) */}
      <defs>
        {(() => {
          if (series.length < 2) return null;
          const order = series
            .map((s, si) => ({ si, avg: s.values.reduce((a, b) => a + b, 0) / Math.max(1, s.values.length) }))
            .sort((a, b) => a.avg - b.avg)
            .map((o) => o.si);
          const bottom = series[order[0]];
          const mid = series[order[1]];
          const top = series[order[2]];
          return (
            <>
              <linearGradient id="lg-band-top-mid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={top.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={top.color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lg-band-mid-bottom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={mid.color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={mid.color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lg-bottom-x" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={bottom.color} stopOpacity={0.14} />
                <stop offset="100%" stopColor={bottom.color} stopOpacity={0} />
              </linearGradient>
            </>
          );
        })()}
      </defs>

      {/* Plot area */}
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* Optional subtitle inside chart */}
        {subtitle && (
          <text x={innerWidth / 2} y={-6} textAnchor="middle" fill="rgba(0,0,0,0.8)" fontSize="18">
            {subtitle}
          </text>
        )}

        {/* Vertical grid lines for each year; stronger every 5 years */}
        {labels.map((age, i) => {
          const x = xForAge(age);
          const isMajor = age % 5 === 0 || i === 0 || i === labels.length - 1;
          return (
            <line
              key={`vgrid-${age}`}
              x1={x}
              x2={x}
              y1={0}
              y2={innerHeight}
              stroke={isMajor ? BRAND.color.gridMajor : BRAND.color.grid}
              strokeWidth={1}
            />
          );
        })}
        {/* Horizontal grid lines */}
        {yTickValues.map((tick) => {
          const y = yForValue(tick);
          return (
            <g key={`grid-${tick}`}>
              <line
                x1={0}
                x2={innerWidth}
                y1={y}
                y2={y}
                stroke={BRAND.color.grid}
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* Y axis labels */}
        {yTickValues.map((tick) => {
          const y = yForValue(tick);
          return (
            <text
              key={`ylabel-${tick}`}
              x={-8}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fill={BRAND.color.subtext}
              fontSize="10"
            >
              {yScaleFactor === 1 ? tick.toLocaleString() : (tick / yScaleFactor).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </text>
          );
        })}

        {/* y-axis scale indicator */}
        {yScaleFactor !== 1 && (
          <text x={-40} y={-10} textAnchor="start" fill={BRAND.color.subtext} fontSize="12">
            1e6
          </text>
        )}

        {/* X axis labels */}
        {labels.map((label, i) => {
          const x = xForAge(label);
          const y = innerHeight + 18;
          const isMajor = label % 5 === 0 || i === 0 || i === numPoints - 1;
          return (
            <text
              key={`xlabel-${i}`}
              x={x}
              y={y}
              textAnchor={i === 0 ? "start" : i === numPoints - 1 ? "end" : "middle"}
              fill={BRAND.color.subtext}
              fontSize="10"
            >
              {isMajor ? String(label) : ""}
            </text>
          );
        })}

        {/* Bands between lines (no overlap) */}
        {(() => {
          if (series.length < 2) return null;
          const order = series
            .map((s, si) => ({ si, avg: s.values.reduce((a, b) => a + b, 0) / Math.max(1, s.values.length) }))
            .sort((a, b) => a.avg - b.avg)
            .map((o) => o.si);
          const bottom = series[order[0]];
          const mid = series[order[1]];
          const top = series[order[2]];
          return (
            <g>
              <path d={buildBandPath(top.values, mid.values)} fill="url(#lg-band-top-mid)" stroke="none" />
              <path d={buildBandPath(mid.values, bottom.values)} fill="url(#lg-band-mid-bottom)" stroke="none" />
              {/* Bottom to x-axis fill */}
              <path d={buildFillToBaseline(bottom.values)} fill="url(#lg-bottom-x)" stroke="none" />
            </g>
          );
        })()}

        {/* Lines and points */}
        {series.map((s, si) => (
          <g key={s.name}>
            {/* eraser stroke: creates a ~2px no-fill band below the line */}
            <path
              d={buildPath(s.values.map((v) => clamp(v, yMin, yMax)))}
              fill="none"
              stroke={BRAND.color.surface}
              strokeWidth={BRAND.strokeWidth + 4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={buildPath(s.values.map((v) => clamp(v, yMin, yMax)))}
              fill="none"
              stroke={s.color}
              strokeWidth={BRAND.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.values.map((v, i) => (
              <circle
                key={`${s.name}-pt-${i}`}
                cx={xForAge(labels[i])}
                cy={yForValue(clamp(v, yMin, yMax))}
                r={2.5}
                fill={s.color}
                onMouseEnter={() => setHover({ si, i })}
                onFocus={() => setHover({ si, i })}
                onMouseLeave={() => setHover(null)}
                onBlur={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </g>
        ))}
      </g>

      {/* Legend below x-axis in a horizontal row (centered on plot) */}
      {(() => {
        const legendSpacing = 180;
        const startX = -((series.length - 1) * legendSpacing) / 2;
        const tx = padding.left + innerWidth / 2;
        const ty = padding.top + innerHeight + 28;
        return (
          <g transform={`translate(${tx},${ty})`}>
            {series.map((s, i) => (
              <g key={`legend-${s.name}`} transform={`translate(${startX + i * legendSpacing}, 0)`}>
                <line x1={-7} x2={7} y1={0} y2={0} stroke={s.color} strokeWidth={BRAND.strokeWidth} />
                <circle cx={0} cy={0} r={3.5} fill={s.color} />
                <text x={16} y={3} fill={BRAND.color.text} fontSize="12">
                  {s.name}
                </text>
              </g>
            ))}
          </g>
        );
      })()}

      {/* Tooltip (rendered above, relative to plot area) */}
      {hover && (() => {
        const p = getPoint(hover.si, hover.i);
        const tipW = 260;
        const tipH = 56;
        let tx = padding.left + p.x + 14;
        let ty = padding.top + p.y - tipH - 12;
        if (ty < padding.top) ty = padding.top + p.y + 12;
        if (tx + tipW > width - 8) tx = padding.left + p.x - tipW - 14;
        const ageLabel = String(p.age);
        const valLabel = p.value.toLocaleString(undefined, { maximumFractionDigits: 2 });
        return (
          <g key="tooltip" style={{ pointerEvents: "none" }}>
            {/* highlight point */}
            <g transform={`translate(${padding.left + p.x},${padding.top + p.y})`}>
              <circle r={5} fill={BRAND.color.surface} stroke={p.color} strokeWidth={2} />
            </g>
            {/* bubble */}
            <g transform={`translate(${tx},${ty})`}>
              <rect x={0} y={0} width={tipW} height={tipH} rx={10} fill="#111" opacity={0.95} />
              <text x={16} y={24} fill="#fff" fontSize="18" fontWeight={700}>{ageLabel}</text>
              <text x={16} y={40} fill="#cfcfcf" fontSize="14">
                {p.name}: {valLabel}
              </text>
            </g>
          </g>
        );
      })()}
    </svg>
  );
}

function App() {
  const displayMode = useOpenAiGlobal("displayMode");
  const maxHeight = useMaxHeight() ?? undefined;

  const widgetState =
    (typeof window !== "undefined" &&
      window.oai &&
      window.oai.widget &&
      window.oai.widget.state) || {};

  const { labels, series } = React.useMemo(() => {
    // Inputs from widget state (all optional)
    const xStartAge = Number.isFinite(Number(widgetState.xStartAge)) ? Number(widgetState.xStartAge) : 35;
    const xEndAge = Number.isFinite(Number(widgetState.xEndAge)) ? Number(widgetState.xEndAge) : 65;

    const contributionsRaw = Array.isArray(widgetState.contributions)
      ? widgetState.contributions
      : [10, 15, 18];
    const contributionRates = contributionsRaw
      .map((v) => (typeof v === "number" ? v : Number(v)))
      .filter((n) => Number.isFinite(n))
      .map((n) => (n > 1 ? n / 100 : n));
    const fallback = getDefaultData({ startAge: xStartAge, endAge: xEndAge, contributionRates });

    const userLabels = Array.isArray(widgetState.labels)
      ? widgetState.labels
      : fallback.labels;
    const userSeries = Array.isArray(widgetState.series) && widgetState.series.length > 0
      ? widgetState.series
      : fallback.series;
    return { labels: userLabels, series: userSeries };
  }, [widgetState]);

  const containerHeight = displayMode === "fullscreen" ? (maxHeight ? maxHeight - 40 : 480) : 480;

  const title =
    typeof widgetState.title === "string" && widgetState.title.trim().length
      ? widgetState.title
      : null;
  const subtitle =
    typeof widgetState.subtitle === "string" && widgetState.subtitle.trim().length
      ? widgetState.subtitle
      : null;

  return (
    <div style={{ maxHeight, height: containerHeight }}>
      <div className="w-full h-full">
        {title && (
          <div className="px-1 pb-2">
            <div className="text-xl sm:text-2xl font-semibold text-black">{title}</div>
          </div>
        )}
        <LineGraph
          labels={labels}
          series={series}
          height={Math.max(360, containerHeight - 24)}
          subtitle={subtitle ?? undefined}
          yTickStart={Number.isFinite(Number(widgetState.yTickStart)) ? Number(widgetState.yTickStart) : undefined}
          yTickStep={Number.isFinite(Number(widgetState.yTickStep)) ? Number(widgetState.yTickStep) : undefined}
          yMaxOverride={Number.isFinite(Number(widgetState.yMax)) ? Number(widgetState.yMax) : undefined}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById("line-graph-root")).render(<App />);

export { App };
export default App;


