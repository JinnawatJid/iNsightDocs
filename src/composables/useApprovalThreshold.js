import { computed } from 'vue';
import { useConfigStore } from '@/stores/config';

export const APPROVAL_THRESHOLD_CONFIG_KEY = 'COMMITTEE_APPROVAL_THRESHOLD_THB';
export const DEFAULT_APPROVAL_THRESHOLD_THB = 300000;

export const normalizeApprovalThreshold = (rawValue) => {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;

  const parsed = Number(String(rawValue).replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.trunc(parsed);
};

const findConfigValue = (configurations, configKey) => {
  if (!configurations) return null;

  for (const categoryGroup of Object.values(configurations)) {
    const match = (categoryGroup || []).find((config) => config.config_key === configKey);
    if (match) return match.config_value;
  }

  return null;
};

export function useApprovalThreshold() {
  const configStore = useConfigStore();

  const approvalThreshold = computed(() => {
    const rawValue = findConfigValue(configStore.configurations, APPROVAL_THRESHOLD_CONFIG_KEY);
    return normalizeApprovalThreshold(rawValue) ?? DEFAULT_APPROVAL_THRESHOLD_THB;
  });

  return {
    approvalThreshold,
    approvalThresholdConfigKey: APPROVAL_THRESHOLD_CONFIG_KEY,
    defaultApprovalThreshold: DEFAULT_APPROVAL_THRESHOLD_THB,
    normalizeApprovalThreshold,
  };
}