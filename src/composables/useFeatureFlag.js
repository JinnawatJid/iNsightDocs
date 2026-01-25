import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

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
  const route = useRoute();

  const checkFeatures = (querySource) => {
    let featureParam = null;

    // Priority 1: Check provided query source (Route Query)
    if (querySource && querySource.feature) {
        featureParam = querySource.feature;
    }
    // Priority 2: Check Window Location (Fallback)
    else {
        const urlParams = new URLSearchParams(window.location.search);
        featureParam = urlParams.get('feature');
    }

    // console.log('[FeatureFlag] Checking... Param:', featureParam);

    // --- OCR Feature ---
    if (featureParam === 'ocr_beta') {
      sessionStorage.setItem('OCR_ENABLED', 'true');
      isOcrEnabled.value = true;
    } else if (featureParam === 'ocr_off') {
      sessionStorage.removeItem('OCR_ENABLED');
      isOcrEnabled.value = false;
    } else {
      isOcrEnabled.value = sessionStorage.getItem('OCR_ENABLED') === 'true';
    }

    // --- Financial Draft Feature ---
    if (featureParam === 'financial_draft') {
      sessionStorage.setItem('FINANCIAL_DRAFT_ENABLED', 'true');
      isFinancialDraftEnabled.value = true;
      console.log('[FeatureFlag] Financial Draft Enabled via URL');
    } else if (featureParam === 'financial_off') {
      sessionStorage.removeItem('FINANCIAL_DRAFT_ENABLED');
      isFinancialDraftEnabled.value = false;
      console.log('[FeatureFlag] Financial Draft Disabled via URL');
    } else {
      isFinancialDraftEnabled.value = sessionStorage.getItem('FINANCIAL_DRAFT_ENABLED') === 'true';
    }
  };

  // Initial Check (Window)
  checkFeatures();

  // Reactive Watcher (Route)
  if (route) {
    watch(() => route.query, (newQuery) => {
        checkFeatures(newQuery);
    }, { deep: true });
  }

  return {
    isOcrEnabled,
    isFinancialDraftEnabled
  };
}
