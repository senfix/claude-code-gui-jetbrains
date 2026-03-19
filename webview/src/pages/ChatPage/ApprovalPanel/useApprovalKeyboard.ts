import { useCallback, useEffect } from 'react';
import { isMobile } from '@/config/environment';

interface UseApprovalKeyboardParams {
  optionCount: number;
  focusedIndex: number;
  setFocusedIndex: (updater: (prev: number) => number) => void;
  handleOptionClick: (index: number) => void;
  handleTextSubmit: () => void;
  onCancel: () => void;
}

export function useApprovalKeyboard(params: UseApprovalKeyboardParams) {
  const { optionCount, focusedIndex, setFocusedIndex, handleOptionClick, handleTextSubmit, onCancel } = params;

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => Math.min(optionCount, prev + 1));
    }
  }, [optionCount, handleTextSubmit, onCancel, setFocusedIndex]);

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

      // 숫자 키로 옵션 직접 선택 (1-based)
      const numKey = parseInt(e.key);
      if (!isNaN(numKey) && numKey >= 1 && numKey <= optionCount) {
        e.preventDefault();
        handleOptionClick(numKey - 1);
        return;
      }

      if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(prev => Math.max(0, prev - 1)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(prev => Math.min(optionCount, prev + 1)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        handleOptionClick(focusedIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [optionCount, focusedIndex, handleOptionClick, onCancel, setFocusedIndex]);

  return { handleInputKeyDown };
}
