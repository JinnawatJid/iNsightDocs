<template>
  <div v-if="availableActions.length > 0" class="action-bar">
    <div class="status-indicator">
       <span class="label">Status:</span>
       <span class="value">{{ currentStatus || 'Unknown' }}</span>
    </div>

    <div class="buttons">
      <button
        v-for="action in availableActions"
        :key="action.key"
        class="action-btn"
        :class="action.class"
        @click="handleAction(action)"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useAuthStore } from '@/stores/auth';
import { useWorkflowConfig } from '@/composables/useWorkflowConfig';
import { useApprovalThreshold } from '@/composables/useApprovalThreshold';
import { useConfigStore } from '@/stores/config';
import Swal from 'sweetalert2';

const props = defineProps({
    comment: {
        type: String,
        default: ''
    }
});

const store = useCreditRequestStore();
const authStore = useAuthStore();
const configStore = useConfigStore();
const { workflowStates, fetchWorkflowConfig } = useWorkflowConfig();
const { approvalThreshold } = useApprovalThreshold();
const emit = defineEmits(['update:comment']);

const currentStatus = computed(() => store.requestStatus);

onMounted(async () => {
  await Promise.all([
    fetchWorkflowConfig(),
    configStore.configurations && Object.keys(configStore.configurations).length > 0 ? Promise.resolve() : configStore.fetchConfigurations(),
  ]);
});

// Helper: derive button style class from a target state key
const getActionClass = (targetKey) => {
  if (!targetKey) return 'btn-primary';
  const lower = targetKey.toLowerCase();
  if (lower.includes('reject') || lower.includes('cancel')) return 'btn-danger';
  if (lower.includes('approv')) return 'btn-success';
  // Use the target state's type from config if possible
  if (workflowStates.value && workflowStates.value[targetKey]) {
    const t = workflowStates.value[targetKey].type;
    if (t === 'final') {
      // Check if it's a positive or negative final by label content
      const label = (workflowStates.value[targetKey].label || '').toLowerCase();
      if (label.includes('ไม่อนุมัติ') || label.includes('reject')) return 'btn-danger';
      return 'btn-success';
    }
  }
  return 'btn-primary';
};

// Helper: whether a transition requires a comment (i.e., it's a rejection-type action)
const requiresComment = (targetKey) => {
  const lower = (targetKey || '').toLowerCase();
  return lower.includes('reject') || lower.includes('cancel');
};


// Workflow Logic
const availableActions = computed(() => {
  const status = currentStatus.value;
  if (!status) return [];

  const myRoles = (authStore.user?.roles || []).map(r => r.role);
  const amount = Number(store.transactionData?.amount || 0);
  const threshold = approvalThreshold.value;

  // --- Dynamic path: read from WORKFLOW_CONFIG ---
  if (workflowStates.value && workflowStates.value[status]) {
    const stateData = workflowStates.value[status];

    // Check if the current user's roles allow them to act on this state
    const canAct = stateData.actionableByRoles.some(r => myRoles.includes(r));
    if (!canAct) return [];

    // --- Threshold-based special case for FinanceReviewed state ---
    if (status === 'FinanceReviewed') {
      const actions = [];
      const allTransitions = stateData.allowedTransitions || [];

      const approveTransition = allTransitions.find(t => t.toLowerCase().includes('approv') && !t.toLowerCase().includes('review'));
      const committeeTransition = allTransitions.find(t => t === 'Reviewed' || (t !== 'Rejected' && !t.toLowerCase().includes('approv')));
      const rejectTransitions = allTransitions.filter(t => requiresComment(t));

      if (amount <= threshold && approveTransition) {
        actions.push({ key: 'approve', label: 'อนุมัติ (Final Approve)', targetStatus: approveTransition, class: 'btn-success' });
      } else if (amount > threshold && committeeTransition) {
        actions.push({ key: 'submit', label: 'ส่งต่อ (Send to Committee)', targetStatus: committeeTransition, class: 'btn-primary' });
      }

      rejectTransitions.forEach(t => {
        actions.push({ key: 'reject', label: 'ไม่อนุมัติ (Reject)', targetStatus: t, class: 'btn-danger', requireComment: true });
      });

      return actions;
    }

    // --- General dynamic path ---
    return (stateData.allowedTransitions || []).map(targetKey => {
      const isReject = requiresComment(targetKey);
      return {
        key: targetKey,
        label: isReject ? 'ไม่อนุมัติ (Reject)' : 'อนุมัติ (Approve)',
        targetStatus: targetKey,
        class: isReject ? 'btn-danger' : 'btn-success',
        requireComment: isReject,
      };
    });
  }

  // --- Fallback to hardcoded logic if WORKFLOW_CONFIG is not available ---
  const actions = [];
  // Note: /pending-requests shouldn't show Draft requests, so Initiators shouldn't have actions here.

  // 1. Regional Manager (Opened -> RegionalSubmitted)
  if (status === 'Opened' && authStore.isRegionalManager) {
    actions.push({ key: 'approve', label: 'อนุมัติ (Approve)', targetStatus: 'RegionalSubmitted', class: 'btn-success' });
    actions.push({ key: 'reject', label: 'ไม่อนุมัติ (Reject)', targetStatus: 'Rejected', class: 'btn-danger', requireComment: true });
  }

  // 2. Sales Manager (RegionalSubmitted -> SalesSubmitted)
  if (status === 'RegionalSubmitted' && authStore.isSalesManager) {
    actions.push({ key: 'approve', label: 'อนุมัติ (Approve)', targetStatus: 'SalesSubmitted', class: 'btn-success' });
    actions.push({ key: 'reject', label: 'ไม่อนุมัติ (Reject)', targetStatus: 'Rejected', class: 'btn-danger', requireComment: true });
  }

  // 3. Finance Officer (SalesSubmitted -> FinanceReviewed)
  if (status === 'SalesSubmitted' && authStore.isFinanceOfficer) {
    actions.push({ key: 'review', label: 'ตรวจสอบ (Verify)', targetStatus: 'FinanceReviewed', class: 'btn-success' });
    actions.push({ key: 'reject', label: 'ไม่อนุมัติ (Reject)', targetStatus: 'Rejected', class: 'btn-danger', requireComment: true });
  }

  // 4. Finance Manager (FinanceReviewed -> Approved if <= threshold, or Reviewed if > threshold)
  if (status === 'FinanceReviewed' && authStore.isFinanceManager) {
    if (amount <= threshold) {
      actions.push({ key: 'approve', label: 'อนุมัติ (Final Approve)', targetStatus: 'Approved', class: 'btn-success' });
    } else {
      actions.push({ key: 'submit', label: 'ส่งต่อ (Send to Committee)', targetStatus: 'Reviewed', class: 'btn-primary' });
    }
    actions.push({ key: 'reject', label: 'ไม่อนุมัติ (Reject)', targetStatus: 'Rejected', class: 'btn-danger', requireComment: true });
  }

  // 5. Credit Committee (Reviewed -> Approved if > threshold)
  if (status === 'Reviewed' && authStore.isCreditCommittee) {
    if (amount > threshold) {
      actions.push({ key: 'approve', label: 'อนุมัติ (Final Approve)', targetStatus: 'Approved', class: 'btn-success' });
      actions.push({ key: 'reject', label: 'ไม่อนุมัติ (Reject)', targetStatus: 'Rejected', class: 'btn-danger', requireComment: true });
    }
  }

  return actions;
});


    const generateAuditTrailMessage = () => {
      const formatNum = (v) => {
        if (v === null || v === undefined || v === '') return '0';
        const val = parseFloat(String(v).replace(/,/g, ''));
        if (isNaN(val)) return '0';
        return val.toLocaleString('th-TH');
      };

      // Helper: try to extract the last known modified values from existing comments
      const extractLastAmountFromComments = () => {
        const comments = store.comments || [];
        // Find the LAST comment that changed the limit
        const limitChanges = comments.filter(c => c.comment_text && (c.comment_text.includes('ปรับวงเงินจาก') || c.comment_text.includes('อนุมัติวงเงินที่')));
        if (limitChanges.length > 0) {
          const lastLimitChange = limitChanges[limitChanges.length - 1];
          // Try new format first
          let match = lastLimitChange.comment_text.match(/อนุมัติวงเงินที่\s+([\d,]+)\s+บาท/);
          if (match && match[1]) return match[1].replace(/,/g, '');
          // Fallback to old format
          match = lastLimitChange.comment_text.match(/ปรับวงเงินจาก\s+[\d,]+\s+เป็น\s+([\d,]+)\s+บาท/);
          if (match && match[1]) return match[1].replace(/,/g, '');
        }
        return null;
      };

      const extractLastTermsFromComments = () => {
        const comments = store.comments || [];
        const termChanges = comments.filter(c => c.comment_text && (c.comment_text.includes('ปรับเครดิตเทอมจาก') || c.comment_text.includes('อนุมัติเงื่อนไขการชำระเงินที่')));
        if (termChanges.length > 0) {
          const lastTermChange = termChanges[termChanges.length - 1];
          // Try new format first
          let match = lastTermChange.comment_text.match(/อนุมัติเงื่อนไขการชำระเงินที่\s+(\d+)\/(\d+)\/(\d+)/);
          if (match) return { termGS: Number(match[1]), termAE: Number(match[2]), termYC: Number(match[3]) };
          // Fallback to old format
          match = lastTermChange.comment_text.match(/ปรับเครดิตเทอมจาก\s+\d+\/\d+\/\d+\s+เป็น\s+(\d+)\/(\d+)\/(\d+)/);
          if (match) return { termGS: Number(match[1]), termAE: Number(match[2]), termYC: Number(match[3]) };
        }
        return null;
      };

      // To calculate incremental change, we prioritize the last known changed value from comments.
      // If no changes exist in comments, we fall back to the robust originalTransactionData from the backend's original_snapshot.
      const fromCommentsAmt = extractLastAmountFromComments();
      const fromCommentsTerms = extractLastTermsFromComments();

      let baseline = {
        amount: fromCommentsAmt ?? store.originalTransactionData?.amount ?? store.originalRequestedAmount,
        termGS: fromCommentsTerms?.termGS ?? store.originalTransactionData?.termGS ?? store.originalRequestedTerms?.termGS,
        termAE: fromCommentsTerms?.termAE ?? store.originalTransactionData?.termAE ?? store.originalRequestedTerms?.termAE,
        termYC: fromCommentsTerms?.termYC ?? store.originalTransactionData?.termYC ?? store.originalRequestedTerms?.termYC,
      };

      let msg = '';
      // Calculate final total amount (handle credit increases by adding current limit)
      const rawEffectiveAmt = store.getEffectiveValue('amount');
      const parsedAmt = parseFloat(String(rawEffectiveAmt).replace(/,/g, '')) || 0;

      const requestType = store.originalTransactionData?.requestType || store.transactionData.requestType || '';
      const isRequestIncrease = requestType.includes('เครดิตเพิ่ม');

      let finalTotalAmt = parsedAmt;
      if (isRequestIncrease) {
        const currentLimit = parseFloat(String(store.customer.current_credit_limit || 0).replace(/,/g, '')) || 0;
        finalTotalAmt = currentLimit + parsedAmt;
      }

      const newAmt = formatNum(finalTotalAmt);
      msg += `อนุมัติวงเงินที่ ${newAmt} บาท\n`;

      // Always append the final approved payment terms, even if unchanged.
      const newGS = store.getEffectiveValue('termGS') || 0;
      const newAE = store.getEffectiveValue('termAE') || 0;
      const newYC = store.getEffectiveValue('termYC') || 0;
      msg += `อนุมัติเงื่อนไขการชำระเงินที่ ${newGS}/${newAE}/${newYC}\n`;

      return msg;
    };


const handleAction = async (action) => {
  let commentText = props.comment || '';

  const clearDraft = () => {
      if (store.requestId) {
          localStorage.removeItem(`draftComment_${store.requestId}`);
      }
      emit('update:comment', '');
  };


    // Case 1: Comment Required AND Box is Empty -> Use Popup
  if (action.requireComment && !commentText.trim()) {
    const { value: text, isConfirmed } = await Swal.fire({
      title: action.label,
      input: 'textarea',
      inputLabel: 'ระบุเหตุผล / ความคิดเห็น (Reason/Comment)',
      inputPlaceholder: 'พิมพ์ข้อความที่นี่...',
      inputAttributes: {
        'aria-label': 'Type your message here'
      },
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (value) => {
        if (!value) {
          return 'กรุณาระบุเหตุผล!';
        }
      }
    });

    if (isConfirmed && text) {

      // For popup text, default comment is 'text' variable
      let commentText = text;

      const auditTrailMsg = generateAuditTrailMessage();
      const finalActionCommentText = auditTrailMsg ? (commentText ? `${auditTrailMsg}\n${commentText}` : auditTrailMsg.trim()) : commentText;

      // Apply reviewer suggestions before updating status
      store.applyReviewerSuggestions();

      const ok = await store.updateStatus(action.targetStatus, finalActionCommentText);
      if (ok) {
        if (finalActionCommentText) {
          await store.saveCommentToDB(finalActionCommentText);
        }
        clearDraft();
        Swal.fire('Success', 'ดำเนินการเรียบร้อยแล้ว', 'success');
      }
    }
  }
  // Case 2: Comment Provided (Inline) OR Not Required -> Confirm then Submit
  else {
    const result = await Swal.fire({
      title: 'ยืนยันการทำรายการ?',
      text: `คุณต้องการ ${action.label} ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      // If comment was not required and box was empty, use default message
      if (!commentText.trim() && !action.requireComment) {
          commentText = 'ไม่มีความเห็น';
      }


      const auditTrailMsg = generateAuditTrailMessage();
      const finalActionCommentText = auditTrailMsg ? (commentText ? `${auditTrailMsg}\n${commentText}` : auditTrailMsg.trim()) : commentText;

      // Apply reviewer suggestions before updating status
      store.applyReviewerSuggestions();

      const ok = await store.updateStatus(action.targetStatus, finalActionCommentText);
      if (ok) {
        if (finalActionCommentText) {
          await store.saveCommentToDB(finalActionCommentText);
        }
        clearDraft();
        Swal.fire('Success', 'ดำเนินการเรียบร้อยแล้ว', 'success');
      }
    }
  }
};
</script>

<style scoped>
.action-bar {
  background: white;
  border-top: 1px solid #e0e0e0;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
}

.status-indicator {
  font-size: 14px;
  color: #555;
  display: flex;
  gap: 8px;
  align-items: center;
}

.status-indicator .value {
  font-weight: bold;
  color: #333;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.buttons {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.action-btn:hover {
  opacity: 0.9;
}

.btn-primary {
  background-color: #0056b3;
  color: white;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-warning {
  background-color: #ffc107;
  color: #333;
}
</style>
