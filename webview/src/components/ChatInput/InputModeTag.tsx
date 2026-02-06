import { InputMode, INPUT_MODES } from '../../types/chatInput';

interface InputModeTagProps {
  mode: InputMode;
  onClick: () => void;
}

export function InputModeTag({ mode, onClick }: InputModeTagProps) {
  const config = INPUT_MODES[mode];

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs font-medium text-zinc-400 transition-colors cursor-pointer hover:bg-zinc-800"
      title={config.description}
      onClick={onClick}
    >
      <span className="text-[11px]">{config.icon}</span>
      <span>{config.label}</span>
    </button>
  );
}
