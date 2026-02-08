/**
 * Remotion 组件服务端工具函数
 * 用于 Next.js API Routes
 *
 * 存储位置: {项目根目录}/.opencut/remotion-components/
 */
import path from "path";

// ============ 路径配置 ============

const OPENCUT_DIR = ".opencut";
const COMPONENTS_DIR = "remotion-components";
const COMPONENT_PATTERN = /^component_[\w]+\.tsx$/;

/**
 * 获取组件目录路径
 * 路径: {项目根目录}/.opencut/remotion-components/
 */
export function getComponentsPath(): string {
	return path.join(process.cwd(), OPENCUT_DIR, COMPONENTS_DIR);
}

/**
 * 检查是否是主组件文件
 * 只有 component_*.tsx 格式的文件会被自动加载
 */
export function isMainComponent(fileName: string): boolean {
	return COMPONENT_PATTERN.test(fileName);
}

/**
 * 从文件名获取组件名
 * component_test.tsx -> component_test
 */
export function getComponentName(fileName: string): string {
	return fileName.replace(".tsx", "");
}

/**
 * 解析组件元数据注释
 *
 * 格式:
 * /**
 *  * Component: ComponentName
 *  * Description: 组件描述
 *  * Duration: 5
 *  *\/
 */
export function parseComponentMeta(code: string): {
	name?: string;
	description?: string;
	duration?: number;
} {
	const metaMatch = code.match(/\/\*\*[\s\S]*?\*\//m);
	if (!metaMatch) return {};

	const comment = metaMatch[0];
	const nameMatch = comment.match(/Component:\s*(.+)/i);
	const descMatch = comment.match(/Description:\s*(.+)/i);
	const durationMatch = comment.match(/Duration:\s*(\d+(?:\.\d+)?)/i);

	return {
		name: nameMatch?.[1]?.trim(),
		description: descMatch?.[1]?.trim(),
		duration: durationMatch ? parseFloat(durationMatch[1]) : undefined,
	};
}

/**
 * 解析 import 语句，获取本地依赖
 * 只解析相对路径的 import (以 . 开头)
 */
export function parseLocalImports(code: string): string[] {
	const imports: string[] = [];
	const importRegex = /import\s+.*\s+from\s+['"](\.[^'"]+)['"]/g;

	let match;
	while ((match = importRegex.exec(code)) !== null) {
		imports.push(match[1]);
	}

	return imports;
}

/**
 * 解析相对路径，添加扩展名
 * ./shared/utils -> shared/utils.tsx
 */
export function resolveImportPath(importPath: string): string {
	let resolved = importPath.replace(/^\.\//, "");

	if (!resolved.endsWith(".tsx") && !resolved.endsWith(".ts")) {
		resolved += ".tsx";
	}

	return resolved;
}
