/**
 * 组件存储服务
 *
 * 通过 Next.js API 读取组件
 * 存储位置: {项目根目录}/.opencut/remotion-components/
 */

// ============ 类型定义 ============

export interface ComponentFileInfo {
	name: string;
	fileName: string;
	path: string;
	updatedAt: string;
}

export interface ComponentDetail {
	name: string;
	entryCode: string;
	dependencies: Array<{
		path: string;
		code: string;
	}>;
	meta?: {
		name?: string;
		description?: string;
		duration?: number;
	};
}

// ============ API ============

const API_BASE = "/api/remotion-components";

class ComponentStorageService {
	/**
	 * 列出所有组件
	 */
	async listComponents(): Promise<ComponentFileInfo[]> {
		const response = await fetch(API_BASE);

		if (!response.ok) {
			throw new Error(`Failed to list components: ${response.statusText}`);
		}

		const data = await response.json();
		return data.components;
	}

	/**
	 * 获取组件详情
	 */
	async getComponent(componentName: string): Promise<ComponentDetail | null> {
		const response = await fetch(`${API_BASE}/${componentName}`);

		if (response.status === 404) {
			return null;
		}

		if (!response.ok) {
			throw new Error(`Failed to get component: ${response.statusText}`);
		}

		return response.json();
	}
}

export const componentStorage = new ComponentStorageService();
