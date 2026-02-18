import {FC} from "react";
import {ToolUseBlockDto} from "@/dto";
import {LoadedMessageDto} from "@/types";
import { BashRenderer } from "./BashRenderer";
import {TodoWriteRenderer} from "./TodoWriteRenderer.tsx";

interface ToolRendererProps {
    toolUse: ToolUseBlockDto;
    toolResult?: LoadedMessageDto;
}

export function toolMapper() {
    const map = new Map<string, FC<ToolRendererProps>>();

    registerTool(map, BashRenderer);
    registerTool(map, TodoWriteRenderer);

    return map;
}

function registerTool(map: Map<string, FC<ToolRendererProps>>, tool: FC<ToolRendererProps>) {
    map.set(tool.name.replace('Renderer', ''), tool);
}
