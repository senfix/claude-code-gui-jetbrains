import { getAdapter } from '@/adapters';
import { StaticItem } from '../../types';
import { Route, routeToHash } from '@/router/routes';

export const settingsItems = [
  new StaticItem('switch-account', 'Switch account', {
    disabled: false,
    action: async () => {
      window.location.hash = routeToHash(Route.SWITCH_ACCOUNT);
    },
  }),
  new StaticItem('general-config', 'General config...', {
    disabled: false,
    action: async () => {
      await getAdapter().openSettings();
    },
  }),
];
