"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/hooks/use-editor";
import {
	getRegisteredComponentIds,
	getRemotionComponent,
	getRemotionComponentMeta,
} from "@/lib/remotion/registry";
import type { ComponentMeta } from "@/lib/remotion/types";
import type { CreateRemotionElement } from "@/types/timeline";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * Effects 面板 - 展示已注册的 Remotion 组件并支持添加到 Timeline
 */
export function EffectsView() {
	return (
		<div className="flex h-full flex-col overflow-hidden">
			<EffectsContentView />
		</div>
	);
}

function EffectsContentView() {
	const editor = useEditor();
	const [addingComponent, setAddingComponent] = useState<string | null>(null);
	const [, forceUpdate] = useState({});

	// 订阅 remotion manager 的变化，当组件注册/注销时触发重新渲染
	useEffect(() => {
		const unsubscribe = editor.remotion.subscribe(() => {
			forceUpdate({});
		});
		return unsubscribe;
	}, [editor.remotion]);

	// 获取所有已注册的组件
	const componentIds = getRegisteredComponentIds();

	const components = useMemo(() => {
		return componentIds.map((id) => ({
			id,
			component: getRemotionComponent(id),
			meta: getRemotionComponentMeta(id),
		}));
	}, [componentIds]);

	const handleAddToTimeline = useCallback(
		async (componentId: string, meta?: ComponentMeta) => {
			setAddingComponent(componentId);

			try {
				// 构建默认 props
				const defaultProps: Record<string, unknown> = {};
				if (meta?.editableProps) {
					for (const prop of meta.editableProps) {
						defaultProps[prop.key] = prop.defaultValue;
					}
				}

				const currentTime = editor.playback.getCurrentTime();

				// 创建 Remotion 元素
				const element: CreateRemotionElement = {
					type: "remotion",
					name: meta?.name ?? componentId,
					componentId,
					color: "#a855f7", // purple-500
					props: defaultProps,
					startTime: currentTime,
					duration: 5,
					trimStart: 0,
					trimEnd: 0,
					transform: {
						scale: 1,
						position: { x: 0, y: 0 },
						rotate: 0,
					},
					opacity: 1,
				};

				// 插入到 timeline
				editor.timeline.insertElement({
					element,
					placement: { mode: "auto" },
				});

				toast.success(`Added "${meta?.name ?? componentId}" to timeline`);
			} catch (error) {
				console.error("Failed to add effect:", error);
				toast.error("Failed to add effect to timeline");
			} finally {
				setAddingComponent(null);
			}
		},
		[editor],
	);

	if (components.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 p-4">
				<HugeiconsIcon
					icon={SparklesIcon}
					className="text-muted-foreground size-10"
				/>
				<div className="flex flex-col gap-2 text-center">
					<p className="text-lg font-medium">No effects available</p>
					<p className="text-muted-foreground text-sm text-balance">
						Effects will appear here when registered.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col gap-4 p-4">
			<div className="text-muted-foreground text-sm">
				{components.length} effect{components.length !== 1 ? "s" : ""} available
			</div>

			<ScrollArea className="h-full flex-1">
				<div className="grid gap-3">
					{components.map(({ id, meta }) => (
						<EffectItem
							key={id}
							componentId={id}
							meta={meta}
							onAdd={() => handleAddToTimeline(id, meta)}
							isAdding={addingComponent === id}
						/>
					))}
				</div>
			</ScrollArea>
		</div>
	);
}

interface EffectItemProps {
	componentId: string;
	meta?: ComponentMeta;
	onAdd: () => void;
	isAdding: boolean;
}

function EffectItem({ componentId, meta, onAdd, isAdding }: EffectItemProps) {
	return (
		<div className="bg-muted/50 hover:bg-muted flex items-center justify-between rounded-lg p-3 transition-colors">
			<div className="flex items-center gap-3">
				<div className="flex size-10 items-center justify-center rounded-md bg-purple-500/20 text-purple-500">
					<span className="text-lg">✨</span>
				</div>
				<div className="flex flex-col">
					<span className="font-medium">{meta?.name ?? componentId}</span>
					{meta?.description && (
						<span className="text-muted-foreground text-xs">
							{meta.description}
						</span>
					)}
					{meta?.editableProps && meta.editableProps.length > 0 && (
						<span className="text-muted-foreground text-xs">
							{meta.editableProps.length} editable prop
							{meta.editableProps.length !== 1 ? "s" : ""}
						</span>
					)}
				</div>
			</div>

			<Button size="sm" variant="secondary" onClick={onAdd} disabled={isAdding}>
				{isAdding ? "Adding..." : "Add"}
			</Button>
		</div>
	);
}
