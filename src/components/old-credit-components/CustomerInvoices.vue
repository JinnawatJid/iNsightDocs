<template>
  <div class="customer-invoices">
    <h3>ประวัติการซื้อ</h3>
    <table>
      <thead>
        <tr>
          <th>เลขที่ใบเสร็จ</th>
          <th>วันที่</th>
          <th>สินค้า</th>
          <th>มูลค่า</th>
          <th>สถานะ</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invoice in paginatedInvoices" :key="invoice.receiptNumber">
          <td>{{ invoice.receiptNumber }}</td>
          <td>{{ invoice.date }}</td>
          <td>{{ invoice.product }}</td>
          <td>{{ invoice.amount }}</td>
          <td>
            <span :class="getStatusClass(invoice.status)">{{ invoice.status }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">Previous</button>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  invoices: {
    type: Array,
    required: true,
  },
});

const currentPage = ref(1);
const itemsPerPage = 5;

const totalPages = computed(() => {
  return Math.ceil(props.invoices.length / itemsPerPage);
});

const paginatedInvoices = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return props.invoices.slice(start, end);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const getStatusClass = (status) => {
  if (status === 'ชำระแล้ว') {
    return 'status-paid';
  } else if (status === 'ค้างชำระ') {
    return 'status-unpaid';
  } else if (status === 'NPL: หนี้เสีย') {
    return 'status-npl';
  }
  return '';
};
</script>

<style scoped>
.customer-invoices {
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 1rem;
  margin-top: 1rem;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border-bottom: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
.status-paid {
  color: green;
}
.status-unpaid {
  color: orange;
}
.status-npl {
  color: red;
}
.pagination {
    margin-top: 1rem;
    text-align: center;
}
</style>
