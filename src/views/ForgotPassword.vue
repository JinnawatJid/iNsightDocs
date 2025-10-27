<template>
  <div class="forgot-password-container">
    <div class="forgot-password-box">
      <h2>ลืมรหัสผ่าน</h2>
      <p>กรุณากรอกรหัสพนักงานของคุณเพื่อรีเซ็ตรหัสผ่าน</p>
      <form @submit.prevent="resetPassword">
        <div class="input-group">
          <label for="empid">รหัสพนักงาน</label>
          <input type="text" id="empid" v-model="empId" />
        </div>
        <button type="submit" class="reset-password-button">รีเซ็ตรหัสผ่าน</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import employees from '../data/employees.json';

const empId = ref('');
const router = useRouter();

const resetPassword = () => {
  const user = employees.find((e) => e.EmpId === empId.value);

  if (user) {
    user.password = 'Welcome';
    // ในอนาคตต้องส่งไปยังฐานข้อมูลจริงด้วย
    console.log('Password reset for:', empId.value);
    alert('เปลี่ยนรหัสผ่านเป็นค่าเริ่มต้นสำเร็จ');
    router.push('/');
  } else {
    alert('รหัสพนักงานไม่ถูกต้อง');
  }
};
</script>

<style scoped>
.forgot-password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f5f5;
}

.forgot-password-box {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 400px;
  text-align: center;
}

h2 {
  margin-bottom: 0.5rem;
}

p {
  margin-bottom: 2rem;
  color: #666;
}

.input-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.input-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.input-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.reset-password-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.reset-password-button:hover {
  background-color: #0056b3;
}
</style>
