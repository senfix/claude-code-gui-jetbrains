import { useCallback, useEffect, KeyboardEvent, useState } from 'react';
import { CommandPalettePanel } from '@/commandPalette/ui/CommandPalettePanel';
import { useCommandPalette } from '@/commandPalette/hooks/useCommandPalette';
import { INPUT_MODES } from '../../types/chatInput';
import { useInputMode } from './hooks/useInputMode';
import { InputModeTag } from './InputModeTag';
import { ActionButtons } from './ActionButtons';
import { useChatInputFocus } from '../../contexts/ChatInputFocusContext';
import { useInputHistory } from './hooks/useInputHistory';
import { useTextareaAutoResize } from './hooks/useTextareaAutoResize';
import { useSettings } from '@/contexts/SettingsContext';
import { useSessionContext } from '@/contexts/SessionContext';
import { useChatStreamContext } from '@/contexts/ChatStreamContext';
import { SettingKey } from '@/types/settings';

export function ChatInput() {
  const { textareaRef } = useChatInputFocus();
  const { currentSessionId, sessionState, workingDirectory } = useSessionContext();
  const {
    input: value,
    setInput: onChange,
    handleSubmit: onSubmit,
    isStreaming,
    isStopped,
    stop: onStop,
    continue: onContinue,
  } = useChatStreamContext();
  const inputHistory = useInputHistory();
  const [isFocused, setIsFocused] = useState(false);
  const { settings } = useSettings();

  const disabled = sessionState === 'error' || !workingDirectory;

  const { mode, cycleMode } = useInputMode(
    settings[SettingKey.INITIAL_INPUT_MODE]
  );

  const modeConfig = INPUT_MODES[mode];

  const palette = useCommandPalette({ onChange, textareaRef });

  // Auto-resize textarea
  useTextareaAutoResize({ textareaRef, value });

  // Focus on session change or when input becomes enabled
  useEffect(() => {
    if (!disabled) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentSessionId, disabled, textareaRef]);

  // Focus textarea when window/document gains focus
  useEffect(() => {
    const handleFocus = () => {
      textareaRef.current?.focus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [textareaRef]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Tab: 모드 전환
    if (e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      cycleMode();
      return;
    }

    // Slash command interaction
    if (palette.handleSlashKeyDown(e, value)) return;

    // Enter: submit
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isStreaming && value.trim()) {
        inputHistory.pushToHistory(value);
        onSubmit();
      }
    } else if (e.key === 'ArrowUp' && !palette.showSlashCommands) {
      const historyValue = inputHistory.navigateUp(value);
      if (historyValue === null) return;
      e.preventDefault();
      onChange(historyValue);
    } else if (e.key === 'ArrowDown' && !palette.showSlashCommands) {
      const historyValue = inputHistory.navigateDown();
      if (historyValue === null) return;
      e.preventDefault();
      onChange(historyValue);
    }
  }, [disabled, isStreaming, value, onSubmit, inputHistory, onChange, palette, cycleMode]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    palette.detectSlashCommand(newValue);
  }, [onChange, palette]);

  return (
    <div className="max-w-[44rem] mx-auto px-3 pb-3 pt-2">
      {/* 메인 인풋 컨테이너 */}
      <div
        className={`
          relative rounded-lg border bg-[#1e1e21]
          transition-colors duration-150
          ${isFocused && mode !== 'plan' ? modeConfig.borderColor : 'border-zinc-700'}
        `}
      >
        {/* Slash command panel */}
        {palette.showSlashCommands && (
          <div className="absolute bottom-full left-0 mb-2 w-full z-20">
            <CommandPalettePanel
              sections={palette.filteredSections}
              selectedSectionIndex={palette.selectedSectionIndex}
              selectedItemIndex={palette.selectedItemIndex}
              onItemClick={palette.selectItem}
              onItemExecute={palette.handlePanelItemExecute}
              onClose={palette.closePanel}
            />
          </div>
        )}

        {/* Textarea 영역 */}
        <div className="pt-2.5 pb-1.5">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="⌘ Esc to focus or unfocus Claude"
            disabled={disabled || isStreaming}
            rows={1}
            className="w-full px-3 cursor-text resize-none bg-transparent text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none disabled:opacity-50"
            style={{ minHeight: '20px', maxHeight: '200px' }}
          />
        </div>

        {/* 구분선 */}
        <div className="border-t border-zinc-700/50" />

        {/* 하단 바: 모드 태그 + 파일 태그 + 액션 버튼 */}
        <div className="flex items-center justify-between pl-2 pr-1 py-1">
          {/* 좌측: 모드 태그 + 파일 태그들 */}
          <div className="flex items-center gap-4">
            <InputModeTag mode={mode} onClick={cycleMode} />
          </div>

          {/* 우측: 액션 버튼들 */}
          <ActionButtons
            mode={mode}
            isStreaming={isStreaming}
            isStopped={isStopped}
            disabled={disabled}
            hasValue={!!value.trim()}
            onSlashCommand={palette.handleSlashButtonClick}
            onSubmit={onSubmit}
            onStop={onStop}
            onContinue={onContinue}
          />
        </div>
      </div>
    </div>
  );
}
