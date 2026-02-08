export type PropType = "string" | "number" | "color" | "boolean";

export interface EditableProp {
	key: string;
	type: PropType;
	label: string;
	defaultValue: unknown;
	min?: number;
	max?: number;
	step?: number;
	options?: { label: string; value: string | number }[];
}

export interface ComponentMeta {
	name: string;
	description?: string;
	editableProps: EditableProp[];
}

export interface RemotionComponentProps {
	[key: string]: unknown;
	__remotion_frame: number;
	__remotion_fps: number;
	__remotion_duration: number;
}

// ============ 转场组件类型 ============

export type TransitionType = "in" | "out" | "both";

export interface TransitionMeta extends ComponentMeta {
	/** 转场类型：入场、出场、或两者皆可 */
	transitionType: TransitionType;
	/** 推荐时长（秒） */
	defaultDuration: number;
}

export interface TransitionComponentProps extends RemotionComponentProps {
	/** 转场进度 0-1 */
	__transition_progress: number;
	/** 转场方向：in=入场, out=出场 */
	__transition_direction: "in" | "out";
}
