/**
 * AI Agent Chat API - Mock 实现
 *
 * 这个接口模拟 AI Agent 的行为，后续会替换为真正的 Agent 逻辑
 * Agent 将支持：
 * - 自动拉取 YouTube 视频 (yt-dlp)
 * - 分析视频内容 (多模态 LLM)
 * - 生成特效组件代码
 * - 自动剪辑视频
 */

import { NextResponse } from "next/server";
import type {
	AgentChatRequest,
	AgentChatResponse,
	AgentTask,
	AgentTaskResult,
	ChatMessage,
} from "@/services/ai-agent/types";

// 使用本地 demo.mp4 作为测试视频
const MOCK_VIDEO_URL = "/demo.mp4";

export async function POST(request: Request) {
	try {
		const body: AgentChatRequest = await request.json();
		const { message, conversationId } = body;

		// 生成会话 ID
		const newConversationId = conversationId ?? `conv_${Date.now()}`;

		// ============================================================
		// TODO: 这里将来会替换为真正的 Agent 逻辑
		//
		// 真正的实现需要：
		// 1. 调用 Claude API (tool_use 模式)
		// 2. 定义并实现以下工具：
		//    - download_youtube: 使用 yt-dlp 下载视频
		//    - analyze_video: 抽帧 + Claude Vision 分析
		//    - generate_effect: 生成 React 特效组件代码
		//    - create_timeline: 生成时间线配置
		// 3. 执行 Agent 循环直到任务完成
		// ============================================================

		// 检测是否包含视频 URL 或剪辑关键词
		const isVideoRequest =
			message.includes("youtube.com") ||
			message.includes("youtu.be") ||
			message.includes("剪辑") ||
			message.includes("视频") ||
			message.includes("下载");

		let responseMessage: ChatMessage;
		let task: AgentTask | undefined;

		if (isVideoRequest) {
			// 模拟执行剪辑任务
			const taskResult = await mockAgentExecution(message);

			responseMessage = {
				id: `msg_${Date.now()}`,
				role: "assistant",
				content:
					"好的，我已经帮你完成了视频剪辑任务！\n\n" +
					"- 已下载示例视频\n" +
					"- 已添加到素材库\n" +
					"- 已创建时间线\n" +
					"- 已添加金粉特效\n\n" +
					"你可以在预览区查看效果，并进行进一步调整。",
				timestamp: Date.now(),
				status: "complete",
				toolCalls: [
					{ id: "1", name: "download_video", arguments: {}, status: "success" },
					{ id: "2", name: "analyze_video", arguments: {}, status: "success" },
					{ id: "3", name: "add_effect", arguments: {}, status: "success" },
					{
						id: "4",
						name: "create_timeline",
						arguments: {},
						status: "success",
					},
				],
			};

			task = {
				id: `task_${Date.now()}`,
				status: "complete",
				progress: 100,
				currentStep: "完成",
				steps: [
					{ id: "1", name: "下载视频", status: "complete" },
					{ id: "2", name: "分析内容", status: "complete" },
					{ id: "3", name: "添加特效", status: "complete" },
					{ id: "4", name: "生成时间线", status: "complete" },
				],
				result: taskResult,
			};
		} else {
			// 普通对话响应
			responseMessage = {
				id: `msg_${Date.now()}`,
				role: "assistant",
				content: getAssistantResponse(message),
				timestamp: Date.now(),
				status: "complete",
			};
		}

		const response: AgentChatResponse = {
			conversationId: newConversationId,
			message: responseMessage,
			task,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("AI Agent API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * Mock Agent 执行逻辑
 * TODO: 替换为真正的 Agent 实现
 */
async function mockAgentExecution(message: string): Promise<AgentTaskResult> {
	// 模拟返回一个示例视频和特效配置
	return {
		mediaFiles: [
			{
				id: "mock_video_1",
				type: "video",
				name: "demo.mp4",
				url: MOCK_VIDEO_URL,
				duration: 20, // demo 视频时长约 20 秒
				width: 1920,
				height: 1080,
			},
		],
		generatedEffects: [
			// 可以在这里添加动态生成的特效
			// 目前使用已注册的 golden-dust 特效
		],
		projectData: {
			settings: {
				canvasSize: { width: 1080, height: 1920 }, // 抖音尺寸
				fps: 30,
			},
			tracks: [
				{
					type: "video",
					elements: [
						{
							type: "video",
							mediaId: "mock_video_1",
							name: "demo.mp4",
							startTime: 0,
							duration: 20,
							trimStart: 0,
							trimEnd: 0,
						},
					],
				},
				{
					type: "remotion",
					elements: [
						{
							type: "remotion",
							componentId: "golden-dust", // 使用已注册的金粉特效
							name: "金粉飘落",
							startTime: 0,
							duration: 20,
							props: {
								particleCount: 80,
								color: "#FFD700",
								speed: 1.2,
							},
						},
					],
				},
			],
		},
	};
}

/**
 * 获取助手响应（非剪辑任务）
 */
function getAssistantResponse(message: string): string {
	// 简单的响应逻辑
	if (message.includes("你好") || message.includes("hello")) {
		return (
			"你好！我是 AI 剪辑助手。我可以帮你：\n\n" +
			"1. 下载 YouTube 视频\n" +
			"2. 分析视频内容，找出精彩片段\n" +
			"3. 自动剪辑并添加特效\n" +
			"4. 生成适合不同平台的视频\n\n" +
			"试试发送一个 YouTube 链接，或者告诉我你想要什么样的视频！"
		);
	}

	if (message.includes("帮助") || message.includes("help")) {
		return (
			"我可以帮你自动剪辑视频！\n\n" +
			"**使用方法：**\n" +
			"1. 发送 YouTube 链接 + 剪辑要求\n" +
			"2. 例如：'帮我把这个视频剪成30秒抖音，加点金粉特效'\n\n" +
			"**支持的功能：**\n" +
			"- 视频下载\n" +
			"- 内容分析\n" +
			"- 自动剪辑\n" +
			"- 特效添加\n" +
			"- 多平台适配"
		);
	}

	return (
		"我理解了你的需求。如果你想让我帮你剪辑视频，请发送视频链接和具体要求。\n\n" +
		"例如：'帮我剪一个30秒的抖音视频，突出精彩片段'"
	);
}
