import { ref } from 'vue';

const isOcrEnabled = ref(false);
const isFinancialDraftEnabled = ref(false);

/**
 * Composable to handle feature flags.
 * Uses URL query parameters to enable hidden features and persists them in sessionStorage.
 *
 * Usage:
 * URL: http://.../page?feature=ocr_beta
 * URL: http://.../page?feature=financial_draft
 */
export function useFeatureFlag() {

  const checkFeatures = () => {
    // 1. Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const featureParam = urlParams.get('feature');
    console.log('[FeatureFlag] Checking... URL:', window.location.href, 'Param:', featureParam);

    // --- OCR Feature ---
    if (featureParam === 'ocr_beta') {
      sessionStorage.setItem('OCR_ENABLED', 'true');
      isOcrEnabled.value = true;
    } else if (featureParam === 'ocr_off') {
      sessionStorage.removeItem('OCR_ENABLED');
      isOcrEnabled.value = false;
    } else {
      // Check Session Storage (Persistence)
      isOcrEnabled.value = sessionStorage.getItem('OCR_ENABLED') === 'true';
    }

    // --- Financial Draft Feature ---
    if (featureParam === 'financial_draft') {
      sessionStorage.setItem('FINANCIAL_DRAFT_ENABLED', 'true');
      isFinancialDraftEnabled.value = true;
    } else if (featureParam === 'financial_off') {
      sessionStorage.removeItem('FINANCIAL_DRAFT_ENABLED');
      isFinancialDraftEnabled.value = false;
    } else {
      // Check Session Storage (Persistence)
      isFinancialDraftEnabled.value = sessionStorage.getItem('FINANCIAL_DRAFT_ENABLED') === 'true';
    }
  };

  // Initialize on load
  checkFeatures();

  return {
    isOcrEnabled,
    isFinancialDraftEnabled
  };
}
