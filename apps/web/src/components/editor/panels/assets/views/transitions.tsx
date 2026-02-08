"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/hooks/use-editor";
import {
	getRegisteredTransitionIds,
	getTransitionComponent,
	getTransitionComponentMeta,
} from "@/lib/remotion/registry";
import type { TransitionMeta } from "@/lib/remotion/types";
import { SlidersHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * Transitions 面板 - 展示已注册的转场组件
 *
 * 转场效果可以：
 * 1. 拖拽到两个片段之间（未来功能）
 * 2. 应用到选中片段的入场/出场（当前功能）
 */
export function TransitionsView() {
	return (
		<div className="flex h-full flex-col overflow-hidden">
			<TransitionsContentView />
		</div>
	);
}

function TransitionsContentView() {
	const editor = useEditor();
	const [applyingTransition, setApplyingTransition] = useState<string | null>(
		null,
	);
	const [, forceUpdate] = useState({});

	// 订阅 remotion manager 的变化
	useEffect(() => {
		const unsubscribe = editor.remotion.subscribe(() => {
			forceUpdate({});
		});
		return unsubscribe;
	}, [editor.remotion]);

	// 获取所有已注册的转场组件
	const transitionIds = getRegisteredTransitionIds();

	const transitions = useMemo(() => {
		return transitionIds.map((id) => ({
			id,
			component: getTransitionComponent(id),
			meta: getTransitionComponentMeta(id),
		}));
	}, [transitionIds]);

	const handleApplyTransition = useCallback(
		async (
			transitionId: string,
			meta?: TransitionMeta,
			direction?: "in" | "out",
		) => {
			setApplyingTransition(transitionId);

			try {
				// 获取当前选中的元素
				const selectedElements = editor.selection.getSelectedElements();

				if (selectedElements.length === 0) {
					toast.error("请先选择一个片段");
					return;
				}

				// TODO: 实现转场应用逻辑
				// 当前只是展示提示信息，实际实现需要：
				// 1. 在元素数据中存储 transition 配置
				// 2. 在渲染时读取并应用转场效果

				toast.success(
					`转场 "${meta?.name ?? transitionId}" 已选择 (${direction === "in" ? "入场" : "出场"})`,
					{
						description: "转场功能即将推出",
					},
				);
			} catch (error) {
				console.error("Failed to apply transition:", error);
				toast.error("应用转场失败");
			} finally {
				setApplyingTransition(null);
			}
		},
		[editor],
	);

	if (transitions.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 p-4">
				<HugeiconsIcon
					icon={SlidersHorizontalIcon}
					className="text-muted-foreground size-10"
				/>
				<div className="flex flex-col gap-2 text-center">
					<p className="text-lg font-medium">暂无转场效果</p>
					<p className="text-muted-foreground text-sm text-balance">
						转场效果注册后将在此显示
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col gap-4 p-4">
			<div className="text-muted-foreground text-sm">
				{transitions.length} 个转场效果可用
			</div>

			<ScrollArea className="h-full flex-1">
				<div className="grid gap-3">
					{transitions.map(({ id, meta }) => (
						<TransitionItem
							key={id}
							transitionId={id}
							meta={meta}
							onApply={(direction) =>
								handleApplyTransition(id, meta, direction)
							}
							isApplying={applyingTransition === id}
						/>
					))}
				</div>
			</ScrollArea>
		</div>
	);
}

interface TransitionItemProps {
	transitionId: string;
	meta?: TransitionMeta;
	onApply: (direction: "in" | "out") => void;
	isApplying: boolean;
}

function TransitionItem({
	transitionId,
	meta,
	onApply,
	isApplying,
}: TransitionItemProps) {
	// 根据转场类型确定可用的方向
	const canApplyIn =
		meta?.transitionType === "in" || meta?.transitionType === "both";
	const canApplyOut =
		meta?.transitionType === "out" || meta?.transitionType === "both";

	return (
		<div className="bg-muted/50 hover:bg-muted flex flex-col gap-2 rounded-lg p-3 transition-colors">
			<div className="flex items-center gap-3">
				<div className="flex size-10 items-center justify-center rounded-md bg-blue-500/20 text-blue-500">
					<TransitionIcon transitionId={transitionId} />
				</div>
				<div className="flex flex-1 flex-col">
					<span className="font-medium">{meta?.name ?? transitionId}</span>
					{meta?.description && (
						<span className="text-muted-foreground text-xs">
							{meta.description}
						</span>
					)}
					{meta?.defaultDuration && (
						<span className="text-muted-foreground text-xs">
							默认时长: {meta.defaultDuration}s
						</span>
					)}
				</div>
			</div>

			<div className="flex gap-2">
				{canApplyIn && (
					<Button
						size="sm"
						variant="secondary"
						className="flex-1"
						onClick={() => onApply("in")}
						disabled={isApplying}
					>
						入场
					</Button>
				)}
				{canApplyOut && (
					<Button
						size="sm"
						variant="secondary"
						className="flex-1"
						onClick={() => onApply("out")}
						disabled={isApplying}
					>
						出场
					</Button>
				)}
			</div>
		</div>
	);
}

/**
 * 根据转场 ID 返回对应的图标
 */
function TransitionIcon({ transitionId }: { transitionId: string }) {
	const iconMap: Record<string, string> = {
		fade: "🌓",
		slide: "➡️",
		zoom: "🔍",
		"circle-wipe": "⭕",
		blinds: "🪟",
		blur: "🌫️",
		flash: "⚡",
	};

	return <span className="text-lg">{iconMap[transitionId] ?? "🎬"}</span>;
}
