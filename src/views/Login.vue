<template>
  <div class="nav-bar"><img src="../assets/logo.png" /></div>

  <div class="login-container">
    <div class="login-box">
      <h2>เข้าสู่ระบบ</h2>
      <p>ระบบอนุมัติวงเงินเครดิต</p>
      <form @submit.prevent="login">
        <div class="input-group">
          <label for="empid">รหัสพนักงาน</label>
          <input type="text" id="empid" v-model="empId" />
        </div>
        <div class="input-group">
          <label for="password">รหัสผ่าน</label>
          <input type="password" id="password" v-model="password" />
        </div>
        <div class="options">
          <label>
            <input type="checkbox" v-model="rememberMe" />
            จดจำบัญชีผู้ใช้
          </label>
          <a href="/forgot-password">ลืมรหัสผ่าน</a>
        </div>
        <button type="submit" class="login-button">เข้าสู่ระบบ</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import Swal from 'sweetalert2';
import employees from "../data/employees.json";

const empId = ref("");
const password = ref("");
const rememberMe = ref(false);
const router = useRouter();

const login = () => {
  const user = employees.find(
    (e) => e.EmpId === empId.value && e.password === password.value
  );

  if (user) {
    localStorage.setItem("empId", user.EmpId);
    if (user.password === "Welcome") {
      router.push("/change-password");
    } else {
      router.push("/main");
    }
  } else {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง',
    });
  }
};
</script>

<style scoped>
@import "../assets/auth.css";

.options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.options input[type="checkbox"] {
  accent-color: #007bff;
  background-color: #F5F5F5;
}
</style>