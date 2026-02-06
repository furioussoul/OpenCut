import { useCallback } from "react";
import type { RemotionElement } from "@/types/timeline";
import { PanelBaseView } from "@/components/editor/panels/panel-base-view";
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
import type { ComponentMeta } from "@/lib/remotion/types";

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
			<PanelBaseView title="Remotion Element">
				<div className="flex flex-col gap-4 p-4 text-sm text-muted-foreground">
					No editable properties for this component.
				</div>
			</PanelBaseView>
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
		<PanelBaseView title={meta.name} description={meta.description}>
			<div className="flex flex-col gap-4 p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
				{meta.editableProps.map((prop) => {
					const value = (element.props?.[prop.key] as unknown) ?? prop.defaultValue;

					return (
						<PropertyItem key={prop.key}>
							<PropertyItemLabel>{prop.label}</PropertyItemLabel>
							<PropertyItemValue>
								{prop.type === "color" && (
									<ColorPicker
										value={(value as string).replace("#", "")}
										onChange={(color) => handlePropChange(prop.key, `#${color}`)}
									/>
								)}
								{prop.type === "boolean" && (
									<Switch
										checked={value as boolean}
										onCheckedChange={(checked) => handlePropChange(prop.key, checked)}
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
		</PanelBaseView>
	);
}
