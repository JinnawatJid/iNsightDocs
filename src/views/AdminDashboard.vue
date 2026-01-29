<template>
  <div class="admin-dashboard">
    <Navbar />
    <div class="dashboard-content">
      <div class="header">
        <h1>Admin Dashboard</h1>
        <div class="tabs">
          <button
            :class="['tab-btn', { active: activeTab === 'logs' }]"
            @click="activeTab = 'logs'"
          >
            System Logs
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'data' }]"
            @click="activeTab = 'data'"
          >
            Data Explorer
          </button>
        </div>
      </div>

      <!-- System Logs Tab -->
      <div v-if="activeTab === 'logs'" class="tab-content">
        <div class="actions">
          <button @click="fetchLogs" class="refresh-btn">Refresh Logs</button>
          <input v-model="logFilter" placeholder="Filter logs..." class="search-input" />
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Method</th>
                <th>URL</th>
                <th>Status</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(log, index) in filteredLogs" :key="index" :class="getLogClass(log)">
                <td>{{ log.timestamp || '-' }}</td>
                <td>
                    <span v-if="log.request">{{ log.request.split(' ')[0] }}</span>
                    <span v-else>-</span>
                </td>
                <td class="url-cell">
                    <span v-if="log.request">{{ log.request.split(' ')[1] }}</span>
                    <span v-else>{{ log.raw }}</span>
                </td>
                <td>
                    <span :class="['status-badge', getStatusClass(log.status)]">
                        {{ log.status || '-' }}
                    </span>
                </td>
                <td>{{ log.ip || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Data Explorer Tab -->
      <div v-if="activeTab === 'data'" class="tab-content">
        <div class="actions">
          <button @click="fetchTransactions" class="refresh-btn">Refresh Data</button>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>TxID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in transactions" :key="tx.id">
                <td>{{ tx.tx_id }}</td>
                <td>{{ tx.customer_name }}</td>
                <td>
                    <span class="status-badge generic">{{ tx.status }}</span>
                </td>
                <td>{{ formatNumber(tx.request_amount) }}</td>
                <td>{{ formatDate(tx.created_at) }}</td>
                <td>
                  <button @click="openDetails(tx)" class="details-btn">View JSON</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- JSON Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
            <h3>Transaction Details: {{ selectedTx?.tx_id }}</h3>
            <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <pre>{{ formattedJson }}</pre>
        </div>
      </div>
    </div>

    <!-- Auth Modal -->
    <div v-if="showAuthModal" class="modal-overlay">
      <div class="modal-content auth-modal">
        <div class="modal-header">
            <h3>Admin Authentication</h3>
        </div>
        <div class="modal-body auth-body">
            <p>Please enter the Admin Key to access this dashboard.</p>
            <input v-model="adminKeyInput" type="password" placeholder="Enter Admin Key" class="auth-input" />
            <button @click="saveKey" class="auth-btn">Access</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Navbar from '@/components/shared/Navbar.vue';

const activeTab = ref('logs');
const logs = ref([]);
const transactions = ref([]);
const logFilter = ref('');
const showModal = ref(false);
const selectedTx = ref(null);

const showAuthModal = ref(false);
const adminKeyInput = ref('');

const API_BASE = '/api/admin';

const getAdminKey = () => localStorage.getItem('admin_key') || '';

// --- Logs Logic ---
const fetchLogs = async () => {
  try {
    const res = await fetch(`${API_BASE}/logs`, {
        headers: { 'x-admin-key': getAdminKey() }
    });

    if (res.status === 403) {
        showAuthModal.value = true;
        return;
    }

    const data = await res.json();
    logs.value = data.logs || [];
  } catch (e) {
    console.error('Failed to fetch logs', e);
  }
};

const filteredLogs = computed(() => {
  if (!logFilter.value) return logs.value;
  const term = logFilter.value.toLowerCase();
  return logs.value.filter(l =>
    (l.raw && l.raw.toLowerCase().includes(term)) ||
    (l.request && l.request.toLowerCase().includes(term))
  );
});

const getStatusClass = (status) => {
    if (!status) return '';
    if (status >= 500) return 'status-error';
    if (status >= 400) return 'status-warn';
    if (status >= 200 && status < 300) return 'status-success';
    return '';
};

const getLogClass = (log) => {
    if (log.status >= 500) return 'row-error';
    return '';
};

// --- Transactions Logic ---
const fetchTransactions = async () => {
  try {
    const res = await fetch(`${API_BASE}/transactions`, {
        headers: { 'x-admin-key': getAdminKey() }
    });

    if (res.status === 403) {
        showAuthModal.value = true;
        return;
    }

    const data = await res.json();
    transactions.value = data.data || [];
  } catch (e) {
    console.error('Failed to fetch transactions', e);
  }
};

// --- Modal Logic ---
const openDetails = (tx) => {
    selectedTx.value = tx;
    showModal.value = true;
};

const closeModal = () => {
    showModal.value = false;
    selectedTx.value = null;
};

const saveKey = () => {
    if (adminKeyInput.value) {
        localStorage.setItem('admin_key', adminKeyInput.value);
        showAuthModal.value = false;
        fetchLogs();
        fetchTransactions();
    }
};

const formattedJson = computed(() => {
    if (!selectedTx.value) return '';
    return JSON.stringify(selectedTx.value, null, 2);
});

// --- Helpers ---
const formatNumber = (num) => {
    if (!num) return '-';
    return Number(String(num).replace(/,/g, '')).toLocaleString();
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('th-TH');
};

// --- Init ---
onMounted(() => {
    fetchLogs();
    fetchTransactions();
});
</script>

<style scoped>
.admin-dashboard {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-top: 80px;
}

.dashboard-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tabs {
  display: flex;
  gap: 10px;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  color: #666;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tab-btn.active {
  background: #007bff;
  color: white;
}

.tab-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  min-height: 500px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.refresh-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.search-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
  max-width: 300px;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th, .data-table td {
  padding: 10px;
  border-bottom: 1px solid #eee;
  text-align: left;
}

.data-table th {
  background: #f9f9f9;
  font-weight: bold;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.status-success { background-color: #28a745; }
.status-warn { background-color: #ffc107; color: #333; }
.status-error { background-color: #dc3545; }
.generic { background-color: #6c757d; }

.row-error {
    background-color: #fff0f0;
}

.details-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  width: 80%;
  max-width: 1000px;
  height: 80%;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.auth-modal {
    width: 400px;
    height: auto;
}

.auth-body {
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: center;
    padding: 30px;
}

.auth-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.auth-btn {
    width: 100%;
    padding: 10px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

.modal-header {
  padding: 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.modal-body {
  padding: 15px;
  overflow: auto;
  flex: 1;
  background: #f8f9fa;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: monospace;
  font-size: 12px;
}
</style>
