import { createContext, useContext, useRef, useCallback, ReactNode, RefObject } from 'react';

interface ChatInputFocusContextType {
  textareaRef: RefObject<HTMLTextAreaElement>;
  /** Focus the ChatInput textarea from anywhere */
  focus: () => void;
}

const ChatInputFocusContext = createContext<ChatInputFocusContextType>({
  textareaRef: { current: null },
  focus: () => {},
});

export function ChatInputFocusProvider({ children }: { children: ReactNode }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const focus = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <ChatInputFocusContext.Provider value={{ textareaRef, focus }}>
      {children}
    </ChatInputFocusContext.Provider>
  );
}

export function useChatInputFocus() {
  return useContext(ChatInputFocusContext);
}
