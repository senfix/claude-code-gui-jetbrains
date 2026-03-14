import type { ReactNode } from 'react';
import { SettingsHeader } from './SettingsHeader';
import { SettingsSidebar } from './SettingsSidebar';
import { ScopeTabs } from './ScopeTabs';
import { useRouter, ROUTE_META } from '@/router';

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const { route } = useRouter();
  const meta = ROUTE_META[route];
  const showScopeTabs = meta?.scopeSupport === 'both';

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <SettingsHeader />
      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar />
        <main className="flex-1 overflow-y-auto">
          {showScopeTabs && <ScopeTabs />}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
