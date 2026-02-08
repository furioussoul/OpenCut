"use client";

import type React from "react";
import {
	useMemo,
	useState,
	useCallback,
	useRef,
	useEffect,
	createContext,
} from "react";
import { Internals } from "remotion";
import { useEditor } from "@/hooks/use-editor";
import {
	getRemotionComponent,
	getRemotionComponentMeta,
} from "@/lib/remotion/registry";
import { syncRemotionTime } from "@/lib/remotion/bridge/time-sync";
import type { RemotionElement, TimelineTrack } from "@/types/timeline";
import type { ComponentMeta } from "@/lib/remotion/types";

// 生成一个稳定的 rootId 和 compositionId
const PREVIEW_ROOT_ID = "opencut-preview";
const PREVIEW_COMPOSITION_ID = "opencut-preview-composition";

/**
 * Remotion 上下文包装器
 * 为动态编译的组件提供 useCurrentFrame() 和 useVideoConfig() 等 hooks 所需的上下文
 *
 * 这个包装器模拟了 Remotion 的 Composition 环境，让在编辑器预览中渲染的组件能正常使用 Remotion hooks
 */
function RemotionContextWrapper({
	children,
	frame,
	fps,
	durationInFrames,
	width,
	height,
}: {
	children: React.ReactNode;
	frame: number;
	fps: number;
	durationInFrames: number;
	width: number;
	height: number;
}) {
	// ========== Timeline 上下文 ==========
	// 提供 frame 信息给 useCurrentFrame()
	const timelineContextValue = useMemo(
		() => ({
			frame: { [PREVIEW_ROOT_ID]: frame },
			playing: false,
			playbackRate: 1,
			rootId: PREVIEW_ROOT_ID,
			imperativePlaying: { current: false },
			setPlaybackRate: () => {},
			audioAndVideoTags: { current: [] },
		}),
		[frame],
	);

	// ========== SetTimeline 上下文 ==========
	const setTimelineContextValue = useMemo(
		() => ({
			setFrame: () => {},
			setPlaying: () => {},
		}),
		[],
	);

	// ========== Composition 元数据 ==========
	// useVideoConfig() 最终需要这个
	const videoConfigMetadata = useMemo(
		() => ({
			fps,
			durationInFrames,
			width,
			height,
			defaultCodec: null,
			props: {},
			id: PREVIEW_COMPOSITION_ID,
			defaultProps: {},
			// Remotion 4.x 需要的额外字段
			defaultOutName: null,
		}),
		[fps, durationInFrames, width, height],
	);

	// ========== Composition Manager 上下文 ==========
	// useVideo() 从这里获取 composition 信息
	const compositionManagerValue = useMemo(
		() => ({
			// 当前 composition 的元数据 - useResolvedVideoConfig 会优先使用这个
			currentCompositionMetadata: videoConfigMetadata,
			// compositions 列表 - useVideo 需要从这里找到匹配的 composition
			compositions: [
				{
					id: PREVIEW_COMPOSITION_ID,
					component: () => null,
					durationInFrames,
					fps,
					width,
					height,
					defaultProps: {},
					nonce: 0,
					parentFolderName: null,
					schema: null,
					calculateMetadata: null,
				},
			],
			folders: [],
			// canvasContent 指向当前 composition
			canvasContent: {
				type: "composition" as const,
				compositionId: PREVIEW_COMPOSITION_ID,
			},
			registerComposition: () => {},
			registerFolder: () => {},
			unregisterComposition: () => {},
			unregisterFolder: () => {},
			currentComposition: PREVIEW_COMPOSITION_ID,
			setCurrentComposition: () => {},
			setCurrentCompositionMetadata: () => {},
			setCanvasContent: () => {},
		}),
		[videoConfigMetadata, durationInFrames, fps, width, height],
	);

	// ========== Sequence 上下文 ==========
	// Sequence 组件需要这个，null 表示不在 Sequence 内
	const sequenceContextValue = useMemo(
		() => ({
			cumulatedFrom: 0,
			relativeFrom: 0,
			parentFrom: 0,
			durationInFrames,
			id: "root",
			width: null,
			height: null,
		}),
		[durationInFrames],
	);

	// ========== Editor Props 上下文 ==========
	// useResolvedVideoConfig 需要这个
	const editorPropsContextValue = useMemo(
		() => ({
			props: {},
		}),
		[],
	);

	// ========== ResolveComposition 上下文 ==========
	const resolveCompositionContextValue = useMemo(
		() => ({
			setAssets: () => {},
			assets: [],
		}),
		[],
	);

	// ========== Nonce 上下文 ==========
	const nonceContextValue = useMemo(() => 0, []);

	// ========== 获取 Remotion 内部 Context ==========
	const TimelineContext = Internals.TimelineContext as React.Context<unknown>;
	const SetTimelineContext =
		Internals.SetTimelineContext as React.Context<unknown>;
	const CompositionManager =
		Internals.CompositionManager as React.Context<unknown>;
	const SequenceContext = Internals.SequenceContext as React.Context<unknown>;
	const EditorPropsContext =
		Internals.EditorPropsContext as React.Context<unknown>;
	const ResolveCompositionContext =
		Internals.ResolveCompositionContext as React.Context<unknown>;
	const NonceContext = Internals.NonceContext as React.Context<unknown>;

	// ========== 渲染 Provider 树 ==========
	return (
		<Internals.CanUseRemotionHooks.Provider value>
			<TimelineContext.Provider value={timelineContextValue}>
				<SetTimelineContext.Provider value={setTimelineContextValue}>
					<CompositionManager.Provider value={compositionManagerValue}>
						<SequenceContext.Provider value={sequenceContextValue}>
							<EditorPropsContext.Provider value={editorPropsContextValue}>
								<ResolveCompositionContext.Provider
									value={resolveCompositionContextValue}
								>
									<NonceContext.Provider value={nonceContextValue}>
										{children}
									</NonceContext.Provider>
								</ResolveCompositionContext.Provider>
							</EditorPropsContext.Provider>
						</SequenceContext.Provider>
					</CompositionManager.Provider>
				</SetTimelineContext.Provider>
			</TimelineContext.Provider>
		</Internals.CanUseRemotionHooks.Provider>
	);
}

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
	Component: React.FC<Record<string, unknown>>;
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

	// 计算 durationInFrames
	const durationInFrames = Math.max(1, Math.round(element.duration * fps));

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
			{/* 渲染 Remotion 组件 - 用上下文包装器提供 hooks 所需的环境 */}
			<RemotionContextWrapper
				frame={currentFrame}
				fps={fps}
				durationInFrames={durationInFrames}
				width={canvasSize.width}
				height={canvasSize.height}
			>
				<Component {...element.props} />
			</RemotionContextWrapper>

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
				{meta?.name ?? element.componentId}
				<span className="ml-2 opacity-70">(拖动移动)</span>
			</div>
		</>
	);
}
