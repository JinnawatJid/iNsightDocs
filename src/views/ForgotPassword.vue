<template>
  <div class="nav-bar"><img src="../assets/logo.png" /></div>
  <div class="login-container">
    <div class="login-box">
      <h2>ลืมรหัสผ่าน</h2>
      <p>กรุณากรอกรหัสพนักงานของคุณเพื่อรีเซ็ตรหัสผ่าน</p>
      <form @submit.prevent="resetPassword">
        <div class="input-group">
          <label for="empid">รหัสพนักงาน</label>
          <input type="text" id="empid" v-model="empId" />
        </div>
        <button type="submit" class="login-button">รีเซ็ตรหัสผ่าน</button>
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
@import '../assets/auth.css';
</style>
