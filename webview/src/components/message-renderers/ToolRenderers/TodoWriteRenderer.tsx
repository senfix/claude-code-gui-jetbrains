import {ToolHeader, ToolWrapper} from "@/components/message-renderers/ToolRenderers/common";
import {ToolUseBlockDto} from "@/dto";
import {LoadedMessageDto} from "@/types";

interface BashToolUseDto {
    name: string;
    input: {
        command: string;
        description: string;
    };
    tool_result?: BashToolResultDto;
}

interface BashToolResultDto {
    message: {
        content: [{content: string}]
    }
}

interface Props {
    toolUse: ToolUseBlockDto;
    toolResult?: LoadedMessageDto;
}

export function TodoWriteRenderer(props: Props) {
    // const toolUse = props.toolUse as unknown as BashToolUseDto;
    // const toolResult = props.toolResult as BashToolResultDto | undefined;
    //
    // const name = toolUse.name;
    // const description = toolUse.input?.description ?? '';
    // const input = toolUse.input?.command ?? '' as string;
    // const output = toolResult?.message?.content[0].content ?? '' as string;

    return (
        <ToolWrapper onClick={() => console.log(props.toolUse)}>
            <ToolHeader name="Update Todos" />
        </ToolWrapper>
    );
}
