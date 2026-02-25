import { PanelSectionId } from '@/types/commandPalette';
import { SectionDef } from '../../SectionDef';

export class ContextSection extends SectionDef {
  readonly id = PanelSectionId.Context;
  readonly title = 'Context';
  readonly order = 0;
  readonly showDividerAbove = false;
}
