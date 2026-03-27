import { useState, useRef, useCallback } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface Props {
  value: string;
  placeholder: string;
  onSave: (value: string) => Promise<void>;
}

export function TokenField(props: Props) {
  const { value, placeholder, onSave } = props;
  const [localValue, setLocalValue] = useState(value);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDirty = localValue !== value;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(localValue);
    } finally {
      setSaving(false);
    }
  }, [localValue, onSave]);

  const handleClear = useCallback(async () => {
    setLocalValue('');
    setSaving(true);
    try {
      await onSave('');
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isDirty) {
      handleSave();
    }
  }, [isDirty, handleSave]);

  // Sync external value changes
  if (!isDirty && localValue !== value) {
    setLocalValue(value);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type={revealed ? 'text' : 'password'}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 w-full pr-8"
          value={localValue}
          placeholder={placeholder}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          onClick={() => setRevealed(!revealed)}
          tabIndex={-1}
        >
          {revealed
            ? <EyeSlashIcon className="w-4 h-4" />
            : <EyeIcon className="w-4 h-4" />
          }
        </button>
      </div>
      {isDirty && (
        <button
          type="button"
          className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          Save
        </button>
      )}
      {!isDirty && value && (
        <button
          type="button"
          className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50"
          onClick={handleClear}
          disabled={saving}
        >
          Clear
        </button>
      )}
    </div>
  );
}
