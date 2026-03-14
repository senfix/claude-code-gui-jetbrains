import type { ReactNode } from 'react';
import Tippy from '@tippyjs/react/headless';

interface Props {
  supportedScope: 'global' | 'project';
  currentScope: 'global' | 'project';
  children: ReactNode;
}

export function ScopeGuard(props: Props) {
  const { supportedScope, currentScope, children } = props;
  const isDisabled = supportedScope !== currentScope;

  if (!isDisabled) {
    return <>{children}</>;
  }

  const tooltipText =
    supportedScope === 'global'
      ? 'Only available as a global setting'
      : 'Only available as a project setting';

  return (
    <Tippy
      placement="top"
      render={(attrs) => (
        <div
          className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-200 shadow-lg"
          {...attrs}
        >
          {tooltipText}
        </div>
      )}
    >
      <div className="cursor-not-allowed">
        <div className="opacity-30 pointer-events-none select-none">
          {children}
        </div>
      </div>
    </Tippy>
  );
}
