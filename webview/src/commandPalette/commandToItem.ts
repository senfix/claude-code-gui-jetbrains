import {
  PanelItemType,
  ActionItem,
  CommandItem,
  PanelItem,
} from '@/types/commandPalette';
import { CommandPaletteCommand, SlashCommand } from './types';

/**
 * Convert a CommandPaletteCommand to a PanelItem for rendering.
 * Toggle and Link branches removed (no registered items use these types).
 */
export function commandToItem(cmd: CommandPaletteCommand): PanelItem {
  const base = {
    id: cmd.id,
    label: cmd.label,
    type: cmd.type,
    icon: cmd.icon,
    secondaryLabel: cmd.secondaryLabel,
    disabled: cmd.disabled,
  };

  switch (cmd.type) {
    case PanelItemType.Command: {
      const slashCmd = cmd as SlashCommand;
      return {
        ...base,
        type: PanelItemType.Command,
        name: slashCmd.label,
        description: slashCmd.description,
        action: () => cmd.execute(),
      } as CommandItem;
    }
    case PanelItemType.Action:
      return {
        ...base,
        type: PanelItemType.Action,
        action: () => cmd.execute(),
      } as ActionItem;
    default:
      return {
        ...base,
        type: PanelItemType.Info,
      } as PanelItem;
  }
}
