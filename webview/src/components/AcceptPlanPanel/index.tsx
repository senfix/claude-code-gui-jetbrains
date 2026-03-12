import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {OptionButton, OptionItem} from './OptionButton';
import { useAcceptPlanKeyboard } from './useAcceptPlanKeyboard';

interface Props {
  onAutoAccept: () => void;
  onManualApprove: () => void;
  onKeepPlanning: () => void;
  onFeedback: (text: string) => void;
  onCancel: () => void;
}

const options: OptionItem[] = [
  { key: '1', label: 'Yes, and auto-accept' },
  { key: '2', label: 'Yes, and manually approve edits' },
  { key: '3', label: 'No, keep planning' },
];

export function AcceptPlanPanel(props: Props) {
  const { onAutoAccept, onManualApprove, onKeepPlanning, onFeedback, onCancel } = props;

  const [focusedIndex, setFocusedIndex] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    autoResize();
  }, [feedbackText, autoResize]);

  const handleOptionClick = useCallback((index: number) => {
    setFocusedIndex(index);
    if (index === 0) onAutoAccept();
    else if (index === 1) onManualApprove();
    else if (index === 2) onKeepPlanning();
  }, [onAutoAccept, onManualApprove, onKeepPlanning]);

  const handleFeedbackSubmit = useCallback(() => {
    const text = feedbackText.trim();
    if (text) {
      onFeedback(text);
      setFeedbackText('');
    }
  }, [feedbackText, onFeedback]);

  const { handleInputKeyDown } = useAcceptPlanKeyboard({
    focusedIndex,
    setFocusedIndex,
    handleOptionClick,
    handleFeedbackSubmit,
    onCancel,
  });

  useEffect(() => {
    if (focusedIndex === options.length) textareaRef.current?.focus();
  }, [focusedIndex]);


  return (
    <div className="max-w-[44rem] mx-auto px-4 pb-[20px] pt-2">
      <div className="rounded-lg border border-zinc-700 bg-[#1e1e21] overflow-hidden">
        {/* 헤더 */}
        <div className="px-2 py-2.5 mb-0.5">
          <p className="text-[14px] font-semibold text-zinc-100 leading-snug">Accept this plan?</p>
          <p className="text-[13px] text-zinc-400 mt-1">Select text in the preview to add comments <span className="hidden">{focusedIndex}</span></p>
        </div>

        {/* 옵션 목록 */}
        <div className="px-2 flex flex-col gap-[7px]">
          {options.map((opt, idx) => (
            <OptionButton
              key={opt.key}
              option={opt}
              isFocused={focusedIndex === idx}
              onClick={() => handleOptionClick(idx)}
              onFocus={() => setFocusedIndex(idx)}
            />
          ))}

          {/* 자유 텍스트 입력 */}
          <textarea
            ref={textareaRef}
            value={feedbackText}
            rows={1}
            tabIndex={0}
            onFocus={() => setFocusedIndex(options.length)}
            onChange={e => setFeedbackText(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Tell Claude what to do instead"
            className="w-full bg-transparent text-[13px] px-2.5 py-[5px] text-zinc-200 placeholder-zinc-500 focus:outline-none border border-zinc-400/20 rounded-[4px] text-left font-normal transition-colors duration-100 resize-none overflow-hidden"
          />
        </div>

        {/* 푸터 */}
        <div className="px-2 pb-2 pt-0.5">
          <span className="text-[11px] text-zinc-400">Esc to cancel</span>
        </div>
      </div>
    </div>
  );
}
