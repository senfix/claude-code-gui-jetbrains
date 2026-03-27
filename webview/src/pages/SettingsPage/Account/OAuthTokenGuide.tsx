import { useState } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

const MAC_COMMAND =
  'security find-generic-password -s "Claude Code-credentials" -w';

const LINUX_COMMAND =
  'cat ~/.claude/.credentials.json';

const WINDOWS_COMMAND =
  'Get-Content "$env:USERPROFILE\\.claude\\.credentials.json"';

function CopyButton(props: { text: string }) {
  const { text } = props;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex-shrink-0 p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700"
      title="Copy"
    >
      {copied
        ? <CheckIcon className="w-3.5 h-3.5 text-green-400" />
        : <ClipboardDocumentIcon className="w-3.5 h-3.5" />
      }
    </button>
  );
}

function CommandBlock(props: { label: string; command: string }) {
  const { label, command } = props;
  return (
    <div className="mt-1.5">
      <span className="text-zinc-400">{label}:</span>
      <div className="mt-1 flex items-start gap-1.5 bg-zinc-950 rounded px-2 py-1.5 border border-zinc-800">
        <code className="text-xs text-zinc-300 break-all flex-1 select-all">{command}</code>
        <CopyButton text={command} />
      </div>
    </div>
  );
}

export function OAuthTokenGuide() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="text-xs text-zinc-500 mt-1">
      <p>
        For users signed in via <code className="text-zinc-300 bg-zinc-800 px-1 rounded">claude login</code> (OAuth).
      </p>
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-blue-400 hover:text-blue-300 mt-0.5"
        >
          Don&apos;t have a token? See how to get one &rarr;
        </button>
      ) : (
        <div className="mt-2 space-y-2 text-zinc-500">
          <p>
            1. Make sure you are logged in to Claude Code CLI.
            If not, run <code className="text-zinc-300 bg-zinc-800 px-1 rounded">claude login</code> first.
          </p>
          <p>2. Run the command for your OS to view credentials:</p>
          <CommandBlock label="macOS (Terminal)" command={MAC_COMMAND} />
          <CommandBlock label="Linux (Terminal)" command={LINUX_COMMAND} />
          <CommandBlock label="Windows (PowerShell)" command={WINDOWS_COMMAND} />
          <p>
            3. Find the <code className="text-zinc-300 bg-zinc-800 px-1 rounded">accessToken</code> value
            from the output and paste it into the field below.
          </p>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-zinc-600 hover:text-zinc-400"
          >
            Hide guide
          </button>
        </div>
      )}
    </div>
  );
}
