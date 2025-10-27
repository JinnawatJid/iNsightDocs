<template>
  <div class="change-password-container">
    <div class="change-password-box">
      <h2>เปลี่ยนรหัสผ่าน</h2>
      <p>ตั้งรหัสผ่านใหม่ของคุณ</p>
      <form @submit.prevent="changePassword">
        <div class="input-group">
          <label for="new-password">รหัสผ่านใหม่</label>
          <input type="password" id="new-password" v-model="newPassword" />
        </div>
        <div class="input-group">
          <label for="confirm-password">ยืนยันรหัสผ่านใหม่</label>
          <input type="password" id="confirm-password" v-model="confirmPassword" />
        </div>
        <button type="submit" class="change-password-button">บันทึก</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import employees from '../data/employees.json';

const newPassword = ref('');
const confirmPassword = ref('');
const router = useRouter();

const changePassword = () => {
  if (newPassword.value !== confirmPassword.value) {
    alert('รหัสผ่านไม่ตรงกัน');
    return;
  }

  // ตอนนี้เก็บใน localStorage ไม่ปลอดภัย ต้องเอาออก หรือใช้ JWT แทน
  const empId = localStorage.getItem('empId');
  const user = employees.find((e) => e.EmpId === empId);

  if (user) {
    user.password = newPassword.value;
    // ในอนาคตต้องส่งไปยังฐานข้อมูลจริงด้วย
    console.log('Password updated for:', empId, 'New password:', newPassword.value);
    alert('เปลี่ยนรหัสผ่านสำเร็จ!');
    router.push('/');
  } else {
    alert('รหัสพนักงานไม่ถูกต้อง');
  }
};
</script>

<style scoped>
.change-password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f5f5;
}

.change-password-box {
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

.change-password-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.change-password-button:hover {
  background-color: #0056b3;
}
</style>
