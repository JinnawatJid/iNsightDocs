import { reactive } from 'vue';

export function useFormValidation() {
  const errors = reactive({});

  const validateField = (fieldName, value, rules = []) => {
    errors[fieldName] = null; // Reset error

    for (const rule of rules) {
      if (rule === 'required') {
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          errors[fieldName] = 'This field is required'; // Or Thai text: 'กรุณาระบุข้อมูล'
          return false;
        }
      } else if (rule === 'numeric') {
        // Allow numbers and commas
        if (value && !/^[0-9,]+$/.test(value)) {
          errors[fieldName] = 'Please enter numbers only'; // 'กรุณาระบุตัวเลขเท่านั้น'
          return false;
        }
      } else if (rule === 'phone') {
        // Strict 9 or 10 digits
        if (value) {
           // We assume input is already cleaned of dashes for length check,
           // OR we strip dashes here.
           // User wants strict input, so likely the model value is clean or has dashes.
           // Let's assume the model might have dashes (0XX-XXX-XXXX), so we strip them for validation.
           const digits = value.replace(/\D/g, '');
           if (digits.length !== 9 && digits.length !== 10) {
             errors[fieldName] = 'Phone number must be 9 or 10 digits'; // 'เบอร์โทรศัพท์ต้องมี 9 หรือ 10 หลัก'
             return false;
           }
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
    // block anything that is not a digit
    // prevent default if key is not digit (except backspace, tab, etc which are handled by browser usually)
    // But better to handle on 'input' event by stripping chars.
    const input = event.target;
    const val = input.value;
    const clean = val.replace(/[^0-9]/g, '');
    if (clean !== val) {
      input.value = clean;
      // trigger update if needed
      input.dispatchEvent(new Event('input'));
    }
    // Also limit length?
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
