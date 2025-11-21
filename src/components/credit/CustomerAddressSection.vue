<template>
  <div class="customer-address-section">
    <div class="section-header">
      <h3>ตรวจสอบข้อมูลส่วนตัว</h3>
      <span class="badge-edit">แก้ไขข้อมูลส่วนตัว</span>
    </div>

    <div class="form-grid">
      <div class="form-group">
        <label>ชื่อจริง นามสกุล (ตัวอย่าง สมชาย เหล็กดี)</label>
        <input type="text" class="form-input disabled" :value="customerName" disabled placeholder="**ดึงข้อมูลจาก Dynamics**" />
      </div>
      <div class="form-group">
        <label>ชื่อร้าน/บริษัท</label>
        <input type="text" class="form-input disabled" :value="companyName" disabled placeholder="**ดึงข้อมูลจาก Dynamics**" />
      </div>
      <div class="form-group">
        <label>ตำแหน่ง</label>
        <input type="text" class="form-input" placeholder="เจ้าหน้าที่ใส่" v-model="position" />
      </div>

      <!-- Split row for Credit Amount and Reason -->
      <div class="form-group-row">
          <div class="form-group half">
            <label>วงเงินสินเชื่อที่ต้องการ</label>
            <input type="text" class="form-input" placeholder="เจ้าหน้าที่ใส่" v-model="creditAmount" />
          </div>
          <div class="form-group half">
            <label>สาเหตุการขอเครดิต</label>
            <select class="form-input" v-model="creditReason">
                <option value="สต๊อคสินค้า">สต๊อคสินค้า</option>
                <option value="หมุนเวียนธุรกิจ">หมุนเวียนธุรกิจ</option>
                <option value="ขยายกิจการ">ขยายกิจการ</option>
            </select>
          </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CustomerAddressSection',
  props: {
    customerName: {
      type: String,
      default: ''
    },
    companyName: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      position: '',
      creditAmount: '',
      creditReason: 'สต๊อคสินค้า'
    };
  }
};
</script>

<style scoped>
.customer-address-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

h3 {
  font-size: 16px;
  font-weight: bold;
  margin: 0;
}

.badge-edit {
  background-color: #FFA500;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  cursor: pointer;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}

.form-group-row {
    display: flex;
    gap: 20px;
    grid-column: span 2; /* Take up full width of the grid row */
}

.form-group.half {
    flex: 1;
}

label {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 6px;
}

.form-input {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
  font-size: 14px;
}

.form-input.disabled {
  background-color: #f0f0f0;
  color: #888;
  cursor: not-allowed;
}
</style>
