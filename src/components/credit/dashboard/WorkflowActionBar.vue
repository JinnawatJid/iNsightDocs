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
import { computed } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useAuthStore } from '@/stores/auth';
import { getWorkflowConfig } from '@/utils/workflowUtils';
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
const emit = defineEmits(['update:comment']);

const currentStatus = computed(() => store.requestStatus);


// Workflow Logic
const availableActions = computed(() => {
  const status = currentStatus.value;
  const actions = [];

  if (!status) return [];

  const config = getWorkflowConfig();
  if (!config || !config.states || !config.states[status]) return [];

  const stateData = config.states[status];
  const userRoles = authStore.user?.roles?.map(r => r.role) || [];

  // Check if current user is allowed to act on this status
  const isActionable = stateData.actionableByRoles?.some(role => userRoles.includes(role));

  if (!isActionable) return [];

  const amount = Number(store.transactionData.amount || 0);

  // Dynamically map allowed transitions
  if (stateData.allowedTransitions) {
      stateData.allowedTransitions.forEach(targetStatus => {
          // Special Logic for amount threshold
          // In a fully dynamic system, this threshold logic should ideally also be in the config (e.g. conditions).
          // For now, we will honor the 300k rule for the Finance Manager transition by filtering allowedTransitions dynamically.
          // If the status is FinanceReviewed, we enforce the split:
          if (status === 'FinanceReviewed') {
              if (amount <= 300000 && targetStatus === 'Reviewed') return; // Skip Send to Committee
              if (amount > 300000 && targetStatus === 'Approved') return; // Skip Final Approve directly
          }
          if (status === 'Reviewed') {
              // Wait, Reviewed requires amount > 300k to even get here naturally, but just in case:
              if (amount <= 300000 && targetStatus === 'Approved') return;
          }

          let btnClass = 'btn-primary';
          let requireComment = false;
          let label = `ดำเนินการ (${targetStatus})`;

          // Determine aesthetic properties based on target status semantics
          if (targetStatus === 'Approved' || targetStatus.includes('Submitted') || targetStatus.includes('Reviewed')) {
              btnClass = 'btn-success';
              label = targetStatus === 'Approved' ? 'อนุมัติ (Approve)' :
                      targetStatus.includes('Reviewed') ? 'ตรวจสอบ (Verify)' : 'ส่งต่อ (Submit)';
          }
          if (targetStatus === 'Rejected' || targetStatus === 'Returned') {
              btnClass = 'btn-danger';
              requireComment = true;
              label = targetStatus === 'Rejected' ? 'ไม่อนุมัติ (Reject)' : 'ส่งกลับแก้ไข (Return)';
          }

          actions.push({
              key: targetStatus,
              label: label,
              targetStatus: targetStatus,
              class: btnClass,
              requireComment: requireComment
          });
      });
  }

  return actions;
});

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
      const ok = await store.updateStatus(action.targetStatus, text);
      if (ok) {
        if (text) {
          await store.saveCommentToDB(text);
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
          commentText = 'Approved/Verified';
      }

      const ok = await store.updateStatus(action.targetStatus, commentText);
      if (ok) {
        if (commentText) {
          await store.saveCommentToDB(commentText);
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
