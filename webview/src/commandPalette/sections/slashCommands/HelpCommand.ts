import { SlashCommand } from '../../types';

export class HelpCommand extends SlashCommand {
  readonly id = 'cmd-help';
  readonly label = '/help';
  readonly description = 'Show help information';

  async execute(): Promise<void> {
    console.log('[HelpCommand] /help - not yet implemented');
  }
}
