import { StaticItem } from '../../types';

export const supportItems = [
  new StaticItem('help-docs', 'View help docs', {
    disabled: false,
    action: async () => {
      console.log('[CommandPalette] Help docs - not yet implemented');
    },
  }),
];
