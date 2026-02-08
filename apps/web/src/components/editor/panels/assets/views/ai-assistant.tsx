"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiAgentService } from "@/services/ai-agent";
import type { ChatMessage, AgentTask } from "@/services/ai-agent/types";
import { cn } from "@/utils/ui";
import { Spinner } from "@/components/ui/spinner";

/**
 * AI Assistant 面板 - 与 AI Agent 对话进行自动剪辑
 */
export function AIAssistantView() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	// 订阅 Agent 事件
	useEffect(() => {
		const unsubMessage = aiAgentService.on("message", (data) => {
			const msg = data as ChatMessage;
			setMessages((prev) => [...prev, msg]);
		});

		const unsubTask = aiAgentService.on("task-update", (data) => {
			setCurrentTask(data as AgentTask);
		});

		const unsubError = aiAgentService.on("error", (error) => {
			console.error("Agent error:", error);
			setIsLoading(false);
		});

		return () => {
			unsubMessage();
			unsubTask();
			unsubError();
		};
	}, []);

	// 自动滚动到底部
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const handleSend = useCallback(async () => {
		const message = inputValue.trim();
		if (!message || isLoading) return;

		// 添加用户消息
		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			role: "user",
			content: message,
			timestamp: Date.now(),
			status: "complete",
		};
		setMessages((prev) => [...prev, userMessage]);
		setInputValue("");
		setIsLoading(true);

		try {
			await aiAgentService.sendMessage(message);
		} catch (error) {
			console.error("Failed to send message:", error);
			// 添加错误消息
			setMessages((prev) => [
				...prev,
				{
					id: Date.now().toString(),
					role: "assistant",
					content: "抱歉，发生了错误。请稍后重试。",
					timestamp: Date.now(),
					status: "error",
				},
			]);
		} finally {
			setIsLoading(false);
		}
	}, [inputValue, isLoading]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	const handleReset = useCallback(() => {
		aiAgentService.resetConversation();
		setMessages([]);
		setCurrentTask(null);
	}, []);

	return (
		<div className="flex h-full flex-col">
			{/* 头部 */}
			<div className="flex items-center justify-between border-b px-4 py-3">
				<div>
					<h3 className="text-sm font-medium">AI 剪辑助手</h3>
					<p className="text-xs text-muted-foreground">
						输入指令，AI 自动帮你剪辑视频
					</p>
				</div>
				{messages.length > 0 && (
					<Button variant="outline" size="sm" onClick={handleReset}>
						重置
					</Button>
				)}
			</div>

			{/* 消息列表 */}
			<ScrollArea className="flex-1 p-4" ref={scrollRef}>
				{messages.length === 0 ? (
					<EmptyState />
				) : (
					<div className="flex flex-col gap-4">
						{messages.map((msg) => (
							<MessageBubble key={msg.id} message={msg} />
						))}
						{isLoading && <LoadingIndicator />}
					</div>
				)}

				{/* 任务进度 */}
				{currentTask && currentTask.status !== "complete" && (
					<TaskProgress task={currentTask} />
				)}
			</ScrollArea>

			{/* 输入区域 */}
			<div className="border-t p-4">
				<div className="flex gap-2">
					<Input
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="输入剪辑指令，如：帮我剪一个30秒抖音视频..."
						disabled={isLoading}
						className="flex-1"
					/>
					<Button
						onClick={handleSend}
						disabled={isLoading || !inputValue.trim()}
					>
						{isLoading ? <Spinner className="size-4" /> : "发送"}
					</Button>
				</div>
				<p className="mt-2 text-xs text-muted-foreground">
					提示: 可以粘贴 YouTube 链接，AI 会自动下载并剪辑
				</p>
			</div>
		</div>
	);
}

/**
 * 空状态展示
 */
function EmptyState() {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 py-12">
			<div className="rounded-full bg-primary/10 p-4">
				<span className="text-3xl">🎬</span>
			</div>
			<div className="text-center">
				<h4 className="font-medium">开始 AI 剪辑</h4>
				<p className="mt-1 text-sm text-muted-foreground">
					告诉 AI 你想要什么样的视频
				</p>
			</div>
			<div className="mt-4 grid gap-2 text-sm">
				<ExamplePrompt text="帮我把这个视频剪成30秒抖音，突出精彩片段" />
				<ExamplePrompt text="下载这个 YouTube 视频，加上金粉特效" />
				<ExamplePrompt text="分析这个视频，找出最搞笑的3个片段" />
			</div>
		</div>
	);
}

function ExamplePrompt({ text }: { text: string }) {
	return (
		<div className="rounded-lg bg-muted/50 px-3 py-2 text-muted-foreground">
			"{text}"
		</div>
	);
}

/**
 * 消息气泡
 */
function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === "user";

	return (
		<div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"max-w-[80%] rounded-lg px-4 py-2",
					isUser
						? "bg-primary text-primary-foreground"
						: "bg-muted text-foreground",
					message.status === "error" && "bg-destructive/10 text-destructive",
				)}
			>
				<p className="text-sm whitespace-pre-wrap">{message.content}</p>

				{/* 工具调用状态 */}
				{message.toolCalls && message.toolCalls.length > 0 && (
					<div className="mt-2 border-t border-border/50 pt-2">
						{message.toolCalls.map((tool) => (
							<div key={tool.id} className="flex items-center gap-2 text-xs">
								<span
									className={cn(
										"size-2 rounded-full",
										tool.status === "success" && "bg-green-500",
										tool.status === "running" && "bg-yellow-500",
										tool.status === "error" && "bg-red-500",
										tool.status === "pending" && "bg-gray-500",
									)}
								/>
								<span className="text-muted-foreground">{tool.name}</span>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * 加载指示器
 */
function LoadingIndicator() {
	return (
		<div className="flex justify-start">
			<div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
				<Spinner className="size-4" />
				<span className="text-sm text-muted-foreground">AI 正在思考...</span>
			</div>
		</div>
	);
}

/**
 * 任务进度展示
 */
function TaskProgress({ task }: { task: AgentTask }) {
	return (
		<div className="mt-4 rounded-lg border bg-card p-4">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium">任务进度</span>
				<span className="text-xs text-muted-foreground">{task.progress}%</span>
			</div>

			{/* 进度条 */}
			<div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
				<div
					className="h-full bg-primary transition-all duration-300"
					style={{ width: `${task.progress}%` }}
				/>
			</div>

			{/* 当前步骤 */}
			<p className="mt-2 text-xs text-muted-foreground">{task.currentStep}</p>

			{/* 步骤列表 */}
			{task.steps.length > 0 && (
				<div className="mt-3 space-y-1">
					{task.steps.map((step) => (
						<div key={step.id} className="flex items-center gap-2 text-xs">
							<span
								className={cn(
									"size-1.5 rounded-full",
									step.status === "complete" && "bg-green-500",
									step.status === "running" && "bg-yellow-500 animate-pulse",
									step.status === "error" && "bg-red-500",
									step.status === "pending" && "bg-gray-400",
								)}
							/>
							<span
								className={cn(
									step.status === "complete" &&
										"text-muted-foreground line-through",
									step.status === "running" && "text-foreground font-medium",
									step.status === "pending" && "text-muted-foreground",
								)}
							>
								{step.name}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
