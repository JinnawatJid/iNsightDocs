<template>
  <div class="credit-request-form">
    <div class="unified-card">
      <DocumentUploadSection />
      <DocumentInfoSection :customerName="customerData.name" :companyName="customerData.name" />
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
import DocumentUploadSection from './DocumentUploadSection.vue';
import DocumentInfoSection from './DocumentInfoSection.vue';

export default {
  name: 'CreditRequestForm',
  components: {
    DocumentUploadSection,
    DocumentInfoSection
  },
  props: {
    customerData: {
      type: Object,
      default: () => ({})
    }
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
  padding: 10px 0; /* Padding inside the card */
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
  box-sizing: border-box; /* Ensure padding doesn't overflow width */
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
