/**
 * GET /api/remotion-components/[name]
 * 获取组件代码和依赖
 */
import { NextResponse } from "next/server";
import {
	getComponentsPath,
	parseComponentMeta,
	parseLocalImports,
	resolveImportPath,
} from "@/lib/remotion/server-utils";
import fs from "fs/promises";
import path from "path";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ name: string }> },
) {
	const { name: componentName } = await params;
	const componentsPath = getComponentsPath();
	const fileName = `${componentName}.tsx`;
	const filePath = path.join(componentsPath, fileName);

	// 检查文件是否存在
	try {
		await fs.access(filePath);
	} catch {
		return NextResponse.json({ error: "Component not found" }, { status: 404 });
	}

	// 读取主组件代码
	const entryCode = await fs.readFile(filePath, "utf-8");

	// 解析元数据
	const meta = parseComponentMeta(entryCode);

	// 解析并加载依赖
	const imports = parseLocalImports(entryCode);
	const dependencies: Array<{ path: string; code: string }> = [];

	for (const importPath of imports) {
		const resolvedPath = resolveImportPath(importPath);
		const depFilePath = path.join(componentsPath, resolvedPath);

		try {
			const depCode = await fs.readFile(depFilePath, "utf-8");
			dependencies.push({ path: resolvedPath, code: depCode });
		} catch {
			// 尝试 .ts 扩展名
			const tsPath = depFilePath.replace(".tsx", ".ts");
			try {
				const depCode = await fs.readFile(tsPath, "utf-8");
				dependencies.push({
					path: resolvedPath.replace(".tsx", ".ts"),
					code: depCode,
				});
			} catch {
				// 依赖文件不存在，跳过
			}
		}
	}

	return NextResponse.json({
		name: componentName,
		entryCode,
		dependencies,
		meta: meta.name ? meta : undefined,
	});
}
