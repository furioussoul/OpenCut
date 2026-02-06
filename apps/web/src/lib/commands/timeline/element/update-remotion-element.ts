import { Command } from "@/lib/commands/base-command";
import type {
	RemotionElement,
	TimelineTrack,
	Transform,
} from "@/types/timeline";
import { EditorCore } from "@/core";

/**
 * UpdateRemotionElementCommand - 更新 Remotion 元素的属性
 *
 * 支持更新：
 * - props: 组件的自定义属性（如 text、color 等）
 * - transform: 位置、旋转、缩放
 * - opacity: 透明度
 */
export class UpdateRemotionElementCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(
		private trackId: string,
		private elementId: string,
		private updates: Partial<
			Pick<RemotionElement, "props" | "transform" | "opacity">
		>,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = structuredClone(editor.timeline.getTracks());

		const updatedTracks = this.savedState.map((track) => {
			if (track.id !== this.trackId) return track;
			if (track.type !== "remotion") return track;

			const newElements = track.elements.map((el) => {
				if (el.id !== this.elementId) return el;
				if (el.type !== "remotion") return el;

				const updated = { ...el };

				// 合并 props（浅合并）
				if (this.updates.props !== undefined) {
					updated.props = { ...el.props, ...this.updates.props };
				}

				// 更新 transform
				if (this.updates.transform !== undefined) {
					updated.transform = { ...this.updates.transform };
				}

				// 更新 opacity
				if (this.updates.opacity !== undefined) {
					updated.opacity = this.updates.opacity;
				}

				return updated;
			});

			return { ...track, elements: newElements } as typeof track;
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
