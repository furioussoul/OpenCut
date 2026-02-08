import type { EditorCore } from "@/core";
import React from "react";
import { 
	registerRemotionComponent, 
	unregisterRemotionComponent,
	getRegisteredComponentIds,
	clearRegistry
} from "@/lib/remotion/registry";
import { registerSampleComponents } from "@/lib/remotion/sample-components";
import { storageService } from "@/services/storage/service";
import type { ComponentMeta } from "@/lib/remotion/types";
import type { RemotionComponentData } from "@/services/storage/types";

export class RemotionManager {
	private listeners = new Set<() => void>();

	constructor(private editor: EditorCore) {
		this.initialize();
	}

	private initialize() {
		// 先加载内置示例组件
		registerSampleComponents();
	}

	async loadProjectComponents(projectId: string) {
		console.log(`[RemotionManager] Loading components for project ${projectId}`);
		
		try {
			const components = await storageService.loadAllRemotionComponents({ projectId });
			
			for (const data of components) {
				if (data.code) {
					try {
						// 将代码转换为功能组件
						// 期待 code 格式为一个返回 React 组件的函数，或者直接是组件定义
						// 例如: "(props) => <div>{props.text}</div>"
						const componentFn = new Function("React", `return ${data.code}`)(React);
						registerRemotionComponent(data.id, componentFn, data.meta);
					} catch (e) {
						console.error(`Failed to execute code for component ${data.id}:`, e);
					}
				}
			}
		} catch (error) {
			console.error("Failed to load remotion components:", error);
		}
		
		this.notify();
	}

	async saveComponent(projectId: string, id: string, meta: ComponentMeta, code?: string) {
		const componentData: RemotionComponentData = {
			id,
			meta,
			code,
			updatedAt: new Date().toISOString(),
		};

		await storageService.saveRemotionComponent({
			projectId,
			component: componentData,
		});

		this.notify();
	}

	registerComponent(id: string, component: React.FC<any>, meta?: ComponentMeta) {
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
		this.initialize();
		this.notify();
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => fn());
	}
}
