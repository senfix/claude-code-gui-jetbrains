import { useCallback, useEffect } from 'react';

const OPTION_COUNT = 3;

interface UseAcceptPlanKeyboardParams {
  focusedIndex: number;
  setFocusedIndex: (updater: (prev: number) => number) => void;
  handleOptionClick: (index: number) => void;
  handleFeedbackSubmit: () => void;
  onCancel: () => void;
}

export function useAcceptPlanKeyboard(params: UseAcceptPlanKeyboardParams) {
  const { focusedIndex, setFocusedIndex, handleOptionClick, handleFeedbackSubmit, onCancel } = params;

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFeedbackSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      console.log(e)
      setFocusedIndex(prev => Math.min(3, prev + 1));
    }
  }, [handleFeedbackSubmit, onCancel, setFocusedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInputFocused = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      if (isInputFocused) return;

      if (e.key === '1') { e.preventDefault(); handleOptionClick(0); }
      else if (e.key === '2') { e.preventDefault(); handleOptionClick(1); }
      else if (e.key === '3') { e.preventDefault(); handleOptionClick(2); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(prev => Math.max(0, prev - 1)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(prev => Math.min(OPTION_COUNT, prev + 1)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        handleOptionClick(focusedIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, handleOptionClick, onCancel, setFocusedIndex]);

  return { handleInputKeyDown };
}
