import { createContext, useContext, useMemo, useRef, ReactNode } from 'react';
import { useChatStreamContext } from '@/contexts/ChatStreamContext';
import { useSessionContext } from '@/contexts/SessionContext';
import { getAdapter } from '@/adapters';
import { CommandPaletteServices } from './types';
import { CommandPaletteRegistry } from './CommandPaletteRegistry';
import { KeyboardRegistry } from './KeyboardRegistry';
import {
  ContextSection,
  ModelSection,
  CustomizeSection,
  SlashCommandsSection,
  SettingsSection,
  SupportSection,
  ClearCommand,
  InitCommand,
  ReviewCommand,
  HelpCommand,
  CompactCommand,
  contextItems,
  modelItems,
  customizeItems,
  settingsItems,
  supportItems,
} from './sections';

interface CommandPaletteRegistryContextValue {
  registry: CommandPaletteRegistry;
  keyboardRegistry: KeyboardRegistry;
}

const CommandPaletteRegistryContext = createContext<CommandPaletteRegistryContextValue | undefined>(undefined);

export function useCommandPaletteRegistry(): CommandPaletteRegistryContextValue {
  const context = useContext(CommandPaletteRegistryContext);
  if (!context) {
    throw new Error('useCommandPaletteRegistry must be used within a CommandPaletteProvider');
  }
  return context;
}

interface CommandPaletteProviderProps {
  children: ReactNode;
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const chatStream = useChatStreamContext();
  const session = useSessionContext();

  // Services ref - always points to current React state
  const servicesRef = useRef<CommandPaletteServices>({
    chatStream: {
      messages: chatStream.messages,
      isStreaming: chatStream.isStreaming,
      isStopped: chatStream.isStopped,
      input: chatStream.input,
      setInput: chatStream.setInput,
      sendMessage: chatStream.sendMessage,
      stop: chatStream.stop,
      continue: chatStream.continue,
      clearMessages: chatStream.clearMessages,
      resetStreamState: chatStream.resetStreamState,
    },
    session: {
      currentSessionId: session.currentSessionId,
      sessionState: session.sessionState,
      setCurrentSessionId: session.setCurrentSessionId,
      setSessionState: session.setSessionState,
    },
    adapter: {
      openNewTab: () => getAdapter().openNewTab(),
      openSettings: () => getAdapter().openSettings(),
    },
  });

  // Update servicesRef on every render
  servicesRef.current = {
    chatStream: {
      messages: chatStream.messages,
      isStreaming: chatStream.isStreaming,
      isStopped: chatStream.isStopped,
      input: chatStream.input,
      setInput: chatStream.setInput,
      sendMessage: chatStream.sendMessage,
      stop: chatStream.stop,
      continue: chatStream.continue,
      clearMessages: chatStream.clearMessages,
      resetStreamState: chatStream.resetStreamState,
    },
    session: {
      currentSessionId: session.currentSessionId,
      sessionState: session.sessionState,
      setCurrentSessionId: session.setCurrentSessionId,
      setSessionState: session.setSessionState,
    },
    adapter: {
      openNewTab: () => getAdapter().openNewTab(),
      openSettings: () => getAdapter().openSettings(),
    },
  };

  // Create registries once
  const { registry, keyboardRegistry } = useMemo(() => {
    const reg = new CommandPaletteRegistry(servicesRef);
    const keyboardReg = new KeyboardRegistry();

    // Register sections with their commands/items
    reg.registerSection(new ContextSection(), contextItems);
    reg.registerSection(new ModelSection(), modelItems);
    reg.registerSection(new CustomizeSection(), customizeItems);
    reg.registerSection(new SlashCommandsSection(), [
      new ClearCommand(),
      new InitCommand(),
      new ReviewCommand(),
      new HelpCommand(),
      new CompactCommand(),
    ]);
    reg.registerSection(new SettingsSection(), settingsItems);
    reg.registerSection(new SupportSection(), supportItems);

    // Auto-register keyboard bindings from commands
    const bindings = reg.getKeyboardBindings();
    for (const binding of bindings) {
      keyboardReg.register({
        id: binding.id,
        match: binding.handler,
        execute: binding.execute,
      });
    }

    // Register non-command keyboard shortcuts
    keyboardReg.register({
      id: 'new-tab',
      match: (e: KeyboardEvent) => (e.metaKey || e.ctrlKey) && e.key === 'n',
      execute: async () => {
        const newTabButton = document.getElementById('new-tab-button');
        if (newTabButton) newTabButton.click();
      },
    });

    keyboardReg.register({
      id: 'open-settings',
      match: (e: KeyboardEvent) => (e.metaKey || e.ctrlKey) && e.key === ',',
      execute: async () => {
        await getAdapter().openSettings();
      },
    });

    return { registry: reg, keyboardRegistry: keyboardReg };
  }, []);

  const contextValue = useMemo<CommandPaletteRegistryContextValue>(
    () => ({ registry, keyboardRegistry }),
    [registry, keyboardRegistry],
  );

  return (
    <CommandPaletteRegistryContext.Provider value={contextValue}>
      {children}
    </CommandPaletteRegistryContext.Provider>
  );
}
