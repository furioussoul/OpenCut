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
	color = "ff00ff",
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

// ============ 示例组件 4: 金粉飘落 ============
interface GoldenDustProps {
	particleCount?: number;
	color?: string;
	speed?: number;
	__remotion_frame?: number;
}

// 使用确定性随机数生成器，确保每帧渲染结果一致
function seededRandom(seed: number): number {
	const x = Math.sin(seed * 9999) * 10000;
	return x - Math.floor(x);
}

interface Particle {
	x: number;
	y: number;
	size: number;
	speed: number;
	wobble: number;
	opacity: number;
	rotation: number;
}

function generateParticles(count: number): Particle[] {
	const particles: Particle[] = [];
	for (let i = 0; i < count; i++) {
		particles.push({
			x: seededRandom(i * 1) * 100,
			y: seededRandom(i * 2) * 100,
			size: seededRandom(i * 3) * 6 + 2,
			speed: seededRandom(i * 4) * 0.5 + 0.3,
			wobble: seededRandom(i * 5) * 2 - 1,
			opacity: seededRandom(i * 6) * 0.5 + 0.5,
			rotation: seededRandom(i * 7) * 360,
		});
	}
	return particles;
}

const GoldenDust: React.FC<GoldenDustProps> = ({
	particleCount = 50,
	color = "#FFD700",
	speed = 1,
	__remotion_frame = 0,
}) => {
	// 生成粒子（基于 particleCount，确定性）
	const particles = generateParticles(particleCount);

	return (
		<div
			style={{
				position: "relative",
				width: "100%",
				height: "100%",
				overflow: "hidden",
				pointerEvents: "none",
			}}
		>
			{particles.map((particle, i) => {
				// 计算当前帧的位置
				const time = __remotion_frame * 0.02 * speed;
				const yOffset = (time * particle.speed * 100) % 120;
				const xWobble = Math.sin(time * 2 + particle.wobble * 10) * 3;
				const currentY = ((particle.y + yOffset - 10) % 120) - 10;
				const currentX = particle.x + xWobble;
				const rotation =
					particle.rotation + __remotion_frame * particle.speed * 2;

				// 闪烁效果
				const twinkle = Math.sin(__remotion_frame * 0.1 + i) * 0.3 + 0.7;

				return (
					<div
						key={i}
						style={{
							position: "absolute",
							left: `${currentX}%`,
							top: `${currentY}%`,
							width: `${particle.size}px`,
							height: `${particle.size}px`,
							background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
							borderRadius: "50%",
							opacity: particle.opacity * twinkle,
							transform: `rotate(${rotation}deg)`,
							boxShadow: `0 0 ${particle.size * 2}px ${color}`,
						}}
					/>
				);
			})}
		</div>
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
			editableProps: [
				{
					key: "text",
					type: "string",
					label: "文字内容",
					defaultValue: "Hello World",
				},
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
				{
					key: "colorA",
					type: "color",
					label: "颜色A",
					defaultValue: "#ff6b6b",
				},
				{
					key: "colorB",
					type: "color",
					label: "颜色B",
					defaultValue: "#4ecdc4",
				},
			],
		},
	);

	registerRemotionComponent(
		"golden-dust",
		GoldenDust as React.FC<Record<string, unknown>>,
		{
			name: "金粉飘落",
			description: "闪闪发光的金色粒子从天而降",
			editableProps: [
				{
					key: "particleCount",
					type: "number",
					label: "粒子数量",
					defaultValue: 50,
					min: 10,
					max: 200,
					step: 10,
				},
				{
					key: "color",
					type: "color",
					label: "颜色",
					defaultValue: "#FFD700",
				},
				{
					key: "speed",
					type: "number",
					label: "速度",
					defaultValue: 1,
					min: 0.1,
					max: 3,
					step: 0.1,
				},
			],
		},
	);

	console.log(
		"✨ Remotion 示例组件已注册: neon-text, spinning-box, gradient-bg, golden-dust",
	);
}
