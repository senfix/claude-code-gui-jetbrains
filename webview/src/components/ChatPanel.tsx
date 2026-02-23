import React, { useCallback } from 'react';
import { ChatInput } from './ChatInput';
import { SessionHeader } from './SessionHeader';
import { ChatMessageArea } from './ChatMessageArea';
import { PendingPermissionsBanner } from './PendingPermissionsBanner';
import { useChatInputFocus } from '../contexts/ChatInputFocusContext';

export function ChatPanel() {
  const { textareaRef, focus: focusInput } = useChatInputFocus();

  // 빈 영역 클릭 시 textarea로 포커스 이동
  // mousedown 시점에 확인해야 포커스 이동 전 activeElement를 비교할 수 있음
  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [role="button"], [contenteditable]')) {
      return;
    }
    if (document.activeElement === textareaRef.current) {
      // 이미 포커스 상태 → 브라우저가 포커스를 빼앗지 못하게 방지
      // e.preventDefault();
      return;
    }
    e.preventDefault();
    focusInput();
  }, [textareaRef, focusInput]);

  return (
    <div className="w-full h-screen bg-neutral-900 text-zinc-100" onMouseDown={handleContainerMouseDown}>
      {/* Header - Minimal */}
      <div className="fixed w-full top-0 bg-blend-darken bg-neutral-900 z-10">
        <SessionHeader />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto w-full h-screen pt-10 pb-36 bg-neutral-900 z-0">
        <ChatMessageArea />
      </div>

      <PendingPermissionsBanner />

      {/* Input Area */}
      <div className="fixed w-full bottom-0 z-10">
        <ChatInput />
      </div>
    </div>
  );
}
