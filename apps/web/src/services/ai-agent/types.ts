/**
 * AI Agent 类型定义
 * 定义 Agent 与编辑器交互所需的所有数据结构
 */

// ============ 聊天消息 ============

export type MessageRole = "user" | "assistant" | "system";

export type MessageStatus = "pending" | "streaming" | "complete" | "error";

export interface ChatMessage {
	id: string;
	role: MessageRole;
	content: string;
	timestamp: number;
	status: MessageStatus;
	// Agent 执行的工具调用
	toolCalls?: ToolCall[];
}

// ============ 工具调用 ============

export interface ToolCall {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
	status: "pending" | "running" | "success" | "error";
	result?: unknown;
	error?: string;
}

// ============ Agent 任务 ============

export type AgentTaskStatus =
	| "idle"
	| "analyzing"
	| "downloading"
	| "processing"
	| "generating"
	| "importing"
	| "complete"
	| "error";

export interface AgentTask {
	id: string;
	status: AgentTaskStatus;
	progress: number; // 0-100
	currentStep: string;
	steps: AgentTaskStep[];
	result?: AgentTaskResult;
	error?: string;
}

export interface AgentTaskStep {
	id: string;
	name: string;
	status: "pending" | "running" | "complete" | "error";
	message?: string;
}

// ============ Agent 任务结果 ============

export interface AgentTaskResult {
	// 下载的媒体文件
	mediaFiles: DownloadedMedia[];
	// 生成的特效组件
	generatedEffects: GeneratedEffect[];
	// 生成的项目数据（时间线配置）
	projectData: GeneratedProjectData;
}

export interface DownloadedMedia {
	id: string;
	type: "video" | "audio" | "image";
	name: string;
	url: string; // Blob URL 或远程 URL
	duration?: number;
	width?: number;
	height?: number;
	// thumbnailUrl 会由 processMediaAssets 自动生成，无需在此指定
	thumbnailUrl?: string;
}

export interface GeneratedEffect {
	id: string;
	name: string;
	description: string;
	code: string; // React 组件源代码
	editableProps: EditableProp[];
}

export interface EditableProp {
	key: string;
	type: "string" | "number" | "color" | "boolean";
	label: string;
	defaultValue: unknown;
	min?: number;
	max?: number;
	step?: number;
}

// ============ 生成的项目数据 ============

export interface GeneratedProjectData {
	settings: {
		canvasSize: { width: number; height: number };
		fps: number;
	};
	// 时间线配置 - 直接使用 OpenCut 的类型
	tracks: GeneratedTrack[];
}

export interface GeneratedTrack {
	type: "video" | "audio" | "text" | "remotion";
	elements: GeneratedElement[];
}

export interface GeneratedElement {
	type: "video" | "audio" | "text" | "remotion";
	// 媒体元素
	mediaId?: string;
	// Remotion 特效元素
	componentId?: string;
	props?: Record<string, unknown>;
	// 通用属性
	name: string;
	startTime: number;
	duration: number;
	trimStart?: number;
	trimEnd?: number;
}

// ============ API 请求/响应 ============

export interface AgentChatRequest {
	message: string;
	conversationId?: string;
}

export interface AgentChatResponse {
	conversationId: string;
	message: ChatMessage;
	task?: AgentTask;
}

// ============ 视频分析结果 ============

export interface VideoAnalysis {
	duration: number;
	resolution: { width: number; height: number };
	fps: number;
	scenes: VideoScene[];
	highlights: VideoHighlight[];
	transcript?: TranscriptSegment[];
}

export interface VideoScene {
	start: number;
	end: number;
	description: string;
}

export interface VideoHighlight {
	time: number;
	duration: number;
	reason: string;
	score: number; // 0-1
}

export interface TranscriptSegment {
	start: number;
	end: number;
	text: string;
}
