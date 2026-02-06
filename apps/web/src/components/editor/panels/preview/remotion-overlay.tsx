"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useEditor } from "@/hooks/use-editor";
import {
	getRemotionComponent,
	getRemotionComponentMeta,
} from "@/lib/remotion/registry";
import { syncRemotionTime } from "@/lib/remotion/bridge/time-sync";
import type { RemotionElement, TimelineTrack } from "@/types/timeline";
import type { ComponentMeta } from "@/lib/remotion/types";

/**
 * 获取当前时间点活跃的 Remotion 元素
 */
function getActiveRemotionElement(
	tracks: TimelineTrack[],
	currentTime: number,
): { element: RemotionElement; trackId: string } | null {
	for (const track of tracks) {
		if (track.type !== "remotion") continue;
		if (track.hidden) continue;

		for (const element of track.elements) {
			if (element.hidden) continue;

			const elementEnd = element.startTime + element.duration;
			if (currentTime >= element.startTime && currentTime < elementEnd) {
				return { element, trackId: track.id };
			}
		}
	}
	return null;
}

/**
 * RemotionOverlay - 在 Canvas 上叠加 Remotion 组件的交互层
 */
export function RemotionOverlay() {
	const editor = useEditor();
	const tracks = editor.timeline.getTracks();
	const currentTime = editor.playback.getCurrentTime();
	const activeProject = editor.project.getActive();

	// 查找当前时间点的 Remotion 元素
	const activeRemotionData = useMemo(
		() => getActiveRemotionElement(tracks, currentTime),
		[tracks, currentTime],
	);

	// 如果没有活跃的 Remotion 元素，不渲染任何内容
	if (!activeRemotionData || !activeProject) {
		return null;
	}

	const { element, trackId } = activeRemotionData;
	const Component = getRemotionComponent(element.componentId);
	const meta = getRemotionComponentMeta(element.componentId);

	if (!Component) return null;

	const fps = activeProject.settings.fps;
	const sync = syncRemotionTime({
		currentTime,
		startTime: element.startTime,
		duration: element.duration,
		trimStart: element.trimStart,
		fps,
	});

	return (
		<div
			className="absolute inset-0 pointer-events-none"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<div
				className="relative"
				style={{
					width: activeProject.settings.canvasSize.width,
					height: activeProject.settings.canvasSize.height,
				}}
			>
				<RemotionElementWrapper
					element={element}
					trackId={trackId}
					canvasSize={activeProject.settings.canvasSize}
					currentFrame={sync.frame}
					fps={fps}
					Component={Component}
					meta={meta}
				/>
			</div>
		</div>
	);
}

/**
 * 可拖动、可编辑的 Remotion 元素包装器
 */
function RemotionElementWrapper({
	element,
	trackId,
	canvasSize,
	currentFrame,
	fps,
	Component,
	meta,
}: {
	element: RemotionElement;
	trackId: string;
	canvasSize: { width: number; height: number };
	currentFrame: number;
	fps: number;
	Component: React.FC<any>;
	meta?: ComponentMeta;
}) {
	const editor = useEditor();
	const isPlaying = editor.playback.getIsPlaying();

	// 拖动状态
	const [isDragging, setIsDragging] = useState(false);
	const dragStartRef = useRef<{
		x: number;
		y: number;
		posX: number;
		posY: number;
	} | null>(null);

	// 用于存储最新的 element 引用，避免 useEffect 依赖 element 导致重新运行
	const elementRef = useRef(element);
	elementRef.current = element;

	const trackIdRef = useRef(trackId);
	trackIdRef.current = trackId;

	// 处理拖动开始
	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (isPlaying) return;
			e.preventDefault();
			e.stopPropagation();

			// 选中元素，侧边栏会自动显示属性面板
			editor.selection.setSelectedElements({
				elements: [{ trackId, elementId: element.id }],
			});

			dragStartRef.current = {
				x: e.clientX,
				y: e.clientY,
				posX: element.transform.position.x,
				posY: element.transform.position.y,
			};
			setIsDragging(true);
		},
		[isPlaying, element.transform.position, editor, trackId, element.id],
	);

	// 处理拖动 - 使用 ref 避免依赖 element 导致 effect 重新运行
	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (moveEvent: MouseEvent) => {
			if (!dragStartRef.current) return;

			const deltaX = moveEvent.clientX - dragStartRef.current.x;
			const deltaY = moveEvent.clientY - dragStartRef.current.y;

			const currentElement = elementRef.current;
			const currentTrackId = trackIdRef.current;

			// 实时更新位置（不推入历史记录）
			editor.timeline.updateRemotionElement({
				trackId: currentTrackId,
				elementId: currentElement.id,
				updates: {
					transform: {
						...currentElement.transform,
						position: {
							x: dragStartRef.current.posX + deltaX,
							y: dragStartRef.current.posY + deltaY,
						},
					},
				},
				pushHistory: false,
			});
		};

		const handleMouseUp = () => {
			setIsDragging(false);

			// 最终提交到历史记录
			if (dragStartRef.current) {
				const currentElement = elementRef.current;
				const currentTrackId = trackIdRef.current;
				const currentPos = currentElement.transform.position;
				const startPos = dragStartRef.current;

				if (currentPos.x !== startPos.posX || currentPos.y !== startPos.posY) {
					editor.timeline.updateRemotionElement({
						trackId: currentTrackId,
						elementId: currentElement.id,
						updates: { transform: currentElement.transform },
						pushHistory: true,
					});
				}
			}

			dragStartRef.current = null;
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging, editor]);

	const transformStyle = {
		transform: `
      translate(${element.transform.position.x}px, ${element.transform.position.y}px)
      rotate(${element.transform.rotate}deg)
      scale(${element.transform.scale})
    `,
		opacity: element.opacity,
	};

	return (
		<div
			className="absolute pointer-events-auto"
			style={{
				...transformStyle,
				cursor: isDragging ? "grabbing" : isPlaying ? "default" : "grab",
				left: "50%",
				top: "50%",
				marginLeft: -canvasSize.width / 2,
				marginTop: -canvasSize.height / 2,
				width: canvasSize.width,
				height: canvasSize.height,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
			onMouseDown={handleMouseDown}
		>
			{/* 渲染 Remotion 组件 */}
			<Component
				{...element.props}
				__remotion_frame={currentFrame}
				__remotion_fps={fps}
				__remotion_duration={element.duration}
			/>

			{/* 选中边框和手柄（非播放状态时显示） */}
			{!isPlaying && (
				<RemotionEditHandles
					element={element}
					meta={meta}
					isDragging={isDragging}
				/>
			)}
		</div>
	);
}

/**
 * 编辑手柄组件 - 显示边框和拖拽手柄
 */
function RemotionEditHandles({
	element,
	meta,
	isDragging,
}: {
	element: RemotionElement;
	meta?: ReturnType<typeof getRemotionComponentMeta>;
	isDragging: boolean;
}) {
	return (
		<>
			{/* 选中边框 */}
			<div
				className={`absolute inset-0 border-2 rounded pointer-events-none transition-colors ${
					isDragging ? "border-purple-400" : "border-purple-500"
				}`}
				style={{ boxShadow: "0 0 10px rgba(139, 92, 246, 0.5)" }}
			/>

			{/* 组件基础标签 */}
			<div className="absolute -top-7 left-0 bg-purple-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
				✨ {meta?.name ?? element.componentId}
				<span className="ml-2 opacity-70">(拖动移动)</span>
			</div>
		</>
	);
}
