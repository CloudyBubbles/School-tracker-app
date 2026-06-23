import React from "react";

interface Props {
  children: React.ReactNode;
  showLines?: boolean;
}

interface Drip {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  w: string;
  h: string;
}

interface Stain {
  top: string;
  right: string;
  left: string;
  bottom: string;
  width: string;
  height: string;
  rotate: string;
  ringAlpha: number;
  fillAlpha: number;
  innerInset: string;
  innerAlpha: number;
  drip: Drip | null;
}

const stains: Stain[] = [
  {
    top: "22px", right: "44px", left: "auto", bottom: "auto",
    width: "76px", height: "68px", rotate: "-11deg",
    ringAlpha: 0.30, fillAlpha: 0.05,
    innerInset: "9px", innerAlpha: 0.12,
    drip: { top: "auto", left: "52%", bottom: "-5px", w: "10px", h: "8px" },
  },
  {
    top: "auto", right: "auto", left: "14px", bottom: "72px",
    width: "56px", height: "60px", rotate: "7deg",
    ringAlpha: 0.24, fillAlpha: 0.04,
    innerInset: "7px", innerAlpha: 0.09,
    drip: { top: "3px", left: "auto", right: "8px", bottom: "auto", w: "7px", h: "6px" },
  },
  {
    top: "38%", right: "16px", left: "auto", bottom: "auto",
    width: "88px", height: "78px", rotate: "15deg",
    ringAlpha: 0.20, fillAlpha: 0.03,
    innerInset: "11px", innerAlpha: 0.08,
    drip: { top: "auto", left: "20%", bottom: "-6px", w: "9px", h: "7px" },
  },
  {
    top: "16px", right: "auto", left: "52px", bottom: "auto",
    width: "48px", height: "44px", rotate: "-4deg",
    ringAlpha: 0.22, fillAlpha: 0.035,
    innerInset: "5px", innerAlpha: 0.10,
    drip: null,
  },
];

export default function ParchmentPage({ children, showLines = false }: Props) {
  return (
    <div
      className="journal-page"
      style={{
        background: "var(--parchment)",
        position: "relative",
        minHeight: "100vh",
        boxShadow: "inset 0 0 30px rgba(140,100,60,0.06), inset 0 0 4px rgba(140,100,60,0.04)",
        overflow: "hidden",
      }}
    >
      {showLines && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(transparent 0px, transparent 28px, rgba(140,100,60,0.12) 28px, rgba(140,100,60,0.12) 29px)",
            pointerEvents: "none",
          }}
        />
      )}

      {stains.map((ring, i) => {
        const drip = ring.drip;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              borderRadius: "50% 46% 54% 48% / 47% 53% 49% 52%",
              border: `2px solid rgba(140,100,60,${ring.ringAlpha})`,
              background: `radial-gradient(ellipse at 45% 45%, rgba(140,100,60,${ring.fillAlpha}) 55%, rgba(140,100,60,${ring.fillAlpha * 1.5}) 72%, transparent 100%)`,
              width: ring.width,
              height: ring.height,
              top: ring.top,
              right: ring.right,
              bottom: ring.bottom,
              left: ring.left,
              transform: `rotate(${ring.rotate})`,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: ring.innerInset,
                borderRadius: "inherit",
                border: `1px solid rgba(140,100,60,${ring.innerAlpha})`,
              }}
            />
            {drip && (
              <div
                style={{
                  position: "absolute",
                  top: drip.top,
                  right: drip.right,
                  bottom: drip.bottom,
                  left: drip.left,
                  width: drip.w,
                  height: drip.h,
                  borderRadius: "50%",
                  background: `rgba(140,100,60,${ring.fillAlpha * 3})`,
                }}
              />
            )}
          </div>
        );
      })}

      <div style={{ position: "relative", zIndex: 10 }}>{children}</div>
    </div>
  );
}
