<template>
  <div class="request-timeline-container">
    <h4>ประวัติการพิจารณา</h4>
    <div class="request-timeline">
      <div
        v-for="(step, index) in timelineSteps"
        :key="step.id"
        class="timeline-step"
        :class="{
          'completed': step.completed,
          'rejected': step.rejected,
          'pending': !step.completed && !step.rejected,
          'hidden': step.hidden
        }"
      >
        <div class="step-indicator">
          <div class="step-number">{{ index + 1 }}</div>
          <div v-if="index < timelineSteps.length - 1" class="step-line"></div>
        </div>
        <div class="step-content">
          <div class="step-header">
            <span class="step-role">{{ step.roleLabel }}</span>
            <span class="step-date" v-if="step.completed || step.rejected">{{ formatDate(step.date) }}</span>
          </div>
          <div class="step-body" v-if="step.completed || step.rejected">
            <div v-if="step.comment" class="comment-text-wrapper">
              <template v-for="(line, lIndex) in step.comment.split('\n').filter(l => !l.startsWith('ปรับวงเงินจาก') && !l.startsWith('ปรับเครดิตเทอมจาก'))" :key="'text-'+lIndex">
                <div class="comment-text-line">{{ line === '' ? '&nbsp;' : line }}</div>
              </template>
              <div class="audit-logs-container" v-if="step.comment.split('\n').some(l => l.startsWith('ปรับวงเงินจาก') || l.startsWith('ปรับเครดิตเทอมจาก'))">
                <template v-for="(line, lIndex) in step.comment.split('\n').filter(l => l.startsWith('ปรับวงเงินจาก') || l.startsWith('ปรับเครดิตเทอมจาก'))" :key="'audit-'+lIndex">
                  <div class="audit-trail-line">
                    <div class="audit-icon-wrapper"><i class="fas fa-history audit-icon"></i></div>
                    <div class="audit-content">
                      <span class="audit-label">{{ line.split('จาก')[0] }}</span>
                      <span class="audit-values">จาก <span class="audit-highlight">{{ line.split('จาก')[1].split('เป็น')[0].trim() }}</span> เป็น <span class="audit-highlight">{{ line.split('เป็น')[1].trim() }}</span></span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
            <div v-else class="comment-text empty-comment">- ไม่มีข้อความ -</div>
            <div class="step-action-badge" :class="step.actionType" v-if="step.actionLabel">
              {{ step.actionLabel }}
            </div>
          </div>
          <div class="step-body pending-body" v-else>
            <div class="pending-text">รอการพิจารณา</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </template>
<script>
import { computed } from 'vue';
import { formatDateString as normalizeDateString } from '@/utils/dateUtils';

// Define the static 5-step workflow
// Use an array of roleKeys to support multiple actors for the same step (e.g. Finance Manager OR Credit Committee)
const WORKFLOW_STEPS = [
  { id: 'step-1', roleKeys: ['ผู้จัดการสาขา'], label: 'ผู้จัดการสาขา' },
  { id: 'step-2', roleKeys: ['ผู้จัดการภาค'], label: 'ผู้จัดการภาค' },
  { id: 'step-3', roleKeys: ['ผู้จัดการฝ่ายขาย', 'ผู้จัดการฝ่ายขาย (Legacy)'], label: 'ผู้จัดการฝ่ายขาย' },
  { id: 'step-4', roleKeys: ['เจ้าหน้าที่ฝ่ายการเงิน', 'เจ้าหน้าที่ฝ่ายการเงิน (Legacy)'], label: 'เจ้าหน้าที่ฝ่ายการเงิน' },
  { id: 'step-5', roleKeys: ['ผู้อนุมัติ (วงเงิน <300K)', 'ผู้จัดการฝ่ายการเงิน'], label: 'ผู้จัดการฝ่ายการเงิน' },
  { id: 'step-6', roleKeys: ['ผู้อนุมัติ (วงเงิน > 300K)', 'กรรมการเครดิต', 'กรรมการเครดิต (Legacy)'], label: 'กรรมการเครดิต' }
];

export default {
  name: 'RequestTimeline',
  props: {
    comments: {
      type: Array,
      default: () => []
    },
    currentStatus: {
      type: String,
      default: 'Draft'
    },
    requestAmount: {
      type: [Number, String],
      default: 0
    }
  },
  setup(props) {
    const formatDate = (value) => {
      if (!value) return '';

      const date = value instanceof Date ? value : normalizeDateString(value);
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return typeof value === 'string' ? value : '';
      }

      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Map current request status to the corresponding workflow step index that is CURRENTLY pending/active.
    // Anything BEFORE this index is guaranteed to be completed.
    const STATUS_TO_CURRENT_STEP_INDEX = {
      'Draft': 0,             // 0: ผู้จัดการสาขา
      'Opened': 1,            // 1: ผู้จัดการภาค
      'RegionalSubmitted': 2, // 2: ผู้จัดการฝ่ายขาย
      'SalesSubmitted': 3,    // 3: เจ้าหน้าที่ฝ่ายการเงิน
      'FinanceReviewed': 4,   // 4: ผู้อนุมัติ (วงเงิน <300K)
      'Reviewed': 5,          // 5: ผู้อนุมัติ (วงเงิน > 300K)
      'Approved': 6,          // 6: Done (all 0-5 are completed)
      'Closed': 6,            // 6: Done
      // Legacy Support
      'Submitted': 2,
      'PendingSales (ชั่วคราว)': 3,
      'PendingFinance (ชั่วคราว)': 5,
      'Rejected': -1,         // Special handling below
      'Canceled': -1          // Special handling below
    };

    const timelineSteps = computed(() => {
      // Sort comments chronologically
      const sortedComments = [...props.comments].sort((a, b) => {
        const dateA = normalizeDateString(a.created_at);
        const dateB = normalizeDateString(b.created_at);

        return dateA.getTime() - dateB.getTime();
      });

      // Filter out Committee step if amount <= 300,000
      let amount = 0;
      if (typeof props.requestAmount === 'string') {
        amount = Number(props.requestAmount.replace(/,/g, ''));
      } else {
        amount = Number(props.requestAmount || 0);
      }

      let activeSteps = WORKFLOW_STEPS;
      // We hide the 6th step if the amount is explicitly <= 300,000 OR if it's 0 (default empty state)
      if (amount <= 300000) {
          activeSteps = WORKFLOW_STEPS.filter(step => step.id !== 'step-6');
      }

      let steps = activeSteps.map(ws => ({
        ...ws,
        roleLabel: ws.label,
        completed: false,
        rejected: false,
        hidden: false,
        date: null,
        comment: null,
        actionLabel: null,
        actionType: null
      }));

      // 1. Populate data from comments (if they exist)
      steps.forEach((step) => {
        const matchingComments = sortedComments.filter(c => step.roleKeys.includes(c.actor_role));

        if (matchingComments.length > 0) {
          // Take the latest action for this role
          const lastComment = matchingComments[matchingComments.length - 1];
          step.completed = true;
          step.date = lastComment.created_at;
          step.comment = lastComment.comment_text;

          // We can optionally use the actual actor role if provided and valid.
          if (lastComment.actor_role && (step.id === 'step-5' || step.id === 'step-6')) {
              step.roleLabel = lastComment.actor_role;
          }
        }
      });

      // 2. Force previous steps to be 'completed' even if they left no comment.
      // E.g., if status is 'SalesSubmitted' (index 3), then steps 0, 1, and 2 MUST be completed.
      const currentStepIndex = STATUS_TO_CURRENT_STEP_INDEX[props.currentStatus];

      if (currentStepIndex !== undefined && currentStepIndex !== -1) {
        for (let i = 0; i < currentStepIndex; i++) {
            if (i < steps.length) {
                steps[i].completed = true;
                // We cannot force a date if there was no comment, but the step will light up blue.
            }
        }
      }

        // Handle Rejection State globally
        if (props.currentStatus === 'Rejected' || props.currentStatus === 'Canceled') {
          // Find the last completed step (based on comments) and mark it as the rejector
          let lastCompletedIndex = -1;
          for (let i = steps.length - 1; i >= 0; i--) {
            if (steps[i].completed) {
              lastCompletedIndex = i;
              break;
            }
          }

          if (lastCompletedIndex !== -1) {
            steps[lastCompletedIndex].rejected = true;
            steps[lastCompletedIndex].completed = false; // It's rejected, not successfully completed
            steps[lastCompletedIndex].actionLabel = props.currentStatus === 'Rejected' ? 'ปฏิเสธคำขอ' : 'ยกเลิก';
            steps[lastCompletedIndex].actionType = 'badge-danger';

            // Fix: Ensure all steps BEFORE the rejector are marked as completed, even without comments
            for (let i = 0; i < lastCompletedIndex; i++) {
              steps[i].completed = true;
            }
          }

          // Hide all steps after the rejected step
          for (let i = lastCompletedIndex + 1; i < steps.length; i++) {
            steps[i].hidden = true;
          }
        } else if (props.currentStatus === 'Approved') {
          // Find the last step and make sure it shows approved
          const lastStep = steps[steps.length - 1];
          if (lastStep.completed) {
            lastStep.actionLabel = 'อนุมัติแล้ว';
            lastStep.actionType = 'badge-success';
          }
        } else if (props.currentStatus === 'Closed') {
          // Similar to Approved
          const lastStep = steps[steps.length - 1];
          if (lastStep.completed) {
            lastStep.actionLabel = 'ปิดงานแล้ว';
            lastStep.actionType = 'badge-success';
          }
        }

      // Hide hidden steps
      return steps.filter(s => !s.hidden);
    });

    return {
      formatDate,
      timelineSteps
    };
  }
};
</script>

<style scoped>
.request-timeline-container {
  margin-bottom: 20px;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.request-timeline-container h4 {
  font-size: 16px;
  font-weight: bold;
  margin-top: 0;
  margin-bottom: 20px;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 10px;
}

.request-timeline {
  display: flex;
  flex-direction: column;
}

.timeline-step {
  display: flex;
  position: relative;
  min-height: 80px;
}

.timeline-step:last-child {
  min-height: auto;
}

/* Step Indicator (Circle and Line) */
.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 16px;
  position: relative;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #cbd5e1; /* Default grey */
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  z-index: 2;
  transition: all 0.3s ease;
}

.step-line {
  width: 2px;
  background-color: #e2e8f0;
  flex-grow: 1;
  margin-top: 4px;
  margin-bottom: 4px;
}

/* Step Content */
.step-content {
  flex-grow: 1;
  padding-bottom: 24px;
  padding-top: 4px;
}

.timeline-step:last-child .step-content {
  padding-bottom: 0;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.step-role {
  font-weight: 600;
  color: #475569; /* Default grey */
  font-size: 15px;
}

.step-date {
  font-size: 13px;
  color: #64748b;
}

.step-body {
  background-color: #f8fafc;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
  position: relative;
}

.comment-text-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.comment-text-line {
  font-size: 14px;
  color: #334155;
  white-space: pre-wrap;
  line-height: 1.5;
}
.audit-trail-line {
  font-size: 13px;
  color: #64748b;
  background-color: #f8fafc;
  padding: 6px 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  border: 1px solid #e2e8f0;
}
.audit-content {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
.audit-label {
  font-weight: 500;
  color: #475569;
}
.audit-values {
  color: #64748b;
}
.audit-highlight {
  font-weight: 600;
  color: #0f172a;
}
.audit-icon {
  font-size: 12px;
  color: #94a3b8;
}

.empty-comment {
  color: #94a3b8;
  font-style: italic;
}

.pending-body {
  background-color: transparent;
  border: 1px dashed #cbd5e1;
  display: flex;
  align-items: center;
}

.pending-text {
  color: #94a3b8;
  font-size: 14px;
  font-style: italic;
}

/* Action Badge */
.step-action-badge {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge-success {
  background-color: #dcfce7;
  color: #166534;
}

.badge-danger {
  background-color: #fee2e2;
  color: #991b1b;
}

/* --- STATES --- */

/* Completed State */
.timeline-step.completed .step-number {
  background-color: #2563eb; /* Blue */
}

.timeline-step.completed .step-line {
  background-color: #2563eb;
}

.timeline-step.completed .step-role {
  color: #1e293b;
}

.timeline-step.completed .step-body {
  border-color: #e2e8f0;
  background-color: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* Rejected State */
.timeline-step.rejected .step-number {
  background-color: #dc2626; /* Red */
}

.timeline-step.rejected .step-role {
  color: #991b1b;
}

.timeline-step.rejected .step-body {
  border-color: #fecaca;
  background-color: #fef2f2;
}

/* Pending State is default styling */

</style>

<style scoped>
.audit-logs-container {
  margin-top: 8px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 8px;
}
</style>