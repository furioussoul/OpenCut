/**
 * Component: TextReveal
 * Description: 文字逐字显现动画
 * Duration: 5
 */
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export default function TextReveal() {
  const frame = useCurrentFrame();
  const text = "Hello OpenCut!";

  return (
    <AbsoluteFill style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {text.split("").map((char, i) => {
          const delay = i * 3;
          const opacity = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y = interpolate(frame - delay, [0, 10], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <span key={i} style={{ fontSize: 72, fontWeight: "bold", color: "#fff", opacity, transform: `translateY(${y}px)`, textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
              {char === " " ? "\u00A0" : char}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}