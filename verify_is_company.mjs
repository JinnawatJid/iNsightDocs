import { setActivePinia, createPinia } from 'pinia';
import { useCreditRequestStore } from './src/stores/creditRequest.js';

// Mock Swal because it might try to access window/document
// Actually, simple mocking via global object if necessary, or let's hope it doesn't crash on import.
// SweetAlert2 usually requires a DOM. Since I'm running in Node, it might complain.
// But the import itself is usually fine until called.

async function testIsCompanyLogic() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useCreditRequestStore();

  console.log("Starting verification of isCompany logic...");

  const testCases = [
    { name: "บริษัท เทส จำกัด", expected: true },
    { name: "ห้างหุ้นส่วนจำกัด เอบีซี", expected: true },
    { name: "บ. ตัวอย่าง", expected: true },
    { name: "หจก. ทดสอบ", expected: true },
    { name: "นาย สมชาย ใจดี", expected: false },
    { name: "นางสาว สวย น่ารัก", expected: false },
    { name: "Store Name without keywords", expected: false },
    { name: "บริษัท(มหาชน)", expected: true }, // Contains บริษัท
    { name: "ร้านค้าทั่วไป", expected: false }
  ];

  let passed = 0;
  for (const test of testCases) {
    store.customer = { name: test.name };
    const result = store.isCompany;
    if (result === test.expected) {
      console.log(`[PASS] Name: "${test.name}" -> isCompany: ${result}`);
      passed++;
    } else {
      console.error(`[FAIL] Name: "${test.name}" -> Expected: ${test.expected}, Got: ${result}`);
    }
  }

  if (passed === testCases.length) {
    console.log("All test cases passed!");
  } else {
    console.error("Some test cases failed.");
    process.exit(1);
  }
}

testIsCompanyLogic();
