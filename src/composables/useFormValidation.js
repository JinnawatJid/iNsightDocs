import { reactive } from 'vue';

export function useFormValidation() {
  const errors = reactive({});

  const validateField = (fieldName, value, rules = []) => {
    errors[fieldName] = null; // Reset error

    for (const rule of rules) {
      if (rule === 'required') {
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          errors[fieldName] = 'กรุณาระบุข้อมูล';
          return false;
        }
      } else if (rule === 'numeric') {
        // Allow numbers and commas
        if (value && !/^[0-9,]+$/.test(value)) {
          errors[fieldName] = 'กรุณาระบุตัวเลขเท่านั้น';
          return false;
        }
      } else if (rule === 'phone') {
        // Strict 9 or 10 digits
        if (value) {
           const digits = value.replace(/\D/g, '');
           if (digits.length !== 9 && digits.length !== 10) {
             errors[fieldName] = 'เบอร์โทรศัพท์ต้องมี 9 หรือ 10 หลัก';
             return false;
           }
        }
      } else if (rule === 'text') {
        // Allow Thai, English, spaces, parentheses, dots
        // Regex: ^[a-zA-Z\u0E00-\u0E7F\s().]+$
        // \u0E00-\u0E7F is the Thai Unicode block
        if (value && !/^[a-zA-Z\u0E00-\u0E7F\s().]+$/.test(value)) {
          errors[fieldName] = 'กรุณาระบุตัวอักษรเท่านั้น';
          return false;
        }
      }
    }
    return true;
  };

  return {
    errors,
    validateField
  };
}
