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
        // Allow Thai, English, spaces
        // Regex: ^[a-zA-Z\u0E00-\u0E7F\s]+$
        // \u0E00-\u0E7F is the Thai Unicode block
        if (value && !/^[a-zA-Z\u0E00-\u0E7F\s]+$/.test(value)) {
          errors[fieldName] = 'กรุณาระบุตัวอักษรเท่านั้น';
          return false;
        }
      }
    }
    return true;
  };

  const clearError = (fieldName) => {
    if (errors[fieldName]) {
      errors[fieldName] = null;
    }
  };

  const restrictPhoneInput = (event) => {
    const input = event.target;
    const val = input.value;
    const clean = val.replace(/[^0-9]/g, '');
    if (clean !== val) {
      input.value = clean;
      input.dispatchEvent(new Event('input'));
    }
    if (clean.length > 10) {
      input.value = clean.slice(0, 10);
      input.dispatchEvent(new Event('input'));
    }
  };

  const restrictCreditAmountInput = (event) => {
    const input = event.target;
    const val = input.value;
    const clean = val.replace(/[^0-9,]/g, '');
    if (clean !== val) {
      input.value = clean;
      input.dispatchEvent(new Event('input'));
    }
  };

  return {
    errors,
    validateField,
    clearError,
    restrictPhoneInput,
    restrictCreditAmountInput
  };
}
