import { Container, LabelValue, RendererProps, ToolHeader, ToolWrapper } from "../common";

export function AskUserQuestionRenderer(props: RendererProps) {
    const toolUse = props.toolUse;
    const input = toolUse.input as { questions?: Array<{ question: string }> } | undefined;
    const toolResult = props.toolResult as
        | { message?: { content: Array<{ content: string }> } }
        | undefined;
    const output = toolResult?.message?.content?.[0]?.content ?? "";

    const isStreaming = props.message?.isStreaming === true;

    const hasValidQuestions =
        Array.isArray(input?.questions) &&
        input.questions.length > 0 &&
        typeof input.questions[0].question === "string";

    const inProgress = !toolResult && (isStreaming || !hasValidQuestions);

    return (
        <ToolWrapper message={props.message}>
            <ToolHeader
                name={toolUse.name}
                inProgress={inProgress}
                className="mb-2.5"
            />

            {toolResult && (
                <Container>
                    {hasValidQuestions && (
                        <div className="px-3 pt-3 pb-1">
                            <div className="text-white/40 text-[11px] uppercase tracking-wider mb-1">
                                질문
                            </div>
                            {input!.questions!.map((q, idx) => (
                                <div key={idx} className="text-white/60 text-[12px] mb-0.5">
                                    {q.question}
                                </div>
                            ))}
                        </div>
                    )}
                    <LabelValue label="OUT" maxHeight="max-h-[60px]">
                        {output}
                    </LabelValue>
                </Container>
            )}
        </ToolWrapper>
    );
}
