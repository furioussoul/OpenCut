/**
 * Component: TestSimple
 * Description: 最简单的测试组件
 * Duration: 5
 */
import { useCurrentFrame, useVideoConfig } from "remotion";

export default function TestSimple() {
	const frame = useCurrentFrame();
	const { fps, width, height } = useVideoConfig();

	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				backgroundColor: "rgba(255, 0, 0, 0.5)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				color: "white",
				fontWeight: "bold",
				textShadow: "2px 2px 4px black",
			}}
		>
			<div style={{ fontSize: 72 }}>Frame: {frame}</div>
			<div style={{ fontSize: 36, color: "yellow" }}>
				{width}x{height} @ {fps}fps
			</div>
		</div>
	);
}
