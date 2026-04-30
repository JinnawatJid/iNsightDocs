import { useConfigStore } from '@/stores/config';
import { useAuthStore } from '@/stores/auth';

export const getWorkflowConfig = () => {
    const configStore = useConfigStore();
    const configKey = 'WORKFLOW_CONFIG';

    let wfConfigObj = null;
    if (configStore.configurations && configStore.configurations['WorkflowMgmt']) {
       wfConfigObj = configStore.configurations['WorkflowMgmt'].find(c => c.config_key === configKey);
    }

    if (!wfConfigObj && configStore.configurations) {
       for (const cat in configStore.configurations) {
          const found = configStore.configurations[cat]?.find(c => c.config_key === configKey);
          if (found) {
             wfConfigObj = found;
             break;
          }
       }
    }

    if (wfConfigObj && wfConfigObj.config_value) {
        try {
            return JSON.parse(wfConfigObj.config_value);
        } catch (e) {
            console.error('Failed to parse WORKFLOW_CONFIG', e);
        }
    }
    return null;
};

export const getAllowedStatusesForUser = () => {
    const authStore = useAuthStore();
    const config = getWorkflowConfig();

    let allowedStatuses = [];

    if (config && config.states) {
        const userRoles = authStore.user?.roles?.map(r => r.role) || [];

        Object.entries(config.states).forEach(([stateKey, stateData]) => {
            if (stateData.actionableByRoles) {
                const hasRole = stateData.actionableByRoles.some(role => userRoles.includes(role));
                // If user has the role, or if user is initiator and we are handling specific rules.
                // Wait, "ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)" is the initiator role.
                if (hasRole) {
                    allowedStatuses.push(stateKey);
                }
            }
        });
    }

    // Temporary specific handling for Initiator logic - they should see states where they are actively participating or that are returned to them
    // Let's refine based on dynamic workflow. Wait, actually if they have "ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)" added to Draft/PendingSales etc, the dynamic loop will catch it.
    // Let's ensure "ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)" is in their roles.
    const userRoles = authStore.user?.roles?.map(r => r.role) || [];
    if (userRoles.includes('ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)')) {
        // As per previous logic, initiators could see all active requests they submitted.
        // This is handled in backend via `created_by = req.user.username` for active queries.
        // For the frontend to query correctly, it needs to pass the statuses.
        // Let's allow Initiator to query ALL active statuses to see their own requests.
        if (config && config.states) {
             Object.entries(config.states).forEach(([stateKey, stateData]) => {
                 if (stateData.type === 'active' || stateData.type === 'initial') {
                     if (!allowedStatuses.includes(stateKey)) {
                         allowedStatuses.push(stateKey);
                     }
                 }
             });
        } else {
             // Fallback
             allowedStatuses.push('Draft', 'Opened', 'RegionalSubmitted', 'SalesSubmitted', 'FinanceReviewed', 'Reviewed', 'PendingSales (ชั่วคราว)', 'PendingFinance (ชั่วคราว)');
        }
    }

    return [...new Set(allowedStatuses)];
};

export const isStatusActionableForUser = (status) => {
    const authStore = useAuthStore();
    const config = getWorkflowConfig();

    if (!config || !config.states || !config.states[status]) {
        // Fallback hardcoded
        if (authStore.isInitiator && ['Draft', 'PendingSales (ชั่วคราว)', 'PendingFinance (ชั่วคราว)'].includes(status)) return true;
        if (authStore.isRegionalManager && status === 'Opened') return true;
        if (authStore.isSalesManager && status === 'RegionalSubmitted') return true;
        if (authStore.isFinanceOfficer && status === 'SalesSubmitted') return true;
        if (authStore.isFinanceManager && status === 'FinanceReviewed') return true;
        if (authStore.isCreditCommittee && status === 'Reviewed') return true;
        return false;
    }

    const stateData = config.states[status];
    const userRoles = authStore.user?.roles?.map(r => r.role) || [];

    if (stateData.actionableByRoles) {
        return stateData.actionableByRoles.some(role => userRoles.includes(role));
    }
    return false;
};
