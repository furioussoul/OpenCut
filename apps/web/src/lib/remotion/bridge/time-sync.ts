/**
 * Remotion 时间同步桥接器
 * 负责将主编辑器时间转换为 Remotion 序列帧索引
 */
export interface TimeSyncResult {
	frame: number;
	fps: number;
	relativeTime: number;
	isOutRange: boolean;
}

export function syncRemotionTime({
	currentTime,
	startTime,
	duration,
	trimStart,
	fps,
}: {
	currentTime: number;
	startTime: number;
	duration: number;
	trimStart: number;
	fps: number;
}): TimeSyncResult {
	const relativeTime = currentTime - startTime;
	const isOutRange = relativeTime < 0 || relativeTime >= duration;
	
	// 计算元素内部的时间点（考虑裁剪）
	const internalTime = relativeTime + trimStart;
	const frame = Math.floor(internalTime * fps);

	return {
		frame: Math.max(0, frame),
		fps,
		relativeTime,
		isOutRange,
	};
}
