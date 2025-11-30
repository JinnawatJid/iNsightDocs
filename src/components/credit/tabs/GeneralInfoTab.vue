<template>
  <div class="general-info-tab">
    <!-- Upload Section -->
    <div class="upload-section">
      <div class="upload-grid">
        <FileUploader
          label="สำเนาบัตรประชาชน"
          required
          v-model="files.idCard"
        />
        <FileUploader
          label="สำเนาทะเบียนบ้าน"
          required
          v-model="files.homeReg"
        />
      </div>
    </div>

    <!-- Personal Info Section -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลส่วนตัว</h3>
        <span class="badge-edit">แก้ไขข้อมูลส่วนตัว</span>
      </div>

      <div class="form-layout-columns">
        <!-- Left Column -->
        <div class="column-layout">
          <div class="form-group">
            <label>ชื่อจริง นามสกุล</label>
            <input type="text" class="form-input disabled" :value="displayName" disabled placeholder="**ดึงข้อมูลจาก Dynamics**" />
          </div>
          <div class="form-group">
            <label>ตำแหน่ง</label>
            <input type="text" class="form-input" placeholder="เจ้าหน้าที่ใส่" v-model="formData.position" />
          </div>
        </div>

        <!-- Right Column -->
        <div class="column-layout">
          <div class="form-group">
            <label>ชื่อร้าน/บริษัท</label>
            <input type="text" class="form-input disabled" :value="displayCompany" disabled placeholder="**ดึงข้อมูลจาก Dynamics**" />
          </div>
          <div class="row-two-col">
            <div class="form-group">
              <label>วงเงินสินเชื่อที่ต้องการ</label>
              <input type="text" class="form-input" placeholder="เจ้าหน้าที่ใส่" v-model="formData.creditAmount" />
            </div>
            <div class="form-group">
              <label>สาเหตุการขอเครดิต</label>
              <select class="form-input" v-model="formData.creditReason">
                  <option value="สต๊อคสินค้า">สต๊อคสินค้า</option>
                  <option value="หมุนเวียนธุรกิจ">หมุนเวียนธุรกิจ</option>
                  <option value="ขยายกิจการ">ขยายกิจการ</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FileUploader from '@/components/shared/FileUploader.vue';

export default {
  name: 'GeneralInfoTab',
  components: {
    FileUploader
  },
  props: {
    customerData: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      files: {
        idCard: null,
        homeReg: null
      },
      formData: {
        position: '',
        creditAmount: '',
        creditReason: 'สต๊อคสินค้า'
      }
    };
  },
  computed: {
    displayName() {
      return this.customerData.contact_person || this.customerData.name || '';
    },
    displayCompany() {
      if (this.customerData.contact_person) {
        return this.customerData.name || '';
      }
      return this.customerData.name || '';
    }
  }
};
</script>

<style scoped>
@import './shared-styles.css';

.general-info-tab {
  padding: 10px;
}

/* Personal Info Section */
.personal-info-section {
  margin-top: 20px;
}
</style>
