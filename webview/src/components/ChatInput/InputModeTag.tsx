import { InputMode, INPUT_MODES } from '../../types/chatInput';
import { PauseIcon, ForwardIcon, PencilIcon, ChevronDoubleRightIcon } from '@heroicons/react/16/solid';
import {Tag} from "@/components/ChatInput/Tag.tsx";

interface InputModeTagProps {
  mode: InputMode;
  onClick: () => void;
}

const ModeIcon = ({ mode }: { mode: InputMode }) => {
  const iconClass = "w-3 h-3";

  switch (mode) {
    case 'plan':
      return <PauseIcon className={iconClass} />;
    case 'auto_edit':
      return <ForwardIcon className={iconClass} />;
    case 'ask_before_edit':
      return <PencilIcon className={iconClass} />;
    case 'bypass':
      return <ChevronDoubleRightIcon className={iconClass} />;
  }
};

export function InputModeTag({ mode, onClick }: InputModeTagProps) {
  const config = INPUT_MODES[mode];

  return (
      <Tag title={config.description} onClick={onClick}>
        <ModeIcon mode={mode} />
        <span>{config.label}</span>
      </Tag>
  );
}
