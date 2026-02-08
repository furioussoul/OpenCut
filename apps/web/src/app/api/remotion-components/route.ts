/**
 * GET /api/remotion-components
 * 列出所有 Remotion 组件
 */
import { NextResponse } from "next/server";
import {
	getComponentsPath,
	isMainComponent,
	getComponentName,
} from "@/lib/remotion/server-utils";
import fs from "fs/promises";
import path from "path";

export async function GET() {
	const componentsPath = getComponentsPath();

	// 目录不存在则返回空数组
	try {
		await fs.access(componentsPath);
	} catch {
		return NextResponse.json({ components: [] });
	}

	const entries = await fs.readdir(componentsPath, { withFileTypes: true });
	const components = [];

	for (const entry of entries) {
		if (entry.isFile() && isMainComponent(entry.name)) {
			const filePath = path.join(componentsPath, entry.name);
			const stat = await fs.stat(filePath);

			components.push({
				name: getComponentName(entry.name),
				fileName: entry.name,
				path: filePath,
				updatedAt: stat.mtime.toISOString(),
			});
		}
	}

	// 按更新时间排序（最新的在前）
	components.sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);

	return NextResponse.json({ components });
}
