/**
 * 示例 Remotion 组件集合
 * 这些组件可以在预览区实时渲染和编辑
 */
import type React from "react";
import { registerRemotionComponent } from "./registry";

// ============ 示例组件 1: 霓虹文字 ============
interface NeonTextProps {
	text?: string;
	color?: string;
	fontSize?: number;
	__remotion_frame?: number;
}

const NeonText: React.FC<NeonTextProps> = ({
	text = "Hello World",
	color = "#ff00ff",
	fontSize = 48,
	__remotion_frame = 0,
}) => {
	// 简单的呼吸动画效果
	const pulse = Math.sin(__remotion_frame * 0.1) * 0.3 + 1;

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: "100%",
				height: "100%",
				fontFamily: "Arial, sans-serif",
				fontSize: `${fontSize}px`,
				fontWeight: "bold",
				color: color,
				textShadow: `
          0 0 ${10 * pulse}px ${color},
          0 0 ${20 * pulse}px ${color},
          0 0 ${30 * pulse}px ${color},
          0 0 ${40 * pulse}px ${color}
        `,
				transform: `scale(${pulse})`,
				transition: "transform 0.1s ease-out",
			}}
		>
			{text}
		</div>
	);
};

// ============ 示例组件 2: 旋转方块 ============
interface SpinningBoxProps {
	color?: string;
	size?: number;
	__remotion_frame?: number;
}

const SpinningBox: React.FC<SpinningBoxProps> = ({
	color = "#00ffff",
	size = 100,
	__remotion_frame = 0,
}) => {
	const rotation = __remotion_frame * 3;

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: "100%",
				height: "100%",
			}}
		>
			<div
				style={{
					width: `${size}px`,
					height: `${size}px`,
					backgroundColor: color,
					borderRadius: "12px",
					transform: `rotate(${rotation}deg)`,
					boxShadow: `0 0 20px ${color}`,
				}}
			/>
		</div>
	);
};

// ============ 示例组件 3: 渐变背景 ============
interface GradientBackgroundProps {
	colorA?: string;
	colorB?: string;
	__remotion_frame?: number;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({
	colorA = "#ff6b6b",
	colorB = "#4ecdc4",
	__remotion_frame = 0,
}) => {
	const angle = __remotion_frame * 2;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				background: `linear-gradient(${angle}deg, ${colorA}, ${colorB})`,
			}}
		/>
	);
};

// ============ 注册所有示例组件 ============
export function registerSampleComponents() {
	registerRemotionComponent(
		"neon-text",
		NeonText as React.FC<Record<string, unknown>>,
		{
			name: "霓虹文字",
			description: "带有发光效果的动态文字",
			supportsInternalEditing: true,
			editableProps: [
				{ key: "text", type: "string", label: "文字内容", defaultValue: "Hello World" },
				{ key: "color", type: "color", label: "颜色", defaultValue: "#ff00ff" },
				{ key: "fontSize", type: "number", label: "字号", defaultValue: 48 },
			],
		},
	);

	registerRemotionComponent(
		"spinning-box",
		SpinningBox as React.FC<Record<string, unknown>>,
		{
			name: "旋转方块",
			description: "一个不断旋转的发光方块",
			editableProps: [
				{ key: "color", type: "color", label: "颜色", defaultValue: "#00ffff" },
				{ key: "size", type: "number", label: "大小", defaultValue: 100 },
			],
		},
	);

	registerRemotionComponent(
		"gradient-bg",
		GradientBackground as React.FC<Record<string, unknown>>,
		{
			name: "渐变背景",
			description: "动态旋转的渐变背景",
			editableProps: [
				{ key: "colorA", type: "color", label: "颜色A", defaultValue: "#ff6b6b" },
				{ key: "colorB", type: "color", label: "颜色B", defaultValue: "#4ecdc4" },
			],
		},
	);

	console.log("✨ Remotion 示例组件已注册: neon-text, spinning-box, gradient-bg");
}
