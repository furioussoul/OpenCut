/**
 * Component: GoldenDust
 * Description: 金色粒子飘落特效
 * Duration: 8
 */
import {
	AbsoluteFill,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	random,
} from "remotion";

// 使用 Remotion 的 random() 生成稳定的随机值
const particles = Array.from({ length: 50 }, (_, i) => ({
	id: i,
	x: random(`x-${i}`) * 100,
	delay: random(`delay-${i}`) * 60,
	size: 4 + random(`size-${i}`) * 8,
	speed: 0.5 + random(`speed-${i}`) * 1.5,
	opacity: 0.3 + random(`opacity-${i}`) * 0.7,
}));

export default function GoldenDust() {
	const frame = useCurrentFrame();
	const { height, durationInFrames, width } = useVideoConfig();

	// DEBUG: Log values to verify hooks work
	console.log(
		"[GoldenDust] frame:",
		frame,
		"height:",
		height,
		"durationInFrames:",
		durationInFrames,
		"width:",
		width,
	);

	return (
		<AbsoluteFill style={{ backgroundColor: "transparent" }}>
			{/* DEBUG: Simple visible test element */}
			<div
				style={{
					position: "absolute",
					top: 50,
					left: 50,
					width: 200,
					height: 100,
					backgroundColor: "red",
					color: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: 24,
					fontWeight: "bold",
					zIndex: 1000,
				}}
			>
				Frame: {frame}
			</div>
			{particles.map((particle) => {
				const adjustedFrame = Math.max(0, frame - particle.delay);
				const y =
					interpolate(
						adjustedFrame,
						[0, durationInFrames],
						[-50, height + 50],
						{ extrapolateRight: "clamp" },
					) * particle.speed;
				const shimmer = Math.sin(frame * 0.1 + particle.id) * 0.3 + 0.7;
				return (
					<div
						key={particle.id}
						style={{
							position: "absolute",
							left: `${particle.x}%`,
							top: y,
							width: particle.size,
							height: particle.size,
							borderRadius: "50%",
							background: `radial-gradient(circle, rgba(255,215,0,${particle.opacity * shimmer}) 0%, rgba(255,180,0,0) 70%)`,
							boxShadow: `0 0 ${particle.size * 2}px rgba(255,215,0,${particle.opacity * 0.5})`,
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
}
