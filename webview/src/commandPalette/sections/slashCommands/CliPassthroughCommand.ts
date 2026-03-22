import { SlashCommand } from '../../types';
import { InputModeValues } from '@/types/chatInput';
import type { SlashCommandInfo } from '@/types/slashCommand';

export class CliPassthroughCommand extends SlashCommand {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly order: number;
  readonly commandInfo: SlashCommandInfo;

  constructor(commandInfo: SlashCommandInfo, order: number = 100) {
    super();
    const name = commandInfo.name;
    // const sanitized = commandInfo.name.replace(/[\x00-\x1f\x7f]/g, '');
    const normalized = name.startsWith('/') ? name : `/${name}`;
    this.id = `cli-${normalized.slice(1)}`;
    this.label = normalized;
    this.description = commandInfo.description || normalized;
    this.order = order;
    this.commandInfo = commandInfo;
  }

  async execute(): Promise<void> {
    const { chatStream } = this.getServices();
    chatStream.sendMessage(this.label, InputModeValues.AUTO_EDIT);
  }
}
