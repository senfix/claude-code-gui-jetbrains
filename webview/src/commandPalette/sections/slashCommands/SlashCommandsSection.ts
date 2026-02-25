import { PanelSectionId } from '@/types/commandPalette';
import { SectionDef } from '../../SectionDef';

export class SlashCommandsSection extends SectionDef {
  readonly id = PanelSectionId.SlashCommands;
  readonly title = 'Slash Commands';
  readonly order = 3;
  readonly scrollable = true;
  readonly maxHeight = 200;
}
