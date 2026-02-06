"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEditor } from "@/hooks/use-editor";
import {
	useKeybindingsListener,
	useKeybindingDisabler,
} from "@/hooks/use-keybindings";
import { useEditorActions } from "@/hooks/actions/use-editor-actions";
import { registerSampleComponents } from "@/lib/remotion/sample-components";

interface EditorProviderProps {
	projectId: string;
	children: React.ReactNode;
}

export function EditorProvider({ projectId, children }: EditorProviderProps) {
	const editor = useEditor();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { disableKeybindings, enableKeybindings } = useKeybindingDisabler();
	const activeProject = editor.project.getActiveOrNull();

	useEffect(() => {
		if (isLoading) {
			disableKeybindings();
		} else {
			enableKeybindings();
		}
	}, [isLoading, disableKeybindings, enableKeybindings]);

	useEffect(() => {
		let cancelled = false;

		const loadProject = async () => {
			try {
				setIsLoading(true);
				await editor.project.loadProject({ id: projectId });

				if (cancelled) return;

				setIsLoading(false);
			} catch (err) {
				if (cancelled) return;

				const isNotFound =
					err instanceof Error &&
					(err.message.includes("not found") ||
						err.message.includes("does not exist"));

				if (isNotFound) {
					try {
						const newProjectId = await editor.project.createNewProject({
							name: "Untitled Project",
						});
						router.replace(`/editor/${newProjectId}`);
					} catch (_createErr) {
						setError("Failed to create project");
						setIsLoading(false);
					}
				} else {
					setError(
						err instanceof Error ? err.message : "Failed to load project",
					);
					setIsLoading(false);
				}
			}
		};

		loadProject();

		return () => {
			cancelled = true;
		};
	}, [projectId, editor, router]);

	if (error) {
		return (
			<div className="bg-background flex h-screen w-screen items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<p className="text-destructive text-sm">{error}</p>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="bg-background flex h-screen w-screen items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="text-muted-foreground size-8 animate-spin" />
					<p className="text-muted-foreground text-sm">Loading project...</p>
				</div>
			</div>
		);
	}

	if (!activeProject) {
		return (
			<div className="bg-background flex h-screen w-screen items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="text-muted-foreground size-8 animate-spin" />
					<p className="text-muted-foreground text-sm">Exiting project...</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<EditorRuntimeBindings />
			{children}
		</>
	);
}

function EditorRuntimeBindings() {
	const editor = useEditor();

	// 注册 Remotion 示例组件（仅在首次加载时）
	useEffect(() => {
		registerSampleComponents();

		// 添加一个测试用的 Remotion 轨道（如果还没有的话）
		const tracks = editor.timeline.getTracks();
		const hasRemotionTrack = tracks.some((t) => t.type === "remotion");

		if (!hasRemotionTrack) {
			console.log("🎬 添加测试用 Remotion 轨道...");

			// 添加 Remotion 轨道
			editor.timeline.addTrack({ type: "remotion" as any });

			// 获取新创建的轨道
			const newTracks = editor.timeline.getTracks();
			const remotionTrack = newTracks.find((t) => t.type === "remotion");

			if (remotionTrack) {
				// 手动添加一个测试元素
				(remotionTrack as any).elements.push({
					id: "test-remotion-element-1",
					type: "remotion",
					name: "霓虹文字测试",
					componentId: "neon-text",
					props: { text: "Hello Remotion!", color: "#ff00ff", fontSize: 48 },
					startTime: 2,
					duration: 5,
					trimStart: 0,
					trimEnd: 0,
					transform: { scale: 1, position: { x: 0, y: 0 }, rotate: 0 },
					opacity: 1,
				});

				console.log("✅ 测试 Remotion 元素已添加（从第 2 秒到第 7 秒）");
			}
		}
	}, [editor]);

	useEffect(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!editor.save.getIsDirty()) return;
			event.preventDefault();
			(event as unknown as { returnValue: string }).returnValue = "";
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [editor]);

	useEditorActions();
	useKeybindingsListener();
	return null;
}
