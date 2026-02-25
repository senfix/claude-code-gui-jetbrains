import { SlashCommand } from '../../types';

export class ReviewCommand extends SlashCommand {
  readonly id = 'cmd-review';
  readonly label = '/review';
  readonly description = 'Review current file';

  async execute(): Promise<void> {
    console.log('[ReviewCommand] /review - not yet implemented');
  }
}
