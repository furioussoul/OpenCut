import type { EditorCore } from "@/core";
import type { RootNode } from "@/services/renderer/nodes/root-node";
import type { ExportOptions, ExportResult } from "@/types/export";
import type { RemotionElement, TimelineTrack } from "@/types/timeline";
import { SceneExporter } from "@/services/renderer/scene-exporter";
import { buildScene } from "@/services/renderer/scene-builder";
import { createTimelineAudioBuffer } from "@/lib/media/audio";
import { prerenderAllRemotionElements } from "@/services/renderer/remotion-frame-renderer";

export class RendererManager {
	private renderTree: RootNode | null = null;
	private listeners = new Set<() => void>();

	constructor(private editor: EditorCore) {}

	setRenderTree({ renderTree }: { renderTree: RootNode | null }): void {
		this.renderTree = renderTree;
		this.notify();
	}

	getRenderTree(): RootNode | null {
		return this.renderTree;
	}

	async exportProject({
		options,
	}: {
		options: ExportOptions;
	}): Promise<ExportResult> {
		const { format, quality, fps, includeAudio, onProgress, onCancel } =
			options;

		try {
			const tracks = this.editor.timeline.getTracks();
			const mediaAssets = this.editor.media.getAssets();
			const activeProject = this.editor.project.getActive();

			if (!activeProject) {
				return { success: false, error: "No active project" };
			}

			const duration = this.editor.timeline.getTotalDuration();
			if (duration === 0) {
				return { success: false, error: "Project is empty" };
			}

			const exportFps = fps || activeProject.settings.fps;
			const canvasSize = activeProject.settings.canvasSize;

			let audioBuffer: AudioBuffer | null = null;
			if (includeAudio) {
				onProgress?.({ progress: 0.05 });
				audioBuffer = await createTimelineAudioBuffer({
					tracks,
					mediaAssets,
					duration,
				});
			}

			// 预渲染 Remotion 组件帧
			const remotionElements = this.collectRemotionElements(tracks);
			let remotionFrameCaches: Map<string, Map<number, ImageBitmap>> | undefined;

			console.log(`📊 Remotion 元素检测: 找到 ${remotionElements.length} 个元素`);
			for (const el of remotionElements) {
				console.log(`  - ${el.id}: ${el.componentId}, duration: ${el.duration}s`);
			}

			if (remotionElements.length > 0) {
				onProgress?.({ progress: 0.08 });
				console.log(`🎬 开始预渲染 ${remotionElements.length} 个 Remotion 组件...`);

				remotionFrameCaches = await prerenderAllRemotionElements({
					elements: remotionElements,
					fps: exportFps,
					canvasSize,
					onProgress: (p, name) => {
						// Remotion 预渲染占 8%-20% 的进度
						const adjustedProgress = 0.08 + p * 0.12;
						onProgress?.({ progress: adjustedProgress });
					},
				});

				console.log(`✅ Remotion 组件预渲染完成`);
				console.log(`📦 预渲染缓存统计:`);
				for (const [elementId, cache] of remotionFrameCaches) {
					console.log(`  - ${elementId}: ${cache.size} 帧`);
				}
			}

			const scene = buildScene({
				tracks,
				mediaAssets,
				duration,
				canvasSize,
				background: activeProject.settings.background,
				remotionFrameCaches,
			});

			const exporter = new SceneExporter({
				width: canvasSize.width,
				height: canvasSize.height,
				fps: exportFps,
				format,
				quality,
				shouldIncludeAudio: !!includeAudio,
				audioBuffer: audioBuffer || undefined,
			});

			exporter.on("progress", (progress) => {
				const adjustedProgress = includeAudio
					? 0.05 + progress * 0.95
					: progress;
				onProgress?.({ progress: adjustedProgress });
			});

			let cancelled = false;
			const checkCancel = () => {
				if (onCancel?.()) {
					cancelled = true;
					exporter.cancel();
				}
			};

			const cancelInterval = setInterval(checkCancel, 100);

			try {
				const buffer = await exporter.export({ rootNode: scene });
				clearInterval(cancelInterval);

				if (cancelled) {
					return { success: false, cancelled: true };
				}

				if (!buffer) {
					return { success: false, error: "Export failed to produce buffer" };
				}

				return {
					success: true,
					buffer,
				};
			} finally {
				clearInterval(cancelInterval);
			}
		} catch (error) {
			console.error("Export failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown export error",
			};
		}
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => fn());
	}

	/**
	 * 收集所有可见的 Remotion 元素
	 */
	private collectRemotionElements(tracks: TimelineTrack[]): RemotionElement[] {
		const elements: RemotionElement[] = [];
		for (const track of tracks) {
			if (track.type !== "remotion") continue;
			if (track.hidden) continue;

			for (const element of track.elements) {
				if (!element.hidden) {
					elements.push(element as RemotionElement);
				}
			}
		}
		return elements;
	}
}
