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
    alert("รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง");
  }
};
</script>

<style scoped>
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 80px;
  z-index: 1000;
  background-color: #1B1A1A;
  display: flex;
  align-items: center;
  padding-left: 2rem;
}

.nav-bar img {
  height: 40px;
  width: auto;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #ffffff;
  padding-top: 0px;
  box-sizing: border-box;
}

.login-box {
  background-color: white;
  color: #21272A;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 400px;
  text-align: center;
}

h2 {
  font-size: 36px;
  margin: 0px;
}

p {
  font-size: 18px;
  margin: 0px;
}

.input-group {
  margin-top: 24px;
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
  background-color: #F5F5F5;
  color: #21272A;
  border-radius: 4px;
  box-sizing: border-box;
}

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

.login-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.login-button:hover {
  background-color: #0056b3;
}
</style>