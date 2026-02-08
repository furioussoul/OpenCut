import { useCallback } from "react";
import type { RemotionElement } from "@/types/timeline";
import {
	PropertyItem,
	PropertyItemLabel,
	PropertyItemValue,
} from "./property-item";
import { ColorPicker } from "@/components/ui/color-picker";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useEditor } from "@/hooks/use-editor";
import { getRemotionComponentMeta } from "@/lib/remotion/registry";

export function RemotionProperties({
	element,
	trackId,
}: {
	element: RemotionElement;
	trackId: string;
}) {
	const editor = useEditor();
	const meta = getRemotionComponentMeta(element.componentId);

	if (!meta) {
		return (
			<div className="flex flex-col gap-4 p-4">
				<div className="text-sm font-medium">Remotion Element</div>
				<div className="text-sm text-muted-foreground">
					No editable properties for this component.
				</div>
			</div>
		);
	}

	const handlePropChange = useCallback(
		(key: string, value: unknown, pushHistory = true) => {
			editor.timeline.updateRemotionElement({
				trackId,
				elementId: element.id,
				updates: {
					props: { [key]: value },
				},
				pushHistory,
			});
		},
		[editor, trackId, element.id],
	);

	return (
		<div className="flex flex-col gap-4 p-4">
			<div className="space-y-1">
				<div className="text-sm font-medium">{meta.name}</div>
				{meta.description && (
					<div className="text-xs text-muted-foreground">
						{meta.description}
					</div>
				)}
			</div>
			<div className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-200px)]">
				{meta.editableProps.map((prop) => {
					const value =
						(element.props?.[prop.key] as unknown) ?? prop.defaultValue;

					return (
						<PropertyItem key={prop.key}>
							<PropertyItemLabel>{prop.label}</PropertyItemLabel>
							<PropertyItemValue>
								{prop.type === "color" && (
									<ColorPicker
										value={(value as string).replace("#", "")}
										onChange={(color) =>
											handlePropChange(prop.key, `#${color}`)
										}
									/>
								)}
								{prop.type === "boolean" && (
									<Switch
										checked={value as boolean}
										onCheckedChange={(checked) =>
											handlePropChange(prop.key, checked)
										}
									/>
								)}
								{prop.type === "string" && (
									<Input
										value={value as string}
										onChange={(e) => handlePropChange(prop.key, e.target.value)}
										className="h-8 text-xs"
									/>
								)}
								{prop.type === "number" && (
									<div className="flex items-center gap-2 w-full">
										<Slider
											value={[value as number]}
											min={prop.min ?? 0}
											max={prop.max ?? 100}
											step={prop.step ?? 1}
											onValueChange={([val]) => handlePropChange(prop.key, val)}
											className="flex-1"
										/>
										<span className="text-[10px] w-6 text-right">
											{Math.round(value as number)}
										</span>
									</div>
								)}
							</PropertyItemValue>
						</PropertyItem>
					);
				})}
			</div>
		</div>
	);
}
