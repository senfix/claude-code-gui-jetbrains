import remarkMath from 'remark-math-extended';
import rehypeKatex from 'rehype-katex';
import type { MathPlugin } from 'streamdown';

export const math: MathPlugin = {
    name: 'katex',
    type: 'math',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    remarkPlugin: [remarkMath, { singleDollarTextMath: true }] as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rehypePlugin: [rehypeKatex, { errorColor: 'var(--color-muted-foreground)' }] as any,
};
