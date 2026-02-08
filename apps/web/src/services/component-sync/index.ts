/**
 * 组件同步服务
 *
 * 职责：
 * 1. 初始化时加载已有组件到 Timeline
 * 2. 监听 Agent SSE 事件（Mock），检测组件文件变化
 * 3. 提供手动触发接口供测试使用
 */

import type { EditorCore } from "@/core";

// ============ 事件类型 ============

export interface ComponentFileEvent {
	type: "created" | "updated" | "deleted";
	componentName: string;
	filePath: string;
}

// ============ ComponentSyncService ============

export class ComponentSyncService {
	private editor: EditorCore;

	constructor(editor: EditorCore) {
		this.editor = editor;
	}

	/**
	 * 启动服务
	 * - 加载已有组件到 Timeline
	 */
	async start(): Promise<void> {
		console.log("[ComponentSyncService] Starting...");

		// 加载已有组件到 Timeline
		await this.loadExistingComponents();

		console.log("[ComponentSyncService] Started");
	}

	/**
	 * 停止服务
	 */
	stop(): void {
		console.log("[ComponentSyncService] Stopped");
	}

	/**
	 * 加载已有组件
	 */
	private async loadExistingComponents(): Promise<void> {
		console.log("[ComponentSyncService] Loading existing components...");
		await this.editor.remotion.loadProjectComponents();
	}

	/**
	 * 处理 Agent 文件事件
	 * 当 Agent SSE 返回文件写入事件时调用此方法
	 *
	 * @param event Agent 返回的文件事件
	 */
	handleAgentFileEvent(event: { type: string; filePath: string }): void {
		// 只处理 remotion-components 目录下的 component_*.tsx 文件
		if (!this.isRemotionComponent(event.filePath)) {
			return;
		}

		const componentName = this.extractComponentName(event.filePath);
		console.log(
			`[ComponentSyncService] Agent file event: ${event.type} - ${componentName}`,
		);

		switch (event.type) {
			case "file.created":
			case "file.updated":
				this.editor.remotion.onComponentCreated(componentName);
				break;
			case "file.deleted":
				this.editor.remotion.onComponentDeleted(componentName);
				break;
		}
	}

	/**
	 * 手动触发组件事件（供测试使用）
	 */
	triggerEvent(event: ComponentFileEvent): void {
		console.log("[ComponentSyncService] Manual trigger:", event);

		switch (event.type) {
			case "created":
				this.editor.remotion.onComponentCreated(event.componentName);
				break;
			case "updated":
				this.editor.remotion.onComponentUpdated(event.componentName);
				break;
			case "deleted":
				this.editor.remotion.onComponentDeleted(event.componentName);
				break;
		}
	}

	/**
	 * 检查文件路径是否是 Remotion 组件
	 */
	private isRemotionComponent(filePath: string): boolean {
		return (
			filePath.includes(".opencut/remotion-components/component_") &&
			filePath.endsWith(".tsx")
		);
	}

	/**
	 * 从文件路径提取组件名
	 * .opencut/remotion-components/component_test.tsx -> component_test
	 */
	private extractComponentName(filePath: string): string {
		const fileName = filePath.split("/").pop() || "";
		return fileName.replace(".tsx", "");
	}
}

// ============ React Hook ============

import { useEffect, useRef } from "react";
import { useEditor } from "@/hooks/use-editor";

/**
 * React Hook: 管理 ComponentSyncService 生命周期
 */
export function useComponentSync() {
	const editor = useEditor();
	const serviceRef = useRef<ComponentSyncService | null>(null);

	useEffect(() => {
		const service = new ComponentSyncService(editor);
		service.start();
		serviceRef.current = service;

		// 暴露到 window 供调试使用
		if (typeof window !== "undefined") {
			(
				window as unknown as { __componentSync: ComponentSyncService }
			).__componentSync = service;
			// 暴露 editor 供调试
			(window as unknown as { __editor: typeof editor }).__editor = editor;
		}

		return () => {
			service.stop();
			serviceRef.current = null;
			if (typeof window !== "undefined") {
				delete (window as unknown as { __componentSync?: ComponentSyncService })
					.__componentSync;
				delete (window as unknown as { __editor?: typeof editor }).__editor;
			}
		};
	}, [editor]);

	return serviceRef.current;
}
