<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3>สรุปการเปลี่ยนแปลง (Summary of Changes)</h3>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div class="modal-body">
        <p class="summary-desc">กรุณาตรวจสอบรายการที่มีการเปลี่ยนแปลงก่อนยืนยัน</p>

        <table class="diff-table">
          <thead>
            <tr>
              <th>รายการ (Field)</th>
              <th>ข้อมูลเดิม (Original)</th>
              <th>ข้อมูลใหม่ (New)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in changes" :key="index">
              <td class="field-name">{{ item.label }}</td>
              <td class="old-value">{{ item.oldVal || '-' }}</td>
              <td class="new-value">{{ item.newVal }}</td>
            </tr>
            <tr v-if="changes.length === 0">
              <td colspan="3" class="no-changes">ไม่มีการเปลี่ยนแปลงข้อมูล (No changes detected)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="close">กลับไปแก้ไข</button>
        <button class="btn-confirm" @click="confirm">ยืนยันการเปลี่ยนแปลง</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChangeSummaryModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    changes: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'confirm'],
  setup(props, { emit }) {
    const close = () => emit('close');
    const confirm = () => emit('confirm');
    return { close, confirm };
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: 60vh;
}

.summary-desc {
  margin-bottom: 15px;
  color: #666;
  font-size: 14px;
}

.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.diff-table th, .diff-table td {
  border: 1px solid #e0e0e0;
  padding: 10px;
  text-align: left;
}

.diff-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.field-name {
  font-weight: 500;
  color: #333;
  width: 30%;
}

.old-value {
  color: #888;
  width: 35%;
}

.new-value {
  color: #28a745; /* Green */
  font-weight: bold;
  background-color: #f0fff4;
  width: 35%;
}

.no-changes {
  text-align: center;
  color: #888;
  padding: 20px;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  padding: 10px 20px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.btn-confirm {
  padding: 10px 20px;
  background-color: #0056FF;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-confirm:hover {
  background-color: #0046cc;
}
</style>
