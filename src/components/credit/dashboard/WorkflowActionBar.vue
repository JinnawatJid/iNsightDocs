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
import Swal from 'sweetalert2';

const props = defineProps({
    comment: {
        type: String,
        default: ''
    }
});
const emit = defineEmits(['comment-consumed']);

const store = useCreditRequestStore();
const authStore = useAuthStore();

const currentStatus = computed(() => store.requestStatus);


// Workflow Logic
const availableActions = computed(() => {
  const status = currentStatus.value;
  const actions = [];

  if (!status) return [];

  const amount = Number(store.transactionData.amount || 0);

  // Note: /pending-requests shouldn't show Draft requests, so Initiators shouldn't have actions here.
  // Draft submission is handled entirely within /create-credit-request.

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

  // 4. Finance Manager (FinanceReviewed -> Approved if <= 300k, or Reviewed if > 300k)
  if (status === 'FinanceReviewed' && authStore.isFinanceManager) {
    if (amount <= 300000) {
        actions.push({ key: 'approve', label: 'อนุมัติ (Final Approve)', targetStatus: 'Approved', class: 'btn-success' });
    } else {
        actions.push({ key: 'submit', label: 'ส่งต่อ (Send to Committee)', targetStatus: 'Reviewed', class: 'btn-primary' });
    }
    actions.push({ key: 'reject', label: 'ไม่อนุมัติ (Reject)', targetStatus: 'Rejected', class: 'btn-danger', requireComment: true });
  }

  // 5. Credit Committee (Reviewed -> Approved if > 300k)
  if (status === 'Reviewed' && authStore.isCreditCommittee) {
    if (amount > 300000) {
        actions.push({ key: 'approve', label: 'อนุมัติ (Final Approve)', targetStatus: 'Approved', class: 'btn-success' });
        actions.push({ key: 'reject', label: 'ไม่อนุมัติ (Reject)', targetStatus: 'Rejected', class: 'btn-danger', requireComment: true });
    }
  }

  // 7. Approved/Rejected/Canceled (No Actions)
  return actions;
});

const handleAction = async (action) => {
  let commentText = props.comment || '';

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

      const hasInlineDraftComment = !!(props.comment && props.comment.trim());
      const previousDraftComment = store.transactionData.draftComment;
      if (hasInlineDraftComment) {
        store.transactionData.draftComment = '';
      }

      const ok = await store.updateStatus(action.targetStatus, commentText);
      if (ok) {
        if (hasInlineDraftComment) {
          emit('comment-consumed');
        }
        Swal.fire('Success', 'ดำเนินการเรียบร้อยแล้ว', 'success');
      } else if (hasInlineDraftComment) {
        store.transactionData.draftComment = previousDraftComment;
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
