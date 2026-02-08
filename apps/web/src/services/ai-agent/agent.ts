/**
 * AI Agent Service
 * 负责与后端 Agent API 通信（SSE），并执行自动剪辑任务
 */

import { EditorCore } from "@/core";
import { OPFSAdapter } from "@/services/storage/opfs-adapter";
import { processMediaAssets } from "@/lib/media/processing";
import type {
	AgentChatRequest,
	AgentChatResponse,
	AgentTask,
	AgentTaskResult,
	DownloadedMedia,
	GeneratedEffect,
	ChatMessage,
} from "./types";
import { compileEffectCode } from "./effect-compiler";

type AgentEventType =
	| "message.start"
	| "message.delta"
	| "message.complete"
	| "component.created"
	| "component.updated"
	| "component.deleted"
	| "task-update"
	| "error";

type AgentEventListener = (data: unknown) => void;

// OPFS 适配器用于存储大文件
const opfsAdapter = new OPFSAdapter("ai-agent-media");

class AIAgentService {
	private listeners = new Map<AgentEventType, Set<AgentEventListener>>();
	private currentTask: AgentTask | null = null;
	private conversationId: string | null = null;

	constructor() {
		// 初始化事件监听器集合
		const events: AgentEventType[] = [
			"message.start",
			"message.delta",
			"message.complete",
			"component.created",
			"component.updated",
			"component.deleted",
			"task-update",
			"error",
		];
		for (const event of events) {
			this.listeners.set(event, new Set());
		}
	}

	/**
	 * 发送消息给 AI Agent (SSE 流式)
	 * @param message 用户消息
	 * @param onDelta 收到增量内容时的回调
	 * @returns 完整的响应内容
	 */
	async sendMessage(
		message: string,
		onDelta?: (content: string) => void,
	): Promise<string> {
		const request: AgentChatRequest = {
			message,
			conversationId: this.conversationId ?? undefined,
		};

		try {
			const response = await fetch("/api/ai-agent/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(request),
			});

			if (!response.ok) {
				throw new Error(`Agent API error: ${response.status}`);
			}

			// 处理 SSE 流
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("No response body");
			}

			const decoder = new TextDecoder();
			let fullContent = "";
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });

				// 解析 SSE 事件
				const lines = buffer.split("\n");
				buffer = lines.pop() || ""; // 保留不完整的行

				let currentEvent = "";
				for (const line of lines) {
					if (line.startsWith("event: ")) {
						currentEvent = line.slice(7);
					} else if (line.startsWith("data: ") && currentEvent) {
						const data = JSON.parse(line.slice(6));
						this.handleSSEEvent(currentEvent, data, (content) => {
							fullContent += content;
							onDelta?.(content);
						});
						currentEvent = "";
					}
				}
			}

			return fullContent;
		} catch (error) {
			this.emit("error", error);
			throw error;
		}
	}

	/**
	 * 处理 SSE 事件
	 */
	private handleSSEEvent(
		event: string,
		data: unknown,
		onDelta: (content: string) => void,
	): void {
		switch (event) {
			case "message.start":
				this.emit("message.start", data);
				break;

			case "message.delta": {
				const deltaData = data as { content?: string };
				if (deltaData.content) {
					onDelta(deltaData.content);
				}
				this.emit("message.delta", data);
				break;
			}

			case "message.complete":
				this.emit("message.complete", data);
				break;

			case "component.created":
				console.log("[AIAgentService] Component created:", data);
				this.emit("component.created", data);
				// 通知 RemotionManager 加载新组件
				this.handleComponentCreated(data as { componentName: string });
				break;

			case "component.updated":
				console.log("[AIAgentService] Component updated:", data);
				this.emit("component.updated", data);
				this.handleComponentUpdated(data as { componentName: string });
				break;

			case "component.deleted":
				console.log("[AIAgentService] Component deleted:", data);
				this.emit("component.deleted", data);
				this.handleComponentDeleted(data as { componentName: string });
				break;

			case "file.write.start":
			case "file.write.complete":
				// 文件写入事件，可用于 UI 显示进度
				console.log(`[AIAgentService] ${event}:`, data);
				break;

			default:
				console.log(`[AIAgentService] Unknown event: ${event}`, data);
		}
	}

	/**
	 * 处理组件创建事件
	 */
	private async handleComponentCreated(data: {
		componentName: string;
	}): Promise<void> {
		try {
			const editor = EditorCore.getInstance();
			await editor.remotion.onComponentCreated(data.componentName);
		} catch (error) {
			console.error("Failed to handle component creation:", error);
		}
	}

	/**
	 * 处理组件更新事件
	 */
	private async handleComponentUpdated(data: {
		componentName: string;
	}): Promise<void> {
		try {
			const editor = EditorCore.getInstance();
			await editor.remotion.onComponentUpdated(data.componentName);
		} catch (error) {
			console.error("Failed to handle component update:", error);
		}
	}

	/**
	 * 处理组件删除事件
	 */
	private async handleComponentDeleted(data: {
		componentName: string;
	}): Promise<void> {
		try {
			const editor = EditorCore.getInstance();
			await editor.remotion.onComponentDeleted(data.componentName);
		} catch (error) {
			console.error("Failed to handle component deletion:", error);
		}
	}

	/**
	 * 导入 Agent 任务结果到编辑器
	 * 包括：媒体文件、特效组件、时间线配置
	 */
	async importTaskResult(result: AgentTaskResult): Promise<void> {
		try {
			// Step 1: 导入媒体文件到素材库 (大文件使用 OPFS 存储)
			const mediaIdMap = await this.importMediaFiles(result.mediaFiles);

			// Step 2: 注册生成的特效组件
			await this.registerEffects(result.generatedEffects);

			// Step 3: 创建时间线
			await this.createTimeline(result.projectData, mediaIdMap);

			console.log("Agent 任务结果已成功导入编辑器");
		} catch (error) {
			console.error("导入 Agent 任务结果失败:", error);
			throw error;
		}
	}

	/**
	 * 导入媒体文件到素材库
	 * 使用 processMediaAssets 处理文件（会自动生成缩略图）
	 * 大文件使用 OPFS 存储
	 * @returns 媒体 ID 映射表 (原始ID -> 编辑器中的ID)
	 */
	private async importMediaFiles(
		mediaFiles: DownloadedMedia[],
	): Promise<Map<string, string>> {
		const editor = EditorCore.getInstance();
		const mediaIdMap = new Map<string, string>();
		const project = editor.project.getActive();

		if (!project) {
			console.error("No active project");
			return mediaIdMap;
		}

		const projectId = project.metadata.id;

		for (const media of mediaFiles) {
			try {
				// 从 URL 获取文件
				const response = await fetch(media.url);
				const blob = await response.blob();

				// 确定文件 MIME 类型
				let mimeType = blob.type;
				if (!mimeType || mimeType === "application/octet-stream") {
					// 根据文件扩展名推断
					if (media.name.endsWith(".mp4")) mimeType = "video/mp4";
					else if (media.name.endsWith(".webm")) mimeType = "video/webm";
					else if (media.name.endsWith(".mov")) mimeType = "video/quicktime";
					else if (media.name.endsWith(".mp3")) mimeType = "audio/mpeg";
					else if (media.name.endsWith(".wav")) mimeType = "audio/wav";
					else if (media.name.endsWith(".jpg") || media.name.endsWith(".jpeg"))
						mimeType = "image/jpeg";
					else if (media.name.endsWith(".png")) mimeType = "image/png";
				}

				const file = new File([blob], media.name, { type: mimeType });

				// 生成存储 key
				const storageKey = `${projectId}_${media.id}_${media.name}`;

				// 大文件存储到 OPFS (> 5MB)
				if (OPFSAdapter.isSupported() && file.size > 5 * 1024 * 1024) {
					await opfsAdapter.set(storageKey, file);
					console.log(
						`大文件已存储到 OPFS: ${media.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
					);
				}

				// 使用 processMediaAssets 处理文件（会生成缩略图）
				const processedAssets = await processMediaAssets({ files: [file] });

				if (processedAssets.length > 0) {
					const processedAsset = processedAssets[0];

					// 导入到媒体库
					await editor.media.addMediaAsset({
						projectId,
						asset: processedAsset,
					});

					// 获取最新导入的媒体 ID
					const assets = editor.media.getAssets();
					const importedAsset = assets.find((a) => a.name === media.name);
					if (importedAsset) {
						mediaIdMap.set(media.id, importedAsset.id);
					}

					console.log(`媒体文件已导入: ${media.name}`);
				}
			} catch (error) {
				console.error(`导入媒体文件失败: ${media.name}`, error);
			}
		}

		return mediaIdMap;
	}

	/**
	 * 注册生成的特效组件
	 */
	private async registerEffects(effects: GeneratedEffect[]): Promise<void> {
		const editor = EditorCore.getInstance();

		for (const effect of effects) {
			try {
				// 使用 sucrase 编译并注册组件
				const component = compileEffectCode(effect.code);

				if (component) {
					editor.remotion.registerComponent(effect.id, component, {
						name: effect.name,
						description: effect.description,
						editableProps: effect.editableProps,
					});
					console.log(`特效组件已注册: ${effect.name}`);
				}
			} catch (error) {
				console.error(`注册特效组件失败: ${effect.name}`, error);
			}
		}
	}

	/**
	 * 根据 Agent 生成的项目数据创建时间线
	 */
	private async createTimeline(
		projectData: AgentTaskResult["projectData"],
		mediaIdMap: Map<string, string>,
	): Promise<void> {
		const editor = EditorCore.getInstance();

		// 更新项目设置
		editor.project.updateSettings({
			settings: {
				canvasSize: projectData.settings.canvasSize,
				fps: projectData.settings.fps,
			},
			pushHistory: false,
		});

		// 创建时间线元素
		for (const track of projectData.tracks) {
			for (const element of track.elements) {
				// 映射媒体 ID
				const mappedMediaId = element.mediaId
					? (mediaIdMap.get(element.mediaId) ?? element.mediaId)
					: undefined;

				if (element.type === "video" || element.type === "audio") {
					if (!mappedMediaId) continue;

					editor.timeline.insertElement({
						element: {
							type: element.type,
							name: element.name,
							mediaId: mappedMediaId,
							startTime: element.startTime,
							duration: element.duration,
							trimStart: element.trimStart ?? 0,
							trimEnd: element.trimEnd ?? 0,
							transform: { scale: 1, position: { x: 0, y: 0 }, rotate: 0 },
							opacity: 1,
						} as any,
						placement: { mode: "auto" },
					});
				} else if (element.type === "remotion" && element.componentId) {
					editor.timeline.insertElement({
						element: {
							type: "remotion",
							name: element.name,
							componentId: element.componentId,
							color: "#a855f7",
							props: element.props ?? {},
							startTime: element.startTime,
							duration: element.duration,
							trimStart: 0,
							trimEnd: 0,
							transform: { scale: 1, position: { x: 0, y: 0 }, rotate: 0 },
							opacity: 1,
						},
						placement: { mode: "auto" },
					});
				}
			}
		}

		console.log("时间线已创建");
	}

	/**
	 * 获取当前任务状态
	 */
	getCurrentTask(): AgentTask | null {
		return this.currentTask;
	}

	/**
	 * 重置会话
	 */
	resetConversation(): void {
		this.conversationId = null;
		this.currentTask = null;
	}

	/**
	 * 订阅事件
	 */
	on(event: AgentEventType, listener: AgentEventListener): () => void {
		const listeners = this.listeners.get(event);
		listeners?.add(listener);
		return () => listeners?.delete(listener);
	}

	/**
	 * 触发事件
	 */
	private emit(event: AgentEventType, data: unknown): void {
		const listeners = this.listeners.get(event);
		listeners?.forEach((listener) => listener(data));
	}
}

// 单例导出
export const aiAgentService = new AIAgentService();
