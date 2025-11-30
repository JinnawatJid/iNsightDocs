<template>
  <div class="credit-request-form">
    <div class="unified-card">
      <div class="card-header">
        <h3>เอกสารประกอบการพิจารณา</h3>
      </div>
      <ApplicationTabs />
    </div>

    <div class="form-footer">
      <div class="comment-section">
        <h3>ความคิดเห็นเพิ่มเติม</h3>
        <input type="text" class="comment-input" placeholder="ความคิดเห็นเพิ่มเติม" />
      </div>

      <div class="footer-info">
         <span class="author">AY: จิณณวัฒน์ จิตเสนาะ</span>
      </div>

      <div class="action-buttons">
        <button class="btn-save">บันทึกแบบร่าง</button>
        <button class="btn-submit">ส่งคำขอเครดิต</button>
      </div>
    </div>
  </div>
</template>

<script>
import ApplicationTabs from './ApplicationTabs.vue';

export default {
  name: 'CreditRequestForm',
  components: {
    ApplicationTabs
  }
};
</script>

<style scoped>
.credit-request-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.unified-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  /* padding: 10px 0; */
  overflow: hidden;
}

.card-header {
  padding: 0px 20px 0 20px;
}

.card-header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
}

.card-header h3::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'%3E%3C/path%3E%3Cpolyline points='14 2 14 8 20 8'%3E%3C/polyline%3E%3Cline x1='16' y1='13' x2='8' y2='13'%3E%3C/line%3E%3Cline x1='16' y1='17' x2='8' y2='17'%3E%3C/line%3E%3Cpolyline points='10 9 9 9 8 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
}

.form-footer {
  margin-top: 20px;
}

.comment-section {
  margin-bottom: 20px;
}

.comment-section h3 {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
}

.comment-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: #f5f6f8;
  box-sizing: border-box;
}

.footer-info {
  text-align: right;
  margin-bottom: 15px;
}

.author {
  color: #888;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

.btn-save {
  padding: 12px 30px;
  background-color: #999;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.btn-submit {
  padding: 12px 30px;
  background-color: #0056FF;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.btn-submit:hover {
  background-color: #0046cc;
}
</style>
