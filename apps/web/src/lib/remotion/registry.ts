/**
 * Remotion 组件注册表
 * 用于管理 AI 生成的动态组件
 */
import type React from "react";
import type { ComponentMeta } from "./types";

// 组件注册表：存储组件 ID 到组件的映射
const componentRegistry = new Map<string, React.FC<any>>();

// 组件元数据注册表
const componentMetaRegistry = new Map<string, ComponentMeta>();

/**
 * 注册一个 Remotion 组件
 */
export function registerRemotionComponent(
	id: string,
	component: React.FC<any>,
	meta?: ComponentMeta,
) {
	componentRegistry.set(id, component);
	if (meta) {
		componentMetaRegistry.set(id, meta);
	}
}

/**
 * 获取已注册的组件
 */
export function getRemotionComponent(id: string): React.FC<any> | undefined {
	return componentRegistry.get(id);
}

/**
 * 获取组件的元数据
 */
export function getRemotionComponentMeta(
	id: string,
): ComponentMeta | undefined {
	return componentMetaRegistry.get(id);
}

/**
 * 获取所有已注册的组件 ID
 */
export function getRegisteredComponentIds(): string[] {
	return Array.from(componentRegistry.keys());
}

/**
 * 检查组件是否已注册
 */
export function isComponentRegistered(id: string): boolean {
	return componentRegistry.has(id);
}

/**
 * 注销一个组件
 */
export function unregisterRemotionComponent(id: string): boolean {
	componentMetaRegistry.delete(id);
	return componentRegistry.delete(id);
}

/**
 * 清空所有注册的组件
 */
export function clearRegistry(): void {
	componentRegistry.clear();
	componentMetaRegistry.clear();
}
