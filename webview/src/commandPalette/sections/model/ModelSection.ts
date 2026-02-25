import { PanelSectionId } from '@/types/commandPalette';
import { SectionDef } from '../../SectionDef';

export class ModelSection extends SectionDef {
  readonly id = PanelSectionId.Model;
  readonly title = 'Model';
  readonly order = 1;
}
