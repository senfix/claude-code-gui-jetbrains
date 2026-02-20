import { GroupedSessions } from './utils';
import { SearchInput } from './SearchInput';
import { SessionList } from './SessionList';
import { useSessionContext } from '../../../contexts/SessionContext';

interface DropdownMenuProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  groupedSessions: GroupedSessions;
  filteredSessionsCount: number;
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

export function DropdownMenu({
  searchQuery,
  onSearchChange,
  groupedSessions,
  filteredSessionsCount,
  currentSessionId,
  onSelectSession,
}: DropdownMenuProps) {
  const { isLoading } = useSessionContext();

  return (
    <div className="absolute left-0 top-full mt-1 w-[23rem] bg-zinc-900 border border-zinc-700 rounded-md shadow-xl overflow-hidden z-50">
      <SearchInput value={searchQuery} onChange={onSearchChange} />

      {isLoading && (
        <div className="px-2.5 py-3 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading sessions...
        </div>
      )}

      {filteredSessionsCount > 0 && (
        <SessionList
          groupedSessions={groupedSessions}
          currentSessionId={currentSessionId}
          onSelectSession={onSelectSession}
        />
      )}

      {!isLoading && filteredSessionsCount === 0 && (
        <div className="px-2.5 py-3 text-xs text-zinc-500 text-center">
          {searchQuery.trim() ? 'No matching sessions' : 'No sessions yet'}
        </div>
      )}
    </div>
  );
}
