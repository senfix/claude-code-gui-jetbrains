import { LoadedMessageDto } from '../types';
import {
  UserMessageRenderer,
  AssistantMessageRenderer,
  SystemMessageRenderer,
  SummaryMessageRenderer,
} from './message-renderers';

interface MessageBubbleProps {
  message: LoadedMessageDto;
  onRetry?: (messageId: string) => void;
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  switch (message.type) {
    case 'user':
      return <UserMessageRenderer message={message} />;
    case 'assistant':
      return <AssistantMessageRenderer message={message} onRetry={onRetry} />;
    case 'system':
      return <SystemMessageRenderer message={message} />;
    case 'summary':
      return <SummaryMessageRenderer message={message} />;
    default:
      return null;
  }
}
