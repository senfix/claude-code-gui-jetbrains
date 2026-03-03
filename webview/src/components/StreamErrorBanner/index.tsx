import { useChatStreamContext } from '../../contexts/ChatStreamContext';
import {isSessionConflict, SessionConflictErrorBanner} from "./SessionConflictErrorBanner.tsx";
import {DefaultErrorBanner} from "./DefaultErrorBanner.tsx";

export const StreamErrorBanner = () => {
  const { error } = useChatStreamContext();


  if (!error) return null;

  if (isSessionConflict(error)) return <SessionConflictErrorBanner />;

  // Fallback: 정의되지 않은 에러
  return <DefaultErrorBanner error={error} />;
};
