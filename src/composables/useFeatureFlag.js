import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const isFinancialDraftEnabled = ref(false);

/**
 * Composable to handle feature flags.
 * Uses URL query parameters to enable hidden features and persists them in sessionStorage.
 *
 * Usage:
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
    // Priority 2: Check Window Location Search
    else {
        const urlParams = new URLSearchParams(window.location.search);
        featureParam = urlParams.get('feature');

        // Priority 3: Check Window Location Hash (for HashRouter or query inside hash)
        if (!featureParam && window.location.hash.includes('?')) {
            const hashQuery = window.location.hash.split('?')[1];
            const hashParams = new URLSearchParams(hashQuery);
            featureParam = hashParams.get('feature');
        }

        // Priority 4: Brute-force Regex on full HREF (Ultimate Fallback)
        if (!featureParam) {
            const match = window.location.href.match(/[?&]feature=([^&#]*)/);
            if (match) {
                featureParam = match[1];
            }
        }
    }

    // console.log('[FeatureFlag] Checking... Param:', featureParam);

    // --- Financial Draft Feature ---
    if (featureParam === 'financial_draft') {
      // Transient flag: Enabled for this session/SPA lifecycle, but not persisted to storage
      isFinancialDraftEnabled.value = true;
      console.log('[FeatureFlag] Financial Draft Enabled via URL (Transient)');
    } else if (featureParam === 'financial_off') {
      isFinancialDraftEnabled.value = false;
      console.log('[FeatureFlag] Financial Draft Disabled via URL');
    }
    // No else block: Maintain current state during navigation if param is missing
    // (Defaults to false on fresh reload if param is not present)
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
    isFinancialDraftEnabled
  };
}
