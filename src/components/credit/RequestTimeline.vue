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
            <div v-if="step.comment" class="comment-text">{{ step.comment }}</div>
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

// Define the static 5-step workflow
const WORKFLOW_STEPS = [
  { id: 'step-1', roleKey: 'ผู้จัดการสาขา', label: 'ผู้จัดการสาขา' },
  { id: 'step-2', roleKey: 'ผู้จัดการภาค', label: 'ผู้จัดการภาค' },
  { id: 'step-3', roleKey: 'ผู้จัดการฝ่ายขาย', label: 'ผู้จัดการฝ่ายขาย' },
  { id: 'step-4', roleKey: 'เจ้าหน้าที่ฝ่ายการเงิน', label: 'เจ้าหน้าที่ฝ่ายการเงิน' },
  { id: 'step-5', roleKey: 'ผู้จัดการฝ่ายการเงิน / กรรมการเครดิต', label: 'ผู้จัดการฝ่ายการเงิน / กรรมการเครดิต' }
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
    }
  },
  setup(props) {
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const timelineSteps = computed(() => {
      // Sort comments chronologically
      const sortedComments = [...props.comments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      let steps = WORKFLOW_STEPS.map(ws => ({
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

      // In real scenarios, users might revise and send again.
      // We will try to match comments sequentially to the steps.
      // But typically, comments log the action *from* a role.

      // We iterate through comments to populate the steps
      steps.forEach((step, index) => {
        // Find if there's a comment for this role.
        // If there are multiple (e.g., due to some back and forth, though system might not support it),
        // we take the latest one for this specific step in this iteration, or just match sequentially.

        // Let's find the first comment matching this role that hasn't been "consumed" yet
        // A better approach is matching by role.
        const matchingComments = sortedComments.filter(c => c.actor_role === step.roleKey);

        if (matchingComments.length > 0) {
          // Take the latest action for this role
          const lastComment = matchingComments[matchingComments.length - 1];
          step.completed = true;
          step.date = lastComment.created_at;
          step.comment = lastComment.comment_text;

          // Determine if this was a rejection
          // Since we don't store action type in RequestComments table right now,
          // we infer from the overall request status if it's rejected and this is the last step.
          // Wait, actually, let's check if the comment text says something or if status is rejected
        }
      });

      // Handle Rejection State globally
      if (props.currentStatus === 'Rejected' || props.currentStatus === 'Canceled') {
        // Find the last completed step and mark it as the rejector
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

.comment-text {
  font-size: 14px;
  color: #334155;
  white-space: pre-wrap;
  line-height: 1.5;
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
