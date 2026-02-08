"use client";

/**
 * 模块编译器
 *
 * 将 AI 生成的多文件 Remotion 组件编译为可执行的 React 组件
 *
 * 核心功能：
 * 1. 使用 Sucrase 转译 TSX -> JS (包含 imports 转换)
 * 2. 使用 require 机制处理模块依赖
 * 3. 安全沙箱执行
 *
 * 参考实现: /remotion/DynamicComponent.tsx
 */

import { transform } from "sucrase";
import React from "react";
import * as Remotion from "remotion";
import type {
	ComponentBundle,
	CompileError,
	CompiledModule,
	IModuleCompiler,
} from "./storage-schema";
import { isAllowedDependency } from "./storage-schema";

// ============ 外部依赖注入 ============

/**
 * Remotion 导出的所有可用 API
 * AI 生成的组件可以使用这些
 * 参考: /remotion/DynamicComponent.tsx
 */
const RemotionScope: Record<string, unknown> = {
	// Core
	useCurrentFrame: Remotion.useCurrentFrame,
	useVideoConfig: Remotion.useVideoConfig,
	AbsoluteFill: Remotion.AbsoluteFill,
	Sequence: Remotion.Sequence,

	// Animation
	interpolate: Remotion.interpolate,
	spring: Remotion.spring,
	Easing: Remotion.Easing,

	// Media
	Audio: Remotion.Audio,
	Img: Remotion.Img,
	Video: Remotion.Video,

	// Utils
	staticFile: Remotion.staticFile,
	random: Remotion.random,

	// Composition (in case needed)
	Composition: Remotion.Composition,
	useCurrentScale: Remotion.useCurrentScale,
};

/**
 * React 模块代理
 * 使用 Proxy 确保 hooks 调度器一致性
 * 参考: /remotion/DynamicComponent.tsx
 */
const ReactModuleProxy = new Proxy(React, {
	get(target, prop) {
		// 确保 default 导出返回 React 本身
		if (prop === "default") {
			return React;
		}
		// 其他属性直接从 React 获取
		return (target as Record<string | symbol, unknown>)[prop];
	},
});

/**
 * 模拟的依赖模块映射
 * 当代码中 require('remotion') 时，返回对应的对象
 */
const mockModules: Record<string, unknown> = {
	remotion: RemotionScope,
	react: ReactModuleProxy,
};

// ============ 安全验证 ============

const FORBIDDEN_PATTERNS = [
	{ pattern: /\beval\s*\(/, message: "禁止使用 eval" },
	{ pattern: /\bdocument\./, message: "禁止访问 document" },
	{
		pattern: /\bwindow\.(?!innerWidth|innerHeight)/,
		message: "禁止访问 window 属性",
	},
	{ pattern: /\blocalStorage\b/, message: "禁止访问 localStorage" },
	{ pattern: /\bsessionStorage\b/, message: "禁止访问 sessionStorage" },
	{ pattern: /\bfetch\s*\(/, message: "禁止使用 fetch" },
	{ pattern: /\bXMLHttpRequest\b/, message: "禁止使用 XMLHttpRequest" },
	{ pattern: /\bprocess\./, message: "禁止访问 process" },
	{ pattern: /\b__dirname\b/, message: "禁止访问 __dirname" },
	{ pattern: /\b__filename\b/, message: "禁止访问 __filename" },
	{ pattern: /\bimport\s*\(/, message: "禁止动态 import()" },
];

function validateCode(code: string, filePath: string): CompileError[] {
	const errors: CompileError[] = [];

	for (const { pattern, message } of FORBIDDEN_PATTERNS) {
		if (pattern.test(code)) {
			errors.push({
				file: filePath,
				message: `安全验证失败: ${message}`,
			});
		}
	}

	return errors;
}

// ============ Sucrase 编译 ============

/**
 * 使用 Sucrase 编译代码
 * 将 TypeScript/JSX 转换为 JavaScript，并将 import/export 转换为 CommonJS
 */
function compileWithSucrase(code: string): string {
	const result = transform(code, {
		transforms: ["typescript", "jsx", "imports"],
		jsxRuntime: "classic",
		production: true,
	});
	return result.code;
}

// ============ 模块缓存类型 ============

interface ModuleCache {
	[moduleName: string]: {
		exports: Record<string, unknown>;
		compiled: boolean;
	};
}

// ============ require 函数创建 ============

/**
 * 创建支持相对路径导入的 require 函数
 *
 * @param fileContents - 目录下所有文件的内容 { filename: code }
 * @param moduleCache - 已编译模块的缓存
 * @param compileModule - 编译单个模块的函数
 */
function createModuleRequire(
	fileContents: Record<string, string>,
	moduleCache: ModuleCache,
	compileModule: (name: string, code: string) => Record<string, unknown>,
): (moduleName: string) => unknown {
	return (moduleName: string): unknown => {
		// 1. 内置模块
		if (mockModules[moduleName]) {
			return mockModules[moduleName];
		}

		// 2. 检查是否是允许的外部依赖
		if (!moduleName.startsWith(".") && !moduleName.startsWith("/")) {
			if (!isAllowedDependency(moduleName)) {
				console.warn(`[ModuleCompiler] 不允许的外部依赖: ${moduleName}`);
				return {};
			}
			// 对于允许但未加载的依赖，返回空对象
			console.warn(`[ModuleCompiler] 外部模块未加载: ${moduleName}`);
			return {};
		}

		// 3. 相对路径导入 (./xxx or ../xxx)
		if (moduleName.startsWith("./") || moduleName.startsWith("../")) {
			// 提取模块名（去掉 ./ 和可能的扩展名）
			const cleanName = moduleName
				.replace(/^\.\//, "")
				.replace(/^\.\.\//, "")
				.replace(/\.(tsx|ts|js|jsx)$/, "");

			// 检查缓存
			if (moduleCache[cleanName]?.compiled) {
				return moduleCache[cleanName].exports;
			}

			// 查找文件内容
			const code = fileContents[cleanName];
			if (!code) {
				console.warn(
					`[ModuleCompiler] Module not found: ${moduleName} (looked for ${cleanName})`,
				);
				console.warn(
					"[ModuleCompiler] Available files:",
					Object.keys(fileContents),
				);
				return {};
			}

			// 编译并缓存
			const exports = compileModule(cleanName, code);
			return exports;
		}

		// 4. 未知模块
		console.warn(`[ModuleCompiler] Unknown module required: ${moduleName}`);
		return {};
	};
}

// ============ 多文件组件执行 ============

/**
 * 执行多文件组件代码
 * 支持 TypeScript, JSX, import/export，以及相对路径导入
 *
 * @param fileContents - 目录下所有文件的内容 { filename: code }
 * @param mainFileName - 主文件名（不含扩展名）
 */
function executeMultiFileComponent(
	fileContents: Record<string, string>,
	mainFileName: string,
): React.FC<Record<string, unknown>> | null {
	// 模块缓存
	const moduleCache: ModuleCache = {};

	// 编译单个模块的函数
	const compileModule = (
		name: string,
		code: string,
	): Record<string, unknown> => {
		// 防止循环依赖
		if (moduleCache[name]) {
			return moduleCache[name].exports;
		}

		// 预先占位，防止循环依赖
		moduleCache[name] = { exports: {}, compiled: false };

		try {
			// 使用 Sucrase 编译
			const compiledCode = compileWithSucrase(code);

			// 创建模块环境
			const mockModule = { exports: {} as Record<string, unknown> };
			const mockExports = mockModule.exports;

			// 创建该模块的 require 函数
			const moduleRequire = createModuleRequire(
				fileContents,
				moduleCache,
				compileModule,
			);

			// 执行模块代码
			// eslint-disable-next-line no-new-func
			const executeCode = new Function(
				"require",
				"module",
				"exports",
				"React",
				compiledCode,
			);

			executeCode(moduleRequire, mockModule, mockExports, React);

			// 更新缓存
			moduleCache[name] = { exports: mockExports, compiled: true };

			return mockExports;
		} catch (err) {
			console.error(`[ModuleCompiler] Failed to compile module ${name}:`, err);
			throw err;
		}
	};

	// 编译主文件
	const mainCode = fileContents[mainFileName];
	if (!mainCode) {
		console.error(`[ModuleCompiler] Main file not found: ${mainFileName}`);
		console.error(
			"[ModuleCompiler] Available files:",
			Object.keys(fileContents),
		);
		return null;
	}

	const mainExports = compileModule(mainFileName, mainCode);

	// 获取组件
	let Component = mainExports.default || mainExports.Component;

	// 如果 default 是一个对象（可能是嵌套导出），尝试获取其 default
	if (Component && typeof Component === "object" && "default" in Component) {
		Component = (Component as Record<string, unknown>).default;
	}

	if (!Component) {
		console.warn(
			"[ModuleCompiler] No Component or default export found in main file",
		);
		console.warn("[ModuleCompiler] Main exports:", Object.keys(mainExports));
		return null;
	}

	if (typeof Component !== "function") {
		console.error(
			"[ModuleCompiler] Component is not a function:",
			typeof Component,
		);
		return null;
	}

	return Component as React.FC<Record<string, unknown>>;
}

// ============ 模块编译器 ============

class ModuleCompiler implements IModuleCompiler {
	private cache = new Map<string, CompiledModule>();

	/**
	 * 编译组件包
	 */
	async compile(bundle: ComponentBundle): Promise<CompiledModule> {
		// 检查缓存
		const cached = this.cache.get(bundle.id);
		if (cached && cached.compiledAt > Date.parse(bundle.updatedAt)) {
			return cached;
		}

		console.log(
			`[ModuleCompiler] Compiling bundle: ${bundle.id} (${bundle.name})`,
		);

		// Step 1: 验证所有文件
		const errors = await this.validate(bundle);
		if (errors.length > 0) {
			throw new CompileException(errors);
		}

		// Step 2: 构建文件内容映射 { 文件名(不含扩展名): 代码 }
		const fileContents: Record<string, string> = {};
		for (const file of bundle.files) {
			// 去掉扩展名作为 key
			const name = file.path.replace(/\.(tsx|ts|jsx|js)$/, "");
			fileContents[name] = file.content;
		}

		// Step 3: 获取入口文件名（不含扩展名）
		const mainFileName = bundle.entryPoint.replace(/\.(tsx|ts|jsx|js)$/, "");

		// Step 4: 编译组件
		const Component = executeMultiFileComponent(fileContents, mainFileName);

		if (!Component) {
			throw new Error("入口模块没有导出有效的 React 组件");
		}

		// Step 5: 缓存并返回
		const compiled: CompiledModule = {
			bundleId: bundle.id,
			compiledAt: Date.now(),
			component: Component,
			meta: bundle.meta,
		};

		this.cache.set(bundle.id, compiled);
		console.log(`[ModuleCompiler] Compiled successfully: ${bundle.id}`);

		return compiled;
	}

	/**
	 * 验证组件包（不执行，只检查语法和安全性）
	 */
	async validate(bundle: ComponentBundle): Promise<CompileError[]> {
		const errors: CompileError[] = [];

		// 检查入口文件是否存在
		const entryExists = bundle.files.some((f) => f.path === bundle.entryPoint);
		if (!entryExists) {
			errors.push({
				file: bundle.entryPoint,
				message: `入口文件不存在: ${bundle.entryPoint}`,
			});
		}

		// 检查依赖是否允许
		for (const dep of bundle.dependencies ?? []) {
			if (!isAllowedDependency(dep)) {
				errors.push({
					file: "manifest",
					message: `不允许的外部依赖: ${dep}`,
				});
			}
		}

		// 验证每个文件
		for (const file of bundle.files) {
			// 安全性检查
			const securityErrors = validateCode(file.content, file.path);
			errors.push(...securityErrors);

			// 语法检查（尝试转译）
			try {
				transform(file.content, {
					transforms: ["typescript", "jsx", "imports"],
					jsxRuntime: "classic",
					production: true,
				});
			} catch (error) {
				errors.push({
					file: file.path,
					message: `语法错误: ${error}`,
				});
			}
		}

		return errors;
	}

	/**
	 * 清除编译缓存
	 */
	clearCache(bundleId?: string): void {
		if (bundleId) {
			this.cache.delete(bundleId);
		} else {
			this.cache.clear();
		}
	}
}

// ============ 错误类 ============

export class CompileException extends Error {
	constructor(public errors: CompileError[]) {
		super(`编译失败: ${errors.map((e) => e.message).join("; ")}`);
		this.name = "CompileException";
	}
}

// ============ 导出 ============

export const moduleCompiler = new ModuleCompiler();

export type { IModuleCompiler };
