/**
 * Component: GoldenDust
 * Description: 金色粒子飘落特效
 * Duration: 8
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function GoldenDust() {
  const frame = useCurrentFrame();
  const { height, durationInFrames } = useVideoConfig();

  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 60,
    size: 4 + Math.random() * 8,
    speed: 0.5 + Math.random() * 1.5,
    opacity: 0.3 + Math.random() * 0.7,
  }));

  return (
    <AbsoluteFill>
      {particles.map((particle) => {
        const adjustedFrame = Math.max(0, frame - particle.delay);
        const y = interpolate(adjustedFrame, [0, durationInFrames], [-50, height + 50], { extrapolateRight: "clamp" }) * particle.speed;
        const shimmer = Math.sin(frame * 0.1 + particle.id) * 0.3 + 0.7;
        return (
          <div key={particle.id} style={{
            position: "absolute",
            left: `${particle.x}%`,
            top: y,
            width: particle.size,
            height: particle.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(255,215,0,${particle.opacity * shimmer}) 0%, rgba(255,180,0,0) 70%)`,
            boxShadow: `0 0 ${particle.size * 2}px rgba(255,215,0,${particle.opacity * 0.5})`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
}