<template>
  <div class="nav-bar"><img src="../assets/logo.png" /></div>
  <div class="login-container">
    <div class="login-box">
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
        <button type="submit" class="login-button">บันทึก</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import employees from '../data/employees.json';

const newPassword = ref('');
const confirmPassword = ref('');
const router = useRouter();

const changePassword = () => {
  if (newPassword.value !== confirmPassword.value) {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'รหัสผ่านไม่ตรงกัน',
    });
    return;
  }

  // ตอนนี้เก็บใน localStorage ไม่ปลอดภัย ต้องเอาออก หรือใช้ JWT แทน
  const empId = localStorage.getItem('empId');
  const user = employees.find((e) => e.EmpId === empId);

  if (user) {
    user.password = newPassword.value;
    // ในอนาคตต้องส่งไปยังฐานข้อมูลจริงด้วย
    console.log('Password updated for:', empId, 'New password:', newPassword.value);
    Swal.fire({
      icon: 'success',
      title: 'สำเร็จ',
      text: 'เปลี่ยนรหัสผ่านสำเร็จ!',
    }).then(() => {
      router.push('/');
    });
  } else {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'รหัสพนักงานไม่ถูกต้อง',
    });
  }
};
</script>

<style scoped>
@import "../assets/auth.css";
</style>
