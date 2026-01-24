import { ref } from 'vue';

const isOcrEnabled = ref(false);

/**
 * Composable to handle feature flags.
 * Uses URL query parameters to enable hidden features and persists them in sessionStorage.
 *
 * Usage:
 * URL: http://.../page?feature=ocr_beta
 */
export function useFeatureFlag() {

  const checkOcrFeature = () => {
    // 1. Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const featureParam = urlParams.get('feature');
    console.log('[FeatureFlag] Checking... URL:', window.location.href, 'Param:', featureParam);

    if (featureParam === 'ocr_beta') {
      sessionStorage.setItem('OCR_ENABLED', 'true');
      isOcrEnabled.value = true;
    } else if (featureParam === 'ocr_off') {
      sessionStorage.removeItem('OCR_ENABLED');
      isOcrEnabled.value = false;
    } else {
      // 2. Check Session Storage (Persistence)
      isOcrEnabled.value = sessionStorage.getItem('OCR_ENABLED') === 'true';
    }

    return isOcrEnabled.value;
  };

  // Initialize on load
  checkOcrFeature();

  return {
    isOcrEnabled
  };
}
