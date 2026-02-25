import { PanelSectionId } from '@/types/commandPalette';
import { SectionDef } from '../../SectionDef';

export class SupportSection extends SectionDef {
  readonly id = PanelSectionId.Support;
  readonly title = 'Support';
  readonly order = 5;
}
