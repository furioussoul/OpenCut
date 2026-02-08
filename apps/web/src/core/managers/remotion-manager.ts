import type { EditorCore } from "@/core";
import type React from "react";
import {
	registerRemotionComponent,
	unregisterRemotionComponent,
	getRegisteredComponentIds,
	clearRegistry,
} from "@/lib/remotion/registry";
import type { ComponentMeta } from "@/lib/remotion/types";
import {
	componentStorage,
	type ComponentFileInfo,
	type ComponentDetail,
} from "@/lib/remotion/component-storage";
import { moduleCompiler } from "@/lib/remotion/module-compiler";

export class RemotionManager {
	private listeners = new Set<() => void>();

	constructor(private editor: EditorCore) {}

	// ============ 组件管理 API ============

	/**
	 * 加载项目的所有组件（只注册，不添加到 Timeline）
	 */
	async loadProjectComponents(): Promise<void> {
		console.log("[RemotionManager] Loading project components...");

		try {
			const components = await componentStorage.listComponents();
			console.log(`[RemotionManager] Found ${components.length} components`);

			for (const component of components) {
				try {
					await this.loadAndRegisterComponent(component.name);
				} catch (error) {
					console.error(`Failed to load component ${component.name}:`, error);
				}
			}
		} catch (error) {
			console.error("Failed to load components:", error);
		}

		this.notify();
	}

	/**
	 * 加载并注册单个组件
	 */
	async loadAndRegisterComponent(componentName: string): Promise<void> {
		const detail = await componentStorage.getComponent(componentName);
		if (!detail) {
			throw new Error(`Component not found: ${componentName}`);
		}

		// 构建编译所需的文件列表
		const files = [
			{
				path: `${componentName}.tsx`,
				content: detail.entryCode,
				language: "tsx" as const,
			},
			...detail.dependencies.map((dep) => ({
				path: dep.path,
				content: dep.code,
				language: dep.path.endsWith(".ts") ? ("ts" as const) : ("tsx" as const),
			})),
		];

		// 构建 meta，确保有 editableProps
		const meta: ComponentMeta = {
			name: detail.meta?.name || componentName,
			description: detail.meta?.description,
			editableProps: [],
			defaultDuration: detail.meta?.duration,
		};

		// 编译组件
		const compiled = await moduleCompiler.compile({
			id: componentName,
			name: componentName,
			entryPoint: `${componentName}.tsx`,
			files,
			status: "draft",
			meta,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			source: { type: "ai" },
		});

		// 注册到组件注册表
		registerRemotionComponent(componentName, compiled.component, compiled.meta);

		console.log(`[RemotionManager] Registered component: ${componentName}`);
	}

	/**
	 * 添加组件到 Timeline
	 */
	private async addComponentToTimeline(componentName: string): Promise<void> {
		const currentTime = this.editor.playback.getCurrentTime();
		const meta = this.getComponentMeta(componentName);
		const duration = meta?.defaultDuration || 5;

		this.editor.timeline.insertElement({
			element: {
				type: "remotion",
				name: componentName,
				componentId: componentName,
				color: "#a855f7",
				props: {},
				startTime: currentTime,
				duration,
				trimStart: 0,
				trimEnd: 0,
				transform: {
					scale: 1,
					position: { x: 0, y: 0 },
					rotate: 0,
				},
				opacity: 1,
			},
			placement: { mode: "auto" },
		});
	}

	/**
	 * 处理组件创建事件
	 */
	async onComponentCreated(componentName: string): Promise<void> {
		console.log(`[RemotionManager] Component created: ${componentName}`);

		try {
			// 加载并注册组件
			await this.loadAndRegisterComponent(componentName);

			// 添加到 Timeline
			await this.addComponentToTimeline(componentName);

			this.notify();
		} catch (error) {
			console.error(
				`Failed to handle component creation: ${componentName}`,
				error,
			);
		}
	}

	/**
	 * 处理组件更新事件
	 */
	async onComponentUpdated(componentName: string): Promise<void> {
		console.log(`[RemotionManager] Component updated: ${componentName}`);

		try {
			// 清除编译缓存
			moduleCompiler.clearCache(componentName);

			// 重新加载并注册
			await this.loadAndRegisterComponent(componentName);

			this.notify();
		} catch (error) {
			console.error(
				`Failed to handle component update: ${componentName}`,
				error,
			);
		}
	}

	/**
	 * 处理组件删除事件
	 */
	async onComponentDeleted(componentName: string): Promise<void> {
		console.log(`[RemotionManager] Component deleted: ${componentName}`);

		// 从 Registry 注销
		unregisterRemotionComponent(componentName);

		// 清除编译缓存
		moduleCompiler.clearCache(componentName);

		// 从 Timeline 移除使用该组件的元素
		this.removeComponentFromTimeline(componentName);

		this.notify();
	}

	/**
	 * 从 Timeline 移除使用指定组件的所有元素
	 */
	private removeComponentFromTimeline(componentName: string): void {
		const tracks = this.editor.timeline.getTracks();

		for (const track of tracks) {
			if (track.type !== "remotion") continue;

			const elementsToRemove = track.elements.filter(
				(el) => el.componentId === componentName,
			);

			for (const el of elementsToRemove) {
				this.editor.timeline.deleteElements({
					elements: [{ trackId: track.id, elementId: el.id }],
				});
			}
		}
	}

	/**
	 * 获取组件元数据
	 */
	private getComponentMeta(
		componentName: string,
	): (ComponentMeta & { defaultDuration?: number }) | undefined {
		// 从 registry 获取 meta
		const { getRemotionComponentMeta } = require("@/lib/remotion/registry");
		return getRemotionComponentMeta(componentName);
	}

	/**
	 * 列出所有组件
	 */
	async listComponents(): Promise<ComponentFileInfo[]> {
		return componentStorage.listComponents();
	}

	/**
	 * 获取组件详情
	 */
	async getComponent(componentName: string): Promise<ComponentDetail | null> {
		return componentStorage.getComponent(componentName);
	}

	// ============ 旧版兼容 API ============

	registerComponent(
		id: string,
		component: React.FC<Record<string, unknown>>,
		meta?: ComponentMeta,
	) {
		registerRemotionComponent(id, component, meta);
		this.notify();
	}

	unregisterComponent(id: string) {
		unregisterRemotionComponent(id);
		this.notify();
	}

	getComponentIds() {
		return getRegisteredComponentIds();
	}

	clearAll() {
		clearRegistry();
		this.notify();
	}

	// ============ 订阅机制 ============

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => fn());
	}
}
