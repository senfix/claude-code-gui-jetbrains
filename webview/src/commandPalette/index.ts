// Types
export type { CommandPaletteCommand, CommandPaletteServices } from './types';
export { SlashCommand, StaticItem } from './types';

// Registry
export { CommandPaletteRegistry } from './CommandPaletteRegistry';
export { KeyboardRegistry } from './KeyboardRegistry';
export type { KeyboardBinding } from './KeyboardRegistry';

// Section definition
export { SectionDef } from './SectionDef';

// Converter
export { commandToItem } from './commandToItem';

// Provider + context hook
export { CommandPaletteProvider, useCommandPaletteRegistry } from './CommandPaletteProvider';

// Hooks
export { useCommandPalette } from './hooks/useCommandPalette';

// UI
export { CommandPalettePanel } from './ui/CommandPalettePanel';
