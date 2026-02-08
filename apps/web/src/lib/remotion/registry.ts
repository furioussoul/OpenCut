/**
 * Remotion 组件注册表
 * 用于管理 AI 生成的动态组件和转场效果
 */
import type React from "react";
import type { ComponentMeta, TransitionMeta } from "./types";

// ============ 特效组件注册表 ============

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

// ============ 转场组件注册表 ============

// 转场组件注册表
const transitionRegistry = new Map<string, React.FC<any>>();

// 转场元数据注册表
const transitionMetaRegistry = new Map<string, TransitionMeta>();

/**
 * 注册一个转场组件
 */
export function registerTransitionComponent(
	id: string,
	component: React.FC<any>,
	meta: TransitionMeta,
) {
	transitionRegistry.set(id, component);
	transitionMetaRegistry.set(id, meta);
}

/**
 * 获取已注册的转场组件
 */
export function getTransitionComponent(id: string): React.FC<any> | undefined {
	return transitionRegistry.get(id);
}

/**
 * 获取转场组件的元数据
 */
export function getTransitionComponentMeta(
	id: string,
): TransitionMeta | undefined {
	return transitionMetaRegistry.get(id);
}

/**
 * 获取所有已注册的转场组件 ID
 */
export function getRegisteredTransitionIds(): string[] {
	return Array.from(transitionRegistry.keys());
}

/**
 * 检查转场组件是否已注册
 */
export function isTransitionRegistered(id: string): boolean {
	return transitionRegistry.has(id);
}

/**
 * 注销一个转场组件
 */
export function unregisterTransitionComponent(id: string): boolean {
	transitionMetaRegistry.delete(id);
	return transitionRegistry.delete(id);
}

/**
 * 清空所有注册的转场组件
 */
export function clearTransitionRegistry(): void {
	transitionRegistry.clear();
	transitionMetaRegistry.clear();
}
