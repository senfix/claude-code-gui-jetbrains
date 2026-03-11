import { SlashCommand } from '../../types';
import { InputModeValues } from '@/types/chatInput';

export class CliPassthroughCommand extends SlashCommand {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly order: number;

  constructor(commandName: string, order: number = 100) {
    super();
    const sanitized = commandName.replace(/[\x00-\x1f\x7f]/g, '');
    const normalized = sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
    this.id = `cli-${normalized.slice(1)}`;
    this.label = normalized;
    this.description = normalized;
    this.order = order;
  }

  async execute(): Promise<void> {
    const { chatStream } = this.getServices();
    chatStream.sendMessage(this.label, InputModeValues.AUTO_EDIT);
  }
}
