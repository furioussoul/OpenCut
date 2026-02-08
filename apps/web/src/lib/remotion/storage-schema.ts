/**
 * AI 生成的 Remotion 组件存储 Schema
 *
 * 设计原则：
 * 1. 支持多文件组件（1主多从）
 * 2. 支持 import/export 依赖关系
 * 3. 与 VFS 物理存储对应
 * 4. 支持版本管理和元数据
 */

import type { ComponentMeta, EditableProp } from "./types";

// ============ 文件级别 ============

/** 单个源文件 */
export interface ComponentFile {
	/** 相对路径，如 "index.tsx", "utils/helpers.ts" */
	path: string;
	/** 源代码内容 */
	content: string;
	/** 文件语言类型 */
	language: "tsx" | "ts" | "css" | "json";
}

// ============ 组件包级别 ============

/** 组件包状态 */
export type ComponentBundleStatus =
	| "draft" // 草稿，未编译
	| "compiled" // 已编译，可使用
	| "error"; // 编译错误

/** 编译错误信息 */
export interface CompileError {
	file: string;
	line?: number;
	column?: number;
	message: string;
}

/**
 * 组件包 - AI 生成的完整组件
 *
 * VFS 存储结构:
 * /components/<id>/
 *   ├── manifest.json     # 此结构的序列化
 *   └── src/
 *       ├── index.tsx     # 入口文件
 *       ├── particle.tsx  # 子组件
 *       └── utils/
 *           └── math.ts   # 工具函数
 */
export interface ComponentBundle {
	/** 唯一标识符 */
	id: string;

	/** 显示名称 */
	name: string;

	/** 组件描述 */
	description?: string;

	/** 入口文件路径，相对于 src/ */
	entryPoint: string;

	/** 所有源文件 */
	files: ComponentFile[];

	/** 外部依赖（npm 包名） */
	dependencies?: string[];

	/** 组件元数据（可编辑属性等） */
	meta: ComponentMeta;

	/** 组件状态 */
	status: ComponentBundleStatus;

	/** 编译错误（如果 status === "error"） */
	errors?: CompileError[];

	/** 缩略图 URL（可选，用于预览） */
	thumbnailUrl?: string;

	/** 标签（用于分类搜索） */
	tags?: string[];

	/** 创建时间 */
	createdAt: string;

	/** 更新时间 */
	updatedAt: string;

	/** 创建来源 */
	source: ComponentSource;
}

/** 组件来源 */
export interface ComponentSource {
	type: "ai" | "user" | "builtin";
	/** AI 生成时的原始 prompt */
	prompt?: string;
	/** AI 模型 ID */
	model?: string;
	/** 会话 ID（用于追溯） */
	sessionId?: string;
}

// ============ Manifest 文件 ============

/**
 * manifest.json 的结构
 * 存储在 VFS: /components/<id>/manifest.json
 */
export interface ComponentManifest {
	id: string;
	name: string;
	description?: string;
	entryPoint: string;
	dependencies?: string[];
	meta: ComponentMeta;
	status: ComponentBundleStatus;
	errors?: CompileError[];
	thumbnailUrl?: string;
	tags?: string[];
	createdAt: string;
	updatedAt: string;
	source: ComponentSource;
	/** 文件列表（不含内容，只有路径和语言） */
	fileList: Array<{ path: string; language: ComponentFile["language"] }>;
}

// ============ 编译产物 ============

/** 编译后的模块缓存 */
export interface CompiledModule {
	/** 组件 ID */
	bundleId: string;
	/** 编译时间 */
	compiledAt: number;
	/** 编译后的 React 组件 */
	component: React.FC<Record<string, unknown>>;
	/** 组件元数据 */
	meta: ComponentMeta;
}

// ============ AI 生成请求/响应 ============

/** AI 生成组件的请求 */
export interface GenerateComponentRequest {
	/** 用户描述 */
	prompt: string;
	/** 参考组件 ID（用于修改现有组件） */
	referenceId?: string;
	/** 期望的可编辑属性 */
	editableProps?: EditableProp[];
	/** 期望的标签 */
	tags?: string[];
}

/**
 * AI 生成组件的响应
 * AI 应该返回这个结构
 */
export interface GenerateComponentResponse {
	name: string;
	description: string;
	entryPoint: string;
	files: ComponentFile[];
	dependencies?: string[];
	meta: ComponentMeta;
	tags?: string[];
}

// ============ 存储服务接口 ============

/** 组件存储服务接口 */
export interface IComponentStorage {
	/** 保存组件包 */
	save(projectId: string, bundle: ComponentBundle): Promise<void>;

	/** 加载组件包 */
	load(projectId: string, bundleId: string): Promise<ComponentBundle | null>;

	/** 列出所有组件 */
	list(projectId: string): Promise<ComponentManifest[]>;

	/** 删除组件 */
	delete(projectId: string, bundleId: string): Promise<void>;

	/** 检查组件是否存在 */
	exists(projectId: string, bundleId: string): Promise<boolean>;

	/** 更新组件状态 */
	updateStatus(
		projectId: string,
		bundleId: string,
		status: ComponentBundleStatus,
		errors?: CompileError[],
	): Promise<void>;
}

// ============ 编译器接口 ============

/** 模块编译器接口 */
export interface IModuleCompiler {
	/** 编译组件包，返回可执行的 React 组件 */
	compile(bundle: ComponentBundle): Promise<CompiledModule>;

	/** 验证组件包（不执行，只检查语法） */
	validate(bundle: ComponentBundle): Promise<CompileError[]>;

	/** 清除编译缓存 */
	clearCache(bundleId?: string): void;
}

// ============ 外部依赖白名单 ============

/**
 * 允许 AI 生成代码使用的外部依赖
 * 这些包需要预先打包进应用
 */
export const ALLOWED_DEPENDENCIES = [
	"react",
	"remotion",
	"framer-motion",
	"@remotion/transitions",
] as const;

export type AllowedDependency = (typeof ALLOWED_DEPENDENCIES)[number];

/** 检查依赖是否允许 */
export function isAllowedDependency(dep: string): dep is AllowedDependency {
	return ALLOWED_DEPENDENCIES.includes(dep as AllowedDependency);
}
