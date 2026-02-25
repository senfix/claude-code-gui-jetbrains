import { SlashCommand } from '../../types';

export class CompactCommand extends SlashCommand {
  readonly id = 'cmd-compact';
  readonly label = '/compact';
  readonly description = 'Compact conversation';

  async execute(): Promise<void> {
    console.log('[CompactCommand] /compact - not yet implemented');
  }
}
