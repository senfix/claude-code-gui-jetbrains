import {FC} from "react";
import {ToolUseBlockDto} from "@/dto";
import {LoadedMessageDto} from "@/types";
import { BashRenderer } from "./BashRenderer";
import {TodoWriteRenderer} from "./TodoWriteRenderer.tsx";
import {TaskRenderer} from "./TaskRenderer.tsx";
import {ReadRenderer} from "@/components/message-renderers/ToolRenderers/ReadRenderer.tsx";
import {GrepRenderer} from "@/components/message-renderers/ToolRenderers/GrepRenderer.tsx";
import {GlobRenderer} from "@/components/message-renderers/ToolRenderers/GlobRenderer.tsx";
import {EditRenderer} from "@/components/message-renderers/ToolRenderers/EditRenderer.tsx";
import {AskUserQuestionRenderer} from "./AskUserQuestion";
import {EnterPlanModeRenderer} from "./EnterPlanModeRenderer.tsx";
import {ExitPlanModeRenderer} from "./ExitPlanModeRenderer.tsx";
import {WebFetchRenderer} from "./WebFetchRenderer.tsx";
import {WebSearchRenderer} from "./WebSearchRenderer.tsx";
import {WriteRenderer} from "./WriteRenderer.tsx";
import {SkillRenderer} from "./SkillRenderer.tsx";

interface ToolRendererProps {
    toolUse: ToolUseBlockDto;
    toolResult?: LoadedMessageDto;
    message?: LoadedMessageDto;
}

// Add all renderer component here.
const Renderers = [
    BashRenderer,
    TodoWriteRenderer,
    TaskRenderer,
    ReadRenderer,
    GrepRenderer,
    GlobRenderer,
    EditRenderer,
    AskUserQuestionRenderer,
    EnterPlanModeRenderer,
    ExitPlanModeRenderer,
    WebFetchRenderer,
    WebSearchRenderer,
    WriteRenderer,
    SkillRenderer,
];

export const ToolRendererMap = (() => {
    const map = new Map<string, FC<ToolRendererProps>>();
    Renderers.forEach((R) => registerTool(map, R));
    // Claude Code CLI는 sub-agent tool을 'Agent'라는 이름으로 전송함 (구버전: 'Task')
    registerTool(map, TaskRenderer, 'Agent');
    return map;
})();

function registerTool(map: Map<string, FC<ToolRendererProps>>, tool: FC<ToolRendererProps>, name?: string) {
    const key = name || tool.name.replace('Renderer', '');
    map.set(key, tool);
}
