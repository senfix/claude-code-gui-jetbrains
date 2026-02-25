import { PanelSectionId } from '@/types/commandPalette';

/**
 * Abstract base class for command palette section definitions.
 */
export abstract class SectionDef {
  abstract readonly id: PanelSectionId;
  abstract readonly title: string;
  abstract readonly order: number;
  readonly showDividerAbove: boolean = true;
  readonly scrollable: boolean = false;
  readonly maxHeight?: number;
}
