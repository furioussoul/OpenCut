import type { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";
import type { Transform } from "@/types/timeline";

import { syncRemotionTime } from "@/lib/remotion/bridge/time-sync";

const REMOTION_EPSILON = 1 / 1000;

export interface RemotionNodeParams {
	componentId: string;
	props: Record<string, unknown>;
	duration: number;
	startTime: number; // 同 timeOffset
	trimStart: number;
	trimEnd: number;
	transform: Transform;
	opacity: number;
	// 缓存的渲染帧（由外部 Remotion 引擎提供）
	frameCache?: Map<number, ImageBitmap | HTMLCanvasElement>;
}

/**
 * RemotionNode - 用于在 Canvas 上渲染 Remotion 组件的帧
 */
export class RemotionNode extends BaseNode<RemotionNodeParams> {
	async render({
		renderer,
		time,
	}: { renderer: CanvasRenderer; time: number }): Promise<void> {
		await super.render({ renderer, time });

		const sync = syncRemotionTime({
			currentTime: time,
			startTime: this.params.startTime,
			duration: this.params.duration,
			trimStart: this.params.trimStart,
			fps: renderer.fps,
		});

		if (sync.isOutRange) {
			return;
		}

		renderer.context.save();

		// 应用透明度
		if (this.params.opacity !== undefined) {
			renderer.context.globalAlpha = this.params.opacity;
		}

		// 尝试从缓存获取帧
		const cachedFrame = this.params.frameCache?.get(sync.frame);

		if (cachedFrame) {
			// 如果有缓存帧，直接绘制
			this.drawFrame(renderer, cachedFrame);
		}
		renderer.context.restore();
	}

	private drawFrame(
		renderer: CanvasRenderer,
		frame: ImageBitmap | HTMLCanvasElement,
	): void {
		const { transform } = this.params;

		// 应用变换
		const centerX = renderer.width / 2;
		const centerY = renderer.height / 2;

		renderer.context.translate(
			centerX + transform.position.x,
			centerY + transform.position.y,
		);
		renderer.context.rotate((transform.rotate * Math.PI) / 180);
		renderer.context.scale(transform.scale, transform.scale);

		// 绘制帧
		const drawWidth = renderer.width;
		const drawHeight = renderer.height;
		renderer.context.drawImage(
			frame,
			-drawWidth / 2,
			-drawHeight / 2,
			drawWidth,
			drawHeight,
		);
	}

	/**
	 * 设置帧缓存（用于导出时）
	 */
	public setFrameCache(
		cache: Map<number, ImageBitmap | HTMLCanvasElement>,
	): void {
		this.params.frameCache = cache;
	}
}
