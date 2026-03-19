import { useRef, useEffect, KeyboardEvent } from 'react';
import { OptionItem } from '@/pages/ChatPage/message-renderers/ToolRenderers/AskUserQuestion/OptionItem';
import { useTextareaAutoResize } from '@/pages/ChatPage/ChatInput/hooks/useTextareaAutoResize';
import { QuestionOption } from './useFormState';

interface Props {
  options: QuestionOption[];
  selected: string[];
  multiSelect: boolean;
  isOtherSelected: boolean;
  otherText: string;
  onSelect: (label: string) => void;
  onOtherTextChange: (text: string) => void;
  onOtherKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const OptionList = (props: Props) => {
  const {
    options,
    selected,
    multiSelect,
    isOtherSelected,
    otherText,
    onSelect,
    onOtherTextChange,
    onOtherKeyDown,
  } = props;

  const otherInputRef = useRef<HTMLTextAreaElement>(null);

  useTextareaAutoResize({ textareaRef: otherInputRef, value: otherText, maxHeight: 120 });

  useEffect(() => {
    if (isOtherSelected) {
      setTimeout(() => otherInputRef.current?.focus(), 0);
    }
  }, [isOtherSelected]);

  return (
    <div className="px-3 py-2.5 flex flex-col gap-1.5">
      {options.map((option) => (
        <OptionItem
          key={option.label}
          label={option.label}
          description={option.description}
          selected={selected.includes(option.label)}
          multiSelect={multiSelect}
          disabled={false}
          onClick={() => onSelect(option.label)}
        />
      ))}

      {isOtherSelected && (
        <div className="mt-1">
          <textarea
            ref={otherInputRef}
            value={otherText}
            onChange={e => onOtherTextChange(e.target.value)}
            onKeyDown={onOtherKeyDown}
            placeholder="Type your answer..."
            rows={1}
            className="w-full px-3 py-1.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-200 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 resize-none"
          />
        </div>
      )}
    </div>
  );
};
