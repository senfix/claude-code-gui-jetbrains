import { getAdapter } from '@/adapters';
import { StaticItem } from '../../types';

export const settingsItems = [
  new StaticItem('switch-account', 'Switch account'),
  new StaticItem('general-config', 'General config...', {
    disabled: false,
    action: async () => {
      await getAdapter().openSettings();
    },
  }),
];
