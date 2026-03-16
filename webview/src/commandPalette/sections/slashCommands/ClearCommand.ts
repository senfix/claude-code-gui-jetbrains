import { SlashCommand } from '../../types';

export class ClearCommand extends SlashCommand {
  readonly id = 'cmd-clear';
  readonly label = '/clear';
  readonly description = 'Clear conversation';

  async execute(): Promise<void> {
    const services = this.getServices();

    if (services.chatStream.isStreaming) services.chatStream.stop();
    services.chatStream.resetForSessionSwitch();
    services.session.resetToNewSession();
  }

  bindKeyboard(e: KeyboardEvent): boolean {
    return (e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C';
  }
}
