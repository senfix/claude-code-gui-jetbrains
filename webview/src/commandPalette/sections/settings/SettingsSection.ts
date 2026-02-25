import { PanelSectionId } from '@/types/commandPalette';
import { SectionDef } from '../../SectionDef';

export class SettingsSection extends SectionDef {
  readonly id = PanelSectionId.Settings;
  readonly title = 'Settings';
  readonly order = 4;
}
