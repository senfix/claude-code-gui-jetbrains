import React, {useState} from 'react';
import { LoadedMessageDto, getTextContent } from '../../types';
import { useCopyToClipboard } from './hooks/useCopyToClipboard';
import { ContextPills } from './components/ContextPills';
import { ImageAttachments } from './components/ImageAttachments';
import { MessageActions } from './components/MessageActions';
import { parseUserContent } from './utils/parseUserContent';
import { InterruptedMessageRenderer } from './InterruptedMessageRenderer';

interface UserMessageRendererProps {
  message: LoadedMessageDto;
}

const INTERRUPTED_TEXT = '[Request interrupted by user]';

export const UserMessageRenderer: React.FC<UserMessageRendererProps> = ({ message }) => {
  const { copied, copy } = useCopyToClipboard();
  const [isExpended, setIsExpended] = useState(false);
  const parsedContent = parseUserContent(getTextContent(message));

  const handleCopy = () => {
    copy(parsedContent.text);
  };

  const allContexts = [
    ...(parsedContent.contexts || []),
    ...(message.context || []),
  ];

  // Route interrupted messages to dedicated renderer
  if (parsedContent.text.trim() === INTERRUPTED_TEXT) {
    return <InterruptedMessageRenderer message={message} />;
  }

  return (
    <div className="group py-2 px-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <div className={`bg-zinc-800/80 border border-white/25 rounded-lg px-[8px] py-[3.5px] ${isExpended ? '' : 'max-h-[280px] overflow-hidden'}`} onClick={() => setIsExpended(!isExpended)}>
            <div className="text-white/80 text-[13px] leading-relaxed whitespace-pre-wrap break-words">
              {parsedContent.text}
            </div>
          </div>

          {allContexts.length > 0 && <ContextPills context={allContexts} />}
          {message.images && message.images.length > 0 && (
            <ImageAttachments images={message.images} />
          )}
        </div>

        <MessageActions copied={copied} onCopy={handleCopy} />
      </div>
    </div>
  );
};
