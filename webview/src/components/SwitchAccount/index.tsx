import { ArrowLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useRouter } from '@/router';
import { Route, ROUTE_META, Label } from '@/router/routes';

interface Props {
  className?: string;
}

export function SwitchAccount(props: Props) {
  const { className } = props;
  const { navigate } = useRouter();
  const meta = ROUTE_META[Route.SWITCH_ACCOUNT];

  return (
    <div className={`flex flex-col h-full bg-[#1a1a1a] ${className ?? ''}`}>
      <header className="flex items-center gap-2 px-2 py-1 border-b border-zinc-800">
        <button
          onClick={() => navigate(Route.CHAT)}
          className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          title={Label.BACK}
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-semibold text-zinc-100">{meta.label}</h1>
      </header>

      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="max-w-md w-full px-8">
          <img
            src="/welcome-art-dark.svg"
            alt="Welcome art"
            className="w-full mb-6"
            draggable={false}
          />

          <p className="text-sm text-zinc-300 leading-relaxed">
            Claude Code can be used with your Claude subscription or billed based on API usage through your Console account.
          </p>

          <p className="text-sm text-zinc-300 mt-4">
            How do you want to log in?
          </p>

          <button className="w-full mt-6 py-3 rounded-lg bg-[#D97757] hover:bg-[#c5684a] text-white font-semibold text-sm transition-colors">
            Claude.ai Subscription
          </button>
          <p className="text-xs text-zinc-500 mt-1.5">
            Use your Claude Pro, Team, or Enterprise subscription
          </p>

          <button className="w-full mt-5 py-3 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white font-semibold text-sm transition-colors">
            Anthropic Console
          </button>
          <p className="text-xs text-zinc-500 mt-1.5">
            Pay for API usage through your Console account
          </p>

          <button className="w-full mt-5 py-3 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-1.5">
            Bedrock, Foundry, or Vertex
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </button>
          <p className="text-xs text-zinc-500 mt-1.5">
            Instructions on how to use API keys or third-party providers.
          </p>

          <p className="text-xs text-zinc-500 mt-10 text-center">
            Prefer the terminal experience? Run{' '}
            <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-xs">
              claude
            </code>{' '}
            in terminal
          </p>
        </div>
      </div>
    </div>
  );
}
