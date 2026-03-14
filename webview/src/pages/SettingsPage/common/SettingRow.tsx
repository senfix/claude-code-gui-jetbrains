import type { ReactNode } from 'react';
import { SettingDescription } from './SettingDescription';

interface SettingRowProps {
  label: string;
  description?: string;
  children: ReactNode;
}

export function SettingRow(props: SettingRowProps) {
  const { label, description, children } = props;
  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center md:justify-between py-3 border-b border-zinc-800">
      <div className="flex-1 mr-4">
        <label className="text-sm text-zinc-200">{label}</label>
        {description && <SettingDescription>{description}</SettingDescription>}
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  );
}
