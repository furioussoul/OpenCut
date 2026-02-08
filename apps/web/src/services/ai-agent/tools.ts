/**
 * AI Agent 工具定义
 *
 * 这些工具定义将在真正实现 Agent 时使用
 * Agent 通过 tool_use 调用这些工具来完成任务
 */

export interface ToolDefinition {
	name: string;
	description: string;
	parameters: {
		type: "object";
		properties: Record<
			string,
			{
				type: string;
				description: string;
				enum?: string[];
				default?: unknown;
			}
		>;
		required?: string[];
	};
}

/**
 * 素材获取工具
 */
export const MEDIA_TOOLS: ToolDefinition[] = [
	{
		name: "download_youtube",
		description: "下载 YouTube 视频到本地，支持指定质量和格式",
		parameters: {
			type: "object",
			properties: {
				url: {
					type: "string",
					description: "YouTube 视频 URL",
				},
				quality: {
					type: "string",
					description: "视频质量",
					enum: ["best", "1080p", "720p", "480p"],
					default: "best",
				},
				downloadSubtitles: {
					type: "boolean",
					description: "是否下载字幕",
					default: true,
				},
			},
			required: ["url"],
		},
	},
	{
		name: "fetch_subtitles",
		description: "获取视频字幕/转录文本",
		parameters: {
			type: "object",
			properties: {
				url: {
					type: "string",
					description: "视频 URL",
				},
				language: {
					type: "string",
					description: "字幕语言",
					default: "zh",
				},
			},
			required: ["url"],
		},
	},
];

/**
 * 视频分析工具
 */
export const ANALYSIS_TOOLS: ToolDefinition[] = [
	{
		name: "analyze_video_content",
		description: "分析视频内容，返回场景列表、关键时刻、情绪曲线等",
		parameters: {
			type: "object",
			properties: {
				mediaId: {
					type: "string",
					description: "媒体资源 ID",
				},
				analysisType: {
					type: "string",
					description:
						"分析类型：scenes(场景), highlights(高能), audio(音频), all(全部)",
					enum: ["scenes", "highlights", "audio", "all"],
					default: "all",
				},
				frameInterval: {
					type: "number",
					description: "抽帧间隔(秒)",
					default: 3,
				},
			},
			required: ["mediaId"],
		},
	},
	{
		name: "detect_highlights",
		description: "检测视频中的高能/精彩时刻",
		parameters: {
			type: "object",
			properties: {
				mediaId: {
					type: "string",
					description: "媒体资源 ID",
				},
				minScore: {
					type: "number",
					description: "最小精彩分数阈值 (0-1)",
					default: 0.7,
				},
				maxCount: {
					type: "number",
					description: "最多返回多少个高能时刻",
					default: 10,
				},
			},
			required: ["mediaId"],
		},
	},
	{
		name: "get_video_info",
		description: "获取视频元数据信息",
		parameters: {
			type: "object",
			properties: {
				mediaId: {
					type: "string",
					description: "媒体资源 ID",
				},
			},
			required: ["mediaId"],
		},
	},
];

/**
 * 特效生成工具
 */
export const EFFECT_TOOLS: ToolDefinition[] = [
	{
		name: "generate_effect",
		description: "根据描述生成新的视觉特效组件代码",
		parameters: {
			type: "object",
			properties: {
				description: {
					type: "string",
					description: "特效描述，如'彩虹色的粒子从四周向中心聚拢'",
				},
				style: {
					type: "string",
					description: "特效风格",
					enum: ["particle", "text", "overlay", "transition", "filter"],
					default: "particle",
				},
				editableProps: {
					type: "string",
					description: "用户可调整的属性列表 (JSON 格式)",
				},
			},
			required: ["description"],
		},
	},
	{
		name: "list_effects",
		description: "列出所有可用的特效组件",
		parameters: {
			type: "object",
			properties: {},
		},
	},
];

/**
 * 时间线操作工具
 */
export const TIMELINE_TOOLS: ToolDefinition[] = [
	{
		name: "add_clip",
		description: "将视频片段添加到时间线",
		parameters: {
			type: "object",
			properties: {
				mediaId: {
					type: "string",
					description: "媒体资源 ID",
				},
				sourceStart: {
					type: "number",
					description: "源视频开始时间(秒)",
				},
				sourceEnd: {
					type: "number",
					description: "源视频结束时间(秒)",
				},
				timelinePosition: {
					type: "number",
					description: "在时间线上的位置(秒)，-1 表示追加到末尾",
					default: -1,
				},
			},
			required: ["mediaId", "sourceStart", "sourceEnd"],
		},
	},
	{
		name: "trim_clip",
		description: "裁剪时间线上的片段",
		parameters: {
			type: "object",
			properties: {
				elementId: {
					type: "string",
					description: "元素 ID",
				},
				trimStart: {
					type: "number",
					description: "开头裁剪量(秒)",
				},
				trimEnd: {
					type: "number",
					description: "结尾裁剪量(秒)",
				},
			},
			required: ["elementId"],
		},
	},
	{
		name: "split_clip",
		description: "在指定位置分割片段",
		parameters: {
			type: "object",
			properties: {
				elementId: {
					type: "string",
					description: "元素 ID",
				},
				splitTime: {
					type: "number",
					description: "分割时间点(秒)",
				},
			},
			required: ["elementId", "splitTime"],
		},
	},
	{
		name: "add_effect",
		description: "在时间线上添加特效",
		parameters: {
			type: "object",
			properties: {
				effectId: {
					type: "string",
					description: "特效组件 ID",
				},
				startTime: {
					type: "number",
					description: "开始时间(秒)",
				},
				duration: {
					type: "number",
					description: "持续时间(秒)",
				},
				props: {
					type: "string",
					description: "特效参数 (JSON 格式)",
				},
			},
			required: ["effectId", "startTime", "duration"],
		},
	},
	{
		name: "add_text",
		description: "在时间线上添加文字",
		parameters: {
			type: "object",
			properties: {
				text: {
					type: "string",
					description: "文字内容",
				},
				startTime: {
					type: "number",
					description: "开始时间(秒)",
				},
				duration: {
					type: "number",
					description: "持续时间(秒)",
				},
				style: {
					type: "string",
					description: "文字样式 (JSON 格式)",
				},
			},
			required: ["text", "startTime", "duration"],
		},
	},
	{
		name: "get_timeline",
		description: "获取当前时间线状态",
		parameters: {
			type: "object",
			properties: {},
		},
	},
];

/**
 * 导出工具
 */
export const EXPORT_TOOLS: ToolDefinition[] = [
	{
		name: "export_video",
		description: "导出最终视频",
		parameters: {
			type: "object",
			properties: {
				format: {
					type: "string",
					description: "输出格式",
					enum: ["mp4", "webm", "gif"],
					default: "mp4",
				},
				quality: {
					type: "string",
					description: "输出质量",
					enum: ["high", "medium", "low"],
					default: "high",
				},
				aspectRatio: {
					type: "string",
					description: "宽高比预设",
					enum: ["16:9", "9:16", "1:1", "4:3", "original"],
					default: "original",
				},
			},
		},
	},
	{
		name: "export_preview",
		description: "快速导出预览",
		parameters: {
			type: "object",
			properties: {
				startTime: {
					type: "number",
					description: "预览开始时间",
				},
				endTime: {
					type: "number",
					description: "预览结束时间",
				},
			},
		},
	},
];

/**
 * 所有工具定义
 */
export const ALL_TOOLS: ToolDefinition[] = [
	...MEDIA_TOOLS,
	...ANALYSIS_TOOLS,
	...EFFECT_TOOLS,
	...TIMELINE_TOOLS,
	...EXPORT_TOOLS,
];
