/**
 * useWorkflowConfig
 * Shared composable that fetches WORKFLOW_CONFIG from the public endpoint
 * (/api/config/workflow) — no admin rights required.
 *
 * Uses a module-level singleton so only one HTTP request is made per page load,
 * regardless of how many components call this composable.
 */
import { ref } from 'vue';

const workflowStates = ref(null);
let fetchPromise = null;

export function useWorkflowConfig() {
  const fetchWorkflowConfig = async () => {
    // Return cached data if already loaded
    if (workflowStates.value) return;

    // If a fetch is already in-flight, wait for it instead of duplicating
    if (fetchPromise) {
      await fetchPromise;
      return;
    }

    fetchPromise = (async () => {
      try {
        const res = await fetch('/api/config/workflow');
        if (!res.ok) {
          console.warn('[useWorkflowConfig] /api/config/workflow returned', res.status);
          return;
        }
        const json = await res.json();
        if (json.success && json.data?.states) {
          workflowStates.value = json.data.states;
        }
      } catch (e) {
        console.warn('[useWorkflowConfig] Failed to fetch WORKFLOW_CONFIG:', e);
      } finally {
        fetchPromise = null;
      }
    })();

    await fetchPromise;
  };

  return { workflowStates, fetchWorkflowConfig };
}
