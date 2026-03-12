import { useCallback } from 'react';
import { OptionItem } from '../ApprovalPanel/OptionButton';
import { ApprovalPanel } from '../ApprovalPanel';
import { useChatStreamContext } from '../../../contexts/ChatStreamContext';
import { useSessionContext } from '../../../contexts/SessionContext';
import { usePendingPlanApproval } from '../../../hooks/usePendingPlanApproval';
import { InputModeValues } from '../../../types/chatInput';

const options: OptionItem[] = [
  { key: '1', label: 'Yes, and auto-accept' },
  { key: '2', label: 'Yes, and manually approve edits' },
  { key: '3', label: 'No, keep planning' },
];

export function AcceptPlanPanel() {
  const { stop } = useChatStreamContext();
  const { setInputMode } = useSessionContext();
  const { pending: pendingPlan, approve: approvePlan, deny: denyPlan } = usePendingPlanApproval();

  const handleOptionSelect = useCallback((index: number) => {
    if (!pendingPlan) return;
    if (index === 0) {
      approvePlan(pendingPlan.controlRequestId);
      setInputMode(InputModeValues.AUTO_EDIT);
    } else if (index === 1) {
      approvePlan(pendingPlan.controlRequestId);
      setInputMode(InputModeValues.ASK_BEFORE_EDIT);
    } else if (index === 2) {
      denyPlan(pendingPlan.controlRequestId);
      stop();
    }
  }, [pendingPlan, approvePlan, denyPlan, setInputMode, stop]);

  const handleTextSubmit = useCallback((text: string) => {
    if (!pendingPlan) return;
    denyPlan(pendingPlan.controlRequestId, text);
  }, [pendingPlan, denyPlan]);

  const handleCancel = useCallback(() => {
    if (!pendingPlan) return;
    denyPlan(pendingPlan.controlRequestId);
    stop();
  }, [pendingPlan, denyPlan, stop]);

  if (!pendingPlan) return null;

  return (
    <ApprovalPanel
      title="Accept this plan?"
      subtitle="Select text in the preview to add comments"
      options={options}
      onOptionSelect={handleOptionSelect}
      textareaPlaceholder="Tell Claude what to do instead"
      onTextSubmit={handleTextSubmit}
      onCancel={handleCancel}
    />
  );
}
