/**
 * 示例转场组件集合
 * 这些组件用于在视频片段之间创建平滑过渡效果
 */
import type React from "react";
import { registerTransitionComponent } from "./registry";

// ============ 缓动函数 ============

const easeInOut = (t: number): number => {
	return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
};

const easeOut = (t: number): number => {
	return 1 - (1 - t) ** 3;
};

const easeIn = (t: number): number => {
	return t * t * t;
};

// ============ 转场组件 1: 淡入淡出 ============

interface FadeTransitionProps {
	__transition_progress?: number;
	__transition_direction?: "in" | "out";
	color?: string;
}

const FadeTransition: React.FC<FadeTransitionProps> = ({
	__transition_progress = 0,
	__transition_direction = "in",
	color = "#000000",
}) => {
	// 入场：从不透明到透明；出场：从透明到不透明
	const opacity =
		__transition_direction === "in"
			? 1 - easeOut(__transition_progress)
			: easeIn(__transition_progress);

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				backgroundColor: color,
				opacity,
				pointerEvents: "none",
			}}
		/>
	);
};

// ============ 转场组件 2: 滑动 ============

interface SlideTransitionProps {
	__transition_progress?: number;
	__transition_direction?: "in" | "out";
	direction?: "left" | "right" | "up" | "down";
	color?: string;
}

const SlideTransition: React.FC<SlideTransitionProps> = ({
	__transition_progress = 0,
	__transition_direction = "in",
	direction = "left",
	color = "#000000",
}) => {
	const progress = easeInOut(__transition_progress);

	// 计算位置
	let translateX = "0%";
	let translateY = "0%";

	if (__transition_direction === "in") {
		// 入场：遮罩从屏幕移出
		switch (direction) {
			case "left":
				translateX = `${-progress * 100}%`;
				break;
			case "right":
				translateX = `${progress * 100}%`;
				break;
			case "up":
				translateY = `${-progress * 100}%`;
				break;
			case "down":
				translateY = `${progress * 100}%`;
				break;
		}
	} else {
		// 出场：遮罩移入屏幕
		switch (direction) {
			case "left":
				translateX = `${(1 - progress) * 100}%`;
				break;
			case "right":
				translateX = `${-(1 - progress) * 100}%`;
				break;
			case "up":
				translateY = `${(1 - progress) * 100}%`;
				break;
			case "down":
				translateY = `${-(1 - progress) * 100}%`;
				break;
		}
	}

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				backgroundColor: color,
				transform: `translate(${translateX}, ${translateY})`,
				pointerEvents: "none",
			}}
		/>
	);
};

// ============ 转场组件 3: 缩放 ============

interface ZoomTransitionProps {
	__transition_progress?: number;
	__transition_direction?: "in" | "out";
	color?: string;
}

const ZoomTransition: React.FC<ZoomTransitionProps> = ({
	__transition_progress = 0,
	__transition_direction = "in",
	color = "#000000",
}) => {
	const progress = easeInOut(__transition_progress);

	// 入场：从大到小消失；出场：从小到大出现
	const scale = __transition_direction === "in" ? 1 - progress : progress;
	const opacity = __transition_direction === "in" ? 1 - progress : progress;

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				backgroundColor: color,
				transform: `scale(${1 + scale * 0.5})`,
				opacity,
				pointerEvents: "none",
			}}
		/>
	);
};

// ============ 转场组件 4: 圆形擦除 ============

interface CircleWipeTransitionProps {
	__transition_progress?: number;
	__transition_direction?: "in" | "out";
	color?: string;
}

const CircleWipeTransition: React.FC<CircleWipeTransitionProps> = ({
	__transition_progress = 0,
	__transition_direction = "in",
	color = "#000000",
}) => {
	const progress = easeInOut(__transition_progress);

	// 圆形从中心向外扩展或收缩
	const radius =
		__transition_direction === "in"
			? progress * 150 // 入场：圆形扩大露出内容
			: (1 - progress) * 150; // 出场：圆形缩小遮挡内容

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				backgroundColor: color,
				clipPath: `circle(${radius}% at 50% 50%)`,
				pointerEvents: "none",
			}}
		/>
	);
};

// ============ 转场组件 5: 百叶窗 ============

interface BlindsTransitionProps {
	__transition_progress?: number;
	__transition_direction?: "in" | "out";
	color?: string;
	count?: number;
}

const BlindsTransition: React.FC<BlindsTransitionProps> = ({
	__transition_progress = 0,
	__transition_direction = "in",
	color = "#000000",
	count = 10,
}) => {
	const progress = easeInOut(__transition_progress);

	const blinds = [];
	const blindHeight = 100 / count;

	for (let i = 0; i < count; i++) {
		// 每个百叶窗条有略微不同的延迟
		const delay = i * 0.05;
		const blindProgress = Math.max(
			0,
			Math.min(1, (progress - delay) / (1 - delay * count * 0.5)),
		);

		const scaleY =
			__transition_direction === "in" ? 1 - blindProgress : blindProgress;

		blinds.push(
			<div
				key={i}
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					top: `${i * blindHeight}%`,
					height: `${blindHeight}%`,
					backgroundColor: color,
					transform: `scaleY(${scaleY})`,
					transformOrigin: "center",
				}}
			/>,
		);
	}

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				overflow: "hidden",
			}}
		>
			{blinds}
		</div>
	);
};

// ============ 转场组件 6: 模糊过渡 ============

interface BlurTransitionProps {
	__transition_progress?: number;
	__transition_direction?: "in" | "out";
	maxBlur?: number;
}

const BlurTransition: React.FC<BlurTransitionProps> = ({
	__transition_progress = 0,
	__transition_direction = "in",
	maxBlur = 20,
}) => {
	const progress = easeInOut(__transition_progress);

	// 入场：模糊减少；出场：模糊增加
	const blur =
		__transition_direction === "in"
			? maxBlur * (1 - progress)
			: maxBlur * progress;
	const opacity =
		__transition_direction === "in" ? 1 - progress * 0.3 : progress * 0.3;

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				backdropFilter: `blur(${blur}px)`,
				backgroundColor: `rgba(255, 255, 255, ${opacity})`,
				pointerEvents: "none",
			}}
		/>
	);
};

// ============ 转场组件 7: 闪白 ============

interface FlashTransitionProps {
	__transition_progress?: number;
	__transition_direction?: "in" | "out";
	color?: string;
}

const FlashTransition: React.FC<FlashTransitionProps> = ({
	__transition_progress = 0,
	__transition_direction = "in",
	color = "#ffffff",
}) => {
	// 快速闪烁效果
	let opacity: number;

	if (__transition_direction === "in") {
		// 入场：快速闪亮然后消失
		if (__transition_progress < 0.3) {
			opacity = easeOut(__transition_progress / 0.3);
		} else {
			opacity = 1 - easeIn((__transition_progress - 0.3) / 0.7);
		}
	} else {
		// 出场：渐亮然后保持
		if (__transition_progress < 0.7) {
			opacity = easeIn(__transition_progress / 0.7);
		} else {
			opacity = 1;
		}
	}

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				backgroundColor: color,
				opacity,
				pointerEvents: "none",
			}}
		/>
	);
};

// ============ 注册所有转场组件 ============

export function registerSampleTransitions() {
	registerTransitionComponent(
		"fade",
		FadeTransition as React.FC<Record<string, unknown>>,
		{
			name: "淡入淡出",
			description: "经典的透明度渐变过渡",
			transitionType: "both",
			defaultDuration: 0.5,
			editableProps: [
				{ key: "color", type: "color", label: "颜色", defaultValue: "#000000" },
			],
		},
	);

	registerTransitionComponent(
		"slide",
		SlideTransition as React.FC<Record<string, unknown>>,
		{
			name: "滑动",
			description: "画面从一侧滑入或滑出",
			transitionType: "both",
			defaultDuration: 0.5,
			editableProps: [
				{ key: "color", type: "color", label: "颜色", defaultValue: "#000000" },
			],
		},
	);

	registerTransitionComponent(
		"zoom",
		ZoomTransition as React.FC<Record<string, unknown>>,
		{
			name: "缩放",
			description: "画面缩放过渡效果",
			transitionType: "both",
			defaultDuration: 0.5,
			editableProps: [
				{ key: "color", type: "color", label: "颜色", defaultValue: "#000000" },
			],
		},
	);

	registerTransitionComponent(
		"circle-wipe",
		CircleWipeTransition as React.FC<Record<string, unknown>>,
		{
			name: "圆形擦除",
			description: "圆形从中心向外扩展的过渡",
			transitionType: "both",
			defaultDuration: 0.8,
			editableProps: [
				{ key: "color", type: "color", label: "颜色", defaultValue: "#000000" },
			],
		},
	);

	registerTransitionComponent(
		"blinds",
		BlindsTransition as React.FC<Record<string, unknown>>,
		{
			name: "百叶窗",
			description: "百叶窗式的条纹过渡",
			transitionType: "both",
			defaultDuration: 0.6,
			editableProps: [
				{ key: "color", type: "color", label: "颜色", defaultValue: "#000000" },
				{
					key: "count",
					type: "number",
					label: "条纹数量",
					defaultValue: 10,
					min: 3,
					max: 20,
				},
			],
		},
	);

	registerTransitionComponent(
		"blur",
		BlurTransition as React.FC<Record<string, unknown>>,
		{
			name: "模糊过渡",
			description: "画面模糊渐变效果",
			transitionType: "both",
			defaultDuration: 0.5,
			editableProps: [
				{
					key: "maxBlur",
					type: "number",
					label: "最大模糊",
					defaultValue: 20,
					min: 5,
					max: 50,
				},
			],
		},
	);

	registerTransitionComponent(
		"flash",
		FlashTransition as React.FC<Record<string, unknown>>,
		{
			name: "闪白",
			description: "快速闪光过渡效果",
			transitionType: "both",
			defaultDuration: 0.3,
			editableProps: [
				{ key: "color", type: "color", label: "颜色", defaultValue: "#ffffff" },
			],
		},
	);

	console.log(
		"✨ 转场组件已注册: fade, slide, zoom, circle-wipe, blinds, blur, flash",
	);
}
