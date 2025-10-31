import React from "react";

/**
 * RangeSlider - A styled range input component with gradient progress indicator
 * 
 * @param {Object} props
 * @param {number} props.value - Current value of the slider
 * @param {function} props.onChange - Callback function when value changes
 * @param {number} props.min - Minimum value (default: 0)
 * @param {number} props.max - Maximum value (default: 100)
 * @param {number} props.step - Step increment (default: 1)
 * @param {string} props.progressColor - Color of the filled portion (default: "#000")
 * @param {string} props.trackColor - Color of the unfilled portion (default: "#e0e0e0")
 * @param {string} props.progressColorDark - Color of filled portion in dark mode (default: "#fff")
 * @param {string} props.trackColorDark - Color of unfilled portion in dark mode (default: "#444")
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 */
export function RangeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  progressColor = "#000",
  trackColor = "#e0e0e0",
  progressColorDark = "#fff",
  trackColorDark = "#444",
  className = "",
  style = {},
  ...rest
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  const sliderStyle = {
    width: "100%",
    height: "6px",
    borderRadius: "3px",
    background: `linear-gradient(to right, ${progressColor} 0%, ${progressColor} ${percentage}%, ${trackColor} ${percentage}%, ${trackColor} 100%)`,
    outline: "none",
    WebkitAppearance: "none",
    appearance: "none",
    cursor: "pointer",
    ...style,
  };

  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className={className}
        style={sliderStyle}
        {...rest}
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
        input[type="range"]::-webkit-slider-thumb:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        input[type="range"]::-moz-range-thumb:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        @media (prefers-color-scheme: dark) {
          input[type="range"] {
            background: linear-gradient(to right, ${progressColorDark} 0%, ${progressColorDark} ${percentage}%, ${trackColorDark} ${percentage}%, ${trackColorDark} 100%) !important;
          }
        }
      `}</style>
    </>
  );
}

export default RangeSlider;