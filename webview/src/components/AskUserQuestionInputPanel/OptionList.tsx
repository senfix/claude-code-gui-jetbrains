import { useRef, useEffect, KeyboardEvent } from 'react';
import { OptionItem } from '@/components/message-renderers/ToolRenderers/AskUserQuestion/OptionItem';
import { QuestionOption } from './useFormState';

interface Props {
  options: QuestionOption[];
  selected: string[];
  multiSelect: boolean;
  isOtherSelected: boolean;
  otherText: string;
  onSelect: (label: string) => void;
  onOtherTextChange: (text: string) => void;
  onOtherKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
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

  const otherInputRef = useRef<HTMLInputElement>(null);

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
          <input
            ref={otherInputRef}
            type="text"
            value={otherText}
            onChange={e => onOtherTextChange(e.target.value)}
            onKeyDown={onOtherKeyDown}
            placeholder="직접 입력..."
            className="w-full px-3 py-1.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-200 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      )}
    </div>
  );
};
