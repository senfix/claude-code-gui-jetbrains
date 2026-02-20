import { useChatStreamContext } from '../contexts/ChatStreamContext';

export function PendingPermissionsBanner() {
  const { tools } = useChatStreamContext();
  const { pendingPermissions } = tools;

  if (pendingPermissions.length === 0) return null;

  return (
    <div className="flex-shrink-0 bg-amber-900/20 border-t border-amber-700/50 px-6 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <svg className="w-5 h-5 text-amber-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm1-3H7V4h2v5z" />
        </svg>
        <span className="text-sm text-amber-400 font-medium">
          {pendingPermissions.length} tool{pendingPermissions.length > 1 ? 's' : ''} awaiting approval
        </span>
      </div>
    </div>
  );
}
