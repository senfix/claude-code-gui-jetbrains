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

export const ToolRendererMap = new Map<string, FC<ToolRendererProps>>([
    ['Bash', BashRenderer],
    ['TodoWrite', TodoWriteRenderer],
    ['Task', TaskRenderer],
    ['Agent', TaskRenderer],
    ['Read', ReadRenderer],
    ['Grep', GrepRenderer],
    ['Glob', GlobRenderer],
    ['Edit', EditRenderer],
    ['AskUserQuestion', AskUserQuestionRenderer],
    ['EnterPlanMode', EnterPlanModeRenderer],
    ['ExitPlanMode', ExitPlanModeRenderer],
    ['WebFetch', WebFetchRenderer],
    ['WebSearch', WebSearchRenderer],
    ['Write', WriteRenderer],
    ['Skill', SkillRenderer],
]);
