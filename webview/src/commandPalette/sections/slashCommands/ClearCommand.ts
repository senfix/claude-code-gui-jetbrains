import { SlashCommand } from '../../types';

export class ClearCommand extends SlashCommand {
  readonly id = 'cmd-clear';
  readonly label = '/clear';
  readonly description = 'Clear conversation';

  async execute(): Promise<void> {
    const { chatStream, session } = this.getServices();

    if (chatStream.isStreaming) {
      chatStream.stop();
    }

    chatStream.clearMessages();
    chatStream.resetStreamState();
    chatStream.setInput('');

    session.setCurrentSessionId(null);
    session.setSessionState('idle');
  }

  bindKeyboard(e: KeyboardEvent): boolean {
    return (e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C';
  }
}
