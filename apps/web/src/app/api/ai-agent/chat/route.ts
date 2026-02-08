/**
 * AI Agent Chat API - Mock SSE 实现
 *
 * 这个接口模拟 AI Agent 的行为，使用 SSE 流式返回
 * 当 Agent 创建/更新/删除组件文件时，会发送对应事件
 */

import { getComponentsPath } from "@/lib/remotion/server-utils";
import fs from "fs/promises";
import path from "path";

// ============ SSE 事件类型 ============

interface SSEEvent {
	event: string;
	data: unknown;
}

// ============ 组件模板 ============

const COMPONENT_TEMPLATES: Record<string, { code: string; duration: number }> =
	{
		golden_dust: {
			duration: 8,
			code: `/**
 * Component: GoldenDust
 * Description: 金色粒子飘落特效
 * Duration: 8
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function GoldenDust() {
  const frame = useCurrentFrame();
  const { height, durationInFrames } = useVideoConfig();

  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 60,
    size: 4 + Math.random() * 8,
    speed: 0.5 + Math.random() * 1.5,
    opacity: 0.3 + Math.random() * 0.7,
  }));

  return (
    <AbsoluteFill>
      {particles.map((particle) => {
        const adjustedFrame = Math.max(0, frame - particle.delay);
        const y = interpolate(adjustedFrame, [0, durationInFrames], [-50, height + 50], { extrapolateRight: "clamp" }) * particle.speed;
        const shimmer = Math.sin(frame * 0.1 + particle.id) * 0.3 + 0.7;
        return (
          <div key={particle.id} style={{
            position: "absolute",
            left: \`\${particle.x}%\`,
            top: y,
            width: particle.size,
            height: particle.size,
            borderRadius: "50%",
            background: \`radial-gradient(circle, rgba(255,215,0,\${particle.opacity * shimmer}) 0%, rgba(255,180,0,0) 70%)\`,
            boxShadow: \`0 0 \${particle.size * 2}px rgba(255,215,0,\${particle.opacity * 0.5})\`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
}`,
		},
		text_reveal: {
			duration: 5,
			code: `/**
 * Component: TextReveal
 * Description: 文字逐字显现动画
 * Duration: 5
 */
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export default function TextReveal() {
  const frame = useCurrentFrame();
  const text = "Hello OpenCut!";

  return (
    <AbsoluteFill style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {text.split("").map((char, i) => {
          const delay = i * 3;
          const opacity = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y = interpolate(frame - delay, [0, 10], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <span key={i} style={{ fontSize: 72, fontWeight: "bold", color: "#fff", opacity, transform: \`translateY(\${y}px)\`, textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
              {char === " " ? "\\u00A0" : char}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}`,
		},
		neon_glow: {
			duration: 6,
			code: `/**
 * Component: NeonGlow
 * Description: 霓虹灯光效果
 * Duration: 6
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";

export default function NeonGlow() {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.1) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{
        fontSize: 80,
        fontWeight: "bold",
        color: "#fff",
        textShadow: \`
          0 0 10px #ff00ff,
          0 0 20px #ff00ff,
          0 0 40px #ff00ff,
          0 0 80px #ff00ff
        \`,
        opacity: pulse,
      }}>
        NEON
      </div>
    </AbsoluteFill>
  );
}`,
		},
	};

// ============ POST Handler (SSE) ============

export async function POST(request: Request) {
	const encoder = new TextEncoder();

	try {
		const body = await request.json();
		const { message } = body;

		// 创建 SSE 流
		const stream = new ReadableStream({
			async start(controller) {
				const send = (event: SSEEvent) => {
					controller.enqueue(
						encoder.encode(
							`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`,
						),
					);
				};

				// 发送开始事件
				send({ event: "message.start", data: { id: `msg_${Date.now()}` } });

				// 检测是否是特效/组件相关请求
				const isEffectRequest =
					message.includes("特效") ||
					message.includes("效果") ||
					message.includes("组件") ||
					message.includes("粒子") ||
					message.includes("金粉") ||
					message.includes("文字") ||
					message.includes("霓虹") ||
					message.includes("effect");

				if (isEffectRequest) {
					// 模拟思考
					send({
						event: "message.delta",
						data: { content: "好的，我来为你创建一个特效组件...\n\n" },
					});
					await sleep(500);

					// 选择组件模板
					let templateKey = "golden_dust";
					if (message.includes("文字") || message.includes("text")) {
						templateKey = "text_reveal";
					} else if (message.includes("霓虹") || message.includes("neon")) {
						templateKey = "neon_glow";
					}

					const template = COMPONENT_TEMPLATES[templateKey];
					const componentName = `component_${templateKey}`;
					const fileName = `${componentName}.tsx`;

					// 发送文件写入开始事件
					send({
						event: "file.write.start",
						data: {
							filePath: `.opencut/remotion-components/${fileName}`,
							componentName,
						},
					});
					await sleep(300);

					send({
						event: "message.delta",
						data: { content: `正在创建组件: ${componentName}...\n` },
					});

					// 实际写入文件
					const componentsPath = getComponentsPath();
					await fs.mkdir(componentsPath, { recursive: true });
					const filePath = path.join(componentsPath, fileName);
					await fs.writeFile(filePath, template.code, "utf-8");

					// 发送文件写入完成事件
					send({
						event: "file.write.complete",
						data: {
							filePath: `.opencut/remotion-components/${fileName}`,
							componentName,
							type: "created",
						},
					});
					await sleep(200);

					// 发送组件创建事件（前端 ComponentSyncService 监听这个）
					send({
						event: "component.created",
						data: {
							componentName,
							filePath: `.opencut/remotion-components/${fileName}`,
							duration: template.duration,
						},
					});

					send({
						event: "message.delta",
						data: {
							content: `\n组件已创建并添加到时间线！\n- 组件名: ${componentName}\n- 时长: ${template.duration}秒\n\n你可以在预览区查看效果。`,
						},
					});
				} else {
					// 普通对话
					const response = getAssistantResponse(message);
					send({ event: "message.delta", data: { content: response } });
				}

				// 发送完成事件
				await sleep(100);
				send({ event: "message.complete", data: {} });

				controller.close();
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("AI Agent API error:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

// ============ 辅助函数 ============

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAssistantResponse(message: string): string {
	if (message.includes("你好") || message.includes("hello")) {
		return (
			"你好！我是 AI 剪辑助手。我可以帮你：\n\n" +
			"1. 创建各种特效组件（金粉、文字动画、霓虹等）\n" +
			"2. 分析视频内容\n" +
			"3. 自动剪辑视频\n\n" +
			"试试说：'帮我创建一个金粉特效'"
		);
	}

	if (message.includes("帮助") || message.includes("help")) {
		return (
			"我可以帮你创建特效组件！\n\n" +
			"**可用的特效：**\n" +
			"- 金粉/粒子特效：说 '创建金粉特效'\n" +
			"- 文字动画：说 '创建文字特效'\n" +
			"- 霓虹效果：说 '创建霓虹特效'\n\n" +
			"创建后会自动添加到时间线。"
		);
	}

	return (
		"我理解了你的需求。\n\n" +
		"如果你想创建特效，可以说：\n" +
		"- '帮我创建一个金粉特效'\n" +
		"- '添加文字动画效果'\n" +
		"- '创建霓虹灯效果'"
	);
}
