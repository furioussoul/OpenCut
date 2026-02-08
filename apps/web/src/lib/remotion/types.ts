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
	defaultDuration?: number;
}

export interface RemotionComponentProps {
	[key: string]: unknown;
	__remotion_frame: number;
	__remotion_fps: number;
	__remotion_duration: number;
}
