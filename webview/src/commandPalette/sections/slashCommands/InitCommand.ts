import { SlashCommand } from '../../types';

export class InitCommand extends SlashCommand {
  readonly id = 'cmd-init';
  readonly label = '/init';
  readonly description = 'Initialize Claude in project';

  async execute(): Promise<void> {
    console.log('[InitCommand] /init - not yet implemented');
  }
}
