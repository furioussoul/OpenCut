/**
 * Component: TestSimple
 * Description: 最简单的测试组件
 * Duration: 5
 */

export default function TestSimple() {
	// 完全不用任何 hooks，纯静态渲染
	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				backgroundColor: "rgba(255, 0, 0, 0.5)",
			}}
		>
			<h1
				style={{
					color: "white",
					fontSize: 72,
					textAlign: "center",
					marginTop: 100,
					textShadow: "3px 3px 6px black",
				}}
			>
				HELLO WORLD
			</h1>
			<p
				style={{
					color: "yellow",
					fontSize: 36,
					textAlign: "center",
				}}
			>
				如果你能看到这段文字，说明渲染正常
			</p>
		</div>
	);
}
