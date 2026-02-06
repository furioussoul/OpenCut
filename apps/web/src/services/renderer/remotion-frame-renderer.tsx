import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type React from "react";
import html2canvas from "html2canvas";
import { getRemotionComponent } from "@/lib/remotion/registry";
import type { RemotionElement } from "@/types/timeline";

export interface FrameRenderResult {
	frameCache: Map<number, ImageBitmap>;
	totalFrames: number;
}

/**
 * 将 React Remotion 组件预渲染为帧缓存
 *
 * 工作流程：
 * 1. 创建一个离屏 DOM 容器
 * 2. 逐帧渲染 React 组件
 * 3. 使用 html2canvas 或 foreignObject 捕获为 ImageBitmap
 * 4. 存入 frameCache
 */
export async function prerenderRemotionFrames({
	element,
	fps,
	canvasSize,
	onProgress,
}: {
	element: RemotionElement;
	fps: number;
	canvasSize: { width: number; height: number };
	onProgress?: (progress: number) => void;
}): Promise<FrameRenderResult | null> {
	const Component = getRemotionComponent(element.componentId);
	if (!Component) {
		console.warn(`Remotion component not found: ${element.componentId}`);
		return null;
	}

	const totalFrames = Math.ceil(element.duration * fps);
	const frameCache = new Map<number, ImageBitmap>();

	console.log(`🔍 开始预渲染: ${element.componentId}, 帧数: ${totalFrames}, 尺寸: ${canvasSize.width}x${canvasSize.height}`);

	// 创建离屏容器
	const container = document.createElement("div");
	container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${canvasSize.width}px;
    height: ${canvasSize.height}px;
    overflow: hidden;
    pointer-events: none;
    background: transparent;
  `;
	document.body.appendChild(container);

	const root = createRoot(container);

	try {
		for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
			// 渲染当前帧
			await renderFrameToContainer({
				root,
				container,
				Component,
				element,
				frameIndex,
				fps,
				canvasSize,
			});

			// 捕获为 ImageBitmap
			const bitmap = await captureContainerToBitmap(container, canvasSize);
			if (bitmap) {
				frameCache.set(frameIndex, bitmap);
			}

			onProgress?.(frameIndex / totalFrames);
		}
	} finally {
		root.unmount();
		document.body.removeChild(container);
	}

	return { frameCache, totalFrames };
}

/**
 * 渲染单帧到容器
 */
async function renderFrameToContainer({
	root,
	container,
	Component,
	element,
	frameIndex,
	fps,
	canvasSize,
}: {
	root: Root;
	container: HTMLElement;
	Component: React.FC<Record<string, unknown>>;
	element: RemotionElement;
	frameIndex: number;
	fps: number;
	canvasSize: { width: number; height: number };
}): Promise<void> {
	return new Promise((resolve) => {
		const componentTime = element.trimStart + frameIndex / fps;

		root.render(
			<div
				style={{
					width: canvasSize.width,
					height: canvasSize.height,
					position: "relative",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					transform: `
            translate(${element.transform.position.x}px, ${element.transform.position.y}px)
            rotate(${element.transform.rotate}deg)
            scale(${element.transform.scale})
          `,
					opacity: element.opacity,
				}}
			>
				<Component
					{...element.props}
					__remotion_frame={frameIndex}
					__remotion_fps={fps}
					__remotion_duration={element.duration}
				/>
			</div>,
		);

		// 等待 React 渲染完成 + 额外帧延迟确保动画/CSS 生效
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	});
}

/**
 * 将 DOM 容器捕获为 ImageBitmap
 * 使用 html2canvas 库实现可靠的 DOM 截图
 */
async function captureContainerToBitmap(
	container: HTMLElement,
	canvasSize: { width: number; height: number },
): Promise<ImageBitmap | null> {
	try {
		// 使用 html2canvas 捕获 DOM
		const canvas = await html2canvas(container, {
			width: canvasSize.width,
			height: canvasSize.height,
			backgroundColor: null, // 透明背景
			logging: false,
			useCORS: true,
			scale: 1,
		});

		console.log(`🔍 捕获帧完成, canvas 尺寸: ${canvas.width}x${canvas.height}`);

		return createImageBitmap(canvas);
	} catch (error) {
		console.error("❌ 捕获帧失败:", error);
		return null;
	}
}

/**
 * 批量预渲染多个 Remotion 元素
 */
export async function prerenderAllRemotionElements({
	elements,
	fps,
	canvasSize,
	onProgress,
}: {
	elements: RemotionElement[];
	fps: number;
	canvasSize: { width: number; height: number };
	onProgress?: (progress: number, elementName: string) => void;
}): Promise<Map<string, Map<number, ImageBitmap>>> {
	const allCaches = new Map<string, Map<number, ImageBitmap>>();

	for (let i = 0; i < elements.length; i++) {
		const element = elements[i];
		const elementProgress = i / elements.length;

		onProgress?.(elementProgress, element.name || element.componentId);

		const result = await prerenderRemotionFrames({
			element,
			fps,
			canvasSize,
			onProgress: (p) => {
				const overallProgress =
					elementProgress + p * (1 / elements.length);
				onProgress?.(overallProgress, element.name || element.componentId);
			},
		});

		if (result) {
			allCaches.set(element.id, result.frameCache);
		}
	}

	return allCaches;
}
