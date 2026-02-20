import React, { useEffect, useCallback } from 'react';
import { ChatInput } from './ChatInput';
import { SessionHeader } from './SessionHeader';
import { ChatMessageArea } from './ChatMessageArea';
import { PendingPermissionsBanner } from './PendingPermissionsBanner';
import { useSessionContext } from '../contexts/SessionContext';
import { useChatStreamContext } from '../contexts/ChatStreamContext';
import { useChatInputFocus } from '../contexts/ChatInputFocusContext';

export function ChatPanel() {
  const {
    messages,
    isStreaming,
  } = useChatStreamContext();

  const {
    currentSessionId,
    saveMessages,
  } = useSessionContext();

  const { textareaRef, focus: focusInput } = useChatInputFocus();

  // Auto-save messages when they change (debounced in useSession)
  const lastMessage = messages[messages.length - 1];
  const lastMessageContent = lastMessage?.message?.content;
  const lastMessageId = lastMessage?.uuid;

  useEffect(() => {
    if (currentSessionId && messages.length > 0 && !isStreaming) {
      saveMessages(messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, messages.length, lastMessageId, lastMessageContent, isStreaming]);

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
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100" onMouseDown={handleContainerMouseDown}>
      {/* Header - Minimal */}
      <div className="flex-shrink-0 border-b border-zinc-800">
        <SessionHeader />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto pb-16">
        <ChatMessageArea />
      </div>

      <PendingPermissionsBanner />

      {/* Input Area */}
      <div className="flex-shrink-0">
        <ChatInput />
      </div>
    </div>
  );
}
