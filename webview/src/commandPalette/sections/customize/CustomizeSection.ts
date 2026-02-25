import { PanelSectionId } from '@/types/commandPalette';
import { SectionDef } from '../../SectionDef';

export class CustomizeSection extends SectionDef {
  readonly id = PanelSectionId.Customize;
  readonly title = 'Customize';
  readonly order = 2;
}
